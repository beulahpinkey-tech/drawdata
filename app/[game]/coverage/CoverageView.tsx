"use client";

import { useState } from "react";
import { CoverageChart } from "@/components/charts/CoverageChart";
import { YearBars } from "@/components/charts/YearBars";
import { StreamSelect } from "@/components/StreamSelect";
import type { Game } from "@/lib/types";

export function CoverageView({ game, agg, meta }: { game: Game; agg: any; meta: any }) {
  const [stream, setStream] = useState<"combined" | "midday" | "evening">("combined");
  const isBall = game === "powerball" || game === "megamillions";

  if (isBall) {
    const pool = agg.whitePool;
    const cum = agg.coverageCum;
    const year = agg.coverageYear.map((d: any) => ({ year: d.year, unique: d.unique, draws: d.draws }));
    return (
      <>
        <div className="text-[12px] text-dim font-mono">
          showing <span className="text-text">{agg.currentCount.toLocaleString()}</span> draws (current era)
        </div>
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Cumulative unique white balls covered</div>
          <h2 className="font-display text-[22px] mt-1">Out of {pool}</h2>
          <div className="mt-4">
            <CoverageChart coverageCum={cum} pool={pool} />
          </div>
        </div>
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Per-year coverage</div>
          <h2 className="font-display text-[22px] mt-1">Unique whites seen each year</h2>
          <div className="mt-4">
            <YearBars data={year} keyName="unique" unit={`of ${pool}`} />
          </div>
        </div>
      </>
    );
  }

  const slice = agg[stream] ?? agg.combined;
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="text-[12px] text-dim font-mono">
          showing <span className="text-text">{slice.count.toLocaleString()}</span> draws ({stream})
        </div>
        <StreamSelect value={stream} onChange={setStream} />
      </div>
      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Cumulative unique digits seen</div>
        <h2 className="font-display text-[22px] mt-1">Out of 10 (0–9)</h2>
        <p className="mt-2 text-[12px] text-dim">All ten digits get covered very quickly. The interesting pattern is in <em className="not-italic text-text">per-year</em> coverage of unique <em className="not-italic text-text">draws</em>, below.</p>
        <div className="mt-4">
          <CoverageChart coverageCum={slice.coverageCum} pool={10} height={220} />
        </div>
      </div>
      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Draws per year</div>
        <h2 className="font-display text-[22px] mt-1">How often the game ran each year</h2>
        <div className="mt-4">
          <YearBars data={slice.coverageYear} keyName="draws" unit="draws" />
        </div>
      </div>
    </>
  );
}
