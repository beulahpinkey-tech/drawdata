/**
 * Fetch Georgia Lottery Cash 3 / Cash 4 draws by reading the official
 * Winning Numbers page in a headless browser.
 *
 * WHY A BROWSER: in Sept 2026 galottery.com moved its draw API to a vendor
 * host that requires an API key issued to the lottery's own website. Rather
 * than reuse a credential that wasn't issued to us, we open the public
 * results page, let it load its own data, and read the table it renders —
 * exactly what a visitor sees. The old keyless endpoint
 * (www.galottery.com/api/v2/draw-games/draws/page) now 404s.
 *
 * HOW: https://www.galottery.com/en-us/winning-numbers.html → Advanced
 * Search → "Select by month and year" → one search per game per month, then
 * every page of the 20-row results table. Each row:
 *   <td title="Date">10/31/2026 …</td> <td title="Draw">MIDDAY</td>
 *   <td title="Winning Numbers"> … <i>3</i><i>1</i><i>0</i> … </td>
 *
 * TIMEZONE: the page converts the chosen month to a timestamp range in the
 * BROWSER's timezone, and labels rows the same way. The browser therefore
 * runs in America/New_York, so months and draw dates are Georgia calendar
 * days — matching the history already on disk (also ET dates).
 *
 * SAFETY:
 *   • Merge-only: existing draws are never removed.
 *   • Integrity check: a scraped draw that DISAGREES with a draw already on
 *     disk (same date + stream, different digits) aborts the run without
 *     writing — that means the page layout or labelling changed.
 *   • Fails (exit 1) if the current month returns no draws for a game, so a
 *     broken source turns the refresh run red instead of silently stalling.
 *   • Polite: one search per game per month, short pauses between pages.
 *
 * History before Sept 2026 came from the old API and is already in
 * data/ga/*.csv; this script only needs to keep it current (and backfill
 * gaps — it starts from the month of the newest draw on disk).
 *
 * Run:  npm run fetch:ga  [-- --from 2026-09]   (needs: npx playwright install chromium)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "data", "ga");
mkdirSync(OUT_DIR, { recursive: true });

// No "#tab-advSearch" fragment: going to the same URL + fragment is an
// in-page jump, not a reload, and the form stays collapsed after a search.
const SEARCH_URL = "https://www.galottery.com/en-us/winning-numbers.html";
const TZ = "America/New_York";

type GameDef = { game: "pick3" | "pick4"; code: string; positions: 3 | 4 };
const GAMES: GameDef[] = [
  { game: "pick3", code: "CASH3", positions: 3 },
  { game: "pick4", code: "CASH4", positions: 4 },
];

const STREAM_LABEL: Record<string, string> = {
  MORNING: "Morning",
  MIDDAY: "Midday",
  EVENING: "Evening",
  NIGHT: "Night",
};

type Row = { iso: string; ddmmyyyy: string; stream: string; digits: number[] };

const args = process.argv.slice(2);
const fromArg = (() => {
  const i = args.indexOf("--from");
  const m = i === -1 ? null : (args[i + 1] ?? "").match(/^(\d{4})-(\d{2})$/);
  return m ? { y: +m[1], m: +m[2] } : null;
})();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad2 = (n: number) => String(n).padStart(2, "0");

/** Today's year/month on the Georgia calendar. */
function nowET(): { y: number; m: number } {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-");
  return { y: +y, m: +m };
}

function monthsBetween(from: { y: number; m: number }, to: { y: number; m: number }) {
  const out: { y: number; m: number }[] = [];
  for (let y = from.y, m = from.m; y < to.y || (y === to.y && m <= to.m); m === 12 ? (y++, (m = 1)) : m++) {
    out.push({ y, m });
  }
  return out;
}

