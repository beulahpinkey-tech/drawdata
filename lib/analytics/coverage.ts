import type { Draw } from "../types";

/**
 * Cumulative unique values covered over chronological draws.
 * Returns array of length draws.length with running unique count.
 */
export function cumulativeUniqueCoverage(
  draws: Draw[],
  size: number,
  extractor: (d: Draw) => number[],
): number[] {
  const seen = new Uint8Array(size);
  const out = new Array(draws.length).fill(0);
  let count = 0;
  for (let i = 0; i < draws.length; i++) {
    for (const v of extractor(draws[i])) {
      if (v < 0 || v >= size) continue;
      if (!seen[v]) {
        seen[v] = 1;
        count++;
      }
    }
    out[i] = count;
  }
  return out;
}

export function perYearCoverage(
  draws: Draw[],
  size: number,
  extractor: (d: Draw) => number[],
): { year: number; unique: number; draws: number }[] {
  const byYear = new Map<number, { seen: Uint8Array; draws: number }>();
  for (const d of draws) {
    const y = parseInt(d.date.slice(0, 4), 10);
    let bucket = byYear.get(y);
    if (!bucket) {
      bucket = { seen: new Uint8Array(size), draws: 0 };
      byYear.set(y, bucket);
    }
    bucket.draws++;
    for (const v of extractor(d)) {
      if (v >= 0 && v < size) bucket.seen[v] = 1;
    }
  }
  return Array.from(byYear.entries())
    .map(([year, b]) => ({
      year,
      unique: Array.from(b.seen).reduce((a, c) => a + c, 0),
      draws: b.draws,
    }))
    .sort((a, b) => a.year - b.year);
}
