/**
 * Fetch Georgia Lottery Cash 3 / Cash 4 draw history.
 *
 * API: https://www.galottery.com/api/v2/draw-games/draws/page
 *   ?game-names=CASH 3|CASH 4&date-from=<ms>&date-to=<ms>
 *    &status=CLOSED&order=desc&page=0&size=2000
 *
 * Same vendor platform as New Jersey — clean JSON, no captcha, deep
 * history (Cash 3 back to the mid-1990s). Each draw:
 *   { gameName, name: "MIDDAY"|"EVENING"|"NIGHT"|"MORNING",
 *     drawTime: <unix ms>, status, results: [{ primary:["5","7","0"],
 *     drawType:"Regular" }] }
 *
 * Notes:
 *   • Georgia runs up to THREE daily draws (Midday/Evening/Night). We keep
 *     the real stream label — the app models multiple named streams.
 *   • Winning digits are results[].primary where drawType === "Regular"
 *     (an array of single-digit strings). Recent draws have no results
 *     until resultsAvailableTime — those are skipped.
 *   • drawTime is a UTC instant; a Night draw (~11 PM ET) lands on the
 *     NEXT UTC day, so we derive the draw date in America/New_York to keep
 *     it on the correct calendar day.
 *   • Full-history backfill, per-year cache, merge-only writer.
 *
 * Output matches the NJ CSV shape so parsePick() reads it unchanged.
 *
 * Run:  npm run fetch:ga  [-- --from 1993] [-- --force]
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "ga");
const OUT_DIR = join(ROOT, "data", "ga");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const BASE = "https://www.galottery.com/api/v2/draw-games/draws/page";

type Endpoint = { game: "pick3" | "pick4"; positions: 3 | 4; apiName: string };
const ENDPOINTS: Endpoint[] = [
  { game: "pick3", positions: 3, apiName: "CASH 3" },
  { game: "pick4", positions: 4, apiName: "CASH 4" },
];

const args = process.argv.slice(2);
function argInt(flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const n = parseInt(args[i + 1] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}
const FORCE = args.includes("--force");
const CURRENT_YEAR = new Date().getUTCFullYear();
const START_YEAR = argInt("--from", 1993);
const END_YEAR = argInt("--to", CURRENT_YEAR);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad2 = (n: number) => String(n).padStart(2, "0");

// Draw date in Georgia local time (America/New_York), as YYYY-MM-DD.
const ET_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function etDate(ms: number): { iso: string; ddmmyyyy: string } {
  const iso = ET_FMT.format(new Date(ms)); // "2026-06-19"
  const [y, m, d] = iso.split("-");
  return { iso, ddmmyyyy: `${d}-${m}-${y}` };
}

const STREAM_LABEL: Record<string, string> = {
  MORNING: "Morning",
  MIDDAY: "Midday",
  EVENING: "Evening",
  NIGHT: "Night",
};

type RawResult = { primary?: string[]; drawType?: string };
type RawDraw = { name?: string; status?: string; drawTime?: number; results?: RawResult[] };
type Row = { iso: string; ddmmyyyy: string; stream: string; digits: number[] };

async function fetchYear(ep: Endpoint, year: number, attempt = 1): Promise<RawDraw[]> {
  const cachePath = join(CACHE_DIR, `${ep.game}-${year}.json`);
  const isCurrentYear = year === CURRENT_YEAR;
  if (!FORCE && !isCurrentYear && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8")) as RawDraw[];
  }
  const from = Date.UTC(year, 0, 1);
  const to = Date.UTC(year + 1, 0, 1) - 1;
  const url =
    `${BASE}?game-names=${encodeURIComponent(ep.apiName)}` +
    `&date-from=${from}&date-to=${to}&status=CLOSED&order=desc&page=0&size=2000`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json, text/plain, */*",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        referer: "https://www.galottery.com/en-us/games/draw-games/cash-3.html",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = (await res.json()) as { draws?: RawDraw[] };
    const draws = data.draws ?? [];
    if (!isCurrentYear) writeFileSync(cachePath, JSON.stringify(draws));
    return draws;
  } catch (err) {
    if (attempt < 3) {
      await sleep(400 * attempt);
      return fetchYear(ep, year, attempt + 1);
    }
    throw err;
  }
}

