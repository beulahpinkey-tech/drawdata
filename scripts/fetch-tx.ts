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
 * Stream mapping — Texas runs FOUR draws a day (Mon–Sat) and we keep all
 * of them under their real names:
 *
 *   Texas "Morning" (~10:00 AM CT) → Morning
 *   Texas "Day"     (~12:27 PM CT) → Midday
 *   Texas "Evening" (~6:00 PM CT)  → Evening
 *   Texas "Night"   (~10:12 PM CT) → Night
 *
 * HISTORY: until Nov 2026 this fetcher kept only Day + Night and stored
 * Night as "Evening" (the app then modelled two draws a day), so half of
 * Texas was missing and the Night draws were mislabelled. On first run
 * against a file in that legacy shape (no Morning and no Night rows), its
 * "Evening" rows are relabelled Night before merging.
 *
 * The writer is MERGE-ONLY and VERIFIED: every draw already on disk must
 * either be absent from the fresh download (then it is kept as-is) or match
 * it exactly. Any disagreement aborts without writing, and draws are never
 * removed, so a short upstream file can no longer delete history.
 *
 * The cache under .cache/tx is only a last-known-good copy for retries;
 * every normal run re-downloads (we need today's draws).
 *
 * Run:  npm run fetch:tx
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".cache", "tx");
const OUT_DIR = join(ROOT, "data", "tx");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

type TxStream = "morning" | "day" | "evening" | "night";
type Endpoint = { game: "pick3" | "pick4"; txStream: TxStream; url: string; positions: 3 | 4 };

