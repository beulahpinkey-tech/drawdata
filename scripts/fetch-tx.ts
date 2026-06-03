/**
 * Fetch Texas Lottery Pick 3 / Daily 4 draw history.
 *
 * Source: Texas Lottery publishes a CSV per draw time, four per game:
 *
 *   Pick 3:
 *     https://www.texaslottery.com/export/sites/lottery/Games/Pick_3/Winning_Numbers/pick3morning.csv
 *     https://www.texaslottery.com/export/sites/lottery/Games/Pick_3/Winning_Numbers/pick3day.csv
 *     https://www.texaslottery.com/export/sites/lottery/Games/Pick_3/Winning_Numbers/pick3evening.csv
 *     https://www.texaslottery.com/export/sites/lottery/Games/Pick_3/Winning_Numbers/pick3night.csv
 *
 *   Daily 4:
 *     https://www.texaslottery.com/export/sites/lottery/Games/Daily_4/Winning_Numbers/daily4morning.csv
 *     https://www.texaslottery.com/export/sites/lottery/Games/Daily_4/Winning_Numbers/daily4day.csv
 *     https://www.texaslottery.com/export/sites/lottery/Games/Daily_4/Winning_Numbers/daily4evening.csv
 *     https://www.texaslottery.com/export/sites/lottery/Games/Daily_4/Winning_Numbers/daily4night.csv
 *
 * Row format (verbatim):
 *   Pick 3:   "Pick 3 Day,9,9,2013,3,9,8,20,"
 *             game, MM, DD, YYYY, d1, d2, d3, sum, fireball
 *   Daily 4:  "Daily 4 Day,9,9,2013,3,4,0,8,15,"
 *             game, MM, DD, YYYY, d1, d2, d3, d4, sum, fireball
 *   Newer rows leave sum blank and use the last column for Fireball.
 *   We ignore sum and Fireball — only date + digits feed the analytics.
 *
 * Stream mapping — our pipeline models two draws/day (Midday + Evening).
 * Texas runs FOUR. We pick the two flagship draws as the canonical
 * Midday/Evening and skip the intra-day Morning + Evening times so the
 * output schema matches PA / NJ / WI exactly:
 *
 *   Texas "Day"   (~12:27 PM CT) → Midday
 *   Texas "Night" (~10:12 PM CT) → Evening
 *   Texas "Morning"              → skipped
 *   Texas "Evening"              → skipped
 *
 * Re-run any time. Years that are not the current year are cached under
 * .cache/tx; same idea as fetch-pa.ts. Current-year rows are never
 * cached (or we'd silently freeze at whatever was in the cache).
 *
 * Run:  npm run fetch:tx
 */

import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "tx");
const OUT_DIR = join(ROOT, "data", "tx");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

type TxStream = "morning" | "day" | "evening" | "night";

type Endpoint = {
  game: "pick3" | "pick4";
  txStream: TxStream;
  url: string;
  positions: 3 | 4;
};

const TX_PICK3_BASE =
  "https://www.texaslottery.com/export/sites/lottery/Games/Pick_3/Winning_Numbers";
const TX_DAILY4_BASE =
  "https://www.texaslottery.com/export/sites/lottery/Games/Daily_4/Winning_Numbers";

const ENDPOINTS: Endpoint[] = [
  { game: "pick3", txStream: "morning", url: `${TX_PICK3_BASE}/pick3morning.csv`, positions: 3 },
  { game: "pick3", txStream: "day",     url: `${TX_PICK3_BASE}/pick3day.csv`,     positions: 3 },
  { game: "pick3", txStream: "evening", url: `${TX_PICK3_BASE}/pick3evening.csv`, positions: 3 },
  { game: "pick3", txStream: "night",   url: `${TX_PICK3_BASE}/pick3night.csv`,   positions: 3 },
  { game: "pick4", txStream: "morning", url: `${TX_DAILY4_BASE}/daily4morning.csv`, positions: 4 },
  { game: "pick4", txStream: "day",     url: `${TX_DAILY4_BASE}/daily4day.csv`,     positions: 4 },
  { game: "pick4", txStream: "evening", url: `${TX_DAILY4_BASE}/daily4evening.csv`, positions: 4 },
  { game: "pick4", txStream: "night",   url: `${TX_DAILY4_BASE}/daily4night.csv`,   positions: 4 },
];

