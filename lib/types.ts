export type Game = "pick3" | "pick4" | "powerball" | "megamillions";
export type BallGame = "powerball" | "megamillions";

export type Stream = "midday" | "evening" | "other";

export type PowerballEra = {
  id: string;
  start: string; // inclusive
  end: string | null; // exclusive (null = current)
  whitePool: number; // e.g., 69
  redPool: number; // e.g., 26
  label: string;
};

export type Draw = {
  game: Game;
  date: string; // ISO YYYY-MM-DD
  stream?: Stream;
  digits?: number[];
  whites?: number[];
  special?: number;
  era?: string;
  index: number;
};

export type ParseReport = {
  game: Game;
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
  countMidday?: number;
  countEvening?: number;
  countOther?: number;
  earliest: string;
  latest: string;
  latestDraw: Draw;
  pool?: number; // digit upper for pick games (10); white pool for powerball current era
  positions?: number; // 3 / 4 / 5
  hasStream: boolean;
};
