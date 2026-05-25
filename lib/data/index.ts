// Server-side data accessors. These are imported by server components/pages
// so the large per-game JSON never ships to the client unless explicitly opted in.

import pick3 from "./pick3.json";
import pick4 from "./pick4.json";
import powerball from "./powerball.json";
import megamillions from "./megamillions.json";
import pick3Agg from "./pick3.agg.json";
import pick4Agg from "./pick4.agg.json";
import powerballAgg from "./powerball.agg.json";
import megamillionsAgg from "./megamillions.agg.json";
import meta from "./meta.json";
import type { Draw, Game } from "../types";

export const META = meta as typeof meta;

export function getDraws(game: Game): Draw[] {
  if (game === "pick3") return (pick3 as { draws: Draw[] }).draws;
  if (game === "pick4") return (pick4 as { draws: Draw[] }).draws;
  if (game === "megamillions") return (megamillions as { draws: Draw[] }).draws;
  return (powerball as { draws: Draw[] }).draws;
}

export function getAgg(game: Game) {
  if (game === "pick3") return pick3Agg as any;
  if (game === "pick4") return pick4Agg as any;
  if (game === "megamillions") return megamillionsAgg as any;
  return powerballAgg as any;
}

export const GAME_LABELS: Record<Game, string> = {
  pick3: "Wisconsin Pick 3",
  pick4: "Wisconsin Pick 4",
  powerball: "Powerball",
  megamillions: "Mega Millions",
};

export const GAME_SHORT: Record<Game, string> = {
  pick3: "Pick 3",
  pick4: "Pick 4",
  powerball: "Powerball",
  megamillions: "Mega Millions",
};

export const GAME_BLURB: Record<Game, string> = {
  pick3: "Three digits, 0–9, drawn twice daily. Outcome space: 1,000 combinations. Wisconsin state game.",
  pick4: "Four digits, 0–9, drawn twice daily. Outcome space: 10,000 combinations. Wisconsin state game.",
  powerball:
    "Five white balls (1–69) plus one red Powerball (1–26). Outcome space: 292,201,338 combinations. Multi-state.",
  megamillions:
    "Five white balls (1–70) plus one Mega Ball. Pool changed in April 2025 (now 1–24). Multi-state national game.",
};

export const NATIONAL_GAMES: Game[] = ["powerball", "megamillions"];
export const DIGIT_GAMES: Game[] = ["pick3", "pick4"];
export const BALL_GAMES: Game[] = ["powerball", "megamillions"];

export const isDigitGame = (g: Game) => g === "pick3" || g === "pick4";
export const isBallGame = (g: Game) => g === "powerball" || g === "megamillions";
