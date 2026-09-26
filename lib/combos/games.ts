/**
 * The four-digit games the Combination Explorer can analyse.
 *
 * Derived from the same catalog the rest of the site uses — a state
 * appears here only once its Pick 4 CSVs are in data/ and precompute has
 * emitted lib/data/<game>.json. Nothing is listed speculatively, so the
 * selector can never offer a state with no history behind it.
 */

import meta from "@/lib/data/meta.json";
import type { Game, Stream } from "@/lib/types";

export type ComboGame = {
  game: Game;
  /** Two-letter state code, e.g. "ny". */
  state: string;
  /** "New York", for the state column. */
  stateLabel: string;
  /** "Win 4" — what that state actually calls the game. */
  gameLabel: string;
  count: number;
  earliest: string;
  latest: string;
  streams: Stream[];
};

const STREAM_KEYS: [Stream, keyof GameMetaRow][] = [
  ["morning", "countMorning"],
  ["midday", "countMidday"],
  ["evening", "countEvening"],
  ["night", "countNight"],
];

type GameMetaRow = {
  state: string;
  stateLabel: string;
  count: number;
  earliest: string;
  latest: string;
  countMorning?: number;
  countMidday?: number;
  countEvening?: number;
  countNight?: number;
  countOther?: number;
};

// State-specific product names. GAME_SHORT in lib/data carries the same
// strings, but importing it would pull all 27 aggregate JSONs into the
// client bundle for the sake of twelve labels.
const GAME_LABEL: Record<string, string> = {
  "wi-pick4": "Pick 4",
  "pa-pick4": "Pick 4",
  "nj-pick4": "Pick-4",
  "tx-pick4": "Daily 4",
  "nc-pick4": "Pick 4",
  "fl-pick4": "Pick 4",
  "ga-pick4": "Cash 4",
  "mi-pick4": "Daily 4",
  "ny-pick4": "Win 4",
  "ca-pick4": "Daily 4",
  "ma-pick4": "The Numbers Game",
  "md-pick4": "Pick 4",
};

export const COMBO_GAMES: ComboGame[] = Object.keys(GAME_LABEL)
  .map((slug) => {
    const row = (meta as Record<string, unknown>)[slug] as GameMetaRow | undefined;
    if (!row) return null;
    return {
      game: slug as Game,
      state: row.state,
      stateLabel: row.stateLabel,
      gameLabel: GAME_LABEL[slug],
      count: row.count,
      earliest: row.earliest,
      latest: row.latest,
      streams: STREAM_KEYS.filter(([, key]) => ((row[key] as number) ?? 0) > 0).map(([s]) => s),
    };
  })
  .filter((g): g is ComboGame => g !== null)
  .sort((a, b) => a.stateLabel.localeCompare(b.stateLabel));

export const DEFAULT_COMBO_GAME: Game = COMBO_GAMES.some((g) => g.game === "ny-pick4")
  ? "ny-pick4"
  : COMBO_GAMES[0].game;

export const comboGame = (game: Game): ComboGame | undefined =>
  COMBO_GAMES.find((g) => g.game === game);

export const ALL_STATES = "all" as const;
export type ComboScope = Game | typeof ALL_STATES;

export const isAllStates = (scope: ComboScope): scope is typeof ALL_STATES => scope === ALL_STATES;

export function scopeGames(scope: ComboScope): Game[] {
  return isAllStates(scope) ? COMBO_GAMES.map((g) => g.game) : [scope];
}

export function scopeLabel(scope: ComboScope): string {
  if (isAllStates(scope)) return "All states";
  const g = comboGame(scope);
  return g ? `${g.stateLabel} ${g.gameLabel}` : scope;
}

/** Streams offered for a scope — the union across states in All States mode. */
export function scopeStreams(scope: ComboScope): Stream[] {
  const order: Stream[] = ["morning", "midday", "evening", "night"];
  const present = new Set<Stream>();
  for (const game of scopeGames(scope)) {
    for (const s of comboGame(game)?.streams ?? []) present.add(s);
  }
  return order.filter((s) => present.has(s));
}

/** Total draws on record for a scope, straight from meta. */
export function scopeDrawCount(scope: ComboScope): number {
  return scopeGames(scope).reduce((sum, g) => sum + (comboGame(g)?.count ?? 0), 0);
}
