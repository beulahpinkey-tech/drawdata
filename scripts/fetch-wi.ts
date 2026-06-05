/**
 * Fetch Wisconsin Lottery Pick 3 / Pick 4 draw history.
 *
 * The WI Lottery's draw history page is a Drupal "Views infinite scroll"
 * widget that emits an HTML fragment per page on POST. Sample response
 * shape for one draw:
 *
 *   <div class="winning-numbers-line pick-3">
 *     <div ... class="... date">
 *       <div>Tuesday, Midday</div>
 *       <strong>06/02/2026</strong>
 *     </div>
 *     <div ... class="... game">Pick 3</div>
 *     <div ... class="... numbers-drawn">
 *       <div class="winning-numbers small-ball">
 *         <ul>
 *           <li><div class="winning-number w1"><span class="prefix ">0</span></div></li>
 *           <li><div class="winning-number w2"><span class="prefix ">7</span></div></li>
 *           <li><div class="winning-number w3"><span class="prefix ">8</span></div></li>
 *         </ul>
 *       </div>
 *     </div>
 *   </div>
 *
 * We scrape with regex (no jsdom dep) — the markup is stable enough that
 * a targeted pattern is far lighter than parsing the full DOM.
 *
 * Pagination: the page query param walks back through history. We loop
 * page=0,1,2,… until either (a) the response contains no draws, or (b)
 * the same draws as the previous page (server-side cap). First page is
 * always re-fetched (it has today's draws); older pages are cached
 * forever — once 2015 is recorded, it never changes.
 *
 * Run:  npm run fetch:wi  [-- --max-pages 600] [-- --force]
 *
 * Writes:  data/wi/pick3.csv  data/wi/pick4.csv
 *
 * MERGE, NEVER SHRINK. wilottery.com's pagination has historically been
 * fragile — it once silently capped at page 0 (~100 rows) for weeks,
 * and because earlier versions of this script *overwrote* the output
 * with whatever it scraped, the nightly bot DESTROYED 14k+ rows of
 * Wisconsin history one commit at a time. Restored from git
 * (d30668c) on 2026-06-06 and the writer rewritten:
 *
 *   - existing data/wi/*.csv is parsed FIRST and seeded into the row set
 *   - scraped rows are unioned on (date, stream) key — new dates added,
 *     known dates skipped
 *   - the file is rewritten only if the merged set is >= the existing
 *     row count. If a scrape yields fewer rows than what's on disk and
 *     can't add any new dates, we BAIL and leave the CSV untouched.
 *
 * If you ever need to nuke the merge guard for a clean rebuild, pass
 * --force-shrink (intentionally noisy flag name).
 */

import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "wi");
const OUT_DIR = join(ROOT, "data", "wi");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

type Endpoint = {
  game: "pick3" | "pick4";
  positions: 3 | 4;
  slug: string; // URL slug used by wilottery.com
};

const ENDPOINTS: Endpoint[] = [
  { game: "pick3", positions: 3, slug: "pick-3" },
  { game: "pick4", positions: 4, slug: "pick-4" },
];

const args = process.argv.slice(2);
function argInt(flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const n = parseInt(args[i + 1] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}
const MAX_PAGES = argInt("--max-pages", 600);
const FORCE = args.includes("--force");
const FORCE_SHRINK = args.includes("--force-shrink");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchPage(slug: string, page: number, attempt = 1): Promise<string> {
  // Cache hits ONLY for historical pages — page 0 always re-fetches so
  // today's draws aren't frozen by yesterday's cache. (Same lesson as
  // the PA fetcher's current-year cache bug.)
  const cachePath = join(CACHE_DIR, `${slug}-p${page}.html`);
  if (!FORCE && page > 0 && existsSync(cachePath)) {
    return readFileSync(cachePath, "utf8");
  }

  // wilottery.com responds to POST against the page URL itself; we send
  // page=N in the form body. Drupal's standard Views infinite scroll
  // honors the `page` param the same way for GET and POST.
  const url = `https://wilottery.com/winners/draw-history?game=${slug}&page=${page}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "user-agent": UA,
        accept: "text/html, */*; q=0.01",
        "x-requested-with": "XMLHttpRequest",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        referer: `https://wilottery.com/winners/draw-history?game=${slug}`,
      },
      body: `page=${page}`,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const html = await res.text();
    if (page > 0) writeFileSync(cachePath, html);
    return html;
  } catch (err: any) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return fetchPage(slug, page, attempt + 1);
    }
    throw err;
  }
}

