// Server-side data accessors. Slug-based: pages pass the game slug
// ("wi-pick3", "pa-pick4", "nj-pick3", "powerball", "megamillions") and
// we look up the matching aggregate JSON.

import wiPick3 from "./wi-pick3.json";
import wiPick4 from "./wi-pick4.json";
import paPick3 from "./pa-pick3.json";
import paPick4 from "./pa-pick4.json";
import njPick3 from "./nj-pick3.json";
import njPick4 from "./nj-pick4.json";
import powerball from "./powerball.json";
import megamillions from "./megamillions.json";
import wiPick3Agg from "./wi-pick3.agg.json";
import wiPick4Agg from "./wi-pick4.agg.json";
import paPick3Agg from "./pa-pick3.agg.json";
import paPick4Agg from "./pa-pick4.agg.json";
import njPick3Agg from "./nj-pick3.agg.json";
import njPick4Agg from "./nj-pick4.agg.json";
import powerballAgg from "./powerball.agg.json";
import megamillionsAgg from "./megamillions.agg.json";
import meta from "./meta.json";
import type { Draw, Game } from "../types";

export const META = meta as typeof meta;

export function getDraws(game: Game): Draw[] {
  switch (game) {
    case "wi-pick3": return (wiPick3 as { draws: Draw[] }).draws;
    case "wi-pick4": return (wiPick4 as { draws: Draw[] }).draws;
    case "pa-pick3": return (paPick3 as { draws: Draw[] }).draws;
    case "pa-pick4": return (paPick4 as { draws: Draw[] }).draws;
    case "nj-pick3": return (njPick3 as { draws: Draw[] }).draws;
    case "nj-pick4": return (njPick4 as { draws: Draw[] }).draws;
    case "megamillions": return (megamillions as { draws: Draw[] }).draws;
    case "powerball": return (powerball as { draws: Draw[] }).draws;
  }
}

export function getAgg(game: Game): any {
  switch (game) {
    case "wi-pick3": return wiPick3Agg;
    case "wi-pick4": return wiPick4Agg;
    case "pa-pick3": return paPick3Agg;
    case "pa-pick4": return paPick4Agg;
    case "nj-pick3": return njPick3Agg;
    case "nj-pick4": return njPick4Agg;
    case "megamillions": return megamillionsAgg;
    case "powerball": return powerballAgg;
  }
}

export function getMeta(game: Game): any {
  return (META as any)[game];
}

export const GAME_LABELS: Record<Game, string> = {
  "wi-pick3": "Wisconsin Pick 3",
  "wi-pick4": "Wisconsin Pick 4",
  "pa-pick3": "Pennsylvania Pick 3",
  "pa-pick4": "Pennsylvania Pick 4",
  "nj-pick3": "New Jersey Pick 3",
  "nj-pick4": "New Jersey Pick 4",
  powerball: "Powerball",
  megamillions: "Mega Millions",
};

export const GAME_SHORT: Record<Game, string> = {
  "wi-pick3": "Pick 3",
  "wi-pick4": "Pick 4",
  "pa-pick3": "Pick 3",
  "pa-pick4": "Pick 4",
  "nj-pick3": "Pick 3",
  "nj-pick4": "Pick 4",
  powerball: "Powerball",
  megamillions: "Mega Millions",
};

export const STATE_LABEL: Record<string, string> = {
  wi: "Wisconsin",
  pa: "Pennsylvania",
  nj: "New Jersey",
};

export const GAME_BLURB: Record<Game, string> = {
  "wi-pick3":
    "Three digits, 0–9, drawn twice daily by the Wisconsin Lottery. Outcome space: 1,000 combinations.",
  "wi-pick4":
    "Four digits, 0–9, drawn twice daily by the Wisconsin Lottery. Outcome space: 10,000 combinations.",
  "pa-pick3":
    "Three digits, 0–9, drawn twice daily by the Pennsylvania Lottery. Outcome space: 1,000 combinations.",
  "pa-pick4":
    "Four digits, 0–9, drawn twice daily by the Pennsylvania Lottery. Outcome space: 10,000 combinations.",
  "nj-pick3":
    "Three digits, 0–9, drawn twice daily by the New Jersey Lottery (Midday 12:59 PM ET, Evening 10:57 PM ET).",
  "nj-pick4":
    "Four digits, 0–9, drawn twice daily by the New Jersey Lottery. Outcome space: 10,000 combinations.",
  powerball:
    "Five white balls (1–69) plus one red Powerball (1–26). Outcome space: 292,201,338 combinations. Multi-state.",
  megamillions:
    "Five white balls (1–70) plus one Mega Ball. Pool changed in April 2025 (now 1–24). Multi-state national game.",
};

export const NATIONAL_GAMES: Game[] = ["powerball", "megamillions"];
export const PICK_GAMES: Game[] = [
  "wi-pick3", "wi-pick4",
  "pa-pick3", "pa-pick4",
  "nj-pick3", "nj-pick4",
];
export const BALL_GAMES: Game[] = ["powerball", "megamillions"];

export const isDigitGame = (g: Game) =>
  g === "wi-pick3" || g === "wi-pick4" ||
  g === "pa-pick3" || g === "pa-pick4" ||
  g === "nj-pick3" || g === "nj-pick4";
export const isBallGame = (g: Game) => g === "powerball" || g === "megamillions";
