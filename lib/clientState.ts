"use client";

import { ALL_GAMES, type Game } from "@/lib/types";

const GAME_KEY = "drawdata_active_game_v2"; // v2 because slug format changed

// The set of games the client may remember. Derived from ALL_GAMES so it
// cannot drift: this used to be a hand-maintained union and fell 15 datasets
// behind, which silently broke "remember my last game" for every state added
// after North Carolina.
export type ActiveGame = Game;

const VALID = new Set<ActiveGame>(ALL_GAMES);

export function readActiveGame(): ActiveGame | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(GAME_KEY) as ActiveGame | null;
    if (v && VALID.has(v)) return v;
    // legacy upgrade from v1 (bare "pick3" → "wi-pick3")
    const legacy = localStorage.getItem("drawdata_active_game_v1");
    if (legacy === "pick3") return "wi-pick3";
    if (legacy === "pick4") return "wi-pick4";
    if (legacy === "powerball" || legacy === "megamillions") return legacy as ActiveGame;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeActiveGame(g: ActiveGame) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GAME_KEY, g);
  } catch {
    /* ignore */
  }
}
