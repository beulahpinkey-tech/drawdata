import type { Draw } from "../types";

/**
 * Current gap = number of draws since the value last appeared.
 * Operates on a value extractor so it works for digits, whites, special.
 */
export function currentGapsPerValue(
  draws: Draw[],
  size: number,
  extractor: (d: Draw) => number[],
): number[] {
  // size = pool+1 length (index 0 unused for 1-indexed pools); we keep raw length.
  const lastSeen = new Array(size).fill(-1);
  for (let i = 0; i < draws.length; i++) {
    const vals = extractor(draws[i]);
    for (const v of vals) {
      if (v >= 0 && v < size) lastSeen[v] = i;
    }
  }
  const out = new Array(size).fill(0);
  const N = draws.length;
  for (let v = 0; v < size; v++) {
    if (lastSeen[v] < 0) out[v] = N; // never seen
    else out[v] = N - 1 - lastSeen[v];
  }
  return out;
}

/**
 * Distribution of gap lengths (gap = draws between consecutive appearances).
 * Returns map gap-length -> count.
 */
export function gapDistribution(
  draws: Draw[],
  size: number,
  extractor: (d: Draw) => number[],
): Record<number, number> {
  const last = new Array(size).fill(-1);
  const dist: Record<number, number> = {};
  for (let i = 0; i < draws.length; i++) {
    const vals = extractor(draws[i]);
    const seenThisDraw = new Set<number>();
    for (const v of vals) {
      if (v < 0 || v >= size) continue;
      if (seenThisDraw.has(v)) continue;
      seenThisDraw.add(v);
      if (last[v] !== -1) {
        const g = i - last[v];
        dist[g] = (dist[g] ?? 0) + 1;
      }
      last[v] = i;
    }
  }
  return dist;
}
