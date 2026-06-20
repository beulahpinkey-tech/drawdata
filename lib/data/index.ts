// Server-side data accessors. Slug-based: pages pass the game slug
// ("wi-pick3", "pa-pick4", "nj-pick3", "tx-pick3", "powerball",
// "megamillions") and we look up the matching aggregate JSON.

import wiPick3 from "./wi-pick3.json";
import wiPick4 from "./wi-pick4.json";
import paPick3 from "./pa-pick3.json";
import paPick4 from "./pa-pick4.json";
import njPick3 from "./nj-pick3.json";
import njPick4 from "./nj-pick4.json";
import txPick3 from "./tx-pick3.json";
import txPick4 from "./tx-pick4.json";
import ncPick3 from "./nc-pick3.json";
import ncPick4 from "./nc-pick4.json";
import flPick3 from "./fl-pick3.json";
import flPick4 from "./fl-pick4.json";
import waPick3 from "./wa-pick3.json";
import powerball from "./powerball.json";
import megamillions from "./megamillions.json";
import wiPick3Agg from "./wi-pick3.agg.json";
import wiPick4Agg from "./wi-pick4.agg.json";
import paPick3Agg from "./pa-pick3.agg.json";
import paPick4Agg from "./pa-pick4.agg.json";
import njPick3Agg from "./nj-pick3.agg.json";
import njPick4Agg from "./nj-pick4.agg.json";
import txPick3Agg from "./tx-pick3.agg.json";
import txPick4Agg from "./tx-pick4.agg.json";
import ncPick3Agg from "./nc-pick3.agg.json";
import ncPick4Agg from "./nc-pick4.agg.json";
import flPick3Agg from "./fl-pick3.agg.json";
import flPick4Agg from "./fl-pick4.agg.json";
import waPick3Agg from "./wa-pick3.agg.json";
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
    case "tx-pick3": return (txPick3 as { draws: Draw[] }).draws;
    case "tx-pick4": return (txPick4 as { draws: Draw[] }).draws;
    case "nc-pick3": return (ncPick3 as { draws: Draw[] }).draws;
    case "nc-pick4": return (ncPick4 as { draws: Draw[] }).draws;
    case "fl-pick3": return (flPick3 as { draws: Draw[] }).draws;
    case "fl-pick4": return (flPick4 as { draws: Draw[] }).draws;
    case "wa-pick3": return (waPick3 as { draws: Draw[] }).draws;
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
    case "tx-pick3": return txPick3Agg;
    case "tx-pick4": return txPick4Agg;
    case "nc-pick3": return ncPick3Agg;
    case "nc-pick4": return ncPick4Agg;
    case "fl-pick3": return flPick3Agg;
    case "fl-pick4": return flPick4Agg;
    case "wa-pick3": return waPick3Agg;
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
  "tx-pick3": "Texas Pick 3",
  "tx-pick4": "Texas Daily 4",
  "nc-pick3": "North Carolina Pick 3",
  "nc-pick4": "North Carolina Pick 4",
  "fl-pick3": "Florida Pick 3",
  "fl-pick4": "Florida Pick 4",
  "wa-pick3": "Washington Daily Game",
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
  "tx-pick3": "Pick 3",
  "tx-pick4": "Daily 4",
  "nc-pick3": "Pick 3",
  "nc-pick4": "Pick 4",
  "fl-pick3": "Pick 3",
  "fl-pick4": "Pick 4",
  "wa-pick3": "Daily Game",
  powerball: "Powerball",
  megamillions: "Mega Millions",
};

export const STATE_LABEL: Record<string, string> = {
  wi: "Wisconsin",
  pa: "Pennsylvania",
  nj: "New Jersey",
  tx: "Texas",
  nc: "North Carolina",
  fl: "Florida",
  wa: "Washington",
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
  "tx-pick3":
    "Three digits, 0–9, drawn by the Texas Lottery. We show the Day (~12:27 PM CT) and Night (~10:12 PM CT) flagship draws.",
  "tx-pick4":
    "Four digits, 0–9, drawn by the Texas Lottery (\"Daily 4\"). Day + Night draws shown. Outcome space: 10,000 combinations.",
  "nc-pick3":
    "Three digits, 0–9, drawn twice daily by the North Carolina Education Lottery. Day + Evening draws since October 2006.",
  "nc-pick4":
    "Four digits, 0–9, drawn twice daily by the North Carolina Education Lottery. Day + Evening draws since April 2009.",
  "fl-pick3":
    "Three digits, 0–9, drawn twice daily by the Florida Lottery (Midday + Evening). Outcome space: 1,000 combinations. The Fireball add-on is not shown.",
  "fl-pick4":
    "Four digits, 0–9, drawn twice daily by the Florida Lottery (Midday + Evening). Outcome space: 10,000 combinations. The Fireball add-on is not shown.",
  "wa-pick3":
    "Three digits, 0–9, drawn once nightly by the Washington Lottery (\"Daily Game\", ~8:00 PM PT). Single daily draw — no midday/evening split. Outcome space: 1,000 combinations.",
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
  "tx-pick3", "tx-pick4",
  "nc-pick3", "nc-pick4",
  "fl-pick3", "fl-pick4",
  "wa-pick3",
];
export const BALL_GAMES: Game[] = ["powerball", "megamillions"];

export const isDigitGame = (g: Game) =>
  g === "wi-pick3" || g === "wi-pick4" ||
  g === "pa-pick3" || g === "pa-pick4" ||
  g === "nj-pick3" || g === "nj-pick4" ||
  g === "tx-pick3" || g === "tx-pick4" ||
  g === "nc-pick3" || g === "nc-pick4" ||
  g === "fl-pick3" || g === "fl-pick4" ||
  g === "wa-pick3";

/**
 * Whether a game has a Midday/Evening (or Day/Night) split worth comparing.
 * Single-draw games (e.g. Washington's once-nightly Daily Game) return
 * false, so the engine suppresses the /streams "midday vs evening" spoke
 * for them rather than shipping an empty comparison.
 */
export const hasStreams = (g: Game): boolean => {
  if (!isDigitGame(g)) return false;
  const m = (META as any)[g];
  return !!m && (m.countMidday ?? 0) > 0 && (m.countEvening ?? 0) > 0;
};
export const isBallGame = (g: Game) => g === "powerball" || g === "megamillions";
