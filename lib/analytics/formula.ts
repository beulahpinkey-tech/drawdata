import type { Draw } from "../types";

/**
 * Formula Lab — honest backtester.
 *
 * A Rule transforms the previous draw's digits into a *candidate set* of
 * outcomes for the next draw. We then check, across all consecutive
 * transitions in history, whether the actual next draw is in that set —
 * both "straight" (exact positions) and "box" (any-order match).
 *
 * We always report the chance baseline beside the hit rate. For a fair rule:
 *   E[straight hit] = E[|candidate set|] / 10^positions   (digit games)
 * Box baseline is reported using the empirical box-equivalent.
 */

export type OpKind =
  | "shift" // add k mod 10 to selected positions
  | "mirror" // +5 mod 10 (the lottery "mirror")
  | "reverse" // reverse the selected positions
  | "swap" // swap two selected positions
  | "multiply_pair_2digit" // p1*p2 -> 2-digit product (00–81), placed at target positions
  | "anchor"; // leave selected positions fixed; vary all others 0–9 (any combo) [generates candidate set]

export type TargetMode = "straight" | "any_order";

export type RuleStep = {
  op: OpKind;
  k?: number; // for shift
  sources: number[]; // 0-indexed positions in prev
  targets?: number[]; // 0-indexed positions in next (for placement-aware ops)
};

export type Rule = {
  game: "wi-pick3" | "wi-pick4" | "pa-pick3" | "pa-pick4" | "nj-pick3" | "nj-pick4";
  steps: RuleStep[];
  target: TargetMode;
};

const positionsFor = (g: string) => (g.endsWith("pick3") ? 3 : 4);

/** Generate a multiset of candidate next-draws (as arrays of digits). */
export function generateCandidates(rule: Rule, prev: number[]): number[][] {
  const P = positionsFor(rule.game);
  // Each step produces one or more candidate digit arrays. We collect them all
  // and de-duplicate by tuple at the end.
  const out: number[][] = [];

  for (const step of rule.steps) {
    const candidates = applyStep(step, prev, P);
    for (const c of candidates) out.push(c);
  }
  // De-duplicate
  const seen = new Set<string>();
  const unique: number[][] = [];
  for (const c of out) {
    const key = c.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }
  return unique;
}

function applyStep(
  step: RuleStep,
  prev: number[],
  P: number,
): number[][] {
  const base = new Array(P).fill(-1);
  switch (step.op) {
    case "shift": {
      const k = ((step.k ?? 0) % 10 + 10) % 10;
      const targets = step.targets ?? step.sources;
      if (targets.length !== step.sources.length) return [];
      // copy prev as the unchanged starting point, then overwrite targets
      const cand = prev.slice();
      for (let i = 0; i < step.sources.length; i++) {
        const src = step.sources[i];
        const tgt = targets[i];
        if (src < 0 || src >= P || tgt < 0 || tgt >= P) return [];
        cand[tgt] = (prev[src] + k) % 10;
      }
      return [cand];
    }
    case "mirror": {
      const targets = step.targets ?? step.sources;
      if (targets.length !== step.sources.length) return [];
      const cand = prev.slice();
      for (let i = 0; i < step.sources.length; i++) {
        const src = step.sources[i];
        const tgt = targets[i];
        if (src < 0 || src >= P || tgt < 0 || tgt >= P) return [];
        cand[tgt] = (prev[src] + 5) % 10;
      }
      return [cand];
    }
    case "reverse": {
      const targets = step.targets ?? step.sources;
      if (targets.length !== step.sources.length) return [];
      const cand = prev.slice();
      const reversedVals = step.sources.map((s) => prev[s]).reverse();
      for (let i = 0; i < targets.length; i++) {
        const tgt = targets[i];
        if (tgt < 0 || tgt >= P) return [];
        cand[tgt] = reversedVals[i];
      }
      return [cand];
    }
    case "swap": {
      if (step.sources.length !== 2) return [];
      const cand = prev.slice();
      const [a, b] = step.sources;
      if (a < 0 || a >= P || b < 0 || b >= P) return [];
      cand[a] = prev[b];
      cand[b] = prev[a];
      return [cand];
    }
    case "multiply_pair_2digit": {
      if (step.sources.length !== 2) return [];
      const [a, b] = step.sources;
      const product = (prev[a] ?? 0) * (prev[b] ?? 0);
      const tens = Math.floor(product / 10) % 10;
      const ones = product % 10;
      const targets = step.targets ?? [0, 1];
      if (targets.length !== 2) return [];
      const cand = prev.slice();
      cand[targets[0]] = tens;
      cand[targets[1]] = ones;
      return [cand];
    }
    case "anchor": {
      // Keep prev[sources] fixed; enumerate all combos for non-source positions.
      const fixedIdx = new Set(step.sources);
      const free: number[] = [];
      for (let i = 0; i < P; i++) if (!fixedIdx.has(i)) free.push(i);
      const out: number[][] = [];
      const total = Math.pow(10, free.length);
      for (let n = 0; n < total; n++) {
        const cand = new Array(P).fill(0);
        for (const s of step.sources) cand[s] = prev[s];
        let v = n;
        for (let j = 0; j < free.length; j++) {
          cand[free[j]] = v % 10;
          v = Math.floor(v / 10);
        }
        out.push(cand);
      }
      return out;
    }
  }
}

