/**
 * Fetch Florida Lottery PICK 3 / PICK 4 draw history.
 *
 * API:  https://apim-website-prod-eastus.azure-api.net/drawgamesapp/searchgames
 * Params: id=<gameId>, startDate + endDate as DD-MON-YYYY (e.g. 01-JAN-2020)
 * Auth:   a single header `x-partner: web`. There is NO subscription key —
 *         the Azure APIM gateway only checks for the partner header, which
 *         the public floridalottery.com site sends to every visitor. The
 *         header is overridable via FL_PARTNER for resilience if Florida
 *         ever renames it, but no secret is required.
 *
 * Game ids (discovered by probing the endpoint):
 *   104 = PICK 3   (DrawNumbers: wn1, wn2, wn3, fb)
 *   108 = PICK 4   (DrawNumbers: wn1..wn4, fb)
 * `fb` is the Fireball add-on (a bonus multiplier digit), not a draw
 * number — we drop it, matching how NJ's FIREBALL is dropped.
 *
 * Florida draws Midday + Evening daily; both streams come back tagged in
 * DrawType. Output matches the NJ CSV shape (DD-MM-YYYY,Stream,d…) so the
 * existing parsePick() reads it unchanged.
 *
 * History depth: the API only exposes a ROLLING ~2-year window (older
 * ranges return HTTP 400 "endDate cannot be before 2 years"). So we can't
 * backfill 10 years from it. Instead the writer is MERGE-ONLY: each run
 * unions the fresh ~2-year window with the existing committed CSV and
 * never shrinks it. History therefore accumulates forward — today's draws
 * are captured now and kept even after they age out of the API window
 * (same grow-only strategy as the Wisconsin fetcher).
 *
 * Run:  npm run fetch:fl  [-- --years 2] [-- --force]
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "fl");
const OUT_DIR = join(ROOT, "data", "fl");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const BASE = "https://apim-website-prod-eastus.azure-api.net/drawgamesapp/searchgames";
const PARTNER = process.env.FL_PARTNER || "web";

type Endpoint = { game: "pick3" | "pick4"; positions: 3 | 4; id: number };
const ENDPOINTS: Endpoint[] = [
  { game: "pick3", positions: 3, id: 104 },
  { game: "pick4", positions: 4, id: 108 },
];

// The API only serves a rolling ~2-year window; older requests 400. We
// still loop a couple extra years for the boundary year's partial data,
// but the durable history comes from merging into the committed CSV.
const DEFAULT_YEARS_BACK = 3;
const args = process.argv.slice(2);
function argInt(flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const n = parseInt(args[i + 1] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}
const FORCE = args.includes("--force");
const CURRENT_YEAR = new Date().getUTCFullYear();
const YEARS_BACK = argInt("--years", DEFAULT_YEARS_BACK);
const START_YEAR = CURRENT_YEAR - YEARS_BACK + 1;

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad2 = (n: number) => (n < 10 ? "0" + n : String(n));
/** Date for the API: DD-MON-YYYY, e.g. 01-JAN-2020. */
const apiDate = (y: number, m: number, d: number) => `${pad2(d)}-${MONTHS[m - 1]}-${y}`;

type RawNum = { NumberPick: number; NumberType: string };
type RawDraw = {
  Id?: number;
  GameName?: string;
  DrawDate?: string; // "MM/DD/YYYY 12:00:00 AM"
  DrawType?: string; // "MIDDAY" | "EVENING"
  DrawNumbers?: RawNum[];
};

/** Sentinel: this year is entirely outside the API's 2-year window. */
const OUT_OF_WINDOW = Symbol("out-of-window");

