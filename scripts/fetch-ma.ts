/**
 * Fetch Massachusetts Lottery "The Numbers Game" draw history.
 *
 * API: https://www.masslottery.com/api/v1/draw-results/the_numbers_game?draw_date=YYYY-MM-DD
 *
 * Massachusetts runs ONE digit game — a 4-digit draw — so this state ships
 * pick4 only, with no pick3 counterpart (the mirror of Washington, which is
 * pick3-only). History reaches draw #1 on 1976-04-10, the second-deepest
 * pick4 series in the project after New York.
 *
 * Constraints that shape this fetcher:
 *   • NO RANGE QUERY EXISTS. `draw_date` accepts exactly one date; every
 *     range spelling (comma, pipe, "..", start_date/end_date, repeated
 *     params) returns 400, and the unscoped /draw-results list endpoint
 *     ignores game filters and just returns the latest ~9 rows across all
 *     games. So a full backfill costs ~18,400 requests, one per date.
 *     Completed years are therefore recorded in data/ma/fetched-years.json
 *     and fetched exactly once, ever.
 *   • THAT MANIFEST IS COMMITTED, deliberately. The refresh workflow keeps
 *     .cache/ in actions/cache, which GitHub evicts after ~7 days idle or
 *     under the 10 GB cap. If "have we already fetched 1994?" lived only in
 *     that cache, an eviction would silently trigger a fresh 18,400-request
 *     backfill on the next cron run — blowing the job's 30-minute cap and
 *     hammering the upstream twice a day. The manifest lives in git next to
 *     the CSV it describes, so the answer survives any cache loss.
 *   • The ongoing refresh must NOT re-walk history. Past years listed in the
 *     manifest are skipped outright and only the trailing few days of the
 *     current year are re-fetched, making the twice-daily cron ~5 requests.
 *     `--force` ignores the manifest and refetches everything.
 *   • STREAM LABELS ARE NOT IN THE PAYLOAD and drawSequence is inverted
 *     relative to what you'd guess: seq 0 carries the HIGHER drawNumber.
 *     Verified against the per-draw videoLink titles published by the
 *     lottery — seq 0 is "Evening Drawings", seq 1 is "Midday Drawings".
 *     Pre-2008-ish dates have a single draw, always seq 0 (evening).
 *
 * Per-draw payload:
 *   { gameIdentifier, drawDate: "2026-08-05", drawNumber: 24300,
 *     drawSequence: 0, winningNumbers: [8,7,4,2], status: "COMPLETE" }
 *
 * Digits arrive as a real array of ints — no leading-zero games like NY.
 *
 * Output matches the NJ CSV shape so parsePick() reads it unchanged.
 *
 * Run:  npm run fetch:ma  [-- --from 1976] [-- --force]
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "ma");
const OUT_DIR = join(ROOT, "data", "ma");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const BASE = "https://www.masslottery.com/api/v1/draw-results/the_numbers_game";
/** Committed record of which past years are fully fetched. See header. */
const MANIFEST = join(OUT_DIR, "fetched-years.json");
const FIRST_DRAW = "1976-04-10"; // draw #1
/**
 * Default pacing is deliberately gentle, because this is what the twice-daily
 * cron runs — and the cron only ever fetches a handful of trailing dates.
 * A one-time full backfill is the only case that wants speed, so raise it
 * explicitly there (`--concurrency 12`) rather than making CI noisier.
 */
const DEFAULT_CONCURRENCY = 4;
/** Days of overlap re-fetched on an incremental run, to catch late corrections. */
const REFRESH_TAIL_DAYS = 4;

