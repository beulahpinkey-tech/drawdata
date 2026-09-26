"use client";

/**
 * Saved analyses — localStorage only.
 *
 * DrawData has no accounts and no server tier (see lib/clientState.ts for
 * the same pattern with the active game), so a saved run lives in the
 * visitor's own browser and never leaves it. Records are versioned by key
 * so a future shape change can't crash on old data: unreadable entries are
 * dropped, never migrated in place.
 *
 * A saved run stores enough to reproduce itself — scope, window, weights,
 * algorithm version — and enough to be checked later against real results.
 * Checking is always done against live draw data; nothing here writes back
 * into the historical record.
 */

import type { Game } from "@/lib/types";
import type { ComboDraw, StreamFilter } from "./index-build";
import { drawAtSlot, type DrawSlot } from "./schedule";
import { compareCombos, type Weights } from "./engine";

const KEY = "drawdata_combo_analyses_v1";
const MAX_SAVED = 25;

export type SavedPick = {
  combo: number;
  score: number;
  slot: DrawSlot | null;
};

export type SavedAnalysis = {
  id: string;
  savedAt: string;
  /** Display label for the scope, e.g. "New York Win 4" or "All states". */
  scopeLabel: string;
  games: Game[];
  stream: StreamFilter;
  from?: string;
  to?: string;
  selectedCombo: number | null;
  picks: SavedPick[];
  algorithm: string;
  weights: Weights;
  windowSize: number;
  windowAnalysed: number;
  totalDraws: number;
};

export type PickStatus =
  | { state: "upcoming"; slot: DrawSlot }
  | { state: "no-schedule" }
  | {
      state: "result";
      slot: DrawSlot;
      actual: number;
      exact: boolean;
      positions: boolean[];
      positionMatches: number;
    };

function read(): SavedAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is SavedAnalysis =>
        a && typeof a.id === "string" && Array.isArray(a.picks) && Array.isArray(a.games),
    );
  } catch {
    return [];
  }
}

function write(list: SavedAnalysis[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
  } catch {
    /* quota or private mode — saving is a convenience, not a requirement */
  }
}

export function listAnalyses(): SavedAnalysis[] {
  return read().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveAnalysis(entry: Omit<SavedAnalysis, "id" | "savedAt">): SavedAnalysis {
  const savedAt = new Date().toISOString();
  const record: SavedAnalysis = {
    ...entry,
    savedAt,
    id: `${savedAt}-${entry.games.join("+")}`,
  };
  write([record, ...read().filter((a) => a.id !== record.id)]);
  return record;
}

export function deleteAnalysis(id: string): void {
  write(read().filter((a) => a.id !== id));
}

export function clearAnalyses(): void {
  write([]);
}

/**
 * Compare one saved pick against the real record. Read-only: it looks the
 * slot up in the draws it is handed and reports what it finds.
 */
export function statusOf(pick: SavedPick, draws: readonly ComboDraw[]): PickStatus {
  if (!pick.slot) return { state: "no-schedule" };
  const actual = drawAtSlot(draws, pick.slot);
  if (!actual) return { state: "upcoming", slot: pick.slot };
  const cmp = compareCombos(pick.combo, actual.combo);
  return {
    state: "result",
    slot: pick.slot,
    actual: actual.combo,
    exact: cmp.exact,
    positions: cmp.positions,
    positionMatches: cmp.positionMatches,
  };
}
