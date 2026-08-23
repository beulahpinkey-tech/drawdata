/**
 * Fetch California Lottery Daily 3 / Daily 4 draw history.
 *
 * API: https://www.calottery.com/api/DrawGameApi/DrawGamePastDrawResults/{gameId}/{page}/{size}
 *   Daily 3 = gameId 9   (two draws per day)
 *   Daily 4 = gameId 14  (one draw per night)
 *
 * Open, unauthenticated, no captcha or WAF — but three sharp edges:
 *
 *   1. PAGE SIZE CAPS AT 50. Asking for 100+ returns HTTP 200 with a literal
 *      `null` body, not an error and not a clamped page. A fetcher that
 *      copied NJ's `size=2000` would silently read zero draws forever.
 *   2. ONLY ~181 DAYS ARE REACHABLE (~6 months), even though the response
 *      advertises `TotalPreviousDraws: 21231`. That field is the game's
 *      lifetime count, NOT what the endpoint will serve — paging past the
 *      window returns empty. There is no CSV export and no date parameter,
 *      so deep backfill is impossible from this source. The writer is
 *      MERGE-ONLY, so history accumulates forward from first run; the
 *      twice-daily refresh keeps extending it.
 *   3. DAILY 3'S TWO DRAWS SHARE AN IDENTICAL `DrawDate` (both stamped
 *      T07:00:00) and an identical `DrawCloseTime`. The ONLY discriminator
 *      is `DrawNumber`, which increases monotonically — so within a date the
 *      lower number is the midday draw and the higher is the evening one.
 *      Parity happens to line up today (even=midday) but that's incidental;
 *      we order by DrawNumber instead of trusting it.
 *
 * Per-draw payload:
 *   { DrawNumber: 21229, DrawDate: "2026-08-15T07:00:00",
 *     WinningNumbers: { "1": { Number: "5" }, "2": { Number: "4" }, ... } }
 *
 * DrawDate is midnight Pacific expressed as UTC, so slicing the date part
 * already yields the correct local draw date — no timezone conversion.
 *
 * Output matches the NJ CSV shape so parsePick() reads it unchanged.
 *
 * Run:  npm run fetch:ca
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "data", "ca");
mkdirSync(OUT_DIR, { recursive: true });

const BASE = "https://www.calottery.com/api/DrawGameApi/DrawGamePastDrawResults";
const PAGE_SIZE = 50; // hard cap — see note 1
const MAX_PAGES = 40; // window is ~8 pages; headroom if CA widens it

type Endpoint = {
  game: "pick3" | "pick4";
  positions: 3 | 4;
  gameId: number;
  /** Draws per day upstream: Daily 3 runs midday+evening, Daily 4 evening only. */
  drawsPerDay: 1 | 2;
};

