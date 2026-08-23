/**
 * Fetch Colorado Lottery Pick 3 draw history.
 *
 * Source: coloradolottery.com month-addressable drawing archive.
 *   https://www.coloradolottery.com/en/games/pick3/drawings/YYYY-MM/
 *
 * Colorado runs Pick 3 only — there is no 4-digit game — so this state
 * ships pick3 alone (like Washington's Daily Game).
 *
 * Why this is a scrape and not an API: Colorado exposes no JSON endpoint,
 * but the archive is unusually well-behaved for HTML — every month has its
 * own stable URL, so the whole history is ~161 requests with no pagination,
 * no captcha, and no WAF. Completed months are cached and fetched once.
 *
 * The markup is self-describing, which is what makes this safe to parse:
 *
 *   <div class="drawing">
 *     <div class="date">
 *       <a href="/en/games/pick3/drawings/2026-07-31:EV/"> July 31, 2026: Evening</a>
 *     </div>
 *     <div class="draws"><div class="draw">
 *       <div class="numbers-and-jackpot">
 *         <p class="draw"><span>3</span><span>2</span><span>3</span></p>
 *
 * The permalink carries BOTH the ISO date and an explicit stream code
 * (:EV / :MD), so neither has to be inferred from position or ordering —
 * we key off the href and never off the human-readable date text.
 *
 * Constraints that shape this fetcher:
 *   • History starts 2013-04-28. Earlier months return a valid page with
 *     zero drawings, so "empty month" is normal and must not abort.
 *   • Colorado was EVENING-ONLY until December 2016, when the Midday draw
 *     was added. Both eras are handled by reading the stream code; no
 *     assumption about draws-per-day is baked in.
 *   • `class="draw"` appears on BOTH the wrapper div and the inner <p>
 *     holding the digits. We match the <p> specifically — matching the div
 *     would swallow the title text and yield junk.
 *
 * Output matches the NJ CSV shape so parsePick() reads it unchanged.
 *
 * Run:  npm run fetch:co  [-- --from 2013-04] [-- --force]
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "co");
const OUT_DIR = join(ROOT, "data", "co");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const BASE = "https://www.coloradolottery.com/en/games/pick3/drawings";
const FIRST_MONTH = "2013-04"; // first month with any drawing (2013-04-28)

const args = process.argv.slice(2);
function argStr(flag: string, fallback: string): string {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : (args[i + 1] ?? fallback);
}
const FORCE = args.includes("--force");
const START_MONTH = argStr("--from", FIRST_MONTH);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad2 = (n: number) => String(n).padStart(2, "0");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type Row = { iso: string; ddmmyyyy: string; stream: "Midday" | "Evening"; digits: number[] };

/**
 * One entry per drawing on the page. Split on the drawing wrapper first so a
 * date can never pair with a neighbouring block's digits.
 */
function parseMonth(html: string): Row[] {
  const rows: Row[] = [];
  for (const block of html.split(/<!--\s*Start:\s*Drawing\s*-->/i).slice(1)) {
    const head = block.match(/drawings\/(\d{4}-\d{2}-\d{2}):(EV|MD)\//);
    if (!head) continue;
    const iso = head[1];
    const stream: "Midday" | "Evening" = head[2] === "MD" ? "Midday" : "Evening";
    // Digits live in <p class="draw"> — NOT the enclosing <div class="draw">.
    const p = block.match(/<p[^>]*class="draw"[^>]*>([\s\S]*?)<\/p>/i);
    if (!p) continue;
    const digits = [...p[1].matchAll(/<span[^>]*>\s*(\d)\s*<\/span>/g)].map((m) => parseInt(m[1], 10));
    if (digits.length !== 3 || digits.some(Number.isNaN)) continue;
    const [yyyy, mo, dd] = iso.split("-");
    rows.push({ iso, ddmmyyyy: `${dd}-${mo}-${yyyy}`, stream, digits });
  }
  return rows;
}

async function fetchMonth(ym: string, attempt = 1): Promise<Row[]> {
  const cachePath = join(CACHE_DIR, `${ym}.json`);
  const now = new Date();
  const isCurrent = ym === `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`;
  if (!FORCE && !isCurrent && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8")) as Row[];
  }
  try {
    const res = await fetch(`${BASE}/${ym}/`, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const html = await res.text();
    // Guard against a shell/error page being cached as a legitimately empty
    // month: a real archive page always renders the history container.
    if (!/recent-drawings|drawingHistory/i.test(html)) {
      throw new Error(`${ym}: no drawing container — unexpected page shape`);
    }
    const rows = parseMonth(html);
    if (!isCurrent) writeFileSync(cachePath, JSON.stringify(rows));
    return rows;
  } catch (err) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return fetchMonth(ym, attempt + 1);
    }
    throw err;
  }
}

