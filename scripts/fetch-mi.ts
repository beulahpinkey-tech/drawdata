/**
 * Fetch Michigan Lottery Daily 3 / Daily 4 draw history.
 *
 * API: Apollo GraphQL at https://www.michiganlottery.com/api
 *   query { winningNumbersForDateRange(dateRange: {start,end}) {
 *     drawDate gameTypeId winningNumbers { drawNumbers } } }
 *   Headers: content-type: application/json + apollo-require-preflight: true
 *   (the endpoint rejects requests without one of the Apollo CSRF headers).
 *
 * gameTypeId → game + stream (from the site bundle's GameTypeId map):
 *   4 = Daily 3 Midday   5 = Daily 3 Evening
 *   6 = Daily 4 Midday   7 = Daily 4 Evening
 *
 * Notes:
 *   • The query has no per-game filter — it returns EVERY game in the
 *     range (Club Keno draws every few minutes, so responses are large).
 *     We filter to gameTypeId 4–7 and cache only those rows per year, so
 *     the cache stays tiny.
 *   • drawDate is anchored at ET midnight (…T04:00:00Z), so its date part
 *     is already the correct Eastern calendar day — no TZ shifting needed.
 *   • Ranges are chunked by MONTH — the backend 503s on a full-year
 *     all-games query. Completed months are cached (filtered rows only);
 *     the current + previous month are always refetched so the twice-daily
 *     refresh stays light. The writer is merge-only, so history accumulates.
 *
 * Output matches the NJ CSV shape so parsePick() reads it unchanged.
 *
 * Run:  npm run fetch:mi  [-- --from 1998] [-- --force]
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "mi");
const OUT_DIR = join(ROOT, "data", "mi");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const API = "https://www.michiganlottery.com/api";
const CURRENT_YEAR = new Date().getUTCFullYear();
const CURRENT_MONTH = new Date().getUTCMonth() + 1; // 1..12

const GAME_TYPE: Record<number, { game: "pick3" | "pick4"; stream: "Midday" | "Evening"; positions: 3 | 4 }> = {
  4: { game: "pick3", stream: "Midday", positions: 3 },
  5: { game: "pick3", stream: "Evening", positions: 3 },
  6: { game: "pick4", stream: "Midday", positions: 4 },
  7: { game: "pick4", stream: "Evening", positions: 4 },
};

const args = process.argv.slice(2);
function argInt(flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const n = parseInt(args[i + 1] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}
const FORCE = args.includes("--force");
const START_YEAR = argInt("--from", 1998);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad2 = (n: number) => String(n).padStart(2, "0");

type Row = { iso: string; ddmmyyyy: string; stream: "Midday" | "Evening"; digits: number[] };
type RawDraw = { drawDate: string; gameTypeId: number; winningNumbers: { drawNumbers: number[] } };

async function queryRange(start: string, end: string, attempt = 1): Promise<RawDraw[]> {
  const query = `{ winningNumbersForDateRange(dateRange: { start: "${start}", end: "${end}" }) { drawDate gameTypeId winningNumbers { drawNumbers } } }`;
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "apollo-require-preflight": "true",
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
        referer: "https://www.michiganlottery.com/",
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data?: { winningNumbersForDateRange?: RawDraw[] }; errors?: unknown };
    if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 120)}`);
    return json.data?.winningNumbersForDateRange ?? [];
  } catch (err) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return queryRange(start, end, attempt + 1);
    }
    throw err;
  }
}

function toRow(d: RawDraw): { row: Row; game: "pick3" | "pick4" } | null {
  const gt = GAME_TYPE[d.gameTypeId];
  if (!gt) return null;
  const nums = d.winningNumbers?.drawNumbers ?? [];
  if (nums.length !== gt.positions || nums.some((n) => n < 0 || n > 9)) return null;
  const iso = d.drawDate.slice(0, 10); // ET-anchored date
  const [y, m, dd] = iso.split("-");
  return { game: gt.game, row: { iso, ddmmyyyy: `${dd}-${m}-${y}`, stream: gt.stream, digits: nums } };
}

const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Filtered Daily 3/4 rows for one month, cached (recent months refetched). */
async function fetchMonth(year: number, month: number): Promise<Record<"pick3" | "pick4", Row[]>> {
  const cachePath = join(CACHE_DIR, `${year}-${pad2(month)}.json`);
  // Always refetch the current and previous month (late results can post).
  const monthsAgo = (CURRENT_YEAR - year) * 12 + (CURRENT_MONTH - month);
  const recent = monthsAgo <= 1;
  if (!FORCE && !recent && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8"));
  }
  const start = `${year}-${pad2(month)}-01`;
  const end = `${year}-${pad2(month)}-${pad2(lastDay(year, month))}`;
  const raw = await queryRange(start, end);
  const out: Record<"pick3" | "pick4", Row[]> = { pick3: [], pick4: [] };
  for (const d of raw) {
    const parsed = toRow(d);
    if (parsed) out[parsed.game].push(parsed.row);
  }
  if (!recent) writeFileSync(cachePath, JSON.stringify(out));
  return out;
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
    const stream = cols[1]?.trim() === "Midday" ? "Midday" : "Evening";
    const digits = cols.slice(2, 2 + positions).map((c) => parseInt(c, 10));
    if (digits.length !== positions || digits.some((x) => Number.isNaN(x))) continue;
    out.set(`${yyyy}-${mo}-${dd}|${stream}`, { iso: `${yyyy}-${mo}-${dd}`, ddmmyyyy: `${dd}-${mo}-${yyyy}`, stream, digits });
  }
  return out;
}