const ENDPOINTS: Endpoint[] = [
  { game: "pick3", positions: 3, gameId: 9, drawsPerDay: 2 },
  { game: "pick4", positions: 4, gameId: 14, drawsPerDay: 1 },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type RawDraw = {
  DrawNumber?: number;
  DrawDate?: string;
  WinningNumbers?: Record<string, { Number?: string }>;
};

type Row = { iso: string; ddmmyyyy: string; stream: "Midday" | "Evening"; digits: number[] };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchPage(ep: Endpoint, page: number, attempt = 1): Promise<RawDraw[]> {
  const url = `${BASE}/${ep.gameId}/${page}/${PAGE_SIZE}`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json, text/plain, */*",
        "user-agent": UA,
        referer: "https://www.calottery.com/draw-games/daily-3",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    // A null body means "over the size cap" (see note 1), not "no more draws".
    // Treat it as a hard error so a bad PAGE_SIZE can never look like an
    // exhausted window and quietly write a truncated CSV.
    const body = (await res.json()) as { PreviousDraws?: RawDraw[] } | null;
    if (body === null) throw new Error(`null body at page ${page} — PAGE_SIZE ${PAGE_SIZE} over cap?`);
    return body.PreviousDraws ?? [];
  } catch (err) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return fetchPage(ep, page, attempt + 1);
    }
    throw err;
  }
}

function digitsOf(d: RawDraw, positions: 3 | 4): number[] | null {
  const wn = d.WinningNumbers;
  if (!wn) return null;
  // Keys are positional ("1".."4"); sort numerically so 10+ can't reorder.
  const vals = Object.keys(wn)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map((k) => (wn[k]?.Number ?? "").trim());
  if (vals.length !== positions) return null;
  const digits = vals.map((v) => (/^\d$/.test(v) ? parseInt(v, 10) : NaN));
  return digits.some(Number.isNaN) ? null : digits;
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
  const lines = [
    `California Lottery - Daily ${positions} Winning Numbers${pad}`,
    `Draw Date${pad}`,
  ];
  for (const r of rows) lines.push(`${r.ddmmyyyy},${r.stream},${r.digits.join(",")}`);
  return lines.join("\n") + "\n";
}

async function fetchGame(ep: Endpoint): Promise<{ rows: Row[]; malformed: number; truncated: string | null }> {
  // Pull the whole reachable window first — stream labels depend on seeing
  // every draw for a date together, which a page boundary can split.
  const raw: RawDraw[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const got = await fetchPage(ep, page);
    if (got.length === 0) break;
    raw.push(...got);
    process.stdout.write(".");
    await sleep(120);
  }

  const byDate = new Map<string, RawDraw[]>();
  let malformed = 0;
  for (const d of raw) {
    const iso = (d.DrawDate ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      malformed++;
      continue;
    }
    (byDate.get(iso) ?? byDate.set(iso, []).get(iso)!).push(d);
  }

  // The oldest date sits at the window edge and may be missing its earlier
  // draw, which would mislabel the survivor as Midday. Drop it — the next
  // run re-fetches that date complete anyway, and merge-only means we lose
  // nothing permanently.
  const dates = [...byDate.keys()].sort();
  let truncated: string | null = null;
  if (ep.drawsPerDay === 2 && dates.length > 0) {
    const oldest = dates[0];
    if ((byDate.get(oldest) ?? []).length < 2) {
      byDate.delete(oldest);
      truncated = oldest;
    }
  }

  const rows: Row[] = [];
  for (const [iso, draws] of byDate) {
    const [yyyy, mo, dd] = iso.split("-");
    const ddmmyyyy = `${dd}-${mo}-${yyyy}`;
    // Ascending DrawNumber = chronological within the date (see note 3).
    const ordered = draws.slice().sort((a, b) => (a.DrawNumber ?? 0) - (b.DrawNumber ?? 0));
    ordered.forEach((d, i) => {
      const digits = digitsOf(d, ep.positions);
      if (!digits) {
        malformed++;
        return;
      }
      // Single-draw games (and any lone historical draw) are the evening one.
      const stream: "Midday" | "Evening" =
        ep.drawsPerDay === 2 && ordered.length > 1 && i === 0 ? "Midday" : "Evening";
      rows.push({ iso, ddmmyyyy, stream, digits });
    });
  }
  return { rows, malformed, truncated };
}

async function main() {
  console.log("Fetching CA Daily 3 / Daily 4 (rolling ~6-month window)");
  console.log(`Source: ${BASE}`);

  for (const ep of ENDPOINTS) {
    process.stdout.write(`  ${ep.game.padEnd(6)} `);
    const { rows: fetched, malformed, truncated } = await fetchGame(ep);

    const merged = readExisting(ep.game, ep.positions);
    const existingCount = merged.size;
    for (const r of fetched) merged.set(`${r.iso}|${r.stream}`, r); // upsert; never removes

    const rows = [...merged.values()].sort((a, b) =>
      a.iso !== b.iso ? (a.iso < b.iso ? 1 : -1) : a.stream === "Evening" ? -1 : 1,
    );
    if (rows.length === 0) throw new Error(`${ep.game}: no draws — refusing to write empty CSV`);
    writeFileSync(join(OUT_DIR, `${ep.game}.csv`), csvFor(rows, ep.positions));

    const added = merged.size - existingCount;
    process.stdout.write(
      `  ${merged.size.toLocaleString().padStart(7)} draws ` +
        `(${existingCount.toLocaleString()} existing, +${added.toLocaleString()} new, ` +
        `${fetched.length.toLocaleString()} in window)\n`,
    );
    console.log(`         ${rows[rows.length - 1]?.iso} → ${rows[0]?.iso}`);
    if (truncated) console.log(`         dropped partial edge date ${truncated}`);
    if (malformed) console.warn(`         ${malformed} malformed draw(s) skipped`);
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
