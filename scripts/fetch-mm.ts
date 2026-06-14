/**
 * Auto-fetch Mega Millions draw history.
 *
 * PRIMARY source — full history:
 *   NY State Open Data (Socrata)
 *   https://data.ny.gov/resource/5xaw-6ayf.json
 *   Official NY Lottery feed. Mega Millions is national, so this single
 *   endpoint gives authoritative full history from 2002 → yesterday.
 *
 * FALLBACK source — latest draw only:
 *   megamillions.com utility service
 *   https://www.megamillions.com/cmspages/utilservice.asmx/GetLatestDrawData
 *   Returns ONLY the single most recent draw (no history). Used when NY
 *   is down so we still stay current — the latest draw is MERGED into
 *   the existing CSV, preserving all the history NY gave us on the last
 *   good run. NEVER used as a primary/replacement: it has no history,
 *   and overwriting with it would destroy ~2,500 rows back to 2002.
 *
 * Resilience flow each run:
 *   1. NY (with retry) → success: full authoritative rebuild. Done.
 *   2. NY down → megamillions.com latest, merged into existing CSV.
 *      App stays current; history preserved.
 *   3. Both down, existing CSV present → keep last-known-good, exit 0.
 *   4. Both down, no existing CSV → hard-fail (exit 1).
 * When NY recovers, step 1 rebuilds from full history and overwrites any
 * fallback-sourced row with NY's authoritative version — self-healing.
 *
 * Why not the WI source: the WI Lottery's Mega Millions export strips
 * the Mega Ball column, breaking our parser. That's why MM moved to NY.
 *
 * Run:  npm run fetch:mm
 * Writes:  data/wi/megamillions.csv
 * Row format (parser skips any row whose first column isn't a date):
 *   DD-MM-YYYY, w1, w2, w3, w4, w5, megaball, [multiplier]
 */

import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

// Socrata API. $limit needs to exceed total row count (~2,500 since
// 2002 — 50k is safe headroom).
const NY_BASE =
  "https://data.ny.gov/resource/5xaw-6ayf.json?$limit=50000&$order=draw_date+DESC";
const MM_LATEST =
  "https://www.megamillions.com/cmspages/utilservice.asmx/GetLatestDrawData";

const UA =
  "DrawData/1.0 (Wisconsin-Pennsylvania-lottery-analytics; +https://draw-data.com)";

type NyRow = {
  draw_date: string; // "2026-05-30T00:00:00.000"
  winning_numbers: string; // "19 24 47 59 65"
  mega_ball: string; // "07"
  multiplier?: string; // "02" — sometimes absent on older rows
};

/** One normalized draw, ready to become a CSV line. */
type Draw = { ddmmyyyy: string; iso: string; whites: string[]; mega: string; mult: string };

const OUT_DIR = join(process.cwd(), "data", "wi");
const OUT_PATH = join(OUT_DIR, "megamillions.csv");
const TITLE = "Mega Millions Winning Numbers (NY Open Data),,,,,,,";
const HEADER = "Draw Date,,,,,,Megaball,Multiplier";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ddmmyyyyFromIso(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}
function isoFromDdmmyyyy(s: string): string {
  const [d, m, y] = s.split("-");
  return `${y}-${m}-${d}`;
}
function pad(s: string): string {
  return s.length === 1 ? "0" + s : s;
}
function lineFor(d: Draw): string {
  return `${d.ddmmyyyy},${d.whites.join(",")},${d.mega},${d.mult}`;
}

// ─── PRIMARY: NY Open Data (full history) ─────────────────────────

/**
 * Fetch the Socrata feed with retry + backoff. data.ny.gov returns
 * transient 5xx (notably 503) and the occasional reset; one hiccup must
 * not take down the nightly refresh. Throws only after all attempts.
 */
