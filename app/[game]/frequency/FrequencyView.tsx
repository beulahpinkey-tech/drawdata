"use client";

import { useMemo, useState } from "react";
import { FrequencyBars } from "@/components/charts/FrequencyBars";
import { StreamSelect } from "@/components/StreamSelect";
import { useGameDraws } from "@/lib/hooks/useGameDraws";
import { rollingDigitFrequency } from "@/lib/analytics/digits";
import type { Game } from "@/lib/types";

type WindowOpt = 30 | 90 | 365 | "all";

export function FrequencyView({
  game,
  agg,
  meta,
}: {
  game: Game;
  agg: any;
  meta: any;
}) {
  const [stream, setStream] = useState<"combined" | "midday" | "evening">("combined");
  const isBall = game === "powerball" || game === "megamillions";

  if (isBall) {
    const whiteCounts: number[] = agg.whiteCounts;
    const redCounts: number[] = agg.redCounts;
    const pool = agg.whitePool;
    const redPool = agg.redPool;
    const drawCount = agg.currentCount;
    const expW = (drawCount * 5) / pool;
    const expR = drawCount / redPool;
    const specialLabel = game === "megamillions" ? "Mega Ball" : "Red Powerball";
    const whiteData = Array.from({ length: pool }, (_, i) => ({ label: String(i + 1), value: whiteCounts[i + 1] ?? 0, expected: expW }));
    const redData = Array.from({ length: redPool }, (_, i) => ({ label: String(i + 1), value: redCounts[i + 1] ?? 0, expected: expR }));
    return (
      <>
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">White balls · 1–{pool}</div>
          <h2 className="font-display text-[22px] mt-1">{drawCount.toLocaleString()} draws · current era</h2>
          <div className="mt-4">
            <FrequencyBars data={whiteData} highlightMax unit="picks" height={360} />
          </div>
        </div>
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">{specialLabel} · 1–{redPool}</div>
          <h2 className="font-display text-[22px] mt-1">Single-ball frequency</h2>
          <div className="mt-4">
            <FrequencyBars data={redData} highlightMax unit="picks" />
          </div>
        </div>
      </>
    );
  }

  return <PickFrequency game={game as "pick3" | "pick4"} agg={agg} stream={stream} setStream={setStream} />;
}

function PickFrequency({
  game,
  agg,
  stream,
  setStream,
}: {
  game: "pick3" | "pick4";
  agg: any;
  stream: "combined" | "midday" | "evening";
  setStream: (s: "combined" | "midday" | "evening") => void;
}) {
  const positions = game === "pick3" ? 3 : 4;
  const slice = agg[stream] ?? agg.combined;
  const counts: number[] = slice.allPositions;
  const totalDigits = counts.reduce((a, b) => a + b, 0);
  const expAll = totalDigits / 10;
  const dataAll = counts.map((v, i) => ({ label: String(i), value: v, expected: expAll }));
  return (
    <>
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="text-[12px] text-dim font-mono">
          showing <span className="text-text">{slice.count.toLocaleString()}</span> draws ({stream}) — all-time
        </div>
        <StreamSelect value={stream} onChange={setStream} />
      </div>

      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">All-time · all positions</div>
        <h2 className="font-display text-[22px] mt-1">Digit frequency 0–9</h2>
        <div className="mt-4">
          <FrequencyBars data={dataAll} highlightMax unit="occurrences" height={340} />
        </div>
      </div>

      <RollingWindowPanel game={game} stream={stream} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {slice.freqByPosition.map((row: any) => {
          const exp = row.counts.reduce((a: number, b: number) => a + b, 0) / 10;
          const data = row.counts.map((v: number, i: number) => ({ label: String(i), value: v, expected: exp }));
          return (
            <div key={row.position} className="panel p-6">
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Position {row.position + 1} of {positions}</div>
              <h3 className="font-display text-[18px] mt-1">Digit frequency at this slot</h3>
              <div className="mt-3">
                <FrequencyBars data={data} unit="picks" height={220} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

const WINDOWS: { id: WindowOpt; label: string }[] = [
  { id: 30, label: "Last 30" },
  { id: 90, label: "Last 90" },
  { id: 365, label: "Last 365" },
  { id: "all", label: "All-time" },
];

function RollingWindowPanel({
  game,
  stream,
}: {
  game: "pick3" | "pick4";
  stream: "combined" | "midday" | "evening";
}) {
  const { draws, loading } = useGameDraws(game);
  const [windowSize, setWindowSize] = useState<WindowOpt>(90);

  const filtered = useMemo(() => {
    if (!draws) return [];
    if (stream === "combined") return draws;
    return draws.filter((d) => d.stream === stream);
  }, [draws, stream]);

  const result = useMemo(() => rollingDigitFrequency(filtered, windowSize), [filtered, windowSize]);
  const positions = game === "pick3" ? 3 : 4;
  const exp = (result.draws * positions) / 10;
  const data = result.counts.map((v, i) => ({ label: String(i), value: v, expected: exp }));

  return (
    <div className="panel p-6">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Rolling window · &ldquo;recent&rdquo; view</div>
          <h2 className="font-display text-[22px] mt-1">Digit frequency in the last {windowSize === "all" ? "all" : windowSize} draws</h2>
        </div>
        <div className="inline-flex items-center rounded-md border border-edge p-0.5 bg-white/[0.02]">
          {WINDOWS.map((w) => (
            <button
              key={String(w.id)}
              onClick={() => setWindowSize(w.id)}
              className={`px-3 py-1 text-[12px] rounded-[5px] transition-colors ${
                windowSize === w.id ? "bg-white/[0.08] text-text" : "text-dim hover:text-text"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-[12px] text-dim">
        showing <span className="text-text">{result.draws.toLocaleString()}</span> draws · expected per digit ≈{" "}
        <span className="text-cool">{exp.toFixed(1)}</span> ·{" "}
        <span className="text-text">history, not destiny.</span>
      </p>
      <div className="mt-4">
        {loading ? (
          <div className="text-center text-dim text-sm py-12">Loading…</div>
        ) : (
          <FrequencyBars data={data} highlightMax unit="picks" height={260} />
        )}
      </div>
    </div>
  );
}
