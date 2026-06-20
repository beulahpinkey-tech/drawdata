/**
 * Fetch Illinois Lottery Pick 3 / Pick 4 draw history.
 *
 * Source: illinoislottery.com server-rendered results pages.
 *   https://www.illinoislottery.com/dbg/results/pick4
 *     ?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&page=N
 *
 * Shape of the data (per result block):
 *   • date     — <span class="dbg-results__date-info">Jan 31, 2026</span>
 *   • stream   — schedule-type-text → "midday" | "evening"
 *   • digits   — primary balls (ball-primary-*), 3 or 4 of them. The
 *                secondary board is the FIREBALL add-on — dropped.
 *
 * Constraints that shape this fetcher:
 *   • Page size is locked at 10 results; we paginate per month.
 *   • The site sits behind a captcha/WAF that intermittently challenges
 *     bots — a blocked response lacks the `dbg-results__list` container
 *     (and shows a captcha page). We detect that and retry with backoff +
 *     jitter rather than mistaking it for "no draws".
 *   • Backfill is bounded (default ~2 years) and the writer is MERGE-ONLY,
 *     so history accumulates forward and the ongoing twice-daily refresh
 *     only needs the current month (cheap).
 *
 * Output matches the NJ CSV shape so parsePick() reads it unchanged.
 *
 * Run:  npm run fetch:il  [-- --months 24] [-- --force]
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "il");
const OUT_DIR = join(ROOT, "data", "il");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const BASE = "https://www.illinoislottery.com/dbg/results";

type Endpoint = { game: "pick3" | "pick4"; positions: 3 | 4; path: string };
const ENDPOINTS: Endpoint[] = [
  { game: "pick3", positions: 3, path: "pick3" },
  { game: "pick4", positions: 4, path: "pick4" },
];

const args = process.argv.slice(2);
function argInt(flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const n = parseInt(args[i + 1] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}
const FORCE = args.includes("--force");
const MONTHS_BACK = argInt("--months", 24);
const MAX_PAGES_PER_MONTH = 12; // ~62 draws / 10 = 7; headroom for safety
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NUM: Record<string, string> = Object.fromEntries(
  MONTH_NAMES.map((m, i) => [m, String(i + 1).padStart(2, "0")]),
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad2 = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m=1..12

type Row = { iso: string; ddmmyyyy: string; stream: "Midday" | "Evening"; digits: number[] };

/** "Jan 31, 2026" → { iso, ddmmyyyy }. */
function parseDate(s: string): { iso: string; ddmmyyyy: string } | null {
  const m = s.trim().match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m) return null;
  const mm = MONTH_NUM[m[1]];
  if (!mm) return null;
  const dd = m[2].padStart(2, "0");
  return { iso: `${m[3]}-${mm}-${dd}`, ddmmyyyy: `${dd}-${mm}-${m[3]}` };
}

function parsePage(html: string, positions: number): Row[] {
  const rows: Row[] = [];
  for (const block of html.split("results__list-item--clickable").slice(1)) {
    const date = (block.match(/dbg-results__date-info[^>]*>([^<]+)</) || [])[1];
    const stream = (block.match(/schedule-type-text-\d+"[^>]*>\s*([A-Za-z]+)/) || [])[1];
    if (!date) continue;
    const d = parseDate(date);
    if (!d) continue;
    // primary balls only (the secondary board is FIREBALL)
    const digits = [...block.matchAll(/ball-primary-\d+-\d+"[\s\S]*?>\s*(\d)\s*</g)].map((x) => parseInt(x[1], 10));
    if (digits.length !== positions || digits.some((x) => Number.isNaN(x))) continue;
    const s = (stream || "").trim().toLowerCase();
    rows.push({ iso: d.iso, ddmmyyyy: d.ddmmyyyy, stream: s === "midday" ? "Midday" : "Evening", digits });
  }
  return rows;
}

/** A blocked/captcha response lacks the real results container. */
const isBlocked = (html: string) => !/dbg-results__list/.test(html);

async function fetchPage(ep: Endpoint, from: string, to: string, page: number): Promise<Row[]> {
  const url = `${BASE}/${ep.path}?dateFrom=${from}&dateTo=${to}&page=${page}`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
        },
      });
      const html = await res.text();
      if (res.ok && !isBlocked(html)) return parsePage(html, ep.positions);
      // blocked or non-200 — back off with jitter and retry
    } catch {
      /* network hiccup — retry */
    }
    await sleep(800 * attempt + Math.floor(Math.random() * 700));
  }
  throw new Error(`captcha/block persisted for ${ep.game} ${from}..${to} p${page}`);
}

