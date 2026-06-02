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
 * Writes:  data/wi/pick3.csv  data/wi/pick4.csv  (overwrites)
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

  for (const ep of ENDPOINTS) {
    process.stdout.write(`  ${ep.game.padEnd(6)} `);
    const rows = await pullAll(ep);
    buckets[ep.game] = rows;
    process.stdout.write(`  ${rows.length.toLocaleString().padStart(7)} draws\n`);
  }

  // Newest first; Evening before Midday on same date (matches the WI
  // export convention used elsewhere in DrawData).
  const sortFn = (a: Row, b: Row) => {
    if (a.iso !== b.iso) return a.iso < b.iso ? 1 : -1;
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
  console.log(`\nRe-run any time; only page 0 (today's draws) re-fetches; older pages stay cached.`);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
