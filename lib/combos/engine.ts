/**
 * explorer-v1 — the exploratory ranking model behind "Generate 5".
 *
 * WHAT THIS IS: a transparent, deterministic ranking of the 10,000
 * combinations against six descriptive features of the history you are
 * looking at. Same dataset + same window + same weights ⇒ byte-identical
 * output, every time, on every machine. There is no randomness anywhere in
 * this file, by design: a shuffled result dressed up as analysis would be
 * a lie about what the numbers mean.
 *
 * WHAT THIS IS NOT: a probability model. Four-digit draws are independent
 * and uniform; nothing measured here shifts the odds of the next one. A
 * high score means "ranks highly against these historical features", full
 * stop. The UI must never call these picks likely, due, or predicted.
 */

import type { ComboDraw, ComboIndex } from "./index-build";
import { COMBO_POSITIONS, COMBO_UNIVERSE, comboDigits } from "./universe";

export const ALGORITHM_VERSION = "explorer-v1";

export type Weights = {
  /** All-history frequency of the combination. */
  historical: number;
  /** Frequency inside the analysis window (the last N draws). */
  recentWindow: number;
  /** How long since it last appeared, scaled against the longest wait. */
  dormancy: number;
  /** Per-position digit frequency across all history. */
  positional: number;
  /** Per-position digit frequency inside the window. */
  recentPositional: number;
  /** Subtracted when the combination is already in the freshest draws. */
  repeatPenalty: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  historical: 0.2,
  recentWindow: 0.25,
  dormancy: 0.15,
  positional: 0.2,
  recentPositional: 0.2,
  repeatPenalty: 0.35,
};

export const WEIGHT_LABELS: Record<keyof Weights, string> = {
  historical: "Historical frequency",
  recentWindow: "Window frequency",
  dormancy: "Time since last hit",
  positional: "Digit-position frequency",
  recentPositional: "Recent digit-position frequency",
  repeatPenalty: "Repeat penalty",
};

export type WindowAnalysis = {
  /** Draws actually analysed, newest first. Fewer than requested is normal. */
  draws: ComboDraw[];
  requested: number;
  analysed: number;
  uniqueCombos: number;
  repeatedCombos: { combo: number; count: number }[];
  /** [position][digit] counts inside the window. */
  positionDigits: number[][];
  /** Overall digit counts 0–9 inside the window. */
  digitTotals: number[];
  /** Gaps, in draws, between successive appearances of a repeated combo. */
  repeatIntervals: number[];
  /** How many of the window's combos have k all-time hits, index = k. */
  hitCountSpread: number[];
};

/** Descriptive statistics over the most recent `size` draws. */
export function analyzeWindow(index: ComboIndex, size: number): WindowAnalysis {
  const draws = index.recent(size); // newest first
  const chronological = [...draws].reverse();

  const seen = new Map<number, number[]>(); // combo → positions in window
  chronological.forEach((d, i) => {
    const list = seen.get(d.combo);
    if (list) list.push(i);
    else seen.set(d.combo, [i]);
  });

  const positionDigits: number[][] = Array.from({ length: COMBO_POSITIONS }, () =>
    new Array(10).fill(0),
  );
  const digitTotals = new Array(10).fill(0);
  for (const d of chronological) {
    const digits = comboDigits(d.combo);
    for (let p = 0; p < COMBO_POSITIONS; p++) {
      positionDigits[p][digits[p]]++;
      digitTotals[digits[p]]++;
    }
  }

  const repeatedCombos: { combo: number; count: number }[] = [];
  const repeatIntervals: number[] = [];
  for (const [combo, positions] of seen) {
    if (positions.length < 2) continue;
    repeatedCombos.push({ combo, count: positions.length });
    for (let i = 1; i < positions.length; i++) repeatIntervals.push(positions[i] - positions[i - 1]);
  }
  repeatedCombos.sort((a, b) => b.count - a.count || a.combo - b.combo);

  const hitCountSpread: number[] = [];
  for (const combo of seen.keys()) {
    const k = index.countOf(combo);
    hitCountSpread[k] = (hitCountSpread[k] ?? 0) + 1;
  }
  for (let i = 0; i < hitCountSpread.length; i++) hitCountSpread[i] ??= 0;

  return {
    draws,
    requested: size,
    analysed: draws.length,
    uniqueCombos: seen.size,
    repeatedCombos,
    positionDigits,
    digitTotals,
    repeatIntervals,
    hitCountSpread,
  };
}

export type FeatureBreakdown = {
  [K in keyof Weights]: number;
};

export type ScoredCombo = {
  combo: number;
  score: number;
  features: FeatureBreakdown;
};

export type GenerationResult = {
  algorithm: typeof ALGORITHM_VERSION;
  weights: Weights;
  /** Chosen sets, best-ranked first. */
  picks: ScoredCombo[];
  /** Everything needed to reproduce this run. */
  provenance: {
    windowSize: number;
    windowAnalysed: number;
    /** Identifies each analysed draw: "YYYY-MM-DD|stream|combo". */
    windowDraws: string[];
    totalDraws: number;
    earliest: string | null;
    latest: string | null;
    games: string[];
  };
};

/** Highest value in an array, or 0 for an empty/all-zero one. */
const maxOf = (xs: ArrayLike<number>): number => {
  let m = 0;
  for (let i = 0; i < xs.length; i++) if (xs[i] > m) m = xs[i];
  return m;
};

