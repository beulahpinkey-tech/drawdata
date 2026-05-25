import type { Draw } from "../types";

/**
 * Advanced digit-game analytics. All functions are descriptive — they describe
 * what has happened in the historical record. None claim predictive power.
 */

// ────────────────────────────────────────────────────────────────
// PAIR FREQUENCY
// ────────────────────────────────────────────────────────────────

/**
 * Count how often each ordered pair of digits {a,b} (a <= b) appears together
 * within a single draw, anywhere. Returns a flat 10x10 (upper-triangular) map.
 */
export function pairFrequency(draws: Draw[]): {
  matrix: number[][]; // [a][b] for a <= b, 0..9
  topPairs: { a: number; b: number; count: number }[];
  totalDraws: number;
} {
  const matrix = Array.from({ length: 10 }, () => new Array(10).fill(0));
  for (const d of draws) {
    if (!d.digits) continue;
    const used = new Set<string>();
    for (let i = 0; i < d.digits.length; i++) {
      for (let j = i + 1; j < d.digits.length; j++) {
        const a = Math.min(d.digits[i], d.digits[j]);
        const b = Math.max(d.digits[i], d.digits[j]);
        const key = `${a},${b}`;
        if (used.has(key)) continue;
        used.add(key);
        matrix[a][b]++;
      }
    }
  }
  const topPairs: { a: number; b: number; count: number }[] = [];
  for (let a = 0; a < 10; a++) {
    for (let b = a; b < 10; b++) {
      if (matrix[a][b] > 0) topPairs.push({ a, b, count: matrix[a][b] });
    }
  }
  topPairs.sort((x, y) => y.count - x.count);
  return { matrix, topPairs, totalDraws: draws.length };
}

// ────────────────────────────────────────────────────────────────
// ROLLING-WINDOW FREQUENCY
// ────────────────────────────────────────────────────────────────

/** Frequency of each digit 0-9 across the LAST N draws (chronologically). */
export function rollingDigitFrequency(
  draws: Draw[],
  windowSize: number | "all",
): { counts: number[]; draws: number; positions: number } {
  const positions = draws[0]?.digits?.length ?? 0;
  const sliced =
    windowSize === "all" ? draws : draws.slice(Math.max(0, draws.length - windowSize));
  const counts = new Array(10).fill(0);
  for (const d of sliced) {
    if (!d.digits) continue;
    for (const v of d.digits) counts[v]++;
  }
  return { counts, draws: sliced.length, positions };
}

// ────────────────────────────────────────────────────────────────
// BOX-TYPE BREAKDOWN
// ────────────────────────────────────────────────────────────────

/**
 * Classifies each draw by its repeat pattern.
 * Pick 3: single (no repeats, 6-way box) / double (one pair, 3-way) / triple (4-way? no, 1-way — wait: a triple has 1 unique perm).
 *   Standard box payouts: 6-way (3 distinct), 3-way (one digit twice), 1-way (triple).
 * Pick 4: 24-way (4 distinct), 12-way (one digit twice + 2 distinct), 6-way (two pairs), 4-way (triple + 1 distinct), 1-way (quad).
 */
