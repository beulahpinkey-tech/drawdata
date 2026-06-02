/**
 * Fetch New Jersey Lottery Pick 3 / Pick 4 draw history.
 *
 * API:  https://www.njlottery.com/api/v1/draw-games/draws/page
 * Params: game-names=Pick 3 | Pick 4, date-from + date-to (unix ms),
 *         status=CLOSED, page=0, size=2000
 *
 * The endpoint returns 403 without browser-like headers (referer +
 * realistic UA) but is otherwise wide open and returns rich JSON.
 *
 * Each draw payload has:
 *   gameName, name ("MIDDAY"|"EVENING"), drawTime (unix ms UTC),
 *   results[]: { drawType: "Regular"|"FIREBALL", primary: ["457"] }
 *
 * We keep the Regular result only; FIREBALL is NJ's bonus add-on, not
 * a separate draw. The "primary" field is a string of digits ("457");
 * we split it into [4, 5, 7].
 *
 * Run:  npm run fetch:nj  [-- --from 1980] [-- --force]
 */

import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "nj");
const OUT_DIR = join(ROOT, "data", "nj");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const BASE = "https://www.njlottery.com/api/v1/draw-games/draws/page";

type Endpoint = {
  game: "pick3" | "pick4";
  positions: 3 | 4;
  apiName: string;
};

const ENDPOINTS: Endpoint[] = [
  { game: "pick3", positions: 3, apiName: "Pick 3" },
  { game: "pick4", positions: 4, apiName: "Pick 4" },
];

const DEFAULT_START = 1980;
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

type DrawResult = {
  drawType?: string;
  primary?: string[];
};
type RawDraw = {
  gameName?: string;
  name?: string;
  status?: string;
  drawTime?: number;
  results?: DrawResult[];
};
type ApiResponse = {
  draws?: RawDraw[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function isoToDdmmyyyy(ms: number): { iso: string; ddmmyyyy: string } {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return { iso: `${yyyy}-${mm}-${dd}`, ddmmyyyy: `${dd}-${mm}-${yyyy}` };
}

async function fetchYear(
  ep: Endpoint,
  year: number,
  attempt = 1,
): Promise<RawDraw[]> {
  const cachePath = join(CACHE_DIR, `${ep.game}-${year}.json`);
  const isCurrentYear = year === CURRENT_YEAR;
  if (!FORCE && !isCurrentYear && existsSync(cachePath)) {
    return (JSON.parse(readFileSync(cachePath, "utf8")) as ApiResponse).draws ?? [];
  }
  const dateFrom = Date.UTC(year, 0, 1);
  const dateTo = Date.UTC(year + 1, 0, 1);
  const url =
    `${BASE}?game-names=${encodeURIComponent(ep.apiName)}` +
    `&date-from=${dateFrom}&date-to=${dateTo}` +
    `&status=CLOSED&page=0&size=2000`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json, text/plain, */*",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        referer: "https://www.njlottery.com/en-us/winningnumbers.html",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = (await res.json()) as ApiResponse;
    if (!isCurrentYear) writeFileSync(cachePath, JSON.stringify(data));
    return data.draws ?? [];
  } catch (err: any) {
    if (attempt < 3) {
      await sleep(400 * attempt);
      return fetchYear(ep, year, attempt + 1);
    }
    throw err;
  }
}

type Row = {
  iso: string;
  ddmmyyyy: string;
  stream: "Midday" | "Evening";
  digits: number[];
};

function parseDraw(d: RawDraw, positions: number): Row | null {
  if (d.status !== "CLOSED") return null;
  if (typeof d.drawTime !== "number") return null;
  const regular = (d.results ?? []).find((r) => r.drawType === "Regular");
  if (!regular || !Array.isArray(regular.primary) || !regular.primary[0]) return null;
  const raw = regular.primary[0];
  // primary is a digit string like "457" for Pick 3, "0257" for Pick 4
  if (!/^\d+$/.test(raw)) return null;
  if (raw.length !== positions) return null;
  const digits = raw.split("").map((c) => parseInt(c, 10));
  const { iso, ddmmyyyy } = isoToDdmmyyyy(d.drawTime);
  const upper = (d.name ?? "").toUpperCase();
  const stream: "Midday" | "Evening" =
    upper === "EVENING" ? "Evening" : upper === "MIDDAY" ? "Midday" : "Evening";
  return { iso, ddmmyyyy, stream, digits };
}

function csvFor(rows: Row[], positions: 3 | 4): string {
  const cols = positions === 3 ? ",,,," : ",,,,,";
  const lines = [
    `New Jersey Lottery - Pick ${positions} Winning Numbers${cols}`,
    `Draw Date${cols}`,
  ];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  console.log(`Fetching NJ Pick 3 / Pick 4 history (${START_YEAR}…${END_YEAR})${FORCE ? " [FORCE]" : ""}`);
  console.log(`Cache: ${CACHE_DIR}`);
  const buckets: Record<"pick3" | "pick4", Row[]> = { pick3: [], pick4: [] };
  for (const ep of ENDPOINTS) {
    let count = 0;
    process.stdout.write(`  ${ep.game.padEnd(6)} `);
    for (let year = END_YEAR; year >= START_YEAR; year--) {
      let draws: RawDraw[] = [];
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
        buckets[ep.game].push(row);
        added++;
      }
      count += added;
      process.stdout.write(".");
      // Be polite on first-time runs against the live endpoint
      if (!FORCE && !existsSync(join(CACHE_DIR, `${ep.game}-${year}.json`))) {
        await sleep(150);
      }
    }
    process.stdout.write(`  ${count.toLocaleString().padStart(7)} draws\n`);
  }

  const sortFn = (a: Row, b: Row) => {
    if (a.iso !== b.iso) return a.iso < b.iso ? 1 : -1; // newest first
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
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