/** Multiset equality on sorted digits. */
function multisetMatch(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = a.slice().sort();
  const sb = b.slice().sort();
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
  return true;
}

export type BacktestResult = {
  positions: number;
  transitions: number;
  straightHits: number;
  boxHits: number;
  straightRate: number; // empirical
  boxRate: number; // empirical
  meanCandidates: number;
  straightChance: number; // expected straight rate if independent
  boxChance: number; // expected box rate using observed candidate sizes (approx)
  byYear: { year: number; transitions: number; straight: number; box: number }[];
  splitTest?: {
    firstHalf: { straightRate: number; boxRate: number; transitions: number };
    secondHalf: { straightRate: number; boxRate: number; transitions: number };
  };
};

/**
 * Backtest a rule across consecutive draws.
 */
export function backtestRule(
  draws: Draw[],
  rule: Rule,
): BacktestResult {
  const P = positionsFor(rule.game);
  const transitions = Math.max(0, draws.length - 1);
  if (transitions === 0) {
    return emptyResult(P);
  }

  let straightHits = 0;
  let boxHits = 0;
  let sumCandidates = 0;

  const byYearMap = new Map<
    number,
    { transitions: number; straight: number; box: number }
  >();

  for (let i = 1; i < draws.length; i++) {
    const prev = draws[i - 1].digits;
    const next = draws[i].digits;
    if (!prev || !next || prev.length !== P || next.length !== P) continue;
    const cands = generateCandidates(rule, prev);
    sumCandidates += cands.length;
    let straight = false;
    let box = false;
    for (const c of cands) {
      if (!straight) {
        let eq = true;
        for (let j = 0; j < P; j++) if (c[j] !== next[j]) { eq = false; break; }
        if (eq) straight = true;
      }
      if (!box && multisetMatch(c, next)) box = true;
      if (straight && box) break;
    }
    if (straight) straightHits++;
    if (box) boxHits++;

    const year = parseInt(draws[i].date.slice(0, 4), 10);
    let bucket = byYearMap.get(year);
    if (!bucket) {
      bucket = { transitions: 0, straight: 0, box: 0 };
      byYearMap.set(year, bucket);
    }
    bucket.transitions++;
    if (straight) bucket.straight++;
    if (box) bucket.box++;
  }

  const meanCandidates = sumCandidates / transitions;
  const outcomeSpace = Math.pow(10, P);
  const straightChance = meanCandidates / outcomeSpace;

  // For box chance, use that any specific digit-multiset (e.g., {1,2,3} for pick3) has
  // P! / (counts!) ordered representatives. A reasonable comparable: estimate the
  // average box-equivalent size of a single candidate (≈ P! for all-distinct), then
  // divide by outcomeSpace. We use empirical mean of #permutations per candidate.
  const boxChance =
    (meanCandidates * meanBoxMultiplier(P)) / outcomeSpace;

  const byYear = Array.from(byYearMap.entries())
    .map(([year, b]) => ({ year, ...b }))
    .sort((a, b) => a.year - b.year);

  // Split test: first half vs second half (chronological).
  const half = Math.floor(draws.length / 2);
  const firstHalf = subBacktest(draws.slice(0, half + 1), rule);
  const secondHalf = subBacktest(draws.slice(half), rule);

  return {
    positions: P,
    transitions,
    straightHits,
    boxHits,
    straightRate: straightHits / transitions,
    boxRate: boxHits / transitions,
    meanCandidates,
    straightChance,
    boxChance,
    byYear,
    splitTest: {
      firstHalf,
      secondHalf,
    },
  };
}