export function boxTypeBreakdown(draws: Draw[], positions: 3 | 4): {
  type: string;
  count: number;
  share: number;
  expected: number; // fraction expected under uniform random
}[] {
  const counts: Record<string, number> = {};
  const inc = (k: string) => (counts[k] = (counts[k] ?? 0) + 1);
  for (const d of draws) {
    if (!d.digits || d.digits.length !== positions) continue;
    const freq = new Map<number, number>();
    for (const v of d.digits) freq.set(v, (freq.get(v) ?? 0) + 1);
    const counts2 = Array.from(freq.values()).sort((a, b) => b - a);
    if (positions === 3) {
      if (counts2[0] === 3) inc("triple");
      else if (counts2[0] === 2) inc("double");
      else inc("single");
    } else {
      if (counts2[0] === 4) inc("quad");
      else if (counts2[0] === 3) inc("triple");
      else if (counts2[0] === 2 && counts2[1] === 2) inc("double-double");
      else if (counts2[0] === 2) inc("single-double");
      else inc("no-match");
    }
  }
  const total = draws.length || 1;
  // theoretical fractions for uniform digits
  const theory: Record<string, number> =
    positions === 3
      ? {
          // 3 distinct: 10*9*8 / 1000 = 720/1000
          single: 720 / 1000,
          // one pair: C(10,1)*3 picks-position * 9 other = 10*3*9 = 270/1000
          double: 270 / 1000,
          // triple: 10/1000
          triple: 10 / 1000,
        }
      : {
          // 4 distinct: 10*9*8*7 = 5040/10000
          "no-match": 5040 / 10000,
          // single double (12-way): C(4,2) positions * 10 doubled * 9*8 others = 6*10*72 = 4320/10000
          "single-double": 4320 / 10000,
          // double-double (6-way): C(4,2)/2 placements * C(10,2)*2 = 3 * 90 = 270/10000  (actually 3*C(10,2)*2 perms? recompute)
          // standard reference: 270/10000
          "double-double": 270 / 10000,
          // triple + 1 (4-way): C(4,3) * 10 * 9 = 4*90 = 360/10000
          triple: 360 / 10000,
          // quad: 10/10000
          quad: 10 / 10000,
        };
  const order =
    positions === 3
      ? ["single", "double", "triple"]
      : ["no-match", "single-double", "double-double", "triple", "quad"];
  return order.map((type) => ({
    type,
    count: counts[type] ?? 0,
    share: (counts[type] ?? 0) / total,
    expected: theory[type] ?? 0,
  }));
}

// ────────────────────────────────────────────────────────────────
// CARRYOVER ANALYSIS
// ────────────────────────────────────────────────────────────────

/**
 * Carryover: how often a digit present in draw N is also present in draw N+1
 * (any position). Returns the count of overlaps per consecutive pair, plus a
 * distribution.
 */
export function carryoverAnalysis(draws: Draw[]): {
  transitions: number;
  meanOverlap: number;
  expectedOverlap: number;
  distribution: Record<number, number>; // overlap-count -> # transitions
  byDigit: { digit: number; carryRate: number; appearances: number }[]; // P(digit in next | digit in current)
} {
  const positions = draws[0]?.digits?.length ?? 0;
  if (positions === 0) {
    return {
      transitions: 0,
      meanOverlap: 0,
      expectedOverlap: 0,
      distribution: {},
      byDigit: [],
    };
  }
  let sum = 0;
  let transitions = 0;
  const dist: Record<number, number> = {};
  const digitTotal = new Array(10).fill(0);
  const digitCarry = new Array(10).fill(0);
  for (let i = 1; i < draws.length; i++) {
    const a = draws[i - 1].digits;
    const b = draws[i].digits;
    if (!a || !b) continue;
    transitions++;
    const setA = new Set(a);
    const setB = new Set(b);
    // overlap = number of distinct digits in A that also appear in B
    let overlap = 0;
    for (const v of setA) if (setB.has(v)) overlap++;
    sum += overlap;
    dist[overlap] = (dist[overlap] ?? 0) + 1;
    // per-digit carry rate
    for (const v of setA) {
      digitTotal[v]++;
      if (setB.has(v)) digitCarry[v]++;
    }
  }
  // expected overlap under independence:
  // E[overlap] = Σ_d P(d ∈ A) * P(d ∈ B). For uniform draws,
  // P(d ∈ B) = 1 - (9/10)^positions; same for A.
  const pAppearAny = 1 - Math.pow(0.9, positions);
  const expectedOverlap = 10 * pAppearAny * pAppearAny;
  const byDigit = digitTotal.map((tot, digit) => ({
    digit,
    appearances: tot,
    carryRate: tot > 0 ? digitCarry[digit] / tot : 0,
  }));
  return {
    transitions,
    meanOverlap: transitions > 0 ? sum / transitions : 0,
    expectedOverlap,
    distribution: dist,
    byDigit,
  };
}

// ────────────────────────────────────────────────────────────────
// MIRROR ANALYSIS
// ────────────────────────────────────────────────────────────────

/** Mirror of a digit: +5 mod 10. */
export const mirrorDigit = (d: number) => (d + 5) % 10;

/**
 * How often does the next draw contain ANY mirror of a digit from the previous draw?
 * Reports observed rate and the chance baseline.
 */
