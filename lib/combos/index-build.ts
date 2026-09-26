/**
 * ComboIndex — one pass over a game's real draw history that answers every
 * question the Combination Explorer asks.
 *
 * Shape of the problem: ~25,000 draws per state, 10,000 buckets, and a UI
 * that needs per-combination counts while a reel is being flicked. So the
 * counts live in a Uint16Array (10,000 slots, index == combination) and the
 * per-combination occurrence lists are stored CSR-style — one Int32Array of
 * draw offsets plus a 10,001-entry start table — instead of 10,000 arrays.
 * Building is two linear passes; looking up one combination's history is a
 * subarray view with no allocation and no scan.
 *
 * Everything is derived from the draws passed in. Nothing here invents a
 * draw, and a filter that matches nothing yields an empty index rather than
 * a fabricated one.
 */

import type { Draw, Game } from "@/lib/types";
import { COMBO_UNIVERSE, comboOfDraw } from "./universe";

export type StreamFilter = "all" | "morning" | "midday" | "evening" | "night" | "other";

export type ComboFilter = {
  stream: StreamFilter;
  /** Inclusive ISO date bounds. Empty string / undefined means unbounded. */
  from?: string;
  to?: string;
};

/** One historical occurrence of a combination. */
export type Occurrence = {
  date: string;
  stream: Draw["stream"];
  /** Which dataset it came from — matters in All States mode. */
  game: Game;
};

/** A draw row reduced to what the index needs, in chronological order. */
export type ComboDraw = {
  date: string;
  stream: Draw["stream"];
  game: Game;
  combo: number;
};

export type ComboStats = {
  combo: number;
  count: number;
  firstSeen: string | null;
  lastSeen: string | null;
  /** Draws elapsed since the last hit, within the filtered set. */
  drawsSince: number | null;
  /** count / totalDraws. */
  share: number;
};

export type ComboDistribution = {
  /** How many combinations have been seen exactly k times, index = k. */
  histogram: number[];
  seen: number;
  neverSeen: number;
  maxCount: number;
  meanCount: number;
  medianCount: number;
  /** The most common per-combination hit count (mode of the histogram). */
  modeCount: number;
};

export class ComboIndex {
  readonly counts: Uint16Array;
  readonly totalDraws: number;
  readonly earliest: string | null;
  readonly latest: string | null;
  readonly games: Game[];

  /** Chronological draws that passed the filter (oldest → newest). */
  private readonly draws: ComboDraw[];
  /** CSR: rows[starts[c] … starts[c + 1]) are draw offsets for combo c. */
  private readonly starts: Int32Array;
  private readonly rows: Int32Array;

  private _distribution: ComboDistribution | null = null;

  constructor(draws: ComboDraw[], games: Game[]) {
    this.draws = draws;
    this.games = games;
    this.totalDraws = draws.length;
    this.earliest = draws.length ? draws[0].date : null;
    this.latest = draws.length ? draws[draws.length - 1].date : null;

    const counts = new Uint16Array(COMBO_UNIVERSE);
    for (const d of draws) {
      // A combination can in principle be drawn more than 65,535 times;
      // it never has been (the record is a few dozen), but saturate
      // rather than wrap so a future dataset can't corrupt the table.
      if (counts[d.combo] < 0xffff) counts[d.combo]++;
    }
    this.counts = counts;

    const starts = new Int32Array(COMBO_UNIVERSE + 1);
    for (let c = 0; c < COMBO_UNIVERSE; c++) starts[c + 1] = starts[c] + counts[c];
    const cursor = starts.slice(0, COMBO_UNIVERSE);
    const rows = new Int32Array(draws.length);
    for (let i = 0; i < draws.length; i++) rows[cursor[draws[i].combo]++] = i;
    this.starts = starts;
    this.rows = rows;
  }

  countOf(combo: number): number {
    return this.counts[combo] ?? 0;
  }

  /** Draw offsets for one combination, oldest first. No allocation. */
  private offsets(combo: number): Int32Array {
    return this.rows.subarray(this.starts[combo], this.starts[combo + 1]);
  }

  /** Every historical occurrence of one combination, newest first. */
  occurrences(combo: number): Occurrence[] {
    const offs = this.offsets(combo);
    const out: Occurrence[] = new Array(offs.length);
    for (let i = 0; i < offs.length; i++) {
      const d = this.draws[offs[offs.length - 1 - i]];
      out[i] = { date: d.date, stream: d.stream, game: d.game };
    }
    return out;
  }

