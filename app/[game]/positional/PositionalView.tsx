"use client";

import { useMemo, useState } from "react";
import { PositionHeatmap } from "@/components/charts/PositionHeatmap";
import { SumDistribution } from "@/components/charts/SumDistribution";
import { StreamSelect } from "@/components/StreamSelect";
import { useGameDraws } from "@/lib/hooks/useGameDraws";
import { boxTypeBreakdown, rootSumDistribution } from "@/lib/analytics/digits";
import { ChartZoom } from "@/components/motion/ChartZoom";
import { ChartPanelActions } from "@/components/ChartPanelActions";

import type { Game } from "@/lib/types";

export function PositionalView({ game, agg }: { game: Game; agg: any }) {
  const [stream, setStream] = useState<"combined" | "midday" | "evening">("combined");
  const slice = agg[stream] ?? agg.combined;
  const positions = game.endsWith("pick3") ? 3 : 4;
  const maxSum = positions * 9;
  const { draws, loading } = useGameDraws(game);

  const streamFiltered = useMemo(() => {
    if (!draws) return [];
    if (stream === "combined") return draws;
    return draws.filter((d) => d.stream === stream);
  }, [draws, stream]);

  const boxTypes = useMemo(
    () => (streamFiltered.length > 0 ? boxTypeBreakdown(streamFiltered, positions as 3 | 4) : []),
    [streamFiltered, positions],
  );
  const rootDist = useMemo(
    () => (streamFiltered.length > 0 ? rootSumDistribution(streamFiltered) : {}),
    [streamFiltered],
  );

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="text-[12px] text-dim font-mono">
          showing <span className="text-text">{slice.count.toLocaleString()}</span> draws ({stream})
        </div>
        <StreamSelect value={stream} onChange={setStream} />
      </div>

      <div id="heatmap" className="panel p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Digit-by-position heatmap</div>
            <h2 className="font-display text-[22px] mt-1">Which digit shows up where</h2>
          </div>
          <ChartPanelActions
            ctx={{
              panelId: `${game}-heatmap-${stream}`,
              title: `${positions === 3 ? "Pick 3" : "Pick 4"} positional heatmap (${stream})`,
              csv: () => {
                const header = ["position", "digit0", "digit1", "digit2", "digit3", "digit4", "digit5", "digit6", "digit7", "digit8", "digit9"];
                const rows = slice.freqByPosition.map((r: any) => [`P${r.position + 1}`, ...r.counts]);
                return [header.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
              },
            }}
          />
        </div>
        <ChartZoom caption="Digit-by-position heatmap">
          <div className="mt-5">
            <PositionHeatmap freqByPosition={slice.freqByPosition} />
          </div>
        </ChartZoom>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div id="sums" className="panel p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Sum distribution</div>
              <h2 className="font-display text-[22px] mt-1">All digits added together (0–{maxSum})</h2>
            </div>
            <ChartPanelActions
              ctx={{
                panelId: `${game}-sums-${stream}`,
                title: `${positions === 3 ? "Pick 3" : "Pick 4"} digit sums (${stream})`,
                csv: () => {
                  const rows = [["sum", "count"]];
                  for (let s = 0; s <= maxSum; s++) rows.push([String(s), String(slice.sums[s] ?? 0)]);
                  return rows.map((r) => r.join(",")).join("\n");
                },
              }}
            />
          </div>
          <p className="mt-2 text-[12px] text-dim">
            With independent uniform digits, this settles into a triangular/bell shape centered near{" "}
            <span className="text-text">{(positions * 4.5).toFixed(1)}</span>.
          </p>
          <ChartZoom caption="Digit sum distribution">
            <div className="mt-3">
              <SumDistribution dist={slice.sums} maxSum={maxSum} height={260} />
            </div>
          </ChartZoom>
        </div>

        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Draw shapes</div>
          <h2 className="font-display text-[22px] mt-1">Repeats inside one draw</h2>
          <div className="mt-4 space-y-3">
            {[
              ["all_diff", "All distinct"],
              ["double", "Has a double"],
              ["triple", "Has a triple"],
              ["quad", "Has a quad"],
            ].map(([k, label]) => {
              const v = slice.shapes[k] as number;
              const pct = (v / slice.count) * 100;
              return (
                <div key={k}>
                  <div className="flex justify-between text-[12px] font-mono">
                    <span className="text-dim">{label}</span>
                    <span>
                      {v.toLocaleString()} <span className="text-dim">· {pct.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div className="h-full bg-accent/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Digital root distribution</div>
          <h2 className="font-display text-[22px] mt-1">Sum reduced to a single digit (0–9)</h2>
          <p className="mt-1 text-[12px] text-dim">
            Digital root keeps adding digits until one is left. Reference under uniform digits ≈ 11.1% per class for 1–9, lower for 0.
          </p>
          <div className="mt-4 space-y-2">
            {loading ? (
              <div className="text-center text-dim text-sm py-8">Loading…</div>
            ) : (
              Array.from({ length: 10 }).map((_, root) => {
                const v = rootDist[root] ?? 0;
                const tot = Object.values(rootDist).reduce((a, b) => a + b, 0) || 1;
                const pct = (v / tot) * 100;
                return (
                  <div key={root}>
                    <div className="flex justify-between text-[12px] font-mono">
                      <span className="text-dim">root = {root}</span>
                      <span>
                        {v.toLocaleString()} <span className="text-dim">· {pct.toFixed(1)}%</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full bg-cool/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Box-type breakdown</div>
          <h2 className="font-display text-[22px] mt-1">
            {positions === 3 ? "Pick 3 box types" : "Pick 4 box types"}
          </h2>
          <p className="mt-1 text-[12px] text-dim">
            Observed share vs the theoretical share under uniform random digits.
          </p>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-center text-dim text-sm py-8">Loading…</div>
            ) : (
              boxTypes.map((b) => {
                const obs = b.share * 100;
                const exp = b.expected * 100;
                return (
                  <div key={b.type}>
                    <div className="flex justify-between text-[12px] font-mono">
                      <span className="text-dim">{b.type}</span>
                      <span>
                        {obs.toFixed(2)}% <span className="text-dim">vs {exp.toFixed(2)}% expected</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden relative">
                      <div className="h-full bg-accent/70" style={{ width: `${obs}%` }} />
                      <div className="absolute inset-y-0 w-px bg-cool" style={{ left: `${exp}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