export function mirrorCarryover(draws: Draw[]): {
  transitions: number;
  observedRate: number; // share of transitions where ≥1 mirror appears in next
  expectedRate: number; // under independence
  byDigit: { digit: number; mirror: number; carryRate: number }[];
} {
  const positions = draws[0]?.digits?.length ?? 0;
  let transitions = 0;
  let hits = 0;
  const total = new Array(10).fill(0);
  const carry = new Array(10).fill(0);
  for (let i = 1; i < draws.length; i++) {
    const a = draws[i - 1].digits;
    const b = draws[i].digits;
    if (!a || !b) continue;
    transitions++;
    const setB = new Set(b);
    const setA = new Set(a);
    let hit = false;
    for (const v of setA) {
      total[v]++;
      const m = mirrorDigit(v);
      if (setB.has(m)) {
        carry[v]++;
        hit = true;
      }
    }
    if (hit) hits++;
  }
  // P(a mirror of a specific digit appears in next) = 1 - (9/10)^positions
  // P(any mirror of |distinct(A)| digits appears in next) ≈ 1 - (9/10)^(positions * E[|distinct(A)|])
  // Approximate distinct(A) by P=positions for simplicity (close enough; A's distincts ~ 2.7 for pick3).
  // Compute exact: among 10 candidate mirrors (one per A digit), each is present with prob 1 - (9/10)^positions ≈ 1 - 0.729 = 0.271
  // Under independence on the # distinct in A, expected fraction with ≥1 mirror = 1 - (1 - p)^|distinct(A)|
  // Use empirical mean distinct(A):
  const meanDistinctA = (() => {
    let s = 0;
    let n = 0;
    for (const d of draws) {
      if (!d.digits) continue;
      s += new Set(d.digits).size;
      n++;
    }
    return n > 0 ? s / n : 0;
  })();
  const pPerDigit = 1 - Math.pow(0.9, positions);
  const expectedRate = 1 - Math.pow(1 - pPerDigit, meanDistinctA);
  return {
    transitions,
    observedRate: transitions > 0 ? hits / transitions : 0,
    expectedRate,
    byDigit: total.map((tot, digit) => ({
      digit,
      mirror: mirrorDigit(digit),
      carryRate: tot > 0 ? carry[digit] / tot : 0,
    })),
  };
}

// ────────────────────────────────────────────────────────────────
// DIGITAL ROOT
// ────────────────────────────────────────────────────────────────

/** Digital root of n: repeated digit-sum until single digit (1-9, or 0 for 0). */
export function digitalRoot(n: number): number {
  if (n === 0) return 0;
  return 1 + ((n - 1) % 9);
}

export function rootSumDistribution(draws: Draw[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const d of draws) {
    if (!d.digits) continue;
    const s = d.digits.reduce((a, b) => a + b, 0);
    const r = digitalRoot(s);
    out[r] = (out[r] ?? 0) + 1;
  }
  return out;
}

// ────────────────────────────────────────────────────────────────
// NUMBER LOOKUP
// ────────────────────────────────────────────────────────────────

export function numberLookup(
  draws: Draw[],
  digits: number[],
): {
  exact: { date: string; stream?: string }[];
  box: { date: string; stream?: string; ordered: number[] }[];
  straightCount: number;
  boxCount: number;
  lastSeenStraight: string | null;
  lastSeenBox: string | null;
  sum: number;
  root: number;
} {
  const target = digits;
  const targetSorted = digits.slice().sort();
  const exact: { date: string; stream?: string }[] = [];
  const box: { date: string; stream?: string; ordered: number[] }[] = [];
  let lastStraight: string | null = null;
  let lastBox: string | null = null;
  for (const d of draws) {
    if (!d.digits || d.digits.length !== target.length) continue;
    let exactEq = true;
    for (let i = 0; i < target.length; i++) {
      if (d.digits[i] !== target[i]) {
        exactEq = false;
        break;
      }
    }
    const sorted = d.digits.slice().sort();
    let sortedEq = true;
    for (let i = 0; i < target.length; i++) {
      if (sorted[i] !== targetSorted[i]) {
        sortedEq = false;
        break;
      }
    }
    if (exactEq) {
      exact.push({ date: d.date, stream: d.stream });
      lastStraight = d.date;
    }
    if (sortedEq) {
      box.push({ date: d.date, stream: d.stream, ordered: d.digits.slice() });
      lastBox = d.date;
    }
  }
  const sum = digits.reduce((a, b) => a + b, 0);
  return {
    exact,
    box,
    straightCount: exact.length,
    boxCount: box.length,
    lastSeenStraight: lastStraight,
    lastSeenBox: lastBox,
    sum,
    root: digitalRoot(sum),
  };
}