function csvFor(rows: Row[], positions: 3 | 4): string {
  const cols = positions === 3 ? ",,,," : ",,,,,";
  const lines = [`Michigan Lottery - Daily ${positions} Winning Numbers${cols}`, `Draw Date${cols}`];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  console.log(`Fetching MI Daily 3 / Daily 4 history (${START_YEAR}…${CURRENT_YEAR})${FORCE ? " [FORCE]" : ""}`);
  console.log(`Cache: ${CACHE_DIR}`);
  const merged: Record<"pick3" | "pick4", Map<string, Row>> = {
    pick3: readExisting("pick3", 3),
    pick4: readExisting("pick4", 4),
  };
  const existing = { pick3: merged.pick3.size, pick4: merged.pick4.size };

  // Iterate every month from now back to START_YEAR-01, newest first.
  const months: Array<[number, number]> = [];
  for (let y = CURRENT_YEAR; y >= START_YEAR; y--) {
    const hi = y === CURRENT_YEAR ? CURRENT_MONTH : 12;
    for (let m = hi; m >= 1; m--) months.push([y, m]);
  }
  process.stdout.write(`  ${months.length} months `);
  for (const [y, m] of months) {
    let mr: Record<"pick3" | "pick4", Row[]>;
    try {
      mr = await fetchMonth(y, m);
    } catch {
      process.stdout.write("x");
      continue;
    }
    for (const g of ["pick3", "pick4"] as const) {
      for (const r of mr[g]) merged[g].set(`${r.iso}|${r.stream}`, r); // upsert; never removes
    }
    if (!FORCE && !existsSync(join(CACHE_DIR, `${y}-${pad2(m)}.json`))) await sleep(120);
  }
  process.stdout.write("\n");

  for (const g of ["pick3", "pick4"] as const) {
    const positions = g === "pick3" ? 3 : 4;
    const rows = [...merged[g].values()].sort((a, b) =>
      a.iso !== b.iso ? (a.iso < b.iso ? 1 : -1) : a.stream === "Evening" ? -1 : 1,
    );
    if (rows.length === 0) throw new Error(`${g}: no draws — refusing to write empty CSV`);
    writeFileSync(join(OUT_DIR, `${g}.csv`), csvFor(rows, positions));
    console.log(
      `  ${g}  ${rows.length.toLocaleString()} draws (+${(merged[g].size - existing[g]).toLocaleString()} new)  ${rows[rows.length - 1]?.iso} → ${rows[0]?.iso}`,
    );
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