const args = process.argv.slice(2);
const FORCE = args.includes("--force");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchCsv(ep: Endpoint, attempt = 1): Promise<string> {
  // Texas publishes ONE CSV per stream containing the full history, so
  // unlike PA we can't shard the cache by year. We cache the whole file
  // but always re-fetch on a normal run — the file is small (a few hundred
  // KB) and we need today's draws. The cache exists only to survive a
  // transient 5xx: --force means "re-fetch even if cache exists" but on
  // a clean run with no --force we still fetch fresh and overwrite the
  // cache; the saved copy is just a last-known-good for retries.
  const cachePath = join(CACHE_DIR, `${ep.game}-${ep.txStream}.csv`);
  try {
    const res = await fetch(ep.url, {
      headers: {
        "user-agent":
          "DrawData/1.0 (Texas-lottery-analytics; +https://draw-data.com)",
        accept: "text/csv,*/*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const raw = await res.text();
    if (!raw || raw.length < 32) throw new Error("response too small");
    writeFileSync(cachePath, raw);
    return raw;
  } catch (err: any) {
    if (attempt < 3) {
      await sleep(400 * attempt);
      return fetchCsv(ep, attempt + 1);
    }
    if (existsSync(cachePath)) {
      console.warn(
        `\n  ${ep.game} ${ep.txStream}: live fetch failed (${err.message}); falling back to cached copy.`,
      );
      return readFileSync(cachePath, "utf8");
    }
    throw err;
  }
}

type Row = { iso: string; ddmmyyyy: string; stream: "Midday" | "Evening"; digits: number[] };

// Texas-stream → our two-draw model. Anything not Day/Night is dropped.
function mapStream(tx: TxStream): "Midday" | "Evening" | null {
  if (tx === "day") return "Midday";
  if (tx === "night") return "Evening";
  return null;
}

function parseCsv(raw: string, ep: Endpoint): Row[] {
  const out: Row[] = [];
  const targetStream = mapStream(ep.txStream);
  if (!targetStream) return out; // Morning / Evening: skipped entirely
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    const cols = line.split(",");
    // expected layout: name, MM, DD, YYYY, d1..dN, [sum], [fireball]
    if (cols.length < 4 + ep.positions) continue;
    const mm = parseInt(cols[1], 10);
    const dd = parseInt(cols[2], 10);
    const yyyy = parseInt(cols[3], 10);
    if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yyyy)) continue;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1990 || yyyy > 2100) continue;
    const digits: number[] = [];
    let ok = true;
    for (let i = 0; i < ep.positions; i++) {
      const v = parseInt(cols[4 + i], 10);
      if (!Number.isFinite(v) || v < 0 || v > 9) { ok = false; break; }
      digits.push(v);
    }
    if (!ok) continue;
    const mmS = String(mm).padStart(2, "0");
    const ddS = String(dd).padStart(2, "0");
    out.push({
      iso: `${yyyy}-${mmS}-${ddS}`,
      ddmmyyyy: `${ddS}-${mmS}-${yyyy}`,
      stream: targetStream,
      digits,
    });
  }
  return out;
}

function csvFor(rows: Row[], positions: 3 | 4): string {
  const cols = positions === 3 ? ",,,," : ",,,,,";
  const lines = [
    `Texas Lottery - Pick ${positions} Winning Numbers${cols}`,
    `Draw Date${cols}`,
  ];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  console.log(`Fetching TX Pick 3 / Daily 4 history${FORCE ? " [FORCE refetch]" : ""}`);
  console.log(`Cache: ${CACHE_DIR}`);
  const buckets: Record<"pick3" | "pick4", Row[]> = { pick3: [], pick4: [] };

  for (const ep of ENDPOINTS) {
    const label = `${ep.game} ${ep.txStream}`.padEnd(18);
    process.stdout.write(`  ${label} `);
    try {
      const raw = await fetchCsv(ep);
      const rows = parseCsv(raw, ep);
      buckets[ep.game].push(...rows);
      const kept = rows.length;
      const note = mapStream(ep.txStream)
        ? `${kept.toLocaleString().padStart(6)} kept`
        : `      skipped (intra-day draw)`;
      process.stdout.write(`${note}\n`);
    } catch (err: any) {
      process.stdout.write(`FAILED: ${err.message}\n`);
      throw err;
    }
    await sleep(150);
  }

  // newest first; for same date, Evening before Midday (matches PA/NJ output)
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
