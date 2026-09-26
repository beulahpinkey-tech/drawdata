/**
 * Draw schedules, derived from each game's own history.
 *
 * The project has no schedule configuration — draw days live implicitly in
 * the data, and they differ by state and by era (Colorado's midday draw
 * starts in 2016; Massachusetts ran evening-only for decades). Rather than
 * hardcode a calendar that would rot, we read the cadence off the recent
 * record: which (weekday, stream) slots actually produced draws in the
 * trailing window, and how reliably.
 *
 * A slot is "regular" when it fired on most of its opportunities in the
 * window. Projecting forward then only ever names a slot the game has
 * actually been drawing — never today + 1, and never a day this game
 * doesn't draw. When the window is too thin to establish a cadence we
 * return null and the UI says so instead of guessing.
 */

import type { Stream } from "@/lib/types";
import type { ComboDraw } from "./index-build";

export type DrawSlot = {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  stream: Stream | undefined;
};

const DAY_MS = 86_400_000;

/** "2026-09-26" → epoch day number (UTC), stable across time zones. */
export function isoToDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function dayToIso(day: number): string {
  const dt = new Date(day * DAY_MS);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 0 = Sunday … 6 = Saturday, in UTC. */
export function weekdayOf(iso: string): number {
  return new Date(isoToDay(iso) * DAY_MS).getUTCDay();
}

const slotKey = (weekday: number, stream: Stream | undefined) => `${weekday}|${stream ?? "other"}`;

export type Cadence = {
  /** Regular (weekday, stream) slots, as `${weekday}|${stream}` keys. */
  slots: Set<string>;
  /** Streams the game is currently running, chronological-ish order. */
  streams: (Stream | undefined)[];
  /** Days covered by the window that produced this cadence. */
  windowDays: number;
};

/**
 * Work out the recurring slots from the tail of the history.
 *
 * `minShare` is the fraction of a slot's opportunities that must have
 * produced a draw. 0.6 tolerates the occasional missing day (holidays,
 * a gap in the source feed) without admitting one-off draws.
 */
export function deriveCadence(
  draws: readonly ComboDraw[],
  opts: { windowDays?: number; minShare?: number } = {},
): Cadence | null {
  const windowDays = opts.windowDays ?? 120;
  const minShare = opts.minShare ?? 0.6;
  if (draws.length === 0) return null;

  const lastDay = isoToDay(draws[draws.length - 1].date);
  const firstDay = lastDay - windowDays + 1;

  // Opportunities per weekday inside the window.
  const opportunities = new Array(7).fill(0);
  for (let day = firstDay; day <= lastDay; day++) {
    opportunities[new Date(day * DAY_MS).getUTCDay()]++;
  }

  const hits = new Map<string, number>();
  let inWindow = 0;
  for (let i = draws.length - 1; i >= 0; i--) {
    const d = draws[i];
    const day = isoToDay(d.date);
    if (day < firstDay) break;
    inWindow++;
    const key = slotKey(new Date(day * DAY_MS).getUTCDay(), d.stream);
    hits.set(key, (hits.get(key) ?? 0) + 1);
  }
  // Too little recent history to claim a cadence at all.
  if (inWindow < 10) return null;

  const slots = new Set<string>();
  const streams = new Set<Stream | undefined>();
  for (const [key, count] of hits) {
    const weekday = parseInt(key.slice(0, key.indexOf("|")), 10);
    if (opportunities[weekday] === 0) continue;
    if (count / opportunities[weekday] >= minShare) {
      slots.add(key);
      const raw = key.slice(key.indexOf("|") + 1);
      streams.add(raw === "other" ? undefined : (raw as Stream));
    }
  }
  if (slots.size === 0) return null;

  const order: (Stream | undefined)[] = ["morning", "midday", "evening", "night", undefined];
  return {
    slots,
    streams: order.filter((s) => streams.has(s)),
    windowDays,
  };
}

/**
 * The next `count` scheduled slots strictly after the last recorded draw
 * (and never earlier than `today`). Returns null when no cadence could be
 * established, so callers can say "schedule unavailable" honestly.
 */
export function nextDrawSlots(
  draws: readonly ComboDraw[],
  count: number,
  today: string,
  cadence?: Cadence | null,
): DrawSlot[] | null {
  const cad = cadence !== undefined ? cadence : deriveCadence(draws);
  if (!cad || draws.length === 0) return null;

  const last = draws[draws.length - 1];
  const lastDay = isoToDay(last.date);
  const startDay = Math.max(lastDay, isoToDay(today));
  const streamOrder: (Stream | undefined)[] = ["morning", "midday", "evening", "night", undefined];

  // Slots already drawn on the start day — skip them, they're history now.
  const drawnOnStartDay = new Set<string>();
  for (let i = draws.length - 1; i >= 0; i--) {
    if (isoToDay(draws[i].date) !== startDay) break;
    drawnOnStartDay.add(draws[i].stream ?? "other");
  }

  const out: DrawSlot[] = [];
  // 60 days ahead is far more than five slots for any real daily game;
  // the bound just stops a pathological cadence from looping forever.
  for (let day = startDay; day <= startDay + 60 && out.length < count; day++) {
    const weekday = new Date(day * DAY_MS).getUTCDay();
    for (const stream of streamOrder) {
      if (out.length >= count) break;
      if (!cad.slots.has(slotKey(weekday, stream))) continue;
      if (day === startDay && drawnOnStartDay.has(stream ?? "other")) continue;
      out.push({ date: dayToIso(day), stream });
    }
  }
  return out.length ? out : null;
}

/** Find the real draw that filled a slot, if the dataset has it yet. */
export function drawAtSlot(draws: readonly ComboDraw[], slot: DrawSlot): ComboDraw | null {
  for (let i = draws.length - 1; i >= 0; i--) {
    const d = draws[i];
    if (d.date < slot.date) break;
    if (d.date === slot.date && (d.stream ?? "other") === (slot.stream ?? "other")) return d;
  }
  return null;
}