const args = process.argv.slice(2);
function argInt(flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const n = parseInt(args[i + 1] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}
const FORCE = args.includes("--force");
const START_YEAR = argInt("--from", parseInt(FIRST_DRAW.slice(0, 4), 10));
const CONCURRENCY = Math.max(1, Math.min(16, argInt("--concurrency", DEFAULT_CONCURRENCY)));
/** Politeness delay per worker between requests; scaled down as concurrency rises. */
const THROTTLE_MS = Math.max(15, Math.round(240 / CONCURRENCY));
const CURRENT_YEAR = new Date().getUTCFullYear();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad2 = (n: number) => String(n).padStart(2, "0");
const todayIso = () => new Date().toISOString().slice(0, 10);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type RawDraw = {
  drawDate?: string;
  drawNumber?: number;
  drawSequence?: number;
  winningNumbers?: number[];
  status?: string;
};

type Row = { iso: string; ddmmyyyy: string; stream: "Midday" | "Evening"; digits: number[] };

/** All ISO dates in [from, to] inclusive. */
function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.parse(to);
  for (let t = Date.parse(from); t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

async function fetchDate(iso: string, attempt = 1): Promise<RawDraw[]> {
  try {
    const res = await fetch(`${BASE}?draw_date=${iso}`, {
      headers: { accept: "application/json", "user-agent": UA },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const j = (await res.json()) as { winningNumbers?: RawDraw[] };
    return j.winningNumbers ?? [];
  } catch (err) {
    if (attempt < 4) {
      await sleep(400 * attempt + Math.floor(Math.random() * 300));
      return fetchDate(iso, attempt + 1);
    }
    throw err;
  }
}

/** Fetch many dates with a bounded worker pool, preserving nothing but the union. */
async function fetchDates(dates: string[], onTick: () => void): Promise<RawDraw[]> {
  const out: RawDraw[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < dates.length) {
        const iso = dates[i++];
        out.push(...(await fetchDate(iso)));
        onTick();
        await sleep(THROTTLE_MS + Math.floor(Math.random() * THROTTLE_MS)); // be polite
      }
    }),
  );
  return out;
}

function readManifest(): Set<number> {
  if (!existsSync(MANIFEST)) return new Set();
  try {
    const years = JSON.parse(readFileSync(MANIFEST, "utf8")) as unknown;
    if (!Array.isArray(years)) return new Set();
    return new Set(years.filter((y): y is number => Number.isInteger(y)));
  } catch {
    return new Set(); // corrupt manifest just means we re-fetch; never fatal
  }
}

function writeManifest(years: Set<number>) {
  writeFileSync(MANIFEST, JSON.stringify([...years].sort((a, b) => a - b)) + "\n");
}

function readExisting(): Map<string, Row> {
  const path = join(OUT_DIR, "pick4.csv");
  const out = new Map<string, Row>();
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const cols = line.split(",");
    const m = (cols[0] ?? "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) continue;
    const [, dd, mo, yyyy] = m;
    const stream = cols[1]?.trim() === "Midday" ? "Midday" : "Evening";
    const digits = cols.slice(2, 6).map((c) => parseInt(c, 10));
    if (digits.length !== 4 || digits.some((d) => Number.isNaN(d))) continue;
    const iso = `${yyyy}-${mo}-${dd}`;
    out.set(`${iso}|${stream}`, { iso, ddmmyyyy: `${dd}-${mo}-${yyyy}`, stream, digits });
  }
  return out;
}

function toRow(d: RawDraw): Row | null {
  const iso = (d.drawDate ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  if (d.status && d.status !== "COMPLETE") return null;
  const digits = d.winningNumbers;
  if (!Array.isArray(digits) || digits.length !== 4) return null;
  if (digits.some((n) => !Number.isInteger(n) || n < 0 || n > 9)) return null;
  const [yyyy, mo, dd] = iso.split("-");
  // seq 1 = Midday, seq 0 (and any lone legacy draw) = Evening. See header.
  const stream: "Midday" | "Evening" = d.drawSequence === 1 ? "Midday" : "Evening";
  return { iso, ddmmyyyy: `${dd}-${mo}-${yyyy}`, stream, digits };
}

function csvFor(rows: Row[]): string {
  const lines = [
    "Massachusetts Lottery - The Numbers Game Winning Numbers,,,,,",
    "Draw Date,,,,,",
  ];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  const merged = readExisting();
  const existingCount = merged.size;
  const isIncremental = existingCount > 0 && !FORCE;

  console.log(
    `Fetching MA The Numbers Game from ${START_YEAR}` +
      `${FORCE ? " [FORCE]" : ""}${isIncremental ? " [incremental]" : " [full backfill]"}`,
  );
  console.log(`Cache: ${CACHE_DIR}`);

  const today = todayIso();
  const collected: RawDraw[] = [];
  const completedYears = FORCE ? new Set<number>() : readManifest();
  let skipped = 0;

  for (let year = Math.max(START_YEAR, 1976); year <= CURRENT_YEAR; year++) {
    const cachePath = join(CACHE_DIR, `${year}.json`);
    const isPast = year < CURRENT_YEAR;

    if (isPast && !FORCE) {
      // Already recorded as complete — its draws are in the CSV we just read,
      // so there is nothing to fetch and nothing to re-merge.
      if (completedYears.has(year)) {
        skipped++;
        continue;
      }
      // Local cache from an earlier interrupted backfill: adopt it without
      // re-hitting the network, and promote it into the manifest.
      if (existsSync(cachePath)) {
        collected.push(...(JSON.parse(readFileSync(cachePath, "utf8")) as RawDraw[]));
        completedYears.add(year);
        continue;
      }
    }

    // Window for this year. On an incremental run the current year shrinks to
    // just the trailing few days so the cron isn't re-walking 365 dates.
    let from = `${year}-01-01`;
    const to = year === CURRENT_YEAR ? today : `${year}-12-31`;
    if (year === parseInt(FIRST_DRAW.slice(0, 4), 10) && FIRST_DRAW > from) from = FIRST_DRAW;
    if (year === CURRENT_YEAR && isIncremental) {
      const latestThisYear = [...merged.keys()]
        .map((k) => k.slice(0, 10))
        .filter((d) => d.startsWith(`${year}-`))
        .sort()
        .pop();
      if (latestThisYear) {
        const back = new Date(Date.parse(latestThisYear) - REFRESH_TAIL_DAYS * 86_400_000);
        from = back.toISOString().slice(0, 10);
      }
    }
    if (from > to) continue;

    const dates = dateRange(from, to);
    process.stdout.write(`  ${year} ${String(dates.length).padStart(3)} dates `);
    let done = 0;
    const got = await fetchDates(dates, () => {
      done++;
      if (done % 50 === 0) process.stdout.write(".");
    });
    process.stdout.write(` ${got.length} draws\n`);

    if (isPast) {
      writeFileSync(cachePath, JSON.stringify(got));
      completedYears.add(year); // complete year — never fetch it again
    }
    collected.push(...got);
  }
  if (skipped) console.log(`  ${skipped} past year(s) already complete — skipped`);

  let malformed = 0;
  for (const d of collected) {
    const row = toRow(d);
    if (!row) {
      malformed++;
      continue;
    }
    merged.set(`${row.iso}|${row.stream}`, row); // upsert; never removes
  }

  const rows = [...merged.values()].sort((a, b) =>
    a.iso !== b.iso ? (a.iso < b.iso ? 1 : -1) : a.stream === "Evening" ? -1 : 1,
  );
  if (rows.length === 0) throw new Error("pick4: no draws — refusing to write empty CSV");
  writeFileSync(join(OUT_DIR, "pick4.csv"), csvFor(rows));
  // Written only after the CSV lands, so a crash mid-run can never record a
  // year as complete whose draws were never persisted.
  writeManifest(completedYears);

  const added = merged.size - existingCount;
  console.log(
    `  pick4  ${merged.size.toLocaleString().padStart(7)} draws ` +
      `(${existingCount.toLocaleString()} existing, +${added.toLocaleString()} new)`,
  );
  console.log(`         ${rows[rows.length - 1]?.iso} → ${rows[0]?.iso}`);
  if (malformed) console.warn(`         ${malformed} malformed/pending draw(s) skipped`);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
