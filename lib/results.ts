// Date-sliced views over a game's full draw history, used by the results
// archive pages (/{game}/results, /results/{year}, /results/{year}/{month}).
// Everything here is pure and synchronous over the statically-imported
// draws[], so it runs at build time and only ever produces buckets that
// actually contain draws — the anti-thin-content guarantee at the source.

import { getDraws } from "@/lib/data";
import type { Draw, Game } from "@/lib/types";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-06-12" → "2026". */
const yearOf = (d: Draw) => d.date.slice(0, 4);
/** "2026-06-12" → "06". */
const monthOf = (d: Draw) => d.date.slice(5, 7);

export type YearBucket = { year: string; count: number; months: MonthBucket[] };
export type MonthBucket = { year: string; month: string; monthName: string; count: number };

/** All draws for a game, newest first (archives read reverse-chronologically). */
export async function drawsNewestFirst(game: Game): Promise<Draw[]> {
  return [...(await getDraws(game))].sort((a, b) =>
    a.date === b.date ? b.index - a.index : b.date.localeCompare(a.date),
  );
}

/** Year → month buckets that actually have draws. Newest year first. */
export async function yearBuckets(game: Game): Promise<YearBucket[]> {
  const byYear = new Map<string, Map<string, number>>();
  for (const d of await getDraws(game)) {
    const y = yearOf(d);
    const mo = monthOf(d);
    if (!byYear.has(y)) byYear.set(y, new Map());
    const m = byYear.get(y)!;
    m.set(mo, (m.get(mo) ?? 0) + 1);
  }
  const years: YearBucket[] = [];
  for (const [year, months] of byYear) {
    const monthList: MonthBucket[] = [...months.entries()]
      .map(([month, count]) => ({
        year,
        month,
        monthName: MONTH_NAMES[parseInt(month, 10) - 1],
        count,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
    years.push({
      year,
      count: monthList.reduce((s, m) => s + m.count, 0),
      months: monthList,
    });
  }
  return years.sort((a, b) => b.year.localeCompare(a.year));
}

/** Draws for one calendar month, newest first. */
export async function drawsInMonth(game: Game, year: string, month: string): Promise<Draw[]> {
  const prefix = `${year}-${month}-`;
  return (await drawsNewestFirst(game)).filter((d) => d.date.startsWith(prefix));
}

/** Draws for one calendar year, newest first. */
export async function drawsInYear(game: Game, year: string): Promise<Draw[]> {
  return (await drawsNewestFirst(game)).filter((d) => d.date.startsWith(`${year}-`));
}

/**
 * Flat, chronologically-ordered list of every {year, month} bucket for a
 * game — used both for generateStaticParams and for prev/next links.
 * Oldest first so index math reads naturally.
 */
export async function monthSequence(game: Game): Promise<MonthBucket[]> {
  const seq: MonthBucket[] = [];
  for (const y of [...(await yearBuckets(game))].reverse()) {
    for (const m of [...y.months].reverse()) seq.push(m);
  }
  return seq;
}