  stats(combo: number): ComboStats {
    const offs = this.offsets(combo);
    const count = offs.length;
    if (count === 0) {
      return { combo, count: 0, firstSeen: null, lastSeen: null, drawsSince: null, share: 0 };
    }
    const first = this.draws[offs[0]];
    const last = this.draws[offs[count - 1]];
    return {
      combo,
      count,
      firstSeen: first.date,
      lastSeen: last.date,
      drawsSince: this.totalDraws - 1 - offs[count - 1],
      share: this.totalDraws ? count / this.totalDraws : 0,
    };
  }

  /** The most recent n draws, newest first. Returns fewer if history is shorter. */
  recent(n: number): ComboDraw[] {
    const out: ComboDraw[] = [];
    for (let i = this.draws.length - 1; i >= 0 && out.length < n; i--) out.push(this.draws[i]);
    return out;
  }

  /** Whole filtered history, oldest first. Callers must not mutate it. */
  all(): readonly ComboDraw[] {
    return this.draws;
  }

  distribution(): ComboDistribution {
    if (this._distribution) return this._distribution;
    let maxCount = 0;
    for (let c = 0; c < COMBO_UNIVERSE; c++) if (this.counts[c] > maxCount) maxCount = this.counts[c];
    const histogram = new Array(maxCount + 1).fill(0);
    for (let c = 0; c < COMBO_UNIVERSE; c++) histogram[this.counts[c]]++;

    // Median over the 10,000 per-combination counts, read off the histogram.
    const mid = COMBO_UNIVERSE / 2;
    let cumulative = 0;
    let lower = 0;
    let upper = 0;
    for (let k = 0; k < histogram.length; k++) {
      const before = cumulative;
      cumulative += histogram[k];
      if (before < mid && cumulative >= mid) lower = k;
      if (before < mid + 1 && cumulative >= mid + 1) {
        upper = k;
        break;
      }
    }
    // The never-drawn bucket is excluded: with 10,000 slots and a few
    // thousand draws it always dominates, which says nothing useful about
    // how often the combinations that DID appear came up.
    let modeCount = histogram.length > 1 ? 1 : 0;
    for (let k = 2; k < histogram.length; k++) if (histogram[k] > histogram[modeCount]) modeCount = k;

    this._distribution = {
      histogram,
      seen: COMBO_UNIVERSE - histogram[0],
      neverSeen: histogram[0],
      maxCount,
      meanCount: this.totalDraws / COMBO_UNIVERSE,
      medianCount: (lower + upper) / 2,
      modeCount,
    };
    return this._distribution;
  }
}

/** Reduce raw draws to 4-digit rows that pass the filter, chronologically. */
export function filterComboDraws(
  sources: { game: Game; draws: readonly Draw[] }[],
  filter: ComboFilter,
): ComboDraw[] {
  const out: ComboDraw[] = [];
  for (const src of sources) {
    for (const d of src.draws) {
      const combo = comboOfDraw(d.digits);
      if (combo === null) continue;
      if (filter.stream !== "all" && (d.stream ?? "other") !== filter.stream) continue;
      if (filter.from && d.date < filter.from) continue;
      if (filter.to && d.date > filter.to) continue;
      out.push({ date: d.date, stream: d.stream, game: src.game, combo });
    }
  }
  // Multi-source (All States) interleaves datasets, so sort. Single-source
  // input is already chronological and this is a near no-op.
  out.sort((a, b) => (a.date === b.date ? a.game.localeCompare(b.game) : a.date.localeCompare(b.date)));
  return out;
}

export function buildComboIndex(
  sources: { game: Game; draws: readonly Draw[] }[],
  filter: ComboFilter,
): ComboIndex {
  return new ComboIndex(
    filterComboDraws(sources, filter),
    sources.map((s) => s.game),
  );
}

/**
 * Frequency tiers for the reel and the universe. Deliberately coarse —
 * five buckets read instantly; a continuous gradient would imply a
 * precision the data does not carry.
 */
export type Tier = 0 | 1 | 2 | 3 | 4;
export const tierOf = (count: number): Tier =>
  count <= 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : 4;
