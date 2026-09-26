"use client";

/**
 * State / game / draw-type / date-range controls.
 *
 * Only states with a real four-digit dataset are listed (COMBO_GAMES is
 * derived from meta.json), and the draw-type options are the streams that
 * state actually runs — Massachusetts has no Night draw, so it is never
 * offered one. "All states" is a deliberate, separate choice: nothing is
 * combined unless it is picked.
 */

import { useId } from "react";
import type { Stream } from "@/lib/types";
import {
  ALL_STATES,
  COMBO_GAMES,
  comboGame,
  scopeStreams,
  type ComboScope,
} from "@/lib/combos/games";
import type { StreamFilter } from "@/lib/combos/index-build";
import { fmtDate } from "./tiers";

export function ScopeControls({
  scope,
  stream,
  from,
  to,
  bounds,
  onScope,
  onStream,
  onRange,
}: {
  scope: ComboScope;
  stream: StreamFilter;
  from: string;
  to: string;
  /** Actual first/last dates available for the current scope. */
  bounds: { earliest: string; latest: string } | null;
  onScope: (scope: ComboScope) => void;
  onStream: (stream: StreamFilter) => void;
  onRange: (from: string, to: string) => void;
}) {
  const id = useId();
  const streams = scopeStreams(scope);
  const game = scope === ALL_STATES ? null : comboGame(scope);
  const rangeIsAll = !from && !to;

  return (
    <div className="panel p-4 sm:p-5">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 lg:gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-dim">
              State &amp; game
            </span>
            <select
              value={scope}
              onChange={(e) => onScope(e.target.value as ComboScope)}
              className="mt-1.5 h-11 w-full rounded-md border border-edge bg-panel2 px-3 text-[14px] focus:outline-none focus:border-accent"
            >
              {COMBO_GAMES.map((g) => (
                <option key={g.game} value={g.game}>
                  {g.stateLabel} — {g.gameLabel} ({g.count.toLocaleString()} draws)
                </option>
              ))}
              <option value={ALL_STATES}>All states combined (loads every dataset)</option>
            </select>
          </label>

          <div>
            <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-dim">
              Draw type
            </span>
            <div
              role="radiogroup"
              aria-label="Draw type"
              className="mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-md border border-edge bg-white/[0.02] p-1"
            >
              <StreamButton active={stream === "all"} onClick={() => onStream("all")}>
                All
              </StreamButton>
              {streams.map((s: Stream) => (
                <StreamButton key={s} active={stream === s} onClick={() => onStream(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </StreamButton>
              ))}
            </div>
            {streams.length <= 1 && (
              <p className="mt-1.5 text-[11px] text-dim">
                {game ? `${game.stateLabel} runs a single daily draw.` : "One draw per day."}
              </p>
            )}
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-dim">
            Date range
          </span>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`${id}-from`}>
              From date
            </label>
            <input
              id={`${id}-from`}
              type="date"
              value={from}
              min={bounds?.earliest}
              max={bounds?.latest}
              onChange={(e) => onRange(e.target.value, to)}
              className="h-11 rounded-md border border-edge bg-panel2 px-2.5 text-[13px] focus:outline-none focus:border-accent"
            />
            <span aria-hidden className="text-dim">→</span>
            <label className="sr-only" htmlFor={`${id}-to`}>
              To date
            </label>
            <input
              id={`${id}-to`}
              type="date"
              value={to}
              min={bounds?.earliest}
              max={bounds?.latest}
              onChange={(e) => onRange(from, e.target.value)}
              className="h-11 rounded-md border border-edge bg-panel2 px-2.5 text-[13px] focus:outline-none focus:border-accent"
            />
            {!rangeIsAll && (
              <button
                type="button"
                onClick={() => onRange("", "")}
                className="h-11 px-3 text-[12px] font-mono text-dim hover:text-text transition-colors"
              >
                All history
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-dim">
            {rangeIsAll ? "All available history" : "Filtered range"}
            {bounds ? ` · on record ${fmtDate(bounds.earliest)} → ${fmtDate(bounds.latest)}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function StreamButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`min-h-9 rounded-[5px] px-3 py-1.5 text-[12px] transition-colors ${
        active ? "bg-white/[0.08] text-text" : "text-dim hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
