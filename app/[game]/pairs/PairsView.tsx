"use client";

import { useMemo, useState } from "react";
import { useGameDraws } from "@/lib/hooks/useGameDraws";
import { pairFrequency } from "@/lib/analytics/digits";
import { StreamSelect } from "@/components/StreamSelect";
import { NumberBall } from "@/components/NumberBall";
import type { Game } from "@/lib/types";

export function PairsView({ game }: { game: Game }) {
  const { draws, loading } = useGameDraws(game);
  const [stream, setStream] = useState<"combined" | "midday" | "evening">("combined");

  const filtered = useMemo(() => {
    if (!draws) return [];
    if (stream === "combined") return draws;
    return draws.filter((d) => d.stream === stream);
  }, [draws, stream]);

  const result = useMemo(() => pairFrequency(filtered), [filtered]);

  if (loading)
    return (
      <div className="panel p-8 text-center text-dim text-sm">Loading draws…</div>
    );

  const { matrix, topPairs, totalDraws } = result;
  // expected count for any specific pair {a,b} with a != b under uniform digits:
  // P(both a and b appear in a draw) = 1 - 2*(9/10)^P + (8/10)^P
  // P(double {a,a}) = different math but we skip displaying it
  const P = game.endsWith("pick3") ? 3 : 4;
  const pAB = 1 - 2 * Math.pow(0.9, P) + Math.pow(0.8, P);
  const expected = totalDraws * pAB;

  let max = 0;
  for (const row of matrix) for (const v of row) if (v > max) max = v;

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="text-[12px] text-dim font-mono">
          showing <span className="text-text">{totalDraws.toLocaleString()}</span> draws ({stream}) · expected per distinct pair ≈{" "}
          <span className="text-cool">{expected.toFixed(0)}</span>
        </div>
        <StreamSelect value={stream} onChange={setStream} />
      </div>

      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Pair co-occurrence matrix</div>
        <h2 className="font-display text-[22px] mt-1">How often two digits show up together</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-[12px] font-mono tabular-nums">
            <thead>
              <tr className="text-dim">
                <th className="text-left py-2 pr-2 font-normal">↓ a \ b →</th>
                {Array.from({ length: 10 }).map((_, b) => (
                  <th key={b} className="py-2 px-1 text-center font-normal">{b}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, a) => (
                <tr key={a} className="border-t border-edge">
                  <td className="py-1.5 pr-2 text-dim">{a}</td>
                  {row.map((v, b) => {
                    if (b < a) return <td key={b} className="px-1" />;
                    const t = max > 0 ? v / max : 0;
                    const intensity = 0.04 + t * 0.55;
                    return (
                      <td key={b} className="py-1 px-1 text-center">
                        <div
                          className="rounded-md py-1 border border-edge"
                          style={{ background: `rgba(233,184,74,${intensity})` }}
                          title={`{${a},${b}} appeared in ${v} draws`}
                        >
                          <div className="text-[11px] text-text">{v}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Top 12 pairs</div>
        <h3 className="font-display text-[18px] mt-1">Most frequently co-occurring digit pairs</h3>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {topPairs.slice(0, 12).map((p, i) => (
            <div key={i} className="panel-inner p-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <NumberBall value={p.a} variant="digit" size="sm" />
                <span className="text-dim">+</span>
                <NumberBall value={p.b} variant="digit" size="sm" />
              </div>
              <div className="text-right font-mono">
                <div className="text-[14px] tabular-nums">{p.count.toLocaleString()}</div>
                <div className="text-[10px] text-dim">draws</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
