// Per-number (ball games) and per-digit (pick games) statistics, computed
// at build time from the full draw history. Each feeds one server-rendered
// /{game}/number/{n} page with genuinely unique data: total appearances,
// last-drawn date, current gap, frequency rank, and a per-year sparkline.
//
// Ball games are filtered to the CURRENT matrix era (same basis the
// frequency page uses) so cross-number comparisons are apples-to-apples.

import { getDraws, META, isBallGame } from "@/lib/data";
import type { Draw, Game } from "@/lib/types";

export type NumberStat = {
  /** Canonical slug segment, e.g. "23" or "special-11" or "5" (digit). */
  slug: string;
  /** Display value. */
  value: number;
  /** "white" | "special" (ball) or "digit" (pick). */
  kind: "white" | "special" | "digit";
  count: number;
  /** Times drawn / expected-under-uniform, e.g. 1.04. */
  ratio: number;
  lastSeen: string | null;
  /** Draws since last appearance (0 = appeared in the most recent draw). */
  currentGap: number;
  /** 1-based rank by frequency within its pool (1 = most drawn). */
  rank: number;
  /** Pool size for the rank denominator. */
  poolSize: number;
  /** Appearances per calendar year, oldest→newest: [{year, count}]. */
  byYear: { year: string; count: number }[];
  /** Pick games only: appearances per position. */
  byPosition?: number[];
};

/** Draws in the basis we count over (current era for ball games, all for pick). */
async function basisDraws(game: Game): Promise<Draw[]> {
  const draws = await getDraws(game);
  if (!isBallGame(game)) return draws;
  const start = (META as any)[game]?.currentEra?.start as string | undefined;
  return start ? draws.filter((d) => d.date >= start) : draws;
}

function yearCounts(hits: Draw[]): { year: string; count: number }[] {
  const m = new Map<string, number>();
  for (const d of hits) {
    const y = d.date.slice(0, 4);
    m.set(y, (m.get(y) ?? 0) + 1);
  }
  return [...m.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => a.year.localeCompare(b.year));
}

/** All per-number/per-digit stats for a game, keyed by slug. */
export async function numberStats(game: Game): Promise<NumberStat[]> {
  const draws = await basisDraws(game);
  const total = draws.length;
  // newest-first lets us read currentGap as "index of first hit".
  const newest = [...draws].sort((a, b) => (a.date === b.date ? b.index - a.index : b.date.localeCompare(a.date)));

  if (isBallGame(game)) {
    const m = (META as any)[game];
    const whitePool: number = m.currentEra.whitePool;
    const redPool: number = m.currentEra.redPool;
    const expWhite = (total * 5) / whitePool;
    const expRed = total / redPool;

    const build = (
      pool: number,
      kind: "white" | "special",
      pick: (d: Draw) => number[] | undefined,
      expected: number,
    ): NumberStat[] => {
      const counts = new Array(pool + 1).fill(0);
      const hitsByN: Draw[][] = Array.from({ length: pool + 1 }, () => []);
      for (const d of draws) for (const n of pick(d) ?? []) { counts[n]++; hitsByN[n]?.push(d); }
      // rank
      const order = Array.from({ length: pool }, (_, i) => i + 1).sort((a, b) => counts[b] - counts[a]);
      const rankOf = new Map(order.map((n, i) => [n, i + 1]));
      const out: NumberStat[] = [];
      for (let n = 1; n <= pool; n++) {
        const gapIdx = newest.findIndex((d) => (pick(d) ?? []).includes(n));
        out.push({
          slug: kind === "special" ? `special-${n}` : String(n),
          value: n,
          kind,
          count: counts[n],
          ratio: expected ? counts[n] / expected : 0,
          lastSeen: gapIdx >= 0 ? newest[gapIdx].date : null,
          currentGap: gapIdx >= 0 ? gapIdx : total,
          rank: rankOf.get(n) ?? pool,
          poolSize: pool,
          byYear: yearCounts(hitsByN[n]),
        });
      }
      return out;
    };

    return [
      ...build(whitePool, "white", (d) => d.whites, expWhite),
      ...build(redPool, "special", (d) => (d.special != null ? [d.special] : []), expRed),
    ];
  }

  // Pick games: digits 0–9 across all positions.
  const positions = game.endsWith("pick3") ? 3 : 4;
  const expected = (total * positions) / 10;
  const counts = new Array(10).fill(0);
  const byPos: number[][] = Array.from({ length: 10 }, () => new Array(positions).fill(0));
  const hitsByD: Draw[][] = Array.from({ length: 10 }, () => []);
  for (const d of draws) {
    (d.digits ?? []).forEach((dig, pos) => {
      counts[dig]++;
      if (byPos[dig] && pos < positions) byPos[dig][pos]++;
    });
    if ((d.digits ?? []).length) {
      const seen = new Set(d.digits);
      for (const dig of seen) hitsByD[dig].push(d);
    }
  }
  const order = Array.from({ length: 10 }, (_, i) => i).sort((a, b) => counts[b] - counts[a]);
  const rankOf = new Map(order.map((d, i) => [d, i + 1]));
  const out: NumberStat[] = [];
  for (let dig = 0; dig <= 9; dig++) {
    const gapIdx = newest.findIndex((d) => (d.digits ?? []).includes(dig));
    out.push({
      slug: String(dig),
      value: dig,
      kind: "digit",
      count: counts[dig],
      ratio: expected ? counts[dig] / expected : 0,
      lastSeen: gapIdx >= 0 ? newest[gapIdx].date : null,
      currentGap: gapIdx >= 0 ? gapIdx : total,
      rank: rankOf.get(dig) ?? 10,
      poolSize: 10,
      byYear: yearCounts(hitsByD[dig]),
      byPosition: byPos[dig],
    });
  }
  return out;
}

/** Just the slugs, for generateStaticParams. */
export async function numberSlugs(game: Game): Promise<string[]> {
  return (await numberStats(game)).map((s) => s.slug);
}

/** One number's stats by slug, or null. */
export async function numberStat(game: Game, slug: string): Promise<NumberStat | null> {
  return (await numberStats(game)).find((s) => s.slug === slug) ?? null;
}