function readExisting(): Map<string, Row> {
  const path = join(OUT_DIR, "pick3.csv");
  const out = new Map<string, Row>();
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const cols = line.split(",");
    const m = (cols[0] ?? "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) continue;
    const [, dd, mo, yyyy] = m;
    const stream = cols[1]?.trim() === "Midday" ? "Midday" : "Evening";
    const digits = cols.slice(2, 5).map((c) => parseInt(c, 10));
    if (digits.length !== 3 || digits.some((d) => Number.isNaN(d))) continue;
    const iso = `${yyyy}-${mo}-${dd}`;
    out.set(`${iso}|${stream}`, { iso, ddmmyyyy: `${dd}-${mo}-${yyyy}`, stream, digits });
  }
  return out;
}

function csvFor(rows: Row[]): string {
  const lines = ["Colorado Lottery - Pick 3 Winning Numbers,,,,", "Draw Date,,,,"];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

/** Every YYYY-MM from start through the current month, inclusive. */
function monthsFrom(start: string): string[] {
  const [sy, sm] = start.split("-").map((n) => parseInt(n, 10));
  const now = new Date();
  const ey = now.getUTCFullYear();
  const em = now.getUTCMonth() + 1;
  const out: string[] = [];
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em); m === 12 ? (m = 1, y++) : m++) {
    out.push(`${y}-${pad2(m)}`);
  }
  return out;
}

async function main() {
  const months = monthsFrom(START_MONTH);
  console.log(`Fetching CO Pick 3 — ${months.length} months from ${START_MONTH}${FORCE ? " [FORCE]" : ""}`);
  console.log(`Cache: ${CACHE_DIR}`);

  const merged = readExisting();
  const existingCount = merged.size;
  let fetched = 0;
  let emptyMonths = 0;

  process.stdout.write("  ");
  for (const ym of months) {
    const rows = await fetchMonth(ym);
    if (rows.length === 0) emptyMonths++;
    for (const r of rows) merged.set(`${r.iso}|${r.stream}`, r); // upsert; never removes
    fetched += rows.length;
    process.stdout.write(".");
    await sleep(90);
  }
  process.stdout.write("\n");

  const rows = [...merged.values()].sort((a, b) =>
    a.iso !== b.iso ? (a.iso < b.iso ? 1 : -1) : a.stream === "Evening" ? -1 : 1,
  );
  if (rows.length === 0) throw new Error("pick3: no draws — refusing to write empty CSV");
  writeFileSync(join(OUT_DIR, "pick3.csv"), csvFor(rows));

  const added = merged.size - existingCount;
  const midday = rows.filter((r) => r.stream === "Midday").length;
  console.log(
    `  pick3  ${merged.size.toLocaleString().padStart(7)} draws ` +
      `(${existingCount.toLocaleString()} existing, +${added.toLocaleString()} new, ${fetched.toLocaleString()} in window)`,
  );
  console.log(`         ${rows[rows.length - 1]?.iso} → ${rows[0]?.iso}`);
  console.log(`         ${midday.toLocaleString()} midday / ${(rows.length - midday).toLocaleString()} evening`);
  if (emptyMonths) console.log(`         ${emptyMonths} month(s) with no drawings (pre-2013-04 range)`);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
