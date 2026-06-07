/**
 * Fetch North Carolina Education Lottery Pick 3 / Pick 4 draw history.
 *
 * Source: NC Lottery publishes one CSV per game from their past-results
 * page. No API key, no auth, full history in one file:
 *
 *   Pick 3: https://www.nclottery.com/pick3-download
 *   Pick 4: https://www.nclottery.com/pick4-download
 *
 * Row formats (verified 2026-06-06):
 *   Pick 3: "Date","Day/Eve","Ball 1","Ball 2","Ball 3","Fireball","GreenBall","DoubleDraw*"
 *           "06/06/2026","D","4","7","2","4","",""
 *   Pick 4: "Date","Day/Eve","Ball 1","Ball 2","Ball 3","Ball 4","Fireball"
 *           "06/06/2026","D","8","1","5","5","8"
 *
 * NC runs two draws daily — Day (D) and Evening (E) — which maps
 * cleanly to our Midday / Evening model (no skipping like TX).
 * Fireball / GreenBall / DoubleDraw are ignored — only date + digits
 * feed analytics.
 *
 * Coverage at first fetch:
 *   Pick 3: 2023-01-16 onward (~3.5 years)
 *   Pick 4: 2022-10-30 onward
 *
 * Like fetch-tx.ts: we cache the whole CSV under .cache/nc as a
 * last-known-good for transient 5xx, but a normal run always re-fetches
 * fresh and overwrites the cache. --force re-fetches even if a cache
 * exists (no behavior change on a clean run).
 *
 * Run:  npm run fetch:nc
 */

import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "nc");
const OUT_DIR = join(ROOT, "data", "nc");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

type Endpoint = {
  game: "pick3" | "pick4";
  url: string;
  positions: 3 | 4;
};

const ENDPOINTS: Endpoint[] = [
  { game: "pick3", url: "https://www.nclottery.com/pick3-download", positions: 3 },
  { game: "pick4", url: "https://www.nclottery.com/pick4-download", positions: 4 },
];

const args = process.argv.slice(2);
const FORCE = args.includes("--force");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchCsv(ep: Endpoint, attempt = 1): Promise<string> {
  const cachePath = join(CACHE_DIR, `${ep.game}.csv`);
  try {
    const res = await fetch(ep.url, {
      headers: {
        "user-agent":
          "DrawData/1.0 (NorthCarolina-lottery-analytics; +https://draw-data.com)",
        accept: "text/csv,application/vnd.ms-excel,*/*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const raw = await res.text();
    if (!raw || raw.length < 64) throw new Error("response too small");
    writeFileSync(cachePath, raw);
    return raw;
  } catch (err: any) {
    if (attempt < 3) {
      await sleep(400 * attempt);
      return fetchCsv(ep, attempt + 1);
    }
    if (existsSync(cachePath)) {
      console.warn(
        `\n  ${ep.game}: live fetch failed (${err.message}); using cached copy.`,
      );
      return readFileSync(cachePath, "utf8");
    }
    throw err;
  }
}

type Row = { iso: string; ddmmyyyy: string; stream: "Midday" | "Evening"; digits: number[] };

// NC quotes every field, so values arrive as `"06/06/2026"`. Strip them.
function unquote(s: string): string {
  return s.trim().replace(/^"(.*)"$/, "$1");
}

function parseCsv(raw: string, ep: Endpoint): Row[] {
  const out: Row[] = [];
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    const cols = line.split(",").map(unquote);
    if (cols.length < 2 + ep.positions) continue;
    const date = cols[0];
    // First row is the header — "Date" never matches MM/DD/YYYY.
    const dateM = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date);
    if (!dateM) continue;
    const mm = dateM[1].padStart(2, "0");
    const dd = dateM[2].padStart(2, "0");
    const yyyy = dateM[3];

    const code = cols[1].toUpperCase();
    const stream: "Midday" | "Evening" =
      code === "D" ? "Midday" : code === "E" ? "Evening" : (() => null as never)();
    // Defensive: silently skip anything that isn't D/E (e.g. future
    // header changes or a "DD" double-draw row).
    if (stream === undefined) continue;

    const digits: number[] = [];
    let ok = true;
    for (let i = 0; i < ep.positions; i++) {
      const v = parseInt(cols[2 + i], 10);
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
    `North Carolina Lottery - Pick ${positions} Winning Numbers${cols}`,
    `Draw Date${cols}`,
  ];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  console.log(`Fetching NC Pick 3 / Pick 4 history${FORCE ? " [FORCE refetch]" : ""}`);
  console.log(`Cache: ${CACHE_DIR}`);
  const buckets: Record<"pick3" | "pick4", Row[]> = { pick3: [], pick4: [] };

  for (const ep of ENDPOINTS) {
    const label = ep.game.padEnd(6);
    process.stdout.write(`  ${label} `);
    try {
      const raw = await fetchCsv(ep);
      const rows = parseCsv(raw, ep);
      buckets[ep.game] = rows;
      process.stdout.write(`${rows.length.toLocaleString().padStart(6)} draws\n`);
    } catch (err: any) {
      process.stdout.write(`FAILED: ${err.message}\n`);
      throw err;
    }
    await sleep(150);
  }

  // newest first; Evening before Midday on same date (matches PA/NJ/TX)
  const sortFn = (a: Row, b: Row) => {
    if (a.iso !== b.iso) return a.iso < b.iso ? 1 : -1;
    return a.stream === "Evening" && b.stream === "Midday" ? -1 : 1;
  };
  buckets.pick3.sort(sortFn);
  buckets.pick4.sort(sortFn);

  writeFileSync(join(OUT_DIR, "pick3.csv"), csvFor(buckets.pick3, 3));
  writeFileSync(join(OUT_DIR, "pick4.csv"), csvFor(buckets.pick4, 4));

  const fmt = (rows: Row[]) =>
    rows.length === 0
      ? "—"
      : `${rows[rows.length - 1].iso} → ${rows[0].iso} (${rows.length.toLocaleString()} draws)`;

  console.log(`\nWrote ${OUT_DIR}/pick3.csv  ${fmt(buckets.pick3)}`);
  console.log(`Wrote ${OUT_DIR}/pick4.csv  ${fmt(buckets.pick4)}`);
  console.log(`\nDone.`);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