function parseDraw(d: RawDraw, positions: number): Row | null {
  if (d.status !== "CLOSED" || typeof d.drawTime !== "number") return null;
  const reg = (d.results ?? []).find((r) => r.drawType === "Regular");
  if (!reg || !Array.isArray(reg.primary) || reg.primary.length === 0) return null;
  // primary is an array of single-digit strings, e.g. ["5","7","0"].
  const digits = reg.primary.join("").split("").map((c) => parseInt(c, 10));
  if (digits.length !== positions || digits.some((x) => Number.isNaN(x))) return null;
  const stream = STREAM_LABEL[(d.name ?? "").toUpperCase()] ?? "Evening";
  const { iso, ddmmyyyy } = etDate(d.drawTime);
  return { iso, ddmmyyyy, stream, digits };
}

function readExisting(game: "pick3" | "pick4", positions: 3 | 4): Map<string, Row> {
  const path = join(OUT_DIR, `${game}.csv`);
  const out = new Map<string, Row>();
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const cols = line.split(",");
    const m = (cols[0] ?? "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) continue;
    const [, dd, mo, yyyy] = m;
    const stream = cols[1]?.trim() || "Evening";
    const digits = cols.slice(2, 2 + positions).map((c) => parseInt(c, 10));
    if (digits.length !== positions || digits.some((x) => Number.isNaN(x))) continue;
    out.set(`${yyyy}-${mo}-${dd}|${stream}`, { iso: `${yyyy}-${mo}-${dd}`, ddmmyyyy: `${dd}-${mo}-${yyyy}`, stream, digits });
  }
  return out;
}

function csvFor(rows: Row[], positions: 3 | 4): string {
  const cols = positions === 3 ? ",,,," : ",,,,,";
  const lines = [`Georgia Lottery - Cash ${positions} Winning Numbers${cols}`, `Draw Date${cols}`];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  console.log(`Fetching GA Cash 3 / Cash 4 history (${START_YEAR}…${END_YEAR})${FORCE ? " [FORCE]" : ""}`);
  console.log(`Cache: ${CACHE_DIR}`);
  for (const ep of ENDPOINTS) {
    const merged = readExisting(ep.game, ep.positions);
    const existingCount = merged.size;
    let fetched = 0;
    process.stdout.write(`  ${ep.game.padEnd(6)} `);
    for (let year = END_YEAR; year >= START_YEAR; year--) {
      let draws: RawDraw[];
      try {
        draws = await fetchYear(ep, year);
      } catch {
        process.stdout.write("x");
        continue;
      }
      let added = 0;
      for (const d of draws) {
        const row = parseDraw(d, ep.positions);
        if (!row) continue;
        merged.set(`${row.iso}|${row.stream}`, row); // upsert; never removes
        added++;
      }
      fetched += added;
      process.stdout.write(draws.length ? "." : "·");
      if (!FORCE && !existsSync(join(CACHE_DIR, `${ep.game}-${year}.json`))) await sleep(120);
    }
    const rows = [...merged.values()].sort((a, b) => (a.iso !== b.iso ? (a.iso < b.iso ? 1 : -1) : 0));
    if (rows.length === 0) throw new Error(`${ep.game}: no draws — refusing to write empty CSV`);
    writeFileSync(join(OUT_DIR, `${ep.game}.csv`), csvFor(rows, ep.positions));
    const added = merged.size - existingCount;
    process.stdout.write(
      `  ${merged.size.toLocaleString().padStart(7)} draws (+${added.toLocaleString()} new, ${fetched.toLocaleString()} seen)\n`,
    );
    console.log(`         ${rows[rows.length - 1]?.iso} → ${rows[0]?.iso}`);
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
