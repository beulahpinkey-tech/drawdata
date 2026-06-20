// Game slug = one of the 6 routes. State-scoped picks use the
// "<state>-<game>" form so /[game] only needs one dynamic segment.
export type StateCode = "wi" | "pa" | "nj" | "tx" | "nc" | "fl" | "wa" | "ga";
export type PickGame = "pick3" | "pick4";
export type NationalGame = "powerball" | "megamillions";
export type BallGame = NationalGame;

export type Game =
  | "wi-pick3"
  | "wi-pick4"
  | "pa-pick3"
  | "pa-pick4"
  | "nj-pick3"
  | "nj-pick4"
  | "tx-pick3"
  | "tx-pick4"
  | "nc-pick3"
  | "nc-pick4"
  | "fl-pick3"
  | "fl-pick4"
  | "wa-pick3"
  | "ga-pick3"
  | "ga-pick4"
  | "powerball"
  | "megamillions";

export const ALL_GAMES: Game[] = [
  "wi-pick3",
  "wi-pick4",
  "pa-pick3",
  "pa-pick4",
  "nj-pick3",
  "nj-pick4",
  "tx-pick3",
  "tx-pick4",
  "nc-pick3",
  "nc-pick4",
  "fl-pick3",
  "fl-pick4",
  "wa-pick3",
  "ga-pick3",
  "ga-pick4",
  "powerball",
  "megamillions",
];

export function isPickSlug(slug: string): slug is `${StateCode}-${PickGame}` {
  return /^(wi|pa|nj|tx|nc|fl|wa|ga)-(pick3|pick4)$/.test(slug);
}
export function isBallSlug(slug: string): slug is NationalGame {
  return slug === "powerball" || slug === "megamillions";
}
export function isGameSlug(slug: string): slug is Game {
  return isPickSlug(slug) || isBallSlug(slug);
}

/** "wi-pick3" → { state: "wi", game: "pick3" } */
export function splitPickSlug(
  slug: `${StateCode}-${PickGame}`,
): { state: StateCode; game: PickGame } {
  const [state, game] = slug.split("-") as [StateCode, PickGame];
  return { state, game };
}

// Draw streams. Most states run a Midday + Evening pair; Georgia adds a
// Night draw (and historically a Morning one), so the model carries all
// four named slots plus an "other" catch-all. STREAM_ORDER is the canonical
// chronological order used for sorting and display.
export type Stream = "morning" | "midday" | "evening" | "night" | "other";
export const STREAM_ORDER: Exclude<Stream, "other">[] = ["morning", "midday", "evening", "night"];

export type PowerballEra = {
  id: string;
  start: string;
  end: string | null;
  whitePool: number;
  redPool: number;
  label: string;
};

export type Draw = {
  game: Game | "pick3" | "pick4";
  date: string;
  stream?: Stream;
  digits?: number[];
  whites?: number[];
  special?: number;
  era?: string;
  index: number;
};

export type ParseReport = {
  game: Game | "pick3" | "pick4";
  totalRows: number;
  parsed: number;
  skipped: number;
  skippedReasons: Record<string, number>;
  dateRange: [string, string];
};

export type GameMeta = {
  game: Game;
  label: string;
  count: number;
  countMorning?: number;
  countMidday?: number;
  countEvening?: number;
  countNight?: number;
  countOther?: number;
  earliest: string;
  latest: string;
  latestDraw: Draw;
  pool?: number;
  positions?: number;
  hasStream: boolean;
};
