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
const FORCE_SHRINK = args.includes("--force-shrink"); // allow merge to shrink (clean rebuild)

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

// Past years' data is immutable — once 2014's draws are recorded they
// never change, so caching saves us 49 HTTP calls per run. The CURRENT
// year is the opposite: new draws appear in it daily, so we must never
// serve it from cache or we'll silently freeze at whatever was in there
// when the cache was first populated. (This was a real bug — the live
// site stuck at May 29 because the May-30 cron read May-28 data from
// the cache and exited.)
const CURRENT_YEAR = new Date().getUTCFullYear();

async function fetchYear(ep: Endpoint, year: number, attempt = 1): Promise<RawDraw[]> {
  const cachePath = join(CACHE_DIR, `${ep.g}-${year}.json`);
  const isCurrentYear = year === CURRENT_YEAR;
  if (!FORCE && !isCurrentYear && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8"));
  }
  const url = `${BASE}?g=${ep.g}&y=${year}`;
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
    // Only cache immutable past years; never persist the current-year
    // file or the next run will read it back instead of hitting the API.
    if (!isCurrentYear) writeFileSync(cachePath, JSON.stringify(data));
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

/**
 * Parse the already-committed CSV back into Row[]. Tolerant: skips
 * title/header/blank lines (anything not leading with DD-MM-YYYY).
 * Returns [] if absent/unreadable. This is the basis of the
 * merge-not-shrink guard below.
 */
function loadExisting(path: string, positions: 3 | 4): Row[] {
  if (!existsSync(path)) return [];
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const out: Row[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line) continue;
    const cols = line.split(",");
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(cols[0].trim());
    if (!m) continue;
    const streamRaw = (cols[1] ?? "").trim();
    const stream: Row["stream"] = streamRaw === "Evening" ? "Evening" : "Midday";
    const digits: number[] = [];
    let ok = true;
    for (let i = 0; i < positions; i++) {
      const v = parseInt((cols[2 + i] ?? "").trim(), 10);
      if (!Number.isFinite(v) || v < 0 || v > 9) { ok = false; break; }
      digits.push(v);
    }
    if (!ok) continue;
    out.push({
      iso: `${m[3]}-${m[2]}-${m[1]}`,
      ddmmyyyy: `${m[1]}-${m[2]}-${m[3]}`,
      stream,
      digits,
    });
  }
  return out;
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

  // MERGE, NEVER SHRINK. PA's PastWinningNumbers.ashx is intermittent —
  // it returns HTTP 500 for stretches (the whole of 2026 at times). The
  // old code OVERWROTE the CSV with whatever it managed to fetch, so a
  // run that only got cached ≤2025 years would silently regress the
  // committed file from (e.g.) 2026-06-12 back to 2025-12-31 — the same
  // history-destroying bug we already fixed for Wisconsin. Now we seed
  // from the committed CSV and union the fetched rows on top by
  // (date, stream) key, and refuse to write a file with fewer unique
  // rows than we started with. Pass --force-shrink to override for an
  // intentional clean rebuild.
  for (const game of ["pick3", "pick4"] as const) {
    const positions = game === "pick3" ? 3 : 4;
    const outPath = join(OUT_DIR, `${game}.csv`);
    const existing = loadExisting(outPath, positions);

    const seen = new Set<string>();
    const merged: Row[] = [];
    for (const r of existing) {
      const k = `${r.iso}|${r.stream}`;
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(r);
    }
    const existingUnique = merged.length;
    let added = 0;
    for (const r of buckets[game]) {
      const k = `${r.iso}|${r.stream}`;
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(r);
      added++;
    }
    merged.sort(sortFn);

    if (!FORCE_SHRINK && merged.length < existingUnique) {
      console.warn(
        `  ${game}: merge would SHRINK (${existingUnique} → ${merged.length}); ` +
          `PA endpoint likely down this run. REFUSING to write — keeping committed CSV. ` +
          `(--force-shrink to override.)`,
      );
      continue;
    }
    writeFileSync(outPath, csvFor(merged, positions));
    const last = merged[0]?.iso ?? "—";
    const first = merged[merged.length - 1]?.iso ?? "—";
    console.log(
      `Wrote ${outPath}  (${merged.length.toLocaleString()} draws, ${first} → ${last}; ` +
        `${added.toLocaleString()} new, ${existingUnique.toLocaleString()} preserved)`,
    );
  }

  console.log(`\nDone. Re-run any time; cached years won't be re-fetched.`);
  console.log(`To force a refresh: npm run fetch:pa -- --force`);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
