"use client";

import { useMemo, useState } from "react";
import { useGameDraws } from "@/lib/hooks/useGameDraws";
import { carryoverAnalysis, mirrorCarryover, mirrorDigit } from "@/lib/analytics/digits";
import { StreamSelect } from "@/components/StreamSelect";
import { NumberBall } from "@/components/NumberBall";

import type { Game } from "@/lib/types";

export function CarryoverView({ game }: { game: Game }) {
  const { draws, loading } = useGameDraws(game);
  const [stream, setStream] = useState<"combined" | "midday" | "evening">("combined");

  const filtered = useMemo(() => {
    if (!draws) return [];
    if (stream === "combined") return draws;
    return draws.filter((d) => d.stream === stream);
  }, [draws, stream]);

  const carry = useMemo(() => carryoverAnalysis(filtered), [filtered]);
  const mirror = useMemo(() => mirrorCarryover(filtered), [filtered]);

  if (loading)
    return <div className="panel p-8 text-center text-dim text-sm">Loading draws…</div>;

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="text-[12px] text-dim font-mono">
          showing <span className="text-text">{carry.transitions.toLocaleString()}</span> transitions ({stream})
        </div>
        <StreamSelect value={stream} onChange={setStream} />
      </div>

      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Carryover overlap</div>
        <h2 className="font-display text-[22px] mt-1">Digits shared with the previous draw</h2>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <ObservedExpected
            label="Mean shared digits (prev → next)"
            observed={carry.meanOverlap}
            expected={carry.expectedOverlap}
            unit="digits"
          />
          <div className="panel-inner p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-dim font-mono">Distribution of overlap counts</div>
            <div className="mt-2 space-y-1">
              {Object.entries(carry.distribution)
                .map(([k, v]) => ({ k: parseInt(k, 10), v }))
                .sort((a, b) => a.k - b.k)
                .map(({ k, v }) => {
                  const pct = (v / carry.transitions) * 100;
                  return (
                    <div key={k}>
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-dim">{k} shared</span>
                        <span>{v.toLocaleString()} <span className="text-dim">· {pct.toFixed(1)}%</span></span>
                      </div>
                      <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mt-0.5">
                        <div className="h-full bg-accent/60" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Per-digit carry rate</div>
        <h3 className="font-display text-[18px] mt-1">P(digit appears next | digit appeared in prev)</h3>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {carry.byDigit.map((b) => (
            <div key={b.digit} className="panel-inner p-3 flex items-center justify-between">
              <NumberBall value={b.digit} variant="digit" size="sm" />
              <div className="text-right font-mono">
                <div className="text-[14px] tabular-nums">{(b.carryRate * 100).toFixed(1)}%</div>
                <div className="text-[10px] text-dim">{b.appearances.toLocaleString()} samples</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-dim">
          For a fair process, all ten digits should land near the same rate. Variance you see is the
          finite-sample band.
        </p>
      </div>

      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Mirror analysis</div>
        <h2 className="font-display text-[22px] mt-1">Does the next draw contain a mirror of a previous digit?</h2>
        <p className="mt-1 text-[12px] text-dim">
          Mirror map: 0↔5, 1↔6, 2↔7, 3↔8, 4↔9.
        </p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ObservedExpected
            label="Share of transitions with ≥1 mirror"
            observed={mirror.observedRate}
            expected={mirror.expectedRate}
            percentage
          />
          <div className="panel-inner p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-dim font-mono mb-2">Per-digit mirror carry rate</div>
            <div className="grid grid-cols-2 gap-1.5">
              {mirror.byDigit.map((b) => (
                <div key={b.digit} className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-dim flex items-center gap-1">
                    <NumberBall value={b.digit} variant="digit" size="sm" />
                    <span>→</span>
                    <NumberBall value={mirrorDigit(b.digit)} variant="muted" size="sm" />
                  </span>
                  <span className="tabular-nums">{(b.carryRate * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ObservedExpected({
  label,
  observed,
  expected,
  unit,
  percentage,
}: {
  label: string;
  observed: number;
  expected: number;
  unit?: string;
  percentage?: boolean;
}) {
  const fmt = (n: number) => (percentage ? `${(n * 100).toFixed(2)}%` : n.toFixed(2));
  const delta = observed - expected;
  return (
    <div className="panel-inner p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-dim font-mono">{label}</div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-dim font-mono">observed</div>
          <div className="font-display text-[24px] tabular-nums">{fmt(observed)} {unit && <span className="text-[12px] text-dim">{unit}</span>}</div>
        </div>
        <div>
          <div className="text-[10px] text-cool font-mono">if random</div>
          <div className="font-display text-[24px] tabular-nums text-cool">{fmt(expected)} {unit && <span className="text-[12px] text-dim">{unit}</span>}</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-dim font-mono">
        delta · <span className={Math.abs(delta) < 0.5 ? "text-cool" : "text-hot"}>{delta > 0 ? "+" : ""}{fmt(delta)}</span>
      </div>
    </div>
  );
}
