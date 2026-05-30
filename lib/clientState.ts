"use client";

const GAME_KEY = "drawdata_active_game_v2"; // v2 because slug format changed

export type ActiveGame =
  | "wi-pick3"
  | "wi-pick4"
  | "pa-pick3"
  | "pa-pick4"
  | "powerball"
  | "megamillions";

const VALID = new Set<ActiveGame>([
  "wi-pick3",
  "wi-pick4",
  "pa-pick3",
  "pa-pick4",
  "powerball",
  "megamillions",
]);

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
