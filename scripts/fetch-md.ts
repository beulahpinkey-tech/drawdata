/**
 * Fetch Maryland Lottery Pick 3 / Pick 4 draw history.
 *
 * Source: mdlottery.com winning-numbers page (server-rendered HTML).
 *   https://www.mdlottery.com/games/pick-3/winning-numbers/
 *
 * One page carries the whole reachable window for BOTH games — Maryland
 * renders Pick 3, Pick 4 and Pick 5 as three columns of a single table —
 * so this is a one-request fetcher despite being a scrape.
 *
 * The markup is genuinely self-describing, which is what makes it safe:
 *
 *   <table id="table_pick-3-4-5">
 *     <tr class="mid">
 *       <td class="date">08/16/26&nbsp;<span>Midday</span></td>
 *       <td class="numbers"><ul class="pick-3">
 *         <li>5</li><li class="hidden"> + </li><li>6</li>…</ul></td>
 *       <td class="numbers"><ul class="pick-4">…</ul></td>
 *
 * The row class (`mid` / `eve`) states the stream outright, so it is never
 * inferred from ordering, and each game's digits are scoped to their own
 * `<ul class="pick-N">` rather than read positionally off the row.
 *
 * Constraints that shape this fetcher:
 *   • ROLLING WINDOW, ~7 MONTHS (~211 dates). There is no pagination, no
 *     date parameter and no archive, so deep backfill is impossible from
 *     this source. The writer is MERGE-ONLY and history accumulates
 *     forward from first run, exactly like the California fetcher.
 *   • Dates are MM/DD/YY with a TWO-DIGIT YEAR. Within a 7-month window
 *     the century is unambiguous, but it is pinned to 20xx explicitly
 *     rather than left to Date parsing.
 *   • A draw that hasn't happened yet renders as <li>-</li>. Those rows
 *     must be skipped, not read as zeros — the evening row for the current
 *     date is normally pending when the midday refresh runs.
 *   • Maryland also runs Pick 5 in the same table; that column is ignored.
 *
 * Output matches the NJ CSV shape so parsePick() reads it unchanged.
 *
 * Run:  npm run fetch:md
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "data", "md");
mkdirSync(OUT_DIR, { recursive: true });

const URL_ = "https://www.mdlottery.com/games/pick-3/winning-numbers/";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = { iso: string; ddmmyyyy: string; stream: "Midday" | "Evening"; digits: number[] };

async function fetchPage(attempt = 1): Promise<string> {
  try {
    const res = await fetch(URL_, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const html = await res.text();
    if (!html.includes("table_pick-3-4-5")) {
      throw new Error("pick-3-4-5 table missing — page shape changed or request was blocked");
    }
    return html;
  } catch (err) {
    if (attempt < 4) {
      await sleep(600 * attempt);
      return fetchPage(attempt + 1);
    }
    throw err;
  }
}

/** "08/16/26" → { iso, ddmmyyyy }. Two-digit year is pinned to 20xx. */
function parseDate(s: string): { iso: string; ddmmyyyy: string } | null {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  const [, mm, dd, yy] = m;
  const yyyy = `20${yy}`;
  return { iso: `${yyyy}-${mm}-${dd}`, ddmmyyyy: `${dd}-${mm}-${yyyy}` };
}

/** Digits inside this row's <ul class="pick-N">. Separator <li>s carry a
 *  class and a " + ", so a bare <li>digit</li> match skips them cleanly.
 *  A pending draw renders <li>-</li> and yields nothing. */
function digitsFor(rowHtml: string, game: 3 | 4): number[] | null {
  const ul = rowHtml.match(new RegExp(`<ul[^>]*class="pick-${game}"[^>]*>([\\s\\S]*?)</ul>`, "i"));
  if (!ul) return null;
  const digits = [...ul[1].matchAll(/<li>\s*(\d)\s*<\/li>/g)].map((m) => parseInt(m[1], 10));
  return digits.length === game ? digits : null;
}

function parse(html: string): { pick3: Row[]; pick4: Row[]; pending: number } {
  // Scope to the pick-3-4-5 table; the page renders 8 game tables.
  const tStart = html.indexOf('<table id="table_pick-3-4-5"');
  if (tStart === -1) throw new Error("pick-3-4-5 table not found");
  const tEnd = html.indexOf("</table>", tStart);
  const table = html.slice(tStart, tEnd === -1 ? undefined : tEnd);

  const pick3: Row[] = [];
  const pick4: Row[] = [];
  let pending = 0;

  for (const m of table.matchAll(/<tr\s+class="(mid|eve)"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const stream: "Midday" | "Evening" = m[1].toLowerCase() === "mid" ? "Midday" : "Evening";
    const row = m[2];
    const dm = row.match(/class="date"[^>]*>\s*(\d{2}\/\d{2}\/\d{2})/);
    if (!dm) continue;
    const d = parseDate(dm[1]);
    if (!d) continue;
    const d3 = digitsFor(row, 3);
    const d4 = digitsFor(row, 4);
    if (!d3 && !d4) {
      pending++;
      continue;
    }
    if (d3) pick3.push({ ...d, stream, digits: d3 });
    if (d4) pick4.push({ ...d, stream, digits: d4 });
  }
  return { pick3, pick4, pending };
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
  const pad = positions === 3 ? ",,,," : ",,,,,";
  const lines = [`Maryland Lottery - Pick ${positions} Winning Numbers${pad}`, `Draw Date${pad}`];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  console.log("Fetching MD Pick 3 / Pick 4 (rolling ~7-month window)");
  console.log(`Source: ${URL_}`);

  const html = await fetchPage();
  const { pick3, pick4, pending } = parse(html);

  for (const [game, positions, fetched] of [
    ["pick3", 3, pick3],
    ["pick4", 4, pick4],
  ] as Array<["pick3" | "pick4", 3 | 4, Row[]]>) {
    const merged = readExisting(game, positions);
    const existingCount = merged.size;
    for (const r of fetched) merged.set(`${r.iso}|${r.stream}`, r); // upsert; never removes

    const rows = [...merged.values()].sort((a, b) =>
      a.iso !== b.iso ? (a.iso < b.iso ? 1 : -1) : a.stream === "Evening" ? -1 : 1,
    );
    if (rows.length === 0) throw new Error(`${game}: no draws — refusing to write empty CSV`);
    writeFileSync(join(OUT_DIR, `${game}.csv`), csvFor(rows, positions));

    const added = merged.size - existingCount;
    console.log(
      `  ${game.padEnd(6)} ${merged.size.toLocaleString().padStart(7)} draws ` +
        `(${existingCount.toLocaleString()} existing, +${added.toLocaleString()} new, ${fetched.length} in window)`,
    );
    console.log(`         ${rows[rows.length - 1]?.iso} → ${rows[0]?.iso}`);
  }
  if (pending) console.log(`         ${pending} row(s) skipped as not-yet-drawn`);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
