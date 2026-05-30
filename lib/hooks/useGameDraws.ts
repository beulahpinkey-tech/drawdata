"use client";

import { useEffect, useState } from "react";
import type { Draw, Game } from "@/lib/types";

/**
 * Lazy-load full draws for the requested game slug. JSON is ~1–2 MB so
 * we keep it out of the initial bundle and import it dynamically.
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
      let mod: any;
      switch (game) {
        case "wi-pick3":
          mod = await import("@/lib/data/wi-pick3.json");
          break;
        case "wi-pick4":
          mod = await import("@/lib/data/wi-pick4.json");
          break;
        case "pa-pick3":
          mod = await import("@/lib/data/pa-pick3.json");
          break;
        case "pa-pick4":
          mod = await import("@/lib/data/pa-pick4.json");
          break;
        case "megamillions":
          mod = await import("@/lib/data/megamillions.json");
          break;
        case "powerball":
          mod = await import("@/lib/data/powerball.json");
          break;
      }
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
