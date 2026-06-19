"use client";

/**
 * Draw Explorer — faceted, drill-down exploration of the full draw
 * history (the trackmyi140-style "explore" model applied to lottery
 * data). Every filter is encoded in the URL so any view is shareable
 * and reload-stable, and clicking a digit in the per-position frequency
 * strip pivots the whole result set to that segment.
 *
 * Scope: digit games (Pick 3 / Pick 4 across all 5 states). Ball games
 * have a different shape and are a planned follow-up.
 *
 * Filters: game · stream · date range · exact digit per position ·
 * sum range · shape (all-distinct / double / triple / quad).
 */

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameDraws } from "@/lib/hooks/useGameDraws";
import { GAME_LABELS } from "@/lib/data";
import { track } from "@/lib/analytics";
import type { Draw, Game } from "@/lib/types";
import { NumberBall } from "@/components/NumberBall";

const DIGIT_GAMES: Game[] = [
  "wi-pick3", "pa-pick3", "nj-pick3", "tx-pick3", "nc-pick3",
  "wi-pick4", "pa-pick4", "nj-pick4", "tx-pick4", "nc-pick4",
];
const ROW_CAP = 400; // table render cap; count is always the true total
type Shape = "any" | "all_diff" | "double" | "triple" | "quad";

function shapeOf(digits: number[]): Shape {
  const counts = new Map<number, number>();
  for (const d of digits) counts.set(d, (counts.get(d) ?? 0) + 1);
  const max = Math.max(...counts.values());
  if (max === 1) return "all_diff";
  if (max === digits.length) return digits.length === 4 ? "quad" : "triple";
  if (max === 3) return "triple";
  return "double";
}

