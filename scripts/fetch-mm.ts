/**
 * Auto-fetch Mega Millions full draw history from NY State Open Data.
 *
 * Source:
 *   https://data.ny.gov/Government-Finance/Lottery-Mega-Millions-Winning-Numbers-Beginning-20/5xaw-6ayf
 *
 * This dataset is the official NY Lottery feed, hosted on Socrata. Each
 * Mega Millions draw is the same nationwide (it's a multi-state game),
 * so this single endpoint gives us authoritative full history from 2002
 * through whatever was drawn yesterday. Updated within ~24 hours.
 *
 * Why this exists: the WI Lottery's "Numerical Order" Mega Millions
 * export strips the Mega Ball column, breaking our parser. Asking a
 * human to remember which of two near-identical CSV exports to grab
 * has failed multiple times. This script removes the human entirely.
 *
 * Run:  npm run fetch:mm
 *
 * Writes:  data/wi/megamillions.csv  (overwrites any existing file)
 *
 * Output format matches what scripts/precompute.ts expects:
 *   DD-MM-YYYY, w1, w2, w3, w4, w5, megaball, [multiplier]
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Socrata API. $limit needs to be larger than the total row count
// (~2,500 draws since 2002 — bumping to 50k is safe headroom).
const BASE =
  "https://data.ny.gov/resource/5xaw-6ayf.json?$limit=50000&$order=draw_date+DESC";

type NyRow = {
  draw_date: string; // "2026-05-30T00:00:00.000"
  winning_numbers: string; // "19 24 47 59 65" (5 numbers, space-separated)
  mega_ball: string; // "07"
  multiplier?: string; // "02" — sometimes absent on older rows
};

const OUT_DIR = join(process.cwd(), "data", "wi");
const OUT_PATH = join(OUT_DIR, "megamillions.csv");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}

function pad(s: string): string {
  return s.length === 1 ? "0" + s : s;
}

/**
 * Fetch the Socrata feed with retry + backoff. data.ny.gov returns
 * transient 5xx (notably 503) and the occasional connection reset; a
 * single hiccup must not take down the whole nightly refresh. Mirrors
 * the resilience already in fetch-pa.ts / fetch-tx.ts. Throws only
 * after all attempts are exhausted; the caller decides whether to
 * hard-fail or fall back to the existing CSV.
 */
async function fetchRows(attempt = 1): Promise<NyRow[]> {
  const MAX = 4;
  try {
    const res = await fetch(BASE, {
      headers: {
        accept: "application/json",
        "user-agent":
          "DrawData/1.0 (Wisconsin-Pennsylvania-lottery-analytics; +https://draw-data.com)",
      },
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
      console.warn(`  attempt ${attempt}/${MAX} failed (${err.message}); retrying in ${wait}ms …`);
      await sleep(wait);
      return fetchRows(attempt + 1);
    }
    throw err;
  }
}

async function main() {
  console.log("Fetching Mega Millions history from NY Open Data …");

  let rows: NyRow[];
  try {
    rows = await fetchRows();
  } catch (err: any) {
    // All retries exhausted. Mega Millions is a national game refreshed
    // within ~24h, so a single missed cycle is harmless — keep yesterday's
    // CSV and exit 0 so the rest of the refresh (PA/NJ/WI/TX/NC/PB) still
    // commits. The ingest freshness guard will fail loudly if MM goes
    // genuinely stale (>7-8 days), so a dead source still surfaces — it
    // just doesn't abort a run where everything else succeeded.
    if (existsSync(OUT_PATH)) {
      console.warn(`  NY Open Data unreachable after retries (${err.message}).`);
      console.warn(`  Keeping existing ${OUT_PATH} — Mega Millions left at last-known-good.`);
      console.warn(`  (Ingest's freshness guard will catch it if this persists past ~7 days.)`);
      return;
    }
    // No existing data at all — nothing to fall back to. Hard-fail.
    console.error(`  NY Open Data unreachable after retries and no existing CSV to fall back to.`);
    console.error(`  ${err.message}`);
    process.exit(1);
  }

  console.log(`  fetched ${rows.length.toLocaleString()} draws`);

  // Convert to our canonical CSV format. Title + header rows up top so
  // the parser auto-skips them (it skips any row whose first column
  // isn't a date).
  const lines = [
    "Mega Millions Winning Numbers (NY Open Data),,,,,,,",
    "Draw Date,,,,,,Megaball,Multiplier",
  ];

  let skipped = 0;
  for (const r of rows) {
    const dateIso = (r.draw_date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      skipped++;
      continue;
    }
    const whites = (r.winning_numbers ?? "")
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(pad);
    if (whites.length !== 5) {
      skipped++;
      continue;
    }
    const mega = pad((r.mega_ball ?? "").trim());
    if (!mega) {
      skipped++;
      continue;
    }
    const mult = (r.multiplier ?? "").trim() || "";
    lines.push(`${ddmmyyyy(dateIso)},${whites.join(",")},${mega},${mult}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, lines.join("\n") + "\n");

  const first = lines[2]?.split(",")[0] ?? "—";
  const last = lines[lines.length - 1]?.split(",")[0] ?? "—";
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  ${(lines.length - 2).toLocaleString()} draws, range ${last} → ${first}`);
  if (skipped > 0) console.log(`  ${skipped} malformed rows skipped`);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
