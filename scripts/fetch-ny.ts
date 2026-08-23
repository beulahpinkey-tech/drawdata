/**
 * Fetch New York Lottery Numbers (Pick 3) / Win-4 (Pick 4) draw history.
 *
 * Source: NY State open data (Socrata SODA v2) — the official state portal,
 * not a scrape of the lottery site.
 *   https://data.ny.gov/resource/hsys-3def.json
 *   "Lottery Daily Numbers/Win-4 Winning Numbers: Beginning 1980"
 *
 * This is the cleanest upstream in the project: no captcha, no WAF, no
 * browser-like headers needed, and the whole 16k-row history comes back in
 * one or two requests. Unlike CA/IL there is no rolling-window limit, so a
 * full backfill to 1980-09-02 is a single run.
 *
 * Shape — ONE row per calendar date, carrying up to four draws:
 *   { draw_date: "2026-08-15T00:00:00.000",
 *     midday_daily: "523", evening_daily: "225",
 *     midday_win_4: "974", evening_win_4: "3836" }
 *
 * Constraints that shape this fetcher:
 *   • Digits are stored as NUMBERS-as-strings with LEADING ZEROS STRIPPED.
 *     "21" is the Numbers draw 0-2-1, and "579" is the Win-4 draw 0-5-7-9.
 *     Left-pad to the game width before splitting or the digits silently
 *     shift a position. This is the one real trap in this dataset.
 *   • Fields are OMITTED, not null, when a draw didn't happen. Midday draws
 *     only start in the 1990s, so early rows carry evening_* alone.
 *   • Both games live in the same table, so one fetch fills pick3 + pick4.
 *
 * Output matches the NJ CSV shape so parsePick() reads it unchanged.
 *
 * Run:  npm run fetch:ny  [-- --from 1980]
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "data", "ny");
mkdirSync(OUT_DIR, { recursive: true });

const BASE = "https://data.ny.gov/resource/hsys-3def.json";
const PAGE = 50_000; // Socrata's max page size; the table is ~16.7k rows

const args = process.argv.slice(2);
function argInt(flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const n = parseInt(args[i + 1] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}
const START_YEAR = argInt("--from", 1980);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type RawRow = {
  draw_date?: string;
  midday_daily?: string;
  evening_daily?: string;
  midday_win_4?: string;
  evening_win_4?: string;
};

type Row = { iso: string; ddmmyyyy: string; stream: "Midday" | "Evening"; digits: number[] };

/** Column → which CSV each draw belongs in, and its stream label. */
const COLUMNS: Array<{
  field: keyof RawRow;
  game: "pick3" | "pick4";
  positions: 3 | 4;
  stream: "Midday" | "Evening";
}> = [
  { field: "midday_daily", game: "pick3", positions: 3, stream: "Midday" },
  { field: "evening_daily", game: "pick3", positions: 3, stream: "Evening" },
  { field: "midday_win_4", game: "pick4", positions: 4, stream: "Midday" },
  { field: "evening_win_4", game: "pick4", positions: 4, stream: "Evening" },
];

/**
 * "21" + width 3 → [0, 2, 1]. Returns null for anything that isn't a run of
 * digits fitting the game width — a longer-than-width value means the upstream
 * shape changed and guessing would corrupt the series.
 */
function toDigits(raw: string | undefined, width: 3 | 4): number[] | null {
  const v = (raw ?? "").trim();
  if (v === "" || !/^\d+$/.test(v) || v.length > width) return null;
  return v.padStart(width, "0").split("").map((c) => parseInt(c, 10));
}

async function fetchPage(offset: number, attempt = 1): Promise<RawRow[]> {
  // Built with URLSearchParams: the SoQL clauses carry spaces, quotes and
  // ">=", and hand-rolled escaping of those is what makes Socrata 400.
  const qs = new URLSearchParams({
    $select: "draw_date,midday_daily,evening_daily,midday_win_4,evening_win_4",
    $where: `draw_date >= '${START_YEAR}-01-01T00:00:00'`,
    $order: "draw_date ASC",
    $limit: String(PAGE),
    $offset: String(offset),
  });
  try {
    const res = await fetch(`${BASE}?${qs}`, {
      headers: {
        accept: "application/json",
        "user-agent": "DrawData/1.0 (NewYork-lottery-analytics; +https://draw-data.com)",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return (await res.json()) as RawRow[];
  } catch (err) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return fetchPage(offset, attempt + 1);
    }
    throw err;
  }
}

/** Existing CSV rows, keyed date|stream, so a re-run never loses history. */
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
  const label = positions === 3 ? "Numbers" : "Win 4";
  const lines = [`New York Lottery - ${label} Winning Numbers${pad}`, `Draw Date${pad}`];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function main() {
  console.log(`Fetching NY Numbers / Win-4 from ${START_YEAR}`);
  console.log(`Source: ${BASE}`);

  const raw: RawRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const got = await fetchPage(offset);
    raw.push(...got);
    process.stdout.write(`  page @${offset}: ${got.length} rows\n`);
    if (got.length < PAGE) break;
  }
  if (raw.length === 0) throw new Error("no rows returned — refusing to write empty CSVs");

  // Fan the one-row-per-date table out into per-draw rows, per game.
  const byGame: Record<"pick3" | "pick4", Map<string, Row>> = {
    pick3: readExisting("pick3", 3),
    pick4: readExisting("pick4", 4),
  };
  const existingCount = { pick3: byGame.pick3.size, pick4: byGame.pick4.size };
  const malformed: Record<string, number> = {};

  for (const r of raw) {
    const iso = (r.draw_date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    const [yyyy, mo, dd] = iso.split("-");
    const ddmmyyyy = `${dd}-${mo}-${yyyy}`;
    for (const c of COLUMNS) {
      const present = r[c.field];
      if (present === undefined) continue; // draw didn't run that day — not an error
      const digits = toDigits(present, c.positions);
      if (!digits) {
        malformed[c.field] = (malformed[c.field] ?? 0) + 1;
        continue;
      }
      byGame[c.game].set(`${iso}|${c.stream}`, { iso, ddmmyyyy, stream: c.stream, digits });
    }
  }

  for (const [game, positions] of [
    ["pick3", 3],
    ["pick4", 4],
  ] as Array<["pick3" | "pick4", 3 | 4]>) {
    const merged = byGame[game];
    const rows = [...merged.values()].sort((a, b) =>
      a.iso !== b.iso ? (a.iso < b.iso ? 1 : -1) : a.stream === "Evening" ? -1 : 1,
    );
    if (rows.length === 0) throw new Error(`${game}: no draws — refusing to write empty CSV`);
    writeFileSync(join(OUT_DIR, `${game}.csv`), csvFor(rows, positions));
    const added = merged.size - existingCount[game];
    console.log(
      `  ${game.padEnd(6)} ${merged.size.toLocaleString().padStart(7)} draws ` +
        `(${existingCount[game].toLocaleString()} existing, +${added.toLocaleString()} new)`,
    );
    console.log(`         ${rows[rows.length - 1]?.iso} → ${rows[0]?.iso}`);
  }

  if (Object.keys(malformed).length) {
    console.warn(
      `\n  malformed values skipped: ` +
        Object.entries(malformed).map(([k, v]) => `${k}=${v}`).join(", "),
    );
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
