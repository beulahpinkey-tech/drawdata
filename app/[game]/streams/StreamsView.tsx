"use client";

import { FrequencyBars } from "@/components/charts/FrequencyBars";

import type { Game } from "@/lib/types";

export function StreamsView({ game, agg }: { game: Game; agg: any }) {
  const m = agg.midday;
  const e = agg.evening;
  if (!m || !e) {
    return (
      <div className="panel p-8 text-center text-dim text-sm">
        Both streams need to be present in the data. Currently missing one.
      </div>
    );
  }
  const positions = game.endsWith("pick3") ? 3 : 4;
  const mTotal = m.allPositions.reduce((a: number, b: number) => a + b, 0);
  const eTotal = e.allPositions.reduce((a: number, b: number) => a + b, 0);
  const mExp = mTotal / 10;
  const eExp = eTotal / 10;

  const mData = m.allPositions.map((v: number, i: number) => ({ label: String(i), value: v, expected: mExp }));
  const eData = e.allPositions.map((v: number, i: number) => ({ label: String(i), value: v, expected: eExp }));

  // Largest gap between midday and evening shares
  let biggestGap = { digit: 0, gap: 0 };
  for (let d = 0; d < 10; d++) {
    const ms = m.allPositions[d] / mTotal;
    const es = e.allPositions[d] / eTotal;
    const g = Math.abs(ms - es);
    if (g > biggestGap.gap) biggestGap = { digit: d, gap: g };
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">Midday draws</div>
          <div className="font-display text-[28px] mt-1 tabular-nums">{m.count.toLocaleString()}</div>
          <div className="text-[11px] text-dim">{m.earliest} → {m.latest}</div>
        </div>
        <div className="panel p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">Evening draws</div>
          <div className="font-display text-[28px] mt-1 tabular-nums">{e.count.toLocaleString()}</div>
          <div className="text-[11px] text-dim">{e.earliest} → {e.latest}</div>
        </div>
        <div className="panel p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">Largest share gap</div>
          <div className="font-display text-[28px] mt-1 tabular-nums">digit {biggestGap.digit}</div>
          <div className="text-[11px] text-dim">Δ {(biggestGap.gap * 100).toFixed(2)} percentage points</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Midday · digit frequency</div>
          <h2 className="font-display text-[22px] mt-1">All positions</h2>
          <div className="mt-4">
            <FrequencyBars data={mData} highlightMax unit="picks" height={260} />
          </div>
        </div>
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Evening · digit frequency</div>
          <h2 className="font-display text-[22px] mt-1">All positions</h2>
          <div className="mt-4">
            <FrequencyBars data={eData} highlightMax unit="picks" height={260} />
          </div>
        </div>
      </div>

      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Share comparison</div>
        <h2 className="font-display text-[22px] mt-1">Digit share difference (midday − evening)</h2>
        <div className="mt-4 grid grid-cols-5 sm:grid-cols-10 gap-2">
          {Array.from({ length: 10 }).map((_, d) => {
            const ms = m.allPositions[d] / mTotal;
            const es = e.allPositions[d] / eTotal;
            const diff = (ms - es) * 100;
            const positive = diff >= 0;
            return (
              <div key={d} className="panel-inner p-2 text-center">
                <div className="text-[12px] font-mono text-dim">d={d}</div>
                <div className={`text-[16px] font-mono tabular-nums ${positive ? "text-accent" : "text-cool"}`}>
                  {positive ? "+" : ""}{diff.toFixed(2)}
                </div>
                <div className="text-[9px] text-dim">pts</div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[12px] text-dim">
          Differences this small (typically &lt; 0.5 pts) are exactly what independent random sampling
          produces over tens of thousands of draws. Useful as a sanity check, not a signal.
        </p>
      </div>
    </>
  );
}
