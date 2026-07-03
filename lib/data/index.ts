// Server-side data accessors. Slug-based: pages pass the game slug
// ("wi-pick3", "pa-pick4", "nj-pick3", "tx-pick3", "powerball",
// "megamillions") and we look up the matching aggregate JSON.

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
import gaPick3Agg from "./ga-pick3.agg.json";
import gaPick4Agg from "./ga-pick4.agg.json";
import miPick3Agg from "./mi-pick3.agg.json";
import miPick4Agg from "./mi-pick4.agg.json";
import powerballAgg from "./powerball.agg.json";
import megamillionsAgg from "./megamillions.agg.json";
import meta from "./meta.json";
import type { Game } from "../types";

export const META = meta as typeof meta;

// getDraws is lazy (dynamic per-game import) and lives in lib/draws, so the
// ~20 MB of full history is NOT bundled into every route. Re-exported here
// so existing `import { getDraws } from "@/lib/data"` sites keep working —
// note it now returns Promise<Draw[]>, so callers must await it.
export { getDraws } from "../draws";

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
    case "ga-pick3": return gaPick3Agg;
    case "ga-pick4": return gaPick4Agg;
    case "mi-pick3": return miPick3Agg;
    case "mi-pick4": return miPick4Agg;
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
  "ga-pick3": "Georgia Cash 3",
  "ga-pick4": "Georgia Cash 4",
  "mi-pick3": "Michigan Daily 3",
  "mi-pick4": "Michigan Daily 4",
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
  "ga-pick3": "Cash 3",
  "ga-pick4": "Cash 4",
  "mi-pick3": "Daily 3",
  "mi-pick4": "Daily 4",
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
  ga: "Georgia",
  mi: "Michigan",
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
  "ga-pick3":
    "Three digits, 0–9, drawn three times daily by the Georgia Lottery (Cash 3 — Midday, Evening, Night) since 1993. Outcome space: 1,000 combinations. The Fireball add-on is not shown.",
  "ga-pick4":
    "Four digits, 0–9, drawn three times daily by the Georgia Lottery (Cash 4 — Midday, Evening, Night) since 1997. Outcome space: 10,000 combinations. The Fireball add-on is not shown.",
  "mi-pick3":
    "Three digits, 0–9, drawn twice daily by the Michigan Lottery (Daily 3 — Midday + Evening). Outcome space: 1,000 combinations.",
  "mi-pick4":
    "Four digits, 0–9, drawn twice daily by the Michigan Lottery (Daily 4 — Midday + Evening). Outcome space: 10,000 combinations.",
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
  "ga-pick3", "ga-pick4",
  "mi-pick3", "mi-pick4",
];
export const BALL_GAMES: Game[] = ["powerball", "megamillions"];

export const isDigitGame = (g: Game) =>
  g === "wi-pick3" || g === "wi-pick4" ||
  g === "pa-pick3" || g === "pa-pick4" ||
  g === "nj-pick3" || g === "nj-pick4" ||
  g === "tx-pick3" || g === "tx-pick4" ||
  g === "nc-pick3" || g === "nc-pick4" ||
  g === "fl-pick3" || g === "fl-pick4" ||
  g === "wa-pick3" ||
  g === "ga-pick3" || g === "ga-pick4" ||
  g === "mi-pick3" || g === "mi-pick4";

// Canonical named streams in chronological order. "other" is excluded —
// it's the catch-all for untagged/legacy rows, never a comparison column.
export const STREAMS = ["morning", "midday", "evening", "night"] as const;
export type NamedStream = (typeof STREAMS)[number];

const STREAM_COUNT_KEY: Record<NamedStream, string> = {
  morning: "countMorning",
  midday: "countMidday",
  evening: "countEvening",
  night: "countNight",
};

export const STREAM_LABEL: Record<NamedStream, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
  night: "Night",
};

/** The named streams a game actually has draws for, chronological order. */
export function presentStreams(g: Game): NamedStream[] {
  if (!isDigitGame(g)) return [];
  const m = (META as any)[g];
  if (!m) return [];
  return STREAMS.filter((s) => (m[STREAM_COUNT_KEY[s]] ?? 0) > 0);
}

/**
 * Whether a game has ≥2 named streams worth comparing. Single-draw games
 * (e.g. Washington's once-nightly Daily Game) return false, so the engine
 * suppresses the /streams comparison spoke rather than shipping an empty
 * page. Multi-draw states (Georgia: midday/evening/night) return true and
 * the streams page renders an N-way comparison.
 */
export const hasStreams = (g: Game): boolean => presentStreams(g).length >= 2;
export const isBallGame = (g: Game) => g === "powerball" || g === "megamillions";