const TX_PICK3_BASE = "https://www.texaslottery.com/export/sites/lottery/Games/Pick_3/Winning_Numbers";
const TX_DAILY4_BASE = "https://www.texaslottery.com/export/sites/lottery/Games/Daily_4/Winning_Numbers";

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
  const cachePath = join(CACHE_DIR, `${ep.game}-${ep.txStream}.csv`);
  try {
    const res = await fetch(ep.url, {
      headers: {
        "user-agent": "DrawData/1.0 (Texas-lottery-analytics; +https://draw-data.com)",
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
      console.warn(`\n  ${ep.game} ${ep.txStream}: live fetch failed (${err.message}); falling back to cached copy.`);
      return readFileSync(cachePath, "utf8");
    }
    throw err;
  }
}

type OurStream = "Morning" | "Midday" | "Evening" | "Night";
type Row = { iso: string; ddmmyyyy: string; stream: OurStream; digits: number[] };

const STREAM_OF: Record<TxStream, OurStream> = {
  morning: "Morning",
  day: "Midday",
  evening: "Evening",
  night: "Night",
};
/** Newest-first order within one day. */
const STREAM_RANK: Record<OurStream, number> = { Night: 0, Evening: 1, Midday: 2, Morning: 3 };

const keyOf = (r: Row) => `${r.iso}|${r.stream}`;
const digitsOf = (r: Row) => r.digits.join("");

function parseCsv(raw: string, ep: Endpoint): Row[] {
  const out: Row[] = [];
  const stream = STREAM_OF[ep.txStream];
  for (const line of raw.split(/\r?\n/)) {
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
    out.push({ iso: `${yyyy}-${mmS}-${ddS}`, ddmmyyyy: `${ddS}-${mmS}-${yyyy}`, stream, digits });
  }
  return out;
}

function readExisting(game: "pick3" | "pick4", positions: 3 | 4): Row[] {
  const path = join(OUT_DIR, `${game}.csv`);
  if (!existsSync(path)) return [];
  const rows: Row[] = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const cols = line.split(",");
    const m = (cols[0] ?? "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) continue;
    const [, dd, mo, yyyy] = m;
    const stream = (cols[1] ?? "").trim() as OurStream;
    if (!(stream in STREAM_RANK)) continue;
    const digits = cols.slice(2, 2 + positions).map((c) => parseInt(c, 10));
    if (digits.length !== positions || digits.some((x) => Number.isNaN(x))) continue;
    rows.push({ iso: `${yyyy}-${mo}-${dd}`, ddmmyyyy: `${dd}-${mo}-${yyyy}`, stream, digits });
  }
  // Legacy two-draw file: its "Evening" rows were really Texas Night draws.
  if (rows.length && !rows.some((r) => r.stream === "Morning" || r.stream === "Night")) {
    for (const r of rows) if (r.stream === "Evening") r.stream = "Night";
    console.log(`  ${game}: legacy two-draw file, relabelled its Evening rows as Night`);
  }
  return rows;
}

function csvFor(rows: Row[], positions: 3 | 4): string {
  const cols = positions === 3 ? ",,,," : ",,,,,";
  const lines = [`Texas Lottery - Pick ${positions} Winning Numbers${cols}`, `Draw Date${cols}`];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  console.log(`Fetching TX Pick 3 / Daily 4 history, all four daily draws${FORCE ? " [FORCE refetch]" : ""}`);
  const fresh: Record<"pick3" | "pick4", Map<string, Row>> = { pick3: new Map(), pick4: new Map() };
  const problems: string[] = [];

  for (const ep of ENDPOINTS) {
    process.stdout.write(`  ${`${ep.game} ${ep.txStream}`.padEnd(18)} `);
    const rows = parseCsv(await fetchCsv(ep), ep);
    if (rows.length === 0) throw new Error(`${ep.game} ${ep.txStream}: no draws in ${ep.url}`);
    let dupes = 0;
    for (const r of rows) {
      const have = fresh[ep.game].get(keyOf(r));
      if (!have) { fresh[ep.game].set(keyOf(r), r); continue; }
      dupes++;
      if (digitsOf(have) !== digitsOf(r)) {
        problems.push(`${ep.game} ${keyOf(r)} listed twice upstream with different digits (${digitsOf(have)} / ${digitsOf(r)})`);
      }
    }
    console.log(`${rows.length.toLocaleString().padStart(6)} draws${dupes ? ` (${dupes} duplicate line(s) ignored)` : ""}`);
    await sleep(150);
  }

  const out: Record<"pick3" | "pick4", Row[]> = { pick3: [], pick4: [] };
  for (const [game, positions] of [["pick3", 3], ["pick4", 4]] as const) {
    const merged = new Map(fresh[game]);
    let keptOnlyOnDisk = 0;
    for (const r of readExisting(game, positions)) {
      const f = merged.get(keyOf(r));
      if (!f) { merged.set(keyOf(r), r); keptOnlyOnDisk++; continue; }
      if (digitsOf(f) !== digitsOf(r)) {
        problems.push(`${game} ${keyOf(r)}: disk ${digitsOf(r)} vs texaslottery.com ${digitsOf(f)}`);
      }
    }
    out[game] = [...merged.values()].sort((a, b) =>
      a.iso !== b.iso ? (a.iso < b.iso ? 1 : -1) : STREAM_RANK[a.stream] - STREAM_RANK[b.stream],
    );
    if (keptOnlyOnDisk) console.log(`  ${game}: kept ${keptOnlyOnDisk} draw(s) on disk that today's download lacks`);
  }

  if (problems.length) {
    throw new Error(`refusing to write, ${problems.length} disagreement(s):\n  ${problems.slice(0, 8).join("\n  ")}`);
  }

  writeFileSync(join(OUT_DIR, "pick3.csv"), csvFor(out.pick3, 3));
  writeFileSync(join(OUT_DIR, "pick4.csv"), csvFor(out.pick4, 4));

  const fmt = (rows: Row[]) =>
    rows.length === 0 ? "none" : `${rows[rows.length - 1].iso} → ${rows[0].iso} (${rows.length.toLocaleString()} draws)`;
  console.log(`\nWrote data/tx/pick3.csv  ${fmt(out.pick3)}`);
  console.log(`Wrote data/tx/pick4.csv  ${fmt(out.pick4)}`);
}

main().catch((err) => {
  console.error("\nFAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
