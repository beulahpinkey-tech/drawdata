/**
 * Fetch Pennsylvania Lottery Pick 3 / Pick 4 draw history.
 *
 * The PA Lottery exposes a public JSON endpoint that returns one calendar
 * year's worth of draws for a given game id:
 *
 *   https://www.palottery.pa.gov/Custom/uploadedfiles/winning-numbers-history/
 *     PastWinningNumbers.ashx?g={id}&y={year}
 *
 * Game ids we care about:
 *   g=32  Pick 3 Day     (Midday)
 *   g=28  Pick 3 Evening
 *   g=33  Pick 4 Day     (Midday)
 *   g=29  Pick 4 Evening
 *
 * Date field is .NET serialized:  "/Date(1779940800000)/"  (unix ms)
 * Number fields are drawingNumber1..N. PA also draws a "Wild Ball" stored
 * in drawingNumber4 (Pick 3) / drawingNumber5 (Pick 4) — we ignore it; our
 * analytics only model the main draw.
 *
 * Run:  npm run fetch:pa  [-- --from 2024]   # default 1977..currentYear
 *
 * Caches each year's response under .cache/pa/<g>-<y>.json so re-runs are
 * instant and we don't hammer the PA endpoint. Delete the cache to refetch.
 */

import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "pa");
const OUT_DIR = join(ROOT, "data", "pa");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const BASE =
  "https://www.palottery.pa.gov/Custom/uploadedfiles/winning-numbers-history/PastWinningNumbers.ashx";

type Endpoint = {
  game: "pick3" | "pick4";
  stream: "Midday" | "Evening";
  g: number;
  positions: 3 | 4;
};

const ENDPOINTS: Endpoint[] = [
  { game: "pick3", stream: "Midday",  g: 32, positions: 3 },
  { game: "pick3", stream: "Evening", g: 28, positions: 3 },
  { game: "pick4", stream: "Midday",  g: 33, positions: 4 },
  { game: "pick4", stream: "Evening", g: 29, positions: 4 },
];

const DEFAULT_START = 1977;
const args = process.argv.slice(2);
function argInt(flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const n = parseInt(args[i + 1] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}
const START_YEAR = argInt("--from", DEFAULT_START);
const END_YEAR = argInt("--to", new Date().getUTCFullYear());
const FORCE = args.includes("--force"); // re-fetch even if cached

type RawDraw = {
  drawingGameID: number;
  drawingNumberDate: string;
  drawingNumber1: number | null;
  drawingNumber2: number | null;
  drawingNumber3: number | null;
  drawingNumber4: number | null;
  drawingNumber5: number | null;
};

function parseDotNetDate(s: string): { iso: string; ddmmyyyy: string } {
  const m = s.match(/\/Date\((-?\d+)\)\//);
  if (!m) throw new Error(`bad date: ${s}`);
  const d = new Date(parseInt(m[1], 10));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return { iso: `${yyyy}-${mm}-${dd}`, ddmmyyyy: `${dd}-${mm}-${yyyy}` };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchYear(ep: Endpoint, year: number, attempt = 1): Promise<RawDraw[]> {
  const cachePath = join(CACHE_DIR, `${ep.g}-${year}.json`);
  if (!FORCE && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8"));
  }
  const url = `${BASE}?g=${ep.g}&y=${year}`;
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "DrawData/1.0 (Wisconsin-Pennsylvania-lottery-analytics; +https://drawdata.pages.dev)",
        accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("response is not a JSON array");
    writeFileSync(cachePath, JSON.stringify(data));
    return data;
  } catch (err: any) {
    if (attempt < 3) {
      await sleep(400 * attempt);
      return fetchYear(ep, year, attempt + 1);
    }
    throw err;
  }
}

type Row = { iso: string; ddmmyyyy: string; stream: "Midday" | "Evening"; digits: number[] };

function csvFor(rows: Row[], positions: 3 | 4): string {
  // Match WI file format: title row, header row, then data DD-MM-YYYY,Stream,d1..
  const cols = positions === 3 ? ",,,," : ",,,,,";
  const lines = [
    `Pennsylvania Lottery - Pick ${positions} Winning Numbers${cols}`,
    `Draw Date${cols}`,
  ];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  console.log(
    `Fetching PA Pick 3 / Pick 4 history (${START_YEAR}…${END_YEAR})${FORCE ? " [FORCE refetch]" : ""}`,
  );
  console.log(`Cache: ${CACHE_DIR}`);
  const buckets: Record<"pick3" | "pick4", Row[]> = { pick3: [], pick4: [] };
  const stats: Record<string, number> = {};

  for (const ep of ENDPOINTS) {
    const key = `${ep.game} ${ep.stream}`;
    stats[key] = 0;
    process.stdout.write(`  ${key.padEnd(16)} `);
    let yearCount = 0;
    for (let year = END_YEAR; year >= START_YEAR; year--) {
      let draws: RawDraw[] = [];
      try {
        draws = await fetchYear(ep, year);
      } catch (err: any) {
        process.stdout.write("x");
        continue;
      }
      let added = 0;
      for (const d of draws) {
        const digits: number[] = [];
        let ok = true;
        for (let i = 1; i <= ep.positions; i++) {
          const v = (d as any)[`drawingNumber${i}`];
          if (typeof v !== "number" || v < 0 || v > 9) {
            ok = false;
            break;
          }
          digits.push(v);
        }
        if (!ok) continue;
        const { iso, ddmmyyyy } = parseDotNetDate(d.drawingNumberDate);
        buckets[ep.game].push({ iso, ddmmyyyy, stream: ep.stream, digits });
        added++;
      }
      stats[key] += added;
      yearCount++;
      process.stdout.write(".");
      // be polite to a public endpoint on first run; cached re-runs skip the fetch entirely
      if (!FORCE && !existsSync(join(CACHE_DIR, `${ep.g}-${year}.json`))) {
        await sleep(150);
      }
    }
    process.stdout.write(`  ${stats[key].toLocaleString().padStart(7)} draws over ${yearCount} years\n`);
  }

  // Newest first, evening before midday for same date.
  const sortFn = (a: Row, b: Row) => {
    if (a.iso !== b.iso) return a.iso < b.iso ? 1 : -1;
    return a.stream === "Evening" && b.stream === "Midday" ? -1 : 1;
  };
  buckets.pick3.sort(sortFn);
  buckets.pick4.sort(sortFn);

  writeFileSync(join(OUT_DIR, "pick3.csv"), csvFor(buckets.pick3, 3));
  writeFileSync(join(OUT_DIR, "pick4.csv"), csvFor(buckets.pick4, 4));

  const first3 = buckets.pick3[buckets.pick3.length - 1]?.iso ?? "—";
  const last3 = buckets.pick3[0]?.iso ?? "—";
  const first4 = buckets.pick4[buckets.pick4.length - 1]?.iso ?? "—";
  const last4 = buckets.pick4[0]?.iso ?? "—";

  console.log(`\nWrote ${OUT_DIR}/pick3.csv  (${buckets.pick3.length.toLocaleString()} draws, ${first3} → ${last3})`);
  console.log(`Wrote ${OUT_DIR}/pick4.csv  (${buckets.pick4.length.toLocaleString()} draws, ${first4} → ${last4})`);
  console.log(`\nDone. Re-run any time; cached years won't be re-fetched.`);
  console.log(`To force a refresh: npm run fetch:pa -- --force`);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