/**
 * Score every combination, then take five that don't look alike.
 *
 * Deterministic throughout: features come only from the index and the
 * window, ties break on the lower combination index, and the diversity
 * filter is a fixed rule (no two picks may agree in 3+ positions) applied
 * in rank order. Duplicates are impossible — each combination is
 * considered exactly once.
 */
export function generateExploratorySets(
  index: ComboIndex,
  window: WindowAnalysis,
  opts: { count?: number; weights?: Weights } = {},
): GenerationResult {
  const count = opts.count ?? 5;
  const weights = opts.weights ?? DEFAULT_WEIGHTS;

  const maxHistorical = maxOf(index.counts);

  const windowCounts = new Uint16Array(COMBO_UNIVERSE);
  for (const d of window.draws) windowCounts[d.combo]++;
  const maxWindow = maxOf(windowCounts);

  // Dormancy is measured against the longest observed wait so the feature
  // spans 0..1 for this dataset rather than an arbitrary constant.
  const total = index.totalDraws;
  const lastIndexByCombo = new Int32Array(COMBO_UNIVERSE).fill(-1);
  const drawsList = index.all();
  for (let i = 0; i < drawsList.length; i++) lastIndexByCombo[drawsList[i].combo] = i;
  let maxDormancy = 0;
  for (let c = 0; c < COMBO_UNIVERSE; c++) {
    const since = lastIndexByCombo[c] < 0 ? total : total - 1 - lastIndexByCombo[c];
    if (since > maxDormancy) maxDormancy = since;
  }

  // Per-position digit frequencies, all-history and window.
  const histPos: number[][] = Array.from({ length: COMBO_POSITIONS }, () => new Array(10).fill(0));
  for (let c = 0; c < COMBO_UNIVERSE; c++) {
    const n = index.counts[c];
    if (!n) continue;
    const digits = comboDigits(c);
    for (let p = 0; p < COMBO_POSITIONS; p++) histPos[p][digits[p]] += n;
  }
  const histPosMax = histPos.map(maxOf);
  const winPosMax = window.positionDigits.map(maxOf);

  // Freshest draws carry the repeat penalty: a combination that just came
  // up is demoted, so the five sets aren't simply echoing last night.
  const REPEAT_LOOKBACK = 5;
  const justDrawn = new Set(window.draws.slice(0, REPEAT_LOOKBACK).map((d) => d.combo));

  const scored: ScoredCombo[] = new Array(COMBO_UNIVERSE);
  for (let c = 0; c < COMBO_UNIVERSE; c++) {
    const digits = comboDigits(c);
    let positional = 0;
    let recentPositional = 0;
    for (let p = 0; p < COMBO_POSITIONS; p++) {
      positional += histPosMax[p] ? histPos[p][digits[p]] / histPosMax[p] : 0;
      recentPositional += winPosMax[p] ? window.positionDigits[p][digits[p]] / winPosMax[p] : 0;
    }
    const since = lastIndexByCombo[c] < 0 ? total : total - 1 - lastIndexByCombo[c];
    const features: FeatureBreakdown = {
      historical: maxHistorical ? index.counts[c] / maxHistorical : 0,
      recentWindow: maxWindow ? windowCounts[c] / maxWindow : 0,
      dormancy: maxDormancy ? since / maxDormancy : 0,
      positional: positional / COMBO_POSITIONS,
      recentPositional: recentPositional / COMBO_POSITIONS,
      repeatPenalty: justDrawn.has(c) ? 1 : 0,
    };
    const score =
      weights.historical * features.historical +
      weights.recentWindow * features.recentWindow +
      weights.dormancy * features.dormancy +
      weights.positional * features.positional +
      weights.recentPositional * features.recentPositional -
      weights.repeatPenalty * features.repeatPenalty;
    scored[c] = { combo: c, score, features };
  }

  const ranked = scored.slice().sort((a, b) => b.score - a.score || a.combo - b.combo);

  const picks: ScoredCombo[] = [];
  const tooSimilar = (a: number, b: number): boolean => {
    const da = comboDigits(a);
    const db = comboDigits(b);
    let same = 0;
    for (let p = 0; p < COMBO_POSITIONS; p++) if (da[p] === db[p]) same++;
    return same >= 3;
  };
  for (const cand of ranked) {
    if (picks.length >= count) break;
    if (picks.some((p) => tooSimilar(p.combo, cand.combo))) continue;
    picks.push(cand);
  }
  // Pathological datasets could starve the diversity rule; fall back to
  // plain rank order rather than returning fewer than `count` sets.
  for (const cand of ranked) {
    if (picks.length >= count) break;
    if (!picks.some((p) => p.combo === cand.combo)) picks.push(cand);
  }

  return {
    algorithm: ALGORITHM_VERSION,
    weights,
    picks,
    provenance: {
      windowSize: window.requested,
      windowAnalysed: window.analysed,
      windowDraws: window.draws.map((d) => `${d.date}|${d.stream ?? "other"}|${d.combo}`),
      totalDraws: index.totalDraws,
      earliest: index.earliest,
      latest: index.latest,
      games: index.games,
    },
  };
}

/** Exact and per-position comparison of a generated set against a real draw. */
export function compareCombos(
  generated: number,
  actual: number,
): { exact: boolean; positions: boolean[]; positionMatches: number } {
  const g = comboDigits(generated);
  const a = comboDigits(actual);
  const positions = g.map((d, i) => d === a[i]);
  return {
    exact: generated === actual,
    positions,
    positionMatches: positions.filter(Boolean).length,
  };
}