type Row = {
  iso: string; // YYYY-MM-DD for sorting
  ddmmyyyy: string;
  stream: "Midday" | "Evening";
  digits: number[];
};

// Each draw block is delimited by "winning-numbers-line". We split, then
// inside each block run a small targeted regex set.
const BLOCK_SPLIT = /<div\s+class="winning-numbers-line/;
const DATE_RE =
  /<div>\s*\w+\s*,\s*(Midday|Evening)\s*<\/div>\s*<strong>\s*(\d{2})\/(\d{2})\/(\d{4})\s*<\/strong>/;
const DIGIT_RE = /<span\s+class="prefix\s*"[^>]*>\s*(\d)\s*<\/span>/g;

function parseHtml(html: string, positions: number): Row[] {
  const out: Row[] = [];
  const blocks = html.split(BLOCK_SPLIT);
  for (const block of blocks) {
    const m = DATE_RE.exec(block);
    if (!m) continue;
    const stream = m[1] as "Midday" | "Evening";
    const mm = m[2];
    const dd = m[3];
    const yyyy = m[4];
    const digitMatches = [...block.matchAll(DIGIT_RE)];
    if (digitMatches.length < positions) continue;
    const digits = digitMatches
      .slice(0, positions)
      .map((dm) => parseInt(dm[1], 10));
    if (digits.some((d) => Number.isNaN(d))) continue;
    out.push({
      iso: `${yyyy}-${mm}-${dd}`,
      ddmmyyyy: `${dd}-${mm}-${yyyy}`,
      stream,
      digits,
    });
  }
  return out;
}

/**
 * Read whatever's already on disk for this game and parse it back into
 * Row[]. Tolerant: skips title rows, header rows, blank lines.
 * Returns [] if the file doesn't exist or is unreadable — callers
 * treat that as "no prior data," not as an error.
 */
function loadExistingCsv(path: string, positions: 3 | 4): Row[] {
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
    const first = cols[0].trim();
    // Title / header rows don't lead with a DD-MM-YYYY date.
    const dateM = /^(\d{2})-(\d{2})-(\d{4})$/.exec(first);
    if (!dateM) continue;
    const dd = dateM[1], mm = dateM[2], yyyy = dateM[3];
    const streamRaw = (cols[1] ?? "").trim();
    const stream: Row["stream"] =
      streamRaw === "Midday" || streamRaw === "Evening" ? streamRaw : "Midday";
    const digits: number[] = [];
    let ok = true;
    for (let i = 0; i < positions; i++) {
      const v = parseInt((cols[2 + i] ?? "").trim(), 10);
      if (!Number.isFinite(v) || v < 0 || v > 9) { ok = false; break; }
      digits.push(v);
    }
    if (!ok) continue;
    out.push({
      iso: `${yyyy}-${mm}-${dd}`,
      ddmmyyyy: `${dd}-${mm}-${yyyy}`,
      stream,
      digits,
    });
  }
  return out;
}