async function fetchYear(
  ep: Endpoint,
  year: number,
  attempt = 1,
): Promise<RawDraw[] | typeof OUT_OF_WINDOW> {
  const cachePath = join(CACHE_DIR, `${ep.game}-${year}.json`);
  const isCurrentYear = year === CURRENT_YEAR;
  if (!FORCE && !isCurrentYear && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8")) as RawDraw[];
  }
  const url =
    `${BASE}?id=${ep.id}` +
    `&startDate=${apiDate(year, 1, 1)}&endDate=${apiDate(year, 12, 31)}`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-partner": PARTNER,
        origin: "https://floridalottery.com",
        referer: "https://floridalottery.com/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    // The API rejects any range whose endDate is older than ~2 years.
    // That's expected at the back edge of the window — treat it as a clean
    // stop, not an error.
    if (res.status === 400) {
      const body = await res.text();
      if (/before 2 years/i.test(body)) return OUT_OF_WINDOW;
      throw new Error(`HTTP 400 ${body.slice(0, 120)}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = (await res.json()) as RawDraw[];
    if (!Array.isArray(data)) throw new Error("unexpected payload (not an array)");
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

/**
 * Read already-committed rows from an existing CSV so we never shrink:
 * the API's 2-year window can't see older draws, but our committed file
 * already has them. Returns a map keyed by "iso|stream".
 */
function readExisting(game: "pick3" | "pick4", positions: 3 | 4): Map<string, Row> {
  const path = join(OUT_DIR, `${game}.csv`);
  const out = new Map<string, Row>();
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const cols = line.split(",");
    const first = (cols[0] ?? "").trim();
    // Data rows lead with DD-MM-YYYY; header/title lines don't.
    const m = first.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) continue;
    const [, dd, mm, yyyy] = m;
    const stream = cols[1]?.trim() === "Midday" ? "Midday" : "Evening";
    const digits = cols.slice(2, 2 + positions).map((c) => parseInt(c, 10));
    if (digits.length !== positions || digits.some((d) => Number.isNaN(d))) continue;
    const iso = `${yyyy}-${mm}-${dd}`;
    out.set(`${iso}|${stream}`, { iso, ddmmyyyy: `${dd}-${mm}-${yyyy}`, stream, digits });
  }
  return out;
}

type Row = { iso: string; ddmmyyyy: string; stream: "Midday" | "Evening"; digits: number[] };

function parseDraw(d: RawDraw, positions: number): Row | null {
  if (!d.DrawDate || !Array.isArray(d.DrawNumbers)) return null;
  // "06/23/2024 12:00:00 AM" → parts
  const m = d.DrawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const iso = `${yyyy}-${mm}-${dd}`;
  const ddmmyyyy = `${dd}-${mm}-${yyyy}`;

  // Pull wn1..wnN in order; ignore the Fireball (fb).
  const byType = new Map(d.DrawNumbers.map((n) => [n.NumberType, n.NumberPick]));
  const digits: number[] = [];
  for (let i = 1; i <= positions; i++) {
    const v = byType.get(`wn${i}`);
    if (typeof v !== "number" || v < 0 || v > 9) return null;
    digits.push(v);
  }

  const t = (d.DrawType ?? "").toUpperCase();
  const stream: "Midday" | "Evening" = t === "MIDDAY" ? "Midday" : "Evening";
  return { iso, ddmmyyyy, stream, digits };
}

function csvFor(rows: Row[], positions: 3 | 4): string {
  const cols = positions === 3 ? ",,,," : ",,,,,";
  const lines = [
    `Florida Lottery - Pick ${positions} Winning Numbers${cols}`,
    `Draw Date${cols}`,
  ];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  console.log(`Fetching FL Pick 3 / Pick 4 history (${START_YEAR}…${CURRENT_YEAR})${FORCE ? " [FORCE]" : ""}`);
  console.log(`Cache: ${CACHE_DIR} · partner header: ${PARTNER}`);
  const buckets: Record<"pick3" | "pick4", Row[]> = { pick3: [], pick4: [] };

  for (const ep of ENDPOINTS) {
    // Seed with already-committed history so the merge can only grow.
    const merged = readExisting(ep.game, ep.positions);
    const existingCount = merged.size;
    let fetched = 0;
    process.stdout.write(`  ${ep.game.padEnd(6)} `);
    for (let year = CURRENT_YEAR; year >= START_YEAR; year--) {
      let draws: RawDraw[] | typeof OUT_OF_WINDOW;
      try {
        draws = await fetchYear(ep, year);
      } catch {
        process.stdout.write("x");
        continue;
      }
      if (draws === OUT_OF_WINDOW) {
        process.stdout.write("·"); // past the API's 2-year horizon — stop
        break;
      }
      for (const d of draws) {
        const row = parseDraw(d, ep.positions);
        if (!row) continue;
        merged.set(`${row.iso}|${row.stream}`, row); // upsert; never removes
        fetched++;
      }
      process.stdout.write(".");
      if (!FORCE && !existsSync(join(CACHE_DIR, `${ep.game}-${year}.json`))) await sleep(150);
    }
    buckets[ep.game] = [...merged.values()];
    const added = merged.size - existingCount;
    process.stdout.write(
      `  ${merged.size.toLocaleString().padStart(7)} draws (${existingCount.toLocaleString()} existing, +${added.toLocaleString()} new, ${fetched.toLocaleString()} seen in window)\n`,
    );
  }

  const sortFn = (a: Row, b: Row) => {
    if (a.iso !== b.iso) return a.iso < b.iso ? 1 : -1; // newest first
    return a.stream === "Evening" && b.stream === "Midday" ? -1 : 1;
  };
  buckets.pick3.sort(sortFn);
  buckets.pick4.sort(sortFn);

  if (buckets.pick3.length === 0 || buckets.pick4.length === 0) {
    throw new Error("no draws parsed — refusing to write empty CSVs");
  }

  writeFileSync(join(OUT_DIR, "pick3.csv"), csvFor(buckets.pick3, 3));
  writeFileSync(join(OUT_DIR, "pick4.csv"), csvFor(buckets.pick4, 4));

  const span = (rows: Row[]) => `${rows[rows.length - 1]?.iso ?? "—"} → ${rows[0]?.iso ?? "—"}`;
  console.log(`\nWrote ${OUT_DIR}/pick3.csv  (${buckets.pick3.length.toLocaleString()} draws, ${span(buckets.pick3)})`);
  console.log(`Wrote ${OUT_DIR}/pick4.csv  (${buckets.pick4.length.toLocaleString()} draws, ${span(buckets.pick4)})`);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