export function ExploreView() {
  const router = useRouter();
  const sp = useSearchParams();

  const game = (DIGIT_GAMES.includes(sp.get("g") as Game) ? sp.get("g") : "pa-pick3") as Game;
  const positions = game.endsWith("pick3") ? 3 : 4;
  const stream = sp.get("s") ?? "all"; // all | midday | evening
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const sumMin = sp.get("smin") ? parseInt(sp.get("smin")!, 10) : null;
  const sumMax = sp.get("smax") ? parseInt(sp.get("smax")!, 10) : null;
  const shape = (sp.get("shape") as Shape) ?? "any";
  // Per-position digit filters encoded as p0..p3 (value 0-9 or absent).
  const posFilters: (number | null)[] = Array.from({ length: positions }, (_, i) => {
    const v = sp.get(`p${i}`);
    return v != null && /^\d$/.test(v) ? parseInt(v, 10) : null;
  });

  const { draws, loading } = useGameDraws(game);

  // Update one or more URL params, preserving the rest.
  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      router.replace(`/explore?${next.toString()}`, { scroll: false });
    },
    [sp, router],
  );

  const onPickGame = (g: Game) => {
    track("Explore Game", { game: g });
    // Changing positions invalidates p2/p3 — clear position filters.
    const next = new URLSearchParams(sp.toString());
    next.set("g", g);
    for (let i = 0; i < 4; i++) next.delete(`p${i}`);
    router.replace(`/explore?${next.toString()}`, { scroll: false });
  };

  const filtered = useMemo(() => {
    if (!draws) return [];
    return draws.filter((d) => {
      const digits = d.digits;
      if (!digits || digits.length !== positions) return false;
      if (stream !== "all" && d.stream !== stream) return false;
      if (from && d.date < from) return false;
      if (to && d.date > to) return false;
      for (let i = 0; i < positions; i++) {
        if (posFilters[i] != null && digits[i] !== posFilters[i]) return false;
      }
      const sum = digits.reduce((a, b) => a + b, 0);
      if (sumMin != null && sum < sumMin) return false;
      if (sumMax != null && sum > sumMax) return false;
      if (shape !== "any" && shapeOf(digits) !== shape) return false;
      return true;
    });
  }, [draws, positions, stream, from, to, posFilters, sumMin, sumMax, shape]);

  // Per-position digit frequency over the CURRENT filtered set — drives
  // the click-to-drill strips.
  const posFreq = useMemo(() => {
    const f: number[][] = Array.from({ length: positions }, () => new Array(10).fill(0));
    for (const d of filtered) {
      if (!d.digits) continue;
      for (let i = 0; i < positions; i++) f[i][d.digits[i]]++;
    }
    return f;
  }, [filtered, positions]);

  const anyFilter =
    stream !== "all" || from || to || sumMin != null || sumMax != null ||
    shape !== "any" || posFilters.some((p) => p != null);

  const maxSum = positions * 9;

  return (
    <div className="space-y-5">
      {/* Game selector */}
      <div className="panel p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-2">Game</div>
        <div className="flex flex-wrap gap-2">
          {DIGIT_GAMES.map((g) => (
            <button
              key={g}
              onClick={() => onPickGame(g)}
              className={`px-3 py-1.5 rounded-md text-[13px] border transition-colors ${
                g === game
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-edge text-dim hover:text-text hover:bg-white/[0.04]"
              }`}
            >
              {GAME_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="panel p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Stream</Label>
          <div className="flex gap-1.5">
            {["all", "midday", "evening"].map((s) => (
              <button
                key={s}
                onClick={() => setParams({ s: s === "all" ? null : s })}
                className={`px-3 py-1.5 rounded-md text-[12px] border capitalize transition-colors ${
                  stream === s ? "border-accent/50 bg-accent/10 text-accent" : "border-edge text-dim hover:text-text"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Shape</Label>
          <select
            value={shape}
            onChange={(e) => setParams({ shape: e.target.value === "any" ? null : e.target.value })}
            className="w-full bg-panel2 border border-edge rounded-md px-3 py-1.5 text-[13px] text-text"
          >
            <option value="any">Any</option>
            <option value="all_diff">All distinct</option>
            <option value="double">Has a double</option>
            <option value="triple">Has a triple</option>
            {positions === 4 && <option value="quad">Quad</option>}
          </select>
        </div>

        <div>
          <Label>Date from → to</Label>
          <div className="flex gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setParams({ from: e.target.value })}
              className="flex-1 bg-panel2 border border-edge rounded-md px-2 py-1.5 text-[13px] text-text"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setParams({ to: e.target.value })}
              className="flex-1 bg-panel2 border border-edge rounded-md px-2 py-1.5 text-[13px] text-text"
            />
          </div>
        </div>

        <div>
          <Label>Sum range (0–{maxSum})</Label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={maxSum} placeholder="min"
              value={sumMin ?? ""}
              onChange={(e) => setParams({ smin: e.target.value || null })}
              className="w-20 bg-panel2 border border-edge rounded-md px-2 py-1.5 text-[13px] text-text"
            />
            <span className="text-dim">→</span>
            <input
              type="number" min={0} max={maxSum} placeholder="max"
              value={sumMax ?? ""}
              onChange={(e) => setParams({ smax: e.target.value || null })}
              className="w-20 bg-panel2 border border-edge rounded-md px-2 py-1.5 text-[13px] text-text"
            />
          </div>
        </div>
      </div>

      {/* Per-position click-to-drill strips */}
      <div className="panel p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-3">
          Digit by position — click to filter
        </div>
        <div className="space-y-3">
          {posFilters.map((sel, pos) => {
            const counts = posFreq[pos];
            const max = Math.max(1, ...counts);
            return (
              <div key={pos} className="flex items-center gap-2">
                <span className="w-8 text-[12px] font-mono text-dim shrink-0">P{pos + 1}</span>
                <div className="flex gap-1 flex-wrap">
                  {counts.map((c, digit) => {
                    const active = sel === digit;
                    const h = 4 + Math.round((c / max) * 22);
                    return (
                      <button
                        key={digit}
                        onClick={() => setParams({ [`p${pos}`]: active ? null : String(digit) })}
                        title={`${c.toLocaleString()} draws with ${digit} in P${pos + 1}`}
                        className={`flex flex-col items-center justify-end w-7 rounded-sm border transition-colors ${
                          active ? "border-accent bg-accent/15" : "border-edge hover:bg-white/[0.05]"
                        }`}
                        style={{ height: 34 }}
                      >
                        <span
                          className={active ? "bg-accent w-3 rounded-sm" : "bg-white/30 w-3 rounded-sm"}
                          style={{ height: h }}
                        />
                        <span className={`text-[10px] font-mono ${active ? "text-accent" : "text-dim"}`}>{digit}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Result header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-[14px]">
          <span className="font-display text-[24px] tabular-nums text-accent">
            {filtered.length.toLocaleString()}
          </span>{" "}
          <span className="text-dim">
            of {(draws?.length ?? 0).toLocaleString()} draws match
          </span>
        </div>
        {anyFilter && (
          <button
            onClick={() => router.replace(`/explore?g=${game}`, { scroll: false })}
            className="text-[12px] text-cool hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results table */}
      {loading || !draws ? (
        <div className="panel p-8 text-center text-dim text-sm">Loading draws…</div>
      ) : filtered.length === 0 ? (
        <div className="panel p-8 text-center text-dim text-sm">
          No draws match these filters. <button onClick={() => router.replace(`/explore?g=${game}`)} className="text-cool hover:underline">Reset</button>
        </div>
      ) : (
        <div className="panel p-2 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-dim text-[11px] uppercase tracking-wider font-mono">
                  <th className="text-left py-2 px-2 font-normal">Date</th>
                  <th className="text-left py-2 px-2 font-normal">Stream</th>
                  <th className="text-left py-2 px-2 font-normal">Digits</th>
                  <th className="text-right py-2 px-2 font-normal">Sum</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, ROW_CAP).map((d, i) => (
                  <Row key={`${d.date}-${d.stream}-${i}`} d={d} />
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > ROW_CAP && (
            <div className="mt-3 text-center text-[12px] text-dim">
              Showing first {ROW_CAP.toLocaleString()} of {filtered.length.toLocaleString()} — narrow the filters to see fewer.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ d }: { d: Draw }) {
  const sum = (d.digits ?? []).reduce((a, b) => a + b, 0);
  return (
    <tr className="border-t border-edge hover:bg-white/[0.03]">
      <td className="py-1.5 px-2 font-mono tabular-nums">{d.date}</td>
      <td className="py-1.5 px-2 text-dim capitalize">{d.stream === "other" ? "—" : d.stream}</td>
      <td className="py-1.5 px-2">
        <div className="flex gap-1">
          {(d.digits ?? []).map((v, i) => (
            <NumberBall key={i} value={v} variant="digit" size="sm" />
          ))}
        </div>
      </td>
      <td className="py-1.5 px-2 text-right font-mono tabular-nums text-dim">{sum}</td>
    </tr>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-1.5">{children}</div>;
}
