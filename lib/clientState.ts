"use client";

const GAME_KEY = "drawdata_active_game_v1";

export type ActiveGame = "pick3" | "pick4" | "powerball" | "megamillions";

export function readActiveGame(): ActiveGame | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(GAME_KEY);
    if (
      v === "pick3" ||
      v === "pick4" ||
      v === "powerball" ||
      v === "megamillions"
    )
      return v;
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
