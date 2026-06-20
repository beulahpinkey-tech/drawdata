"use client";

import { FrequencyBars } from "@/components/charts/FrequencyBars";
import type { Game } from "@/lib/types";

const STREAM_ORDER = ["morning", "midday", "evening", "night"] as const;
const LABEL: Record<string, string> = { morning: "Morning", midday: "Midday", evening: "Evening", night: "Night" };

type Sub = { count: number; earliest: string; latest: string; allPositions: number[] };

/**
 * Stream comparison — generalized to however many named streams a game
 * runs. Most states have two (Midday/Evening); Georgia has three
 * (Midday/Evening/Night). Each present stream gets a count card and a
 * frequency chart, and the share table shows one column per stream so you
 * can eyeball digit-share differences across all of them at once.
 */
export function StreamsView({ game, agg }: { game: Game; agg: any }) {
  const streams = STREAM_ORDER.filter((s) => agg[s] && agg[s].count > 0).map((s) => ({
    key: s,
    label: LABEL[s],
    sub: agg[s] as Sub,
    total: (agg[s] as Sub).allPositions.reduce((a: number, b: number) => a + b, 0),
  }));

  if (streams.length < 2) {
    return (
      <div className="panel p-8 text-center text-dim text-sm">
        At least two streams need to be present to compare. Currently {streams.length}.
      </div>
    );
  }

  const positions = game.endsWith("pick3") ? 3 : 4;
  const share = (st: (typeof streams)[number], d: number) => st.sub.allPositions[d] / st.total;

  // Largest spread between any two streams' share, per digit.
  let biggest = { digit: 0, spread: 0 };
  for (let d = 0; d < 10; d++) {
    const shares = streams.map((st) => share(st, d));
    const spread = Math.max(...shares) - Math.min(...shares);
    if (spread > biggest.spread) biggest = { digit: d, spread };
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {streams.map((st) => (
          <div key={st.key} className="panel p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">{st.label} draws</div>
            <div className="font-display text-[28px] mt-1 tabular-nums">{st.sub.count.toLocaleString()}</div>
            <div className="text-[11px] text-dim">{st.sub.earliest} → {st.sub.latest}</div>
          </div>
        ))}
        <div className="panel p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">Largest share spread</div>
          <div className="font-display text-[28px] mt-1 tabular-nums">digit {biggest.digit}</div>
          <div className="text-[11px] text-dim">Δ {(biggest.spread * 100).toFixed(2)} pts across streams</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {streams.map((st) => {
          const exp = st.total / 10;
          const data = st.sub.allPositions.map((v: number, i: number) => ({ label: String(i), value: v, expected: exp }));
          return (
            <div key={st.key} className="panel p-6">
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">{st.label} · digit frequency</div>
              <h2 className="font-display text-[22px] mt-1">All positions</h2>
              <div className="mt-4">
                <FrequencyBars data={data} highlightMax unit="picks" height={260} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel p-6 overflow-x-auto">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Share comparison</div>
        <h2 className="font-display text-[22px] mt-1">Digit share by stream (% of digits drawn)</h2>
        <table className="mt-4 w-full text-[13px] min-w-[420px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-dim font-mono">
              <th className="text-left py-2 pr-3 font-normal">Digit</th>
              {streams.map((st) => (
                <th key={st.key} className="text-right py-2 px-3 font-normal">{st.label}</th>
              ))}
              <th className="text-right py-2 pl-3 font-normal">Spread</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, d) => {
              const shares = streams.map((st) => share(st, d));
              const spread = (Math.max(...shares) - Math.min(...shares)) * 100;
              return (
                <tr key={d} className="border-t border-edge/40">
                  <td className="py-1.5 pr-3 font-mono text-dim">d={d}</td>
                  {streams.map((st, i) => (
                    <td key={st.key} className="py-1.5 px-3 text-right tabular-nums font-mono">
                      {(shares[i] * 100).toFixed(2)}
                    </td>
                  ))}
                  <td className="py-1.5 pl-3 text-right tabular-nums font-mono text-dim">{spread.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-4 text-[12px] text-dim">
          Spreads this small (typically &lt; 1 pt) are exactly what independent random sampling produces. The
          streams are separate drawings with the same odds — this is a sanity check, not a signal.
        </p>
      </div>
    </>
  );
}