function csvFor(rows: Row[], positions: 3 | 4): string {
  const cols = positions === 3 ? ",,,," : ",,,,,";
  const lines = [
    `Wisconsin Lottery - Pick ${positions} Winning Numbers${cols}`,
    `Draw Date${cols}`,
  ];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function pullAll(ep: Endpoint): Promise<Row[]> {
  const all: Row[] = [];
  const seen = new Set<string>();
  let emptyStreak = 0;
  let prevSig = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    let html: string;
    try {
      html = await fetchPage(ep.slug, page);
    } catch (err: any) {
      process.stdout.write("x");
      break;
    }
    const rows = parseHtml(html, ep.positions);
    if (rows.length === 0) {
      emptyStreak++;
      process.stdout.write("·");
      // Two empty pages in a row → we've hit the end.
      if (emptyStreak >= 2) break;
      continue;
    }
    emptyStreak = 0;
    // Detect server cap: same first draw as the previous page means
    // pagination has stalled.
    const sig = `${rows[0].iso}|${rows[0].stream}`;
    if (sig === prevSig) {
      process.stdout.write("=");
      break;
    }
    prevSig = sig;
    let added = 0;
    for (const r of rows) {
      const key = `${r.iso}|${r.stream}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(r);
      added++;
    }
    if (added === 0) {
      // Full duplicate page — also a stop signal.
      process.stdout.write("=");
      break;
    }
    process.stdout.write(".");
    // Be polite on first-time fetches (cached pages skip this).
    if (!existsSync(join(CACHE_DIR, `${ep.slug}-p${page}.html`)) || page === 0) {
      await sleep(150);
    }
  }
  return all;
}

async function main() {
  console.log("Fetching Wisconsin Pick 3 / Pick 4 from wilottery.com …");
  console.log(`Cache: ${CACHE_DIR} (max ${MAX_PAGES} pages per game)`);
  const buckets: Record<"pick3" | "pick4", Row[]> = { pick3: [], pick4: [] };

  // Newest first; Evening before Midday on same date (matches the WI
  // export convention used elsewhere in DrawData).
  const sortFn = (a: Row, b: Row) => {
    if (a.iso !== b.iso) return a.iso < b.iso ? 1 : -1;
    return a.stream === "Evening" && b.stream === "Midday" ? -1 : 1;
  };

  for (const ep of ENDPOINTS) {
    const outPath = join(OUT_DIR, `${ep.game}.csv`);
    const existing = loadExistingCsv(outPath, ep.positions);
    process.stdout.write(`  ${ep.game.padEnd(6)} (on disk: ${existing.length.toLocaleString().padStart(6)}) `);

    let scraped: Row[] = [];
    try {
      scraped = await pullAll(ep);
    } catch (err: any) {
      console.warn(`\n  ${ep.game}: scrape failed (${err.message}). Leaving CSV untouched.`);
      buckets[ep.game] = existing;
      continue;
    }

    // Merge: existing seeds the set, scraped adds new (date, stream) keys.
    // We track `existingUnique` (= existing collapsed by key) separately
    // from raw `existing.length` so the shrink-guard isn't tricked by
    // pre-existing duplicate rows on disk into refusing a healthy merge.
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
    for (const r of scraped) {
      const k = `${r.iso}|${r.stream}`;
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(r);
      added++;
    }
    merged.sort(sortFn);

    process.stdout.write(`scraped ${scraped.length.toLocaleString().padStart(5)}, added ${added.toLocaleString().padStart(4)} new → ${merged.length.toLocaleString()} total\n`);

    // The merge guard: a healthy run must end with at least as many
    // UNIQUE (date, stream) keys as we started with. Dedup of duplicate
    // rows on disk is allowed; loss of history is not.
    if (!FORCE_SHRINK && merged.length < existingUnique) {
      console.warn(
        `  ${ep.game}: merge would SHRINK file (${existingUnique} unique keys → ${merged.length}). REFUSING to write. Pass --force-shrink to override.`,
      );
      buckets[ep.game] = existing;
      continue;
    }

    writeFileSync(outPath, csvFor(merged, ep.positions));
    buckets[ep.game] = merged;
  }

  const first3 = buckets.pick3[buckets.pick3.length - 1]?.iso ?? "—";
  const last3 = buckets.pick3[0]?.iso ?? "—";
  const first4 = buckets.pick4[buckets.pick4.length - 1]?.iso ?? "—";
  const last4 = buckets.pick4[0]?.iso ?? "—";

  console.log(`\nWrote ${OUT_DIR}/pick3.csv  (${buckets.pick3.length.toLocaleString()} draws, ${first3} → ${last3})`);
  console.log(`Wrote ${OUT_DIR}/pick4.csv  (${buckets.pick4.length.toLocaleString()} draws, ${first4} → ${last4})`);
  console.log(`\nRe-run any time; only page 0 (today's draws) re-fetches; older pages stay cached.`);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