function readExisting(game: GameDef["game"], positions: 3 | 4): Map<string, Row> {
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

/** Raw rows of the visible results table: "MM/DD/YYYY", "NIGHT", "026". */
async function readTable(page: Page): Promise<{ date: string; draw: string; nums: string }[]> {
  return page.evaluate(() => {
    const t = [...document.querySelectorAll<HTMLTableElement>("table.table-winning-numbers-pick")].find(
      (x) => x.offsetParent !== null,
    );
    if (!t) return [];
    return [...t.querySelectorAll("tbody tr")].map((r) => ({
      date: (r.querySelector('td[title="Date"]')?.childNodes[0]?.textContent ?? "").trim(),
      draw: (r.querySelector('td[title="Draw"]')?.textContent ?? "").trim(),
      nums: [...r.querySelectorAll('td[title="Winning Numbers"] i')].map((i) => (i.textContent ?? "").trim()).join(""),
    }));
  });
}

function parseRow(raw: { date: string; draw: string; nums: string }, positions: number): Row | null {
  const d = raw.date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const stream = STREAM_LABEL[raw.draw.toUpperCase()];
  if (!d || !stream || !new RegExp(`^\\d{${positions}}$`).test(raw.nums)) return null;
  const [, mo, dd, yyyy] = d;
  return { iso: `${yyyy}-${mo}-${dd}`, ddmmyyyy: `${dd}-${mo}-${yyyy}`, stream, digits: [...raw.nums].map(Number) };
}

/** All draws for one game in one calendar month (every results page). */
async function fetchMonth(page: Page, g: GameDef, y: number, m: number): Promise<Row[]> {
  await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded" });
  const gameSel = page.locator("#advSearchGameSelect");
  await page.locator("a", { hasText: /^\s*Advanced Search\s*$/ }).first().click();
  await gameSel.waitFor({ state: "visible", timeout: 20_000 });
  await gameSel.selectOption(g.code);
  await page.locator("#advSearchbyMonth").selectOption(pad2(m));
  await page.locator("#advSearchbyYear").selectOption(String(y));
  await page.locator("#btnSearchByMonth").click();

  const table = page.locator("table.table-winning-numbers-pick:visible");
  try {
    await table.locator("tbody tr").first().waitFor({ timeout: 20_000 });
  } catch {
    return []; // no draws (e.g. the 1st of a month before the first draw)
  }

  const rows: Row[] = [];
  const seenFirst = new Set<string>();
  for (let pageNo = 1; pageNo <= 20; pageNo++) {
    const raw = await readTable(page);
    const key = JSON.stringify(raw[0] ?? null);
    if (seenFirst.has(key)) break; // pagination didn't advance
    seenFirst.add(key);
    for (const r of raw) {
      const row = parseRow(r, g.positions);
      if (!row) throw new Error(`${g.code} ${y}-${pad2(m)}: unparseable row ${JSON.stringify(r)} — page layout changed?`);
      if (!row.iso.startsWith(`${y}-${pad2(m)}`)) {
        throw new Error(`${g.code} ${y}-${pad2(m)}: row dated ${row.iso} outside the searched month — timezone/labelling changed?`);
      }
      rows.push(row);
    }
    // The page link right after the active one, if any ("…" has no href).
    const next = page.locator("ul.pagination:visible li.active + li a[href]");
    if ((await next.count()) === 0) break;
    await sleep(600);
    await next.first().click();
    await page.waitForFunction(
      (prev) => {
        const t = [...document.querySelectorAll<HTMLTableElement>("table.table-winning-numbers-pick")].find(
          (x) => x.offsetParent !== null,
        );
        const first = t?.querySelector("tbody tr")?.textContent ?? "";
        return first.replace(/\s+/g, " ") !== prev;
      },
      ((await table.locator("tbody tr").first().textContent()) ?? "").replace(/\s+/g, " "),
      { timeout: 20_000 },
    );
  }
  return rows;
}

async function main() {
  const now = nowET();
  const browser = await chromium.launch();
  const context = await browser.newContext({ timezoneId: TZ, locale: "en-US" });
  const page = await context.newPage();
  const problems: string[] = [];

  try {
    for (const g of GAMES) {
      const merged = readExisting(g.game, g.positions);
      const before = merged.size;
      const latest = [...merged.values()].reduce((a, r) => (r.iso > a ? r.iso : a), "0000-00-00");
      // Start at the month of the newest draw on disk, so gaps are backfilled.
      const start = fromArg ?? (latest > "0000" ? { y: +latest.slice(0, 4), m: +latest.slice(5, 7) } : now);
      const months = monthsBetween(start, now);
      console.log(`  ${g.game}: newest on disk ${latest}; reading ${months.map((x) => `${x.y}-${pad2(x.m)}`).join(", ")}`);

      const conflicts: string[] = [];
      let currentMonthRows = 0;
      for (const { y, m } of months) {
        const rows = await fetchMonth(page, g, y, m);
        if (y === now.y && m === now.m) currentMonthRows = rows.length;
        let added = 0;
        for (const r of rows) {
          const k = `${r.iso}|${r.stream}`;
          const have = merged.get(k);
          if (have && have.digits.join("") !== r.digits.join("")) {
            conflicts.push(`${k}: disk ${have.digits.join("")} vs page ${r.digits.join("")}`);
            continue;
          }
          if (!have) added++;
          merged.set(k, r);
        }
        console.log(`    ${y}-${pad2(m)}: ${rows.length} draws on page, +${added} new`);
      }

      if (conflicts.length) {
        problems.push(`${g.game}: ${conflicts.length} draws disagree with history (e.g. ${conflicts.slice(0, 3).join("; ")}) — nothing written`);
        continue;
      }
      if (currentMonthRows === 0 && new Date().getUTCDate() > 2) {
        problems.push(`${g.game}: no draws found for ${now.y}-${pad2(now.m)} — the results page may have changed`);
      }
      const rows = [...merged.values()].sort((a, b) => (a.iso !== b.iso ? (a.iso < b.iso ? 1 : -1) : 0));
      if (merged.size > before) {
        writeFileSync(join(OUT_DIR, `${g.game}.csv`), csvFor(rows, g.positions));
      }
      console.log(`  ${g.game}: ${merged.size.toLocaleString()} draws (+${(merged.size - before).toLocaleString()} new), ${rows[rows.length - 1]?.iso} → ${rows[0]?.iso}`);
    }
  } finally {
    await browser.close();
  }

  if (problems.length) throw new Error(problems.join("\n  "));
}

console.log("Fetching GA Cash 3 / Cash 4 from galottery.com Winning Numbers (headless browser, America/New_York)");
main().catch((err) => {
  console.error("\nFAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
