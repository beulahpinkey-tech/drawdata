/**
 * Fetch Powerball draw history from the same Pennsylvania Lottery JSON
 * endpoint we use for PA Pick 3/4. Game id = 12 selects Powerball.
 *
 * Powerball is a national multi-state game; the draws are identical no
 * matter which state you query, so PA's endpoint gives authoritative
 * national history. Data goes back to Powerball's launch on 1992-04-22
 * (and is tagged with its matrix era at parse time — 5/45 → 5/49 →
 * 5/53 → 5/55 → 5/59 → 5/69 — by lib/ingest/eras.ts).
 *
 * Response shape per draw:
 *   {
 *     drawingGameID: 12,
 *     drawingNumberDate: "/Date(1779940800000)/",
 *     drawingNumber1..5: white balls (1-69 current era),
 *     drawingNumber6: Powerball (1-26 current era),
 *     drawingNumber7: Power Play multiplier ("2x", "3x", etc.),
 *     drawingNumberPayoutData: XML blob (ignored),
 *   }
 *
 * Output CSV format (matches what data/wi/powerball.csv has used
 * historically so lib/ingest/parsers.ts handles it unchanged):
 *
 *   Wisconsin Lottery - Powerball Winning Numbers - Numerical Order
 *   "Draw Date",,,,,,PB,"Power Play","Est. Jackpot"
 *   DD-MM-YYYY,w1,w2,w3,w4,w5,pb,multiplier,
 *
 * Run:  npm run fetch:powerball  [-- --from 1992] [-- --force]
 */

import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "powerball");
const OUT_DIR = join(ROOT, "data", "wi");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const BASE =
  "https://www.palottery.pa.gov/Custom/uploadedfiles/winning-numbers-history/PastWinningNumbers.ashx";

const POWERBALL_GAME_ID = 12;
const DEFAULT_START = 1992; // Powerball launched 1992-04-22
const args = process.argv.slice(2);
function argInt(flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const n = parseInt(args[i + 1] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}
const START_YEAR = argInt("--from", DEFAULT_START);
const END_YEAR = argInt("--to", new Date().getUTCFullYear());
const FORCE = args.includes("--force");
const CURRENT_YEAR = new Date().getUTCFullYear();

type RawDraw = {
  drawingGameID: number;
  drawingNumberDate: string;
  drawingNumber1: number | null;
  drawingNumber2: number | null;
  drawingNumber3: number | null;
  drawingNumber4: number | null;
  drawingNumber5: number | null;
  drawingNumber6: number | string | null; // PB
  drawingNumber7: number | string | null; // Power Play (e.g. "2x")
};

function parseDotNetDate(s: string): { iso: string; ddmmyyyy: string } | null {
  const m = s.match(/\/Date\((-?\d+)\)\//);
  if (!m) return null;
  const d = new Date(parseInt(m[1], 10));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return { iso: `${yyyy}-${mm}-${dd}`, ddmmyyyy: `${dd}-${mm}-${yyyy}` };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchYear(year: number, attempt = 1): Promise<RawDraw[]> {
  const cachePath = join(CACHE_DIR, `${POWERBALL_GAME_ID}-${year}.json`);
  const isCurrentYear = year === CURRENT_YEAR;
  // Same lesson as fetch-pa.ts — past years are immutable, current year
  // changes every few days, so never cache the current year.
  if (!FORCE && !isCurrentYear && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8"));
  }
  const url = `${BASE}?g=${POWERBALL_GAME_ID}&y=${year}`;
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "DrawData/1.0 (Wisconsin-Pennsylvania-lottery-analytics; +https://draw-data.com)",
        accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("response is not a JSON array");
    if (!isCurrentYear) writeFileSync(cachePath, JSON.stringify(data));
    return data;
  } catch (err: any) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return fetchYear(year, attempt + 1);
    }
    throw err;
  }
}

type Row = {
  iso: string;
  ddmmyyyy: string;
  whites: number[];
  pb: number;
};

function parseInt1to99(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  if (n < 1 || n > 99) return null;
  return n;
}

/**
 * Read existing powerball.csv (if any) so we preserve rows the API
 * doesn't have. PA's endpoint with g=12 only goes back to 2002 (when PA
 * started selling Powerball) — but the historical record goes back to
 * 1992. Without merging, we'd silently lose 10 years of pre-PA history
 * every time the bot runs.
 *
 * Returns a Map<DD-MM-YYYY, raw CSV line>. Skips title / header / blank
 * rows automatically (anything whose first column isn't a date).
 */
