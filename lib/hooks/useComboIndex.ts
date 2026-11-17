"use client";

/**
 * Loads four-digit draw history for the Combination Explorer and turns it
 * into a ComboIndex, with two layers of caching so the expensive work
 * happens once.
 *
 * Layer 1 — the decoded draws per game, keyed by slug. The per-game JSON is
 * dynamic-imported exactly as lib/hooks/useGameDraws.ts does it, so a state
 * is downloaded only when someone selects it, and never twice.
 *
 * Layer 2 — the built index, keyed by scope + stream + date range. Flicking
 * the reel, opening deep mode and generating sets all read the same index;
 * changing a filter rebuilds it (one linear pass, a few ms on 25k rows).
 *
 * All States is opt-in for a reason: it pulls twelve datasets, ~3 MB, so it
 * reports progress while loading rather than hanging on a blank panel.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { getDraws } from "@/lib/draws";
import type { Draw, Game } from "@/lib/types";
import { buildComboIndex, type ComboFilter, type ComboIndex } from "@/lib/combos/index-build";
import { scopeGames, type ComboScope } from "@/lib/combos/games";

const drawCache = new Map<Game, Draw[]>();
const inFlight = new Map<Game, Promise<Draw[]>>();

/** Four-digit games only: the explorer indexes a 10,000-combination space. */
async function importGame(game: Game): Promise<Draw[]> {
  if (!game.endsWith("pick4")) throw new Error(`No four-digit dataset for ${game}`);
  // Single loader for every game (lib/draws.ts): decodes the compact format
  // and is the one place allowed to import lib/data JSON directly.
  return getDraws(game);
}

export function loadComboDraws(game: Game): Promise<Draw[]> {
  const cached = drawCache.get(game);
  if (cached) return Promise.resolve(cached);
  const pending = inFlight.get(game);
  if (pending) return pending;
  const p = importGame(game)
    .then((draws) => {
      drawCache.set(game, draws);
      inFlight.delete(game);
      return draws;
    })
    .catch((err) => {
      inFlight.delete(game);
      throw err;
    });
  inFlight.set(game, p);
  return p;
}

const indexCache = new Map<string, ComboIndex>();
const filterKey = (scope: ComboScope, filter: ComboFilter) =>
  `${scope}|${filter.stream}|${filter.from ?? ""}|${filter.to ?? ""}`;

export type ComboIndexState = {
  index: ComboIndex | null;
  loading: boolean;
  /** 0–1 while multiple datasets stream in. */
  progress: number;
  error: string | null;
};

export function useComboIndex(scope: ComboScope, filter: ComboFilter): ComboIndexState {
  const key = filterKey(scope, filter);
  const [state, setState] = useState<ComboIndexState>(() => {
    const hit = indexCache.get(key);
    return { index: hit ?? null, loading: !hit, progress: hit ? 1 : 0, error: null };
  });
  // Guards against a slow first selection resolving after a faster second
  // one and overwriting it.
  const latest = useRef(key);

  useEffect(() => {
    latest.current = key;
    const hit = indexCache.get(key);
    if (hit) {
      setState({ index: hit, loading: false, progress: 1, error: null });
      return;
    }
    const games = scopeGames(scope);
    setState((s) => ({ index: s.index, loading: true, progress: 0, error: null }));

    let done = 0;
    let cancelled = false;
    Promise.all(
      games.map((g) =>
        loadComboDraws(g).then((draws) => {
          done++;
          if (!cancelled && latest.current === key) {
            setState((s) => ({ ...s, progress: done / games.length }));
          }
          return { game: g, draws };
        }),
      ),
    )
      .then((sources) => {
        if (cancelled || latest.current !== key) return;
        const index = buildComboIndex(sources, filter);
        indexCache.set(key, index);
        setState({ index, loading: false, progress: 1, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled || latest.current !== key) return;
        setState({
          index: null,
          loading: false,
          progress: 0,
          error: err instanceof Error ? err.message : "Could not load draw history.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [key, scope, filter.stream, filter.from, filter.to]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}

/**
 * Per-state counts for one combination — what "Compare across states"
 * needs. Loads every four-digit dataset on demand (explicitly triggered,
 * never on page load) and reports each state as it lands.
 */
export function useCrossStateCounts(
  combo: number,
  filter: ComboFilter,
  enabled: boolean,
): { rows: { game: Game; count: number }[]; loading: boolean; progress: number } {
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const games = scopeGames("all");
    const missing = games.filter((g) => !drawCache.has(g));
    if (missing.length === 0) {
      setProgress(1);
      return;
    }
    let cancelled = false;
    setLoading(true);
    let done = games.length - missing.length;
    setProgress(done / games.length);
    Promise.all(
      missing.map((g) =>
        loadComboDraws(g).then(() => {
          done++;
          if (!cancelled) setProgress(done / games.length);
        }),
      ),
    ).then(() => {
      if (cancelled) return;
      setLoading(false);
      setVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const rows = useMemo(() => {
    if (!enabled) return [];
    void version; // recompute once the last dataset lands
    const out: { game: Game; count: number }[] = [];
    for (const game of scopeGames("all")) {
      const draws = drawCache.get(game);
      if (!draws) continue;
      let count = 0;
      for (const d of draws) {
        if (!d.digits || d.digits.length !== 4) continue;
        if (filter.stream !== "all" && (d.stream ?? "other") !== filter.stream) continue;
        if (filter.from && d.date < filter.from) continue;
        if (filter.to && d.date > filter.to) continue;
        if (d.digits[0] * 1000 + d.digits[1] * 100 + d.digits[2] * 10 + d.digits[3] === combo) count++;
      }
      out.push({ game, count });
    }
    return out;
  }, [combo, enabled, version, filter.stream, filter.from, filter.to]);

  return { rows, loading, progress };
}