async function fetchNy(attempt = 1): Promise<NyRow[]> {
  const MAX = 4;
  try {
    const res = await fetch(NY_BASE, {
      headers: { accept: "application/json", "user-agent": UA },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = (await res.json()) as NyRow[];
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("response was empty or not an array");
    }
    return data;
  } catch (err: any) {
    if (attempt < MAX) {
      const wait = 800 * attempt; // 0.8s, 1.6s, 2.4s
      console.warn(`  NY attempt ${attempt}/${MAX} failed (${err.message}); retrying in ${wait}ms …`);
      await sleep(wait);
      return fetchNy(attempt + 1);
    }
    throw err;
  }
}

function normalizeNy(rows: NyRow[]): { draws: Draw[]; skipped: number } {
  const draws: Draw[] = [];
  let skipped = 0;
  for (const r of rows) {
    const iso = (r.draw_date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) { skipped++; continue; }
    const whites = (r.winning_numbers ?? "")
      .split(/\s+/).map((s) => s.trim()).filter(Boolean).map(pad);
    if (whites.length !== 5) { skipped++; continue; }
    const mega = pad((r.mega_ball ?? "").trim());
    if (!mega) { skipped++; continue; }
    const mult = (r.multiplier ?? "").trim() || "";
    draws.push({ ddmmyyyy: ddmmyyyyFromIso(iso), iso, whites, mega, mult });
  }
  return { draws, skipped };
}

// ─── FALLBACK: megamillions.com (latest draw only) ────────────────

/**
 * Fetch the single latest draw from megamillions.com. The endpoint
 * wraps JSON inside an XML <string> element; we unwrap, parse, and
 * pull the Drawing fields. Returns one Draw or throws. Retry for
 * transient errors, same as NY.
 */
async function fetchLatest(attempt = 1): Promise<Draw> {
  const MAX = 3;
  try {
    const res = await fetch(MM_LATEST, {
      headers: { accept: "application/json, text/xml, */*", "user-agent": UA },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    // Unwrap <string ...>{json}</string>; decode the handful of XML
    // entities ASP.NET may emit inside the text node.
    const m = text.match(/<string[^>]*>([\s\S]*)<\/string>/);
    const inner = (m ? m[1] : text)
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    const data = JSON.parse(inner);
    const dr = data?.Drawing;
    if (!dr || !dr.PlayDate) throw new Error("no Drawing.PlayDate in response");
    const iso = String(dr.PlayDate).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error(`bad PlayDate ${dr.PlayDate}`);
    const whites = [dr.N1, dr.N2, dr.N3, dr.N4, dr.N5].map((n: number) => {
      const v = Number(n);
      if (!Number.isInteger(v) || v < 1 || v > 99) throw new Error(`bad white ball ${n}`);
      return pad(String(v));
    });
    const mb = Number(dr.MBall);
    if (!Number.isInteger(mb) || mb < 1 || mb > 99) throw new Error(`bad MBall ${dr.MBall}`);
    // Megaplier is -1 when not set; multiplier is cosmetic (parser
    // ignores it), so emit it only when it's a real positive value.
    const mp = Number(dr.Megaplier);
    const mult = Number.isInteger(mp) && mp > 0 ? pad(String(mp)) : "";
    return { ddmmyyyy: ddmmyyyyFromIso(iso), iso, whites, mega: pad(String(mb)), mult };
  } catch (err: any) {
    if (attempt < MAX) {
      const wait = 600 * attempt;
      console.warn(`  megamillions.com attempt ${attempt}/${MAX} failed (${err.message}); retrying in ${wait}ms …`);
      await sleep(wait);
      return fetchLatest(attempt + 1);
    }
    throw err;
  }
}

// ─── Existing CSV (for the merge fallback) ────────────────────────

/** Map<DD-MM-YYYY, full CSV line>. Skips title/header/blank rows. */
function readExisting(path: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(path)) return out;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const first = line.split(",")[0].trim();
    if (!/^\d{2}-\d{2}-\d{4}$/.test(first)) continue;
    out.set(first, line);
  }
  return out;
}

function writeCsv(draws: Draw[]): void {
  const sorted = [...draws].sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0));
  const lines = [TITLE, HEADER, ...sorted.map(lineFor)];
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, lines.join("\n") + "\n");
}

// ─── Orchestration ────────────────────────────────────────────────

async function main() {
  console.log("Fetching Mega Millions …");

  // 1. NY primary — full authoritative history.
  let ny: NyRow[] | null = null;
  try {
    ny = await fetchNy();
  } catch (err: any) {
    console.warn(`  NY Open Data unreachable after retries (${err.message}).`);
  }

  if (ny) {
    const { draws, skipped } = normalizeNy(ny);
    writeCsv(draws);
    const last = draws[0]?.ddmmyyyy ?? "—";
    const first = draws[draws.length - 1]?.ddmmyyyy ?? "—";
    console.log(`  NY full history: ${draws.length.toLocaleString()} draws, ${first} → ${last}`);
    if (skipped > 0) console.log(`  ${skipped} malformed rows skipped`);
    console.log(`Wrote ${OUT_PATH}`);
    return;
  }

  // 2. NY down — merge megamillions.com latest into existing history.
  const existing = readExisting(OUT_PATH);
  if (existing.size === 0) {
    console.error(`  NY down and no existing CSV to merge into — cannot bootstrap from the latest-only fallback.`);
    process.exit(1);
  }

  try {
    const latest = await fetchLatest();
    const had = existing.has(latest.ddmmyyyy);
    existing.set(latest.ddmmyyyy, lineFor(latest));
    // Re-sort newest-first and rewrite.
    const lines = Array.from(existing.values())
      .map((l) => ({ iso: isoFromDdmmyyyy(l.split(",")[0]), l }))
      .sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0))
      .map((x) => x.l);
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_PATH, [TITLE, HEADER, ...lines].join("\n") + "\n");
    console.log(
      `  NY down → merged latest draw ${latest.ddmmyyyy} from megamillions.com ` +
        `(${had ? "already present, refreshed" : "NEW"}). ${existing.size.toLocaleString()} total rows preserved.`,
    );
    console.log(`Wrote ${OUT_PATH}`);
    return;
  } catch (err: any) {
    // 3. Both sources down — keep last-known-good, exit 0 so the rest
    // of the refresh still commits. Ingest freshness guard (>7-8 days)
    // is the backstop for a genuinely dead pair of sources.
    console.warn(`  megamillions.com fallback also failed (${err.message}).`);
    console.warn(`  Keeping existing ${OUT_PATH} — Mega Millions left at last-known-good.`);
    return;
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
