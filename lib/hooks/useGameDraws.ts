"use client";

import { useEffect, useState } from "react";
import type { Draw, Game } from "@/lib/types";

/**
 * Lazy-load full draws for the requested game. The JSON is ~1MB so we keep it
 * out of the initial bundle; pages that need it use this hook.
 */
export function useGameDraws(game: Game): {
  draws: Draw[] | null;
  loading: boolean;
} {
  const [draws, setDraws] = useState<Draw[] | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const mod: any =
        game === "pick3"
          ? await import("@/lib/data/pick3.json")
          : game === "pick4"
          ? await import("@/lib/data/pick4.json")
          : game === "megamillions"
          ? await import("@/lib/data/megamillions.json")
          : await import("@/lib/data/powerball.json");
      if (cancelled) return;
      let all: Draw[] = mod.draws ?? mod.default?.draws;
      if (game === "powerball") {
        all = all.filter((d) => d.era === "2015-10-07");
      } else if (game === "megamillions") {
        all = all.filter((d) => d.era === "2025-04-08");
      }
      setDraws(all);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [game]);
  return { draws, loading };
}
