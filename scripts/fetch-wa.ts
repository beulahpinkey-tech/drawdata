/**
 * Fetch Washington Lottery "Daily Game" (Pick 3) draw history.
 *
 * Source: walottery.com PastDrawings.aspx (server-rendered HTML).
 *   https://walottery.com/WinningNumbers/PastDrawings.aspx
 *     ?gamename=dailygame&unittype=day&unitcount=180
 *
 * Notes that shape this fetcher:
 *   • Washington's Daily Game is ONE draw per night (≈8:00 PM PT) — there
 *     is no Midday/Evening split, so every row is tagged "Evening".
 *   • Washington has no Pick 4 — this fetcher writes pick3.csv only.
 *   • The page hard-caps at unitcount=180 (≈6 months); larger values and
 *     other unittypes return an "Error … maximum" page, and there is no
 *     date-range / offset parameter. So this is a ROLLING ~180-day window.
 *     The writer is therefore MERGE-ONLY: it unions the fresh window with
 *     the committed CSV and never shrinks, so history accumulates forward
 *     (same grow-only strategy as the WI and FL fetchers).
 *   • Each draw is rendered twice (mobile + desktop table layouts); we
 *     dedupe by date.
 *
 * Output matches the NJ CSV shape so the existing parsePick() reads it
 * unchanged: "DD-MM-YYYY,Evening,d,d,d".
 *
 * Run:  npm run fetch:wa  [-- --force]
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "data", "wa");
mkdirSync(OUT_DIR, { recursive: true });

const URL =
  "https://walottery.com/WinningNumbers/PastDrawings.aspx?gamename=dailygame&unittype=day&unitcount=180";

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

type Row = { iso: string; ddmmyyyy: string; digits: number[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "Thu, Jun 18, 2026" → { iso, ddmmyyyy }. */
function parseDate(s: string): { iso: string; ddmmyyyy: string } | null {
  const m = s.match(/^[A-Za-z]{3},\s*([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m) return null;
  const [, mon, d, yyyy] = m;
  const mm = MONTHS[mon];
  if (!mm) return null;
  const dd = d.padStart(2, "0");
  return { iso: `${yyyy}-${mm}-${dd}`, ddmmyyyy: `${dd}-${mm}-${yyyy}` };
}

async function fetchHtml(attempt = 1): Promise<string> {
  try {
    const res = await fetch(URL, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const html = await res.text();
    if (/>Error</.test(html) && !/h2-like/.test(html)) {
      throw new Error("walottery returned an error page (no draws)");
    }
    return html;
  } catch (err) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return fetchHtml(attempt + 1);
    }
    throw err;
  }
}

/** Each draw block: <p class="h2-like">DATE</p> … <td class="game-balls">…<li>d</li>…</td>. */
function parseHtml(html: string): Map<string, Row> {
  const out = new Map<string, Row>();
  const re = /<p class="h2-like">([^<]+)<\/p>[\s\S]*?<td class="game-balls">([\s\S]*?)<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const date = parseDate(m[1].trim());
    if (!date) continue;
    const digits = [...m[2].matchAll(/<li>\s*(\d)\s*<\/li>/g)].map((x) => parseInt(x[1], 10));
    if (digits.length !== 3 || digits.some((d) => Number.isNaN(d))) continue;
    out.set(date.iso, { iso: date.iso, ddmmyyyy: date.ddmmyyyy, digits }); // dedupe by date
  }
  return out;
}

/** Read committed rows so the merge can only grow. Keyed by iso. */
function readExisting(): Map<string, Row> {
  const path = join(OUT_DIR, "pick3.csv");
  const out = new Map<string, Row>();
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const cols = line.split(",");
    const mm = (cols[0] ?? "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!mm) continue;
    const [, dd, mo, yyyy] = mm;
    const digits = cols.slice(2, 5).map((c) => parseInt(c, 10));
    if (digits.length !== 3 || digits.some((d) => Number.isNaN(d))) continue;
    const iso = `${yyyy}-${mo}-${dd}`;
    out.set(iso, { iso, ddmmyyyy: `${dd}-${mo}-${yyyy}`, digits });
  }
  return out;
}

function csvFor(rows: Row[]): string {
  const lines = ["Washington Lottery - Daily Game Winning Numbers,,,,", "Draw Date,,,,"];
  for (const r of rows) lines.push(`${r.ddmmyyyy},Evening,${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  const force = process.argv.includes("--force");
  console.log(`Fetching WA Daily Game (Pick 3) — rolling 180-day window${force ? " [FORCE]" : ""}`);

  const merged = readExisting();
  const existingCount = merged.size;

  const html = await fetchHtml();
  const fresh = parseHtml(html);
  for (const [iso, row] of fresh) merged.set(iso, row); // upsert; never removes

  if (merged.size === 0) throw new Error("no draws parsed — refusing to write empty CSV");

  const rows = [...merged.values()].sort((a, b) => (a.iso < b.iso ? 1 : -1)); // newest first
  writeFileSync(join(OUT_DIR, "pick3.csv"), csvFor(rows));

  const added = merged.size - existingCount;
  console.log(
    `  pick3  ${merged.size.toLocaleString()} draws ` +
      `(${existingCount.toLocaleString()} existing, +${added.toLocaleString()} new, ${fresh.size} in window)`,
  );
  console.log(`Wrote ${OUT_DIR}/pick3.csv  (${rows[rows.length - 1]?.iso} → ${rows[0]?.iso})`);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