function readExisting(path: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(path)) return out;
  const text = readFileSync(path, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const first = line.split(",")[0].trim();
    // DD-MM-YYYY or YYYY-MM-DD
    if (!/^\d{1,2}-\d{1,2}-\d{4}$|^\d{4}-\d{1,2}-\d{1,2}$/.test(first)) continue;
    // Normalize to DD-MM-YYYY for the merge key
    let key: string;
    if (/^\d{4}-/.test(first)) {
      const [y, m, d] = first.split("-");
      key = `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
    } else {
      const [d, m, y] = first.split("-");
      key = `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
    }
    // Re-emit in canonical DD-MM-YYYY shape so the merged file is uniform
    const rest = line.substring(line.indexOf(",") + 1);
    out.set(key, `${key},${rest}`);
  }
  return out;
}

function isoFromDdmmyyyy(s: string): string {
  const [d, m, y] = s.split("-");
  return `${y}-${m}-${d}`;
}

function csvFor(lines: string[]): string {
  const out = [
    "Wisconsin Lottery - Powerball Winning Numbers - Order Drawn,,,,,,",
    ...lines,
  ];
  return out.join("\n") + "\n";
}

async function main() {
  console.log(`Fetching Powerball history (${START_YEAR}…${END_YEAR})${FORCE ? " [FORCE]" : ""}`);
  console.log(`Cache: ${CACHE_DIR}`);
  const rows: Row[] = [];
  let yearCount = 0;

  process.stdout.write(`  powerball  `);
  for (let year = END_YEAR; year >= START_YEAR; year--) {
    let draws: RawDraw[] = [];
    try {
      draws = await fetchYear(year);
    } catch {
      process.stdout.write("x");
      continue;
    }
    let added = 0;
    for (const d of draws) {
      const date = parseDotNetDate(d.drawingNumberDate);
      if (!date) continue;
      const w1 = parseInt1to99(d.drawingNumber1);
      const w2 = parseInt1to99(d.drawingNumber2);
      const w3 = parseInt1to99(d.drawingNumber3);
      const w4 = parseInt1to99(d.drawingNumber4);
      const w5 = parseInt1to99(d.drawingNumber5);
      const pb = parseInt1to99(d.drawingNumber6);
      if (!w1 || !w2 || !w3 || !w4 || !w5 || !pb) continue;
      // Keep "Order Drawn" — don't sort the whites. The downstream
      // parser sorts internally for analytics; the CSV preserves the
      // raw draw sequence to match the existing file convention.
      rows.push({
        iso: date.iso,
        ddmmyyyy: date.ddmmyyyy,
        whites: [w1, w2, w3, w4, w5],
        pb,
      });
      added++;
    }
    if (added > 0) {
      process.stdout.write(".");
      yearCount++;
    } else {
      process.stdout.write("·");
    }
    if (
      !FORCE &&
      !existsSync(join(CACHE_DIR, `${POWERBALL_GAME_ID}-${year}.json`))
    ) {
      await sleep(150);
    }
  }
  process.stdout.write(`  ${rows.length.toLocaleString().padStart(7)} draws over ${yearCount} years\n`);

  // Merge with existing file so pre-2002 draws (PA didn't sell PB until
  // 2002) aren't silently dropped. Fetched data wins for any date the
  // API covers; existing rows preserve everything older.
  const outPath = join(OUT_DIR, "powerball.csv");
  const existing = readExisting(outPath);
  const merged = new Map<string, string>(existing);
  for (const r of rows) {
    merged.set(r.ddmmyyyy, `${r.ddmmyyyy},${r.whites.join(",")},${r.pb}`);
  }

  // Newest first by ISO date.
  const lines = Array.from(merged.entries())
    .map(([key, line]) => ({ iso: isoFromDdmmyyyy(key), line }))
    .sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0))
    .map((x) => x.line);

  writeFileSync(outPath, csvFor(lines));
  const fetchedCount = rows.length;
  const preservedCount = merged.size - rows.length;
  const first = lines[lines.length - 1]?.split(",")[0] ?? "—";
  const last = lines[0]?.split(",")[0] ?? "—";
  console.log(
    `\nWrote ${outPath}  (${merged.size.toLocaleString()} total — ` +
      `${fetchedCount.toLocaleString()} from API, ${Math.max(0, preservedCount).toLocaleString()} preserved from existing CSV, ` +
      `${last} → ${first})`,
  );
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
