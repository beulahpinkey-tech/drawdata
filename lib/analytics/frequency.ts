import type { Draw } from "../types";

export function digitFrequencyByPosition(
  draws: Draw[],
  positions: number,
): { position: number; counts: number[] }[] {
  const out: { position: number; counts: number[] }[] = [];
  for (let p = 0; p < positions; p++) {
    const counts = new Array(10).fill(0);
    for (const d of draws) {
      if (!d.digits) continue;
      counts[d.digits[p]]++;
    }
    out.push({ position: p, counts });
  }
  return out;
}

export function digitFrequencyAcrossPositions(draws: Draw[]): number[] {
  const counts = new Array(10).fill(0);
  for (const d of draws) {
    if (!d.digits) continue;
    for (const v of d.digits) counts[v]++;
  }
  return counts;
}

export function whiteFrequency(draws: Draw[], pool: number): number[] {
  const counts = new Array(pool + 1).fill(0);
  for (const d of draws) {
    if (!d.whites) continue;
    for (const w of d.whites) {
      if (w >= 1 && w <= pool) counts[w]++;
    }
  }
  return counts;
}

export function redFrequency(draws: Draw[], pool: number): number[] {
  const counts = new Array(pool + 1).fill(0);
  for (const d of draws) {
    if (d.special != null && d.special >= 1 && d.special <= pool) {
      counts[d.special]++;
    }
  }
  return counts;
}

export function sumDistribution(
  draws: Draw[],
  isDigits: boolean,
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const d of draws) {
    let s = 0;
    if (isDigits && d.digits) {
      for (const v of d.digits) s += v;
    } else if (!isDigits && d.whites) {
      for (const v of d.whites) s += v;
    } else continue;
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}

export function shapeCounts(draws: Draw[]): {
  all_diff: number;
  double: number;
  triple: number;
  quad: number;
} {
  const r = { all_diff: 0, double: 0, triple: 0, quad: 0 };
  for (const d of draws) {
    if (!d.digits) continue;
    const map = new Map<number, number>();
    for (const v of d.digits) map.set(v, (map.get(v) ?? 0) + 1);
    const maxRep = Math.max(...map.values());
    if (maxRep >= 4) r.quad++;
    else if (maxRep === 3) r.triple++;
    else if (maxRep === 2) r.double++;
    else r.all_diff++;
  }
  return r;
}