/** All draws in one month, walking pages until a page returns nothing. */
async function fetchMonth(ep: Endpoint, year: number, month: number): Promise<Row[]> {
  const isCurrent = year === new Date().getUTCFullYear() && month === new Date().getUTCMonth() + 1;
  const cachePath = join(CACHE_DIR, `${ep.game}-${year}-${pad2(month)}.json`);
  if (!FORCE && !isCurrent && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8")) as Row[];
  }
  const from = `${year}-${pad2(month)}-01`;
  const to = `${year}-${pad2(month)}-${pad2(lastDay(year, month))}`;
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= MAX_PAGES_PER_MONTH; page++) {
    const got = await fetchPage(ep, from, to, page);
    if (got.length === 0) break;
    let fresh = 0;
    for (const r of got) {
      const k = `${r.iso}|${r.stream}`;
      if (seen.has(k)) continue;
      seen.add(k);
      rows.push(r);
      fresh++;
    }
    if (fresh === 0) break; // pagination looped / no new rows
    await sleep(120 + Math.floor(Math.random() * 200)); // be polite
  }
  if (!isCurrent) writeFileSync(cachePath, JSON.stringify(rows));
  return rows;
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
    if (digits.length !== positions || digits.some((d) => Number.isNaN(d))) continue;
    const iso = `${yyyy}-${mo}-${dd}`;
    out.set(`${iso}|${stream}`, { iso, ddmmyyyy: `${dd}-${mo}-${yyyy}`, stream, digits });
  }
  return out;
}

function csvFor(rows: Row[], positions: 3 | 4): string {
  const cols = positions === 3 ? ",,,," : ",,,,,";
  const lines = [`Illinois Lottery - Pick ${positions} Winning Numbers${cols}`, `Draw Date${cols}`];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  console.log(`Fetching IL Pick 3 / Pick 4 — last ${MONTHS_BACK} months${FORCE ? " [FORCE]" : ""}`);
  console.log(`Cache: ${CACHE_DIR}`);

  // Build the list of (year, month) to fetch, newest first.
  const now = new Date();
  const months: Array<[number, number]> = [];
  for (let i = 0; i < MONTHS_BACK; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push([d.getUTCFullYear(), d.getUTCMonth() + 1]);
  }

  for (const ep of ENDPOINTS) {
    const merged = readExisting(ep.game, ep.positions);
    const existingCount = merged.size;
    let fetched = 0;
    process.stdout.write(`  ${ep.game.padEnd(6)} `);
    for (const [y, m] of months) {
      let monthRows: Row[];
      try {
        monthRows = await fetchMonth(ep, y, m);
      } catch (e) {
        process.stdout.write("x");
        continue;
      }
      for (const r of monthRows) merged.set(`${r.iso}|${r.stream}`, r); // upsert; never removes
      fetched += monthRows.length;
      process.stdout.write(".");
    }
    const rows = [...merged.values()].sort((a, b) =>
      a.iso !== b.iso ? (a.iso < b.iso ? 1 : -1) : a.stream === "Evening" ? -1 : 1,
    );
    if (rows.length === 0) throw new Error(`${ep.game}: no draws — refusing to write empty CSV`);
    writeFileSync(join(OUT_DIR, `${ep.game}.csv`), csvFor(rows, ep.positions));
    const added = merged.size - existingCount;
    process.stdout.write(
      `  ${merged.size.toLocaleString().padStart(7)} draws (${existingCount.toLocaleString()} existing, +${added.toLocaleString()} new, ${fetched.toLocaleString()} in window)\n`,
    );
    console.log(`         ${rows[rows.length - 1]?.iso} → ${rows[0]?.iso}`);
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
