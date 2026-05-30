"use client";

import { useState } from "react";
import { GapDistribution } from "@/components/charts/GapDistribution";
import { StreamSelect } from "@/components/StreamSelect";
import { NumberBall } from "@/components/NumberBall";
import type { Game } from "@/lib/types";

export function GapsView({ game, agg }: { game: Game; agg: any }) {
  const [stream, setStream] = useState<"combined" | "midday" | "evening">("combined");
  const isBall = game === "powerball" || game === "megamillions";

  if (isBall) {
    const whiteGaps: number[] = agg.whiteGaps;
    const redGaps: number[] = agg.redGaps;
    const wpool = agg.whitePool;
    const rpool = agg.redPool;
    const specialLabel = game === "megamillions" ? "Mega Balls" : "red Powerballs";
    const specialShort = game === "megamillions" ? "Mega Ball" : "red Powerball";
    // Geometric baseline for whites: probability a specific white appears in a single 5-pick draw = 5/wpool
    const pWhite = 5 / wpool;
    const pRed = 1 / rpool;

    return (
      <>
        <div className="text-[12px] text-dim font-mono">
          showing <span className="text-text">{agg.currentCount.toLocaleString()}</span> draws (current era)
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CurrentGapsList values={whiteGaps} pool={wpool} label="white balls" />
          <CurrentGapsList values={redGaps} pool={rpool} label={specialLabel} variant="red" />
        </div>

        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Gap distribution · white balls</div>
          <h2 className="font-display text-[22px] mt-1">Draws between consecutive appearances</h2>
          <div className="mt-3">
            <GapDistribution dist={agg.whiteGapDist} geometricP={pWhite} />
          </div>
        </div>

        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Gap distribution · {specialShort}</div>
          <h2 className="font-display text-[22px] mt-1">Single-ball memoryless gaps</h2>
          <div className="mt-3">
            <GapDistribution dist={agg.redGapDist} geometricP={pRed} />
          </div>
        </div>
      </>
    );
  }

  const slice = agg[stream] ?? agg.combined;
  const positions = game.endsWith("pick3") ? 3 : 4;
  // For digit games: prob a specific digit appears in a draw of `positions` digits ≈ 1 - (9/10)^positions
  const p = 1 - Math.pow(0.9, positions);
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="text-[12px] text-dim font-mono">
          showing <span className="text-text">{slice.count.toLocaleString()}</span> draws ({stream})
        </div>
        <StreamSelect value={stream} onChange={setStream} />
      </div>

      <CurrentGapsList values={slice.gaps} pool={9} label="digits" digits />

      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Gap distribution</div>
        <h2 className="font-display text-[22px] mt-1">Draws between consecutive appearances</h2>
        <p className="mt-2 text-[12px] text-dim">
          Expected per draw probability for a specific digit: <span className="text-text">{(p * 100).toFixed(1)}%</span>.
        </p>
        <div className="mt-3">
          <GapDistribution dist={slice.gapDist} geometricP={p} />
        </div>
      </div>
    </>
  );
}

function CurrentGapsList({
  values,
  pool,
  label,
  digits,
  variant,
}: {
  values: number[];
  pool: number;
  label: string;
  digits?: boolean;
  variant?: "red" | "white";
}) {
  const items: { n: number; gap: number }[] = [];
  const start = digits ? 0 : 1;
  const end = digits ? 10 : pool + 1;
  for (let i = start; i < end; i++) items.push({ n: i, gap: values[i] ?? 0 });
  items.sort((a, b) => b.gap - a.gap);
  const maxGap = items[0]?.gap ?? 0;
  return (
    <div className="panel p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Draws since last seen</div>
      <h2 className="font-display text-[22px] mt-1">Longest current gaps · {label}</h2>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {items.slice(0, digits ? 10 : 12).map(({ n, gap }) => (
          <div key={n} className="panel-inner p-3 flex items-center justify-between">
            <NumberBall value={n} variant={variant === "red" ? "red" : digits ? "digit" : "white"} size="sm" />
            <div className="text-right">
              <div className="font-mono text-[14px] tabular-nums">{gap}</div>
              <div className="text-[10px] text-dim">draws ago</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[11px] text-dim">
        Current longest gap: <span className="text-text font-mono">{maxGap}</span> draws.
      </div>
    </div>
  );
}
