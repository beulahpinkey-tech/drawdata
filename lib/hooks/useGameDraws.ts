"use client";

import { useEffect, useState } from "react";
import type { Draw, Game } from "@/lib/types";
import { getDraws } from "@/lib/draws";

/**
 * Ball-game analytics use only the current matrix; older eras are tagged and
 * excluded here so frequency/gap math never mixes incompatible pools.
 */
export const CURRENT_ERA: Partial<Record<Game, string>> = {
  powerball: "2015-10-07",
  megamillions: "2025-04-08",
};

/**
 * Lazy-load full draws for a game in the browser.
 *
 * Delegates to getDraws() (lib/draws.ts), the single loader that covers every
 * game AND decodes the compact on-disk format (lib/draw-codec.ts). This hook
 * used to keep its own 12-case switch and read `mod.draws` directly. That broke
 * twice over: the switch never learned about the states added after North
 * Carolina, and once pick histories moved to the compact `{ rows }` encoding,
 * `mod.draws` was undefined — so pairs, carryover, lookup, frequency, Explore
 * and Patterns silently computed on zero draws while the server-rendered header
 * above them showed the real count.
 */
export function useGameDraws(game: Game): {
  draws: Draw[] | null;
  loading: boolean;
  error: Error | null;
} {
  const [draws, setDraws] = useState<Draw[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDraws(game)
      .then((all) => {
        if (cancelled) return;
        const era = CURRENT_ERA[game];
        setDraws(era ? all.filter((d) => d.era === era) : all);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // Surface it rather than leave consumers on an endless spinner.
        console.error(`useGameDraws(${game}) failed`, e);
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game]);
  return { draws, loading, error };
}
