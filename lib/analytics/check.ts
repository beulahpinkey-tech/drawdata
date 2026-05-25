import type { Draw } from "../types";

/**
 * Check a user's chosen digit set against history (digit games).
 * Returns descriptive stats only — never recommendations.
 */
export function checkDigits(
  draws: Draw[],
  digits: number[],
  positions: number,
): {
  perDigitCounts: { digit: number; count: number }[];
  exactStraightOccurrences: { date: string; stream?: string }[];
  exactBoxOccurrences: number;
  sum: number;
  sumPercentile: number;
  sumDistribution: Record<number, number>;
} {
  const perDigit = new Map<number, number>();
  for (const d of digits) perDigit.set(d, 0);
  let exactStraight: { date: string; stream?: string }[] = [];
  let exactBox = 0;
  const sortedTarget = digits.slice().sort();
  const sum = digits.reduce((a, b) => a + b, 0);
  const sumDist: Record<number, number> = {};
  for (const d of draws) {
    if (!d.digits || d.digits.length !== positions) continue;
    for (const v of d.digits) {
      if (perDigit.has(v)) perDigit.set(v, (perDigit.get(v) ?? 0) + 1);
    }
    let eq = true;
    for (let i = 0; i < positions; i++) if (d.digits[i] !== digits[i]) { eq = false; break; }
    if (eq) exactStraight.push({ date: d.date, stream: d.stream });
    const sortedActual = d.digits.slice().sort();
    let boxEq = true;
    for (let i = 0; i < positions; i++) if (sortedActual[i] !== sortedTarget[i]) { boxEq = false; break; }
    if (boxEq) exactBox++;
    const s = d.digits.reduce((a, b) => a + b, 0);
    sumDist[s] = (sumDist[s] ?? 0) + 1;
  }
  const totalDraws = Object.values(sumDist).reduce((a, b) => a + b, 0) || 1;
  let below = 0;
  for (const k of Object.keys(sumDist)) {
    const v = parseInt(k, 10);
    if (v < sum) below += sumDist[v];
  }
  return {
    perDigitCounts: Array.from(perDigit.entries()).map(([digit, count]) => ({
      digit,
      count,
    })),
    exactStraightOccurrences: exactStraight,
    exactBoxOccurrences: exactBox,
    sum,
    sumPercentile: below / totalDraws,
    sumDistribution: sumDist,
  };
}

export function checkPowerball(
  draws: Draw[],
  whites: number[],
  red: number,
): {
  perWhiteCounts: { n: number; count: number }[];
  redCount: number;
  exactJackpotMatches: { date: string }[];
  fiveWhiteMatches: number;
  sum: number;
  sumDistribution: Record<number, number>;
  sumPercentile: number;
} {
  const sortedTarget = whites.slice().sort((a, b) => a - b);
  const perWhite = new Map<number, number>();
  for (const w of whites) perWhite.set(w, 0);
  let redCount = 0;
  const exactJackpot: { date: string }[] = [];
  let fiveWhite = 0;
  const sum = whites.reduce((a, b) => a + b, 0);
  const sumDist: Record<number, number> = {};
  for (const d of draws) {
    if (!d.whites || d.whites.length !== 5) continue;
    for (const w of d.whites) {
      if (perWhite.has(w)) perWhite.set(w, (perWhite.get(w) ?? 0) + 1);
    }
    if (d.special === red) redCount++;
    let allWhite = true;
    for (let i = 0; i < 5; i++) {
      if (d.whites[i] !== sortedTarget[i]) { allWhite = false; break; }
    }
    if (allWhite) {
      fiveWhite++;
      if (d.special === red) exactJackpot.push({ date: d.date });
    }
    const s = d.whites.reduce((a, b) => a + b, 0);
    sumDist[s] = (sumDist[s] ?? 0) + 1;
  }
  const totalDraws = Object.values(sumDist).reduce((a, b) => a + b, 0) || 1;
  let below = 0;
  for (const k of Object.keys(sumDist)) {
    const v = parseInt(k, 10);
    if (v < sum) below += sumDist[v];
  }
  return {
    perWhiteCounts: Array.from(perWhite.entries()).map(([n, count]) => ({
      n,
      count,
    })),
    redCount,
    exactJackpotMatches: exactJackpot,
    fiveWhiteMatches: fiveWhite,
    sum,
    sumDistribution: sumDist,
    sumPercentile: below / totalDraws,
  };
}