function meanBoxMultiplier(P: number): number {
  // Average ordered representatives per multiset of P digits drawn uniformly.
  // For P=3 ≈ 4.32, P=4 ≈ 12.04 — close enough as a baseline reference.
  // We compute exactly via direct enumeration.
  const total = Math.pow(10, P);
  let sum = 0;
  const counts = new Array(10).fill(0);
  const helper = (depth: number) => {
    if (depth === P) {
      const usedCounts: number[] = [];
      for (const c of counts) if (c > 0) usedCounts.push(c);
      // # ordered representatives = P! / prod(c!)
      sum += factorial(P) / usedCounts.reduce((a, c) => a * factorial(c), 1);
      return;
    }
    for (let d = 0; d < 10; d++) {
      counts[d]++;
      helper(depth + 1);
      counts[d]--;
    }
  };
  helper(0);
  return sum / total;
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function subBacktest(draws: Draw[], rule: Rule) {
  const P = positionsFor(rule.game);
  const transitions = Math.max(0, draws.length - 1);
  if (transitions === 0) {
    return { straightRate: 0, boxRate: 0, transitions: 0 };
  }
  let straight = 0,
    box = 0;
  for (let i = 1; i < draws.length; i++) {
    const prev = draws[i - 1].digits;
    const next = draws[i].digits;
    if (!prev || !next) continue;
    const cands = generateCandidates(rule, prev);
    let s = false,
      b = false;
    for (const c of cands) {
      if (!s) {
        let eq = true;
        for (let j = 0; j < P; j++) if (c[j] !== next[j]) { eq = false; break; }
        if (eq) s = true;
      }
      if (!b && multisetMatch(c, next)) b = true;
      if (s && b) break;
    }
    if (s) straight++;
    if (b) box++;
  }
  return {
    straightRate: straight / transitions,
    boxRate: box / transitions,
    transitions,
  };
}

function emptyResult(P: number): BacktestResult {
  return {
    positions: P,
    transitions: 0,
    straightHits: 0,
    boxHits: 0,
    straightRate: 0,
    boxRate: 0,
    meanCandidates: 0,
    straightChance: 0,
    boxChance: 0,
    byYear: [],
  };
}

export const OP_DOCS: Record<OpKind, { label: string; desc: string }> = {
  shift: {
    label: "Shift ±k (mod 10)",
    desc: "Add a constant k to each selected source digit, modulo 10. The classic '+1 to every digit' move.",
  },
  mirror: {
    label: "Mirror (+5 mod 10)",
    desc: "Replace each selected source digit with its 'mirror' — the value 5 away on a 10-wheel. 0↔5, 1↔6, etc.",
  },
  reverse: {
    label: "Reverse selected",
    desc: "Reverse the order of the selected source digits before placing them in target positions.",
  },
  swap: {
    label: "Swap two positions",
    desc: "Swap the values at two selected positions and leave the rest unchanged.",
  },
  multiply_pair_2digit: {
    label: "Multiply pair → 2-digit",
    desc: "Multiply two selected source digits; place the two product digits (tens, ones) at the target positions.",
  },
  anchor: {
    label: "Anchor selected, vary rest",
    desc: "Keep the selected source positions fixed; enumerate every combination of digits for the remaining positions. Generates a large candidate set.",
  },
};
