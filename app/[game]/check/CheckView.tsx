"use client";

import { useEffect, useState, useTransition } from "react";
import { NumberBall } from "@/components/NumberBall";
import { SumDistribution } from "@/components/charts/SumDistribution";
import type { Draw, Game } from "@/lib/types";
import { checkDigits, checkPowerball } from "@/lib/analytics/check";

type DrawsModule = { default: { draws: Draw[] } };

export function CheckView({ game }: { game: Game }) {
  const [draws, setDraws] = useState<Draw[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [_, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let mod: any;
      switch (game) {
        case "wi-pick3":
          mod = await import("@/lib/data/wi-pick3.json");
          break;
        case "wi-pick4":
          mod = await import("@/lib/data/wi-pick4.json");
          break;
        case "pa-pick3":
          mod = await import("@/lib/data/pa-pick3.json");
          break;
        case "pa-pick4":
          mod = await import("@/lib/data/pa-pick4.json");
          break;
        case "megamillions":
          mod = await import("@/lib/data/megamillions.json");
          break;
        case "powerball":
          mod = await import("@/lib/data/powerball.json");
          break;
      }
      if (cancelled) return;
      const all = mod.default?.draws ?? (mod as any).draws;
      if (game === "powerball") {
        setDraws(all.filter((d: Draw) => d.era === "2015-10-07"));
      } else if (game === "megamillions") {
        setDraws(all.filter((d: Draw) => d.era === "2025-04-08"));
      } else {
        setDraws(all);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [game]);

  if (loading || !draws) {
    return (
      <div className="panel p-8 text-center text-dim text-sm">
        <div className="inline-block h-3 w-3 rounded-full bg-accent/40 animate-pulse mr-2" />
        Loading {draws ? `${draws.length}` : ""} draws…
      </div>
    );
  }

  if (game === "powerball" || game === "megamillions") {
    const pool = game === "megamillions" ? 70 : 69;
    const redPool = game === "megamillions" ? 24 : 26;
    return <BallGameChecker draws={draws} game={game} whitePool={pool} redPool={redPool} />;
  }
  return <DigitChecker draws={draws} positions={game.endsWith("pick3") ? 3 : 4} />;
}

function DigitChecker({ draws, positions }: { draws: Draw[]; positions: number }) {
  const [digits, setDigits] = useState<number[]>(Array(positions).fill(0));
  const [result, setResult] = useState<ReturnType<typeof checkDigits> | null>(null);
  const [computing, startCompute] = useTransition();
  const maxSum = positions * 9;

  const compute = () => {
    startCompute(() => {
      setResult(checkDigits(draws, digits, positions));
    });
  };

  return (
    <>
      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Your numbers</div>
        <h2 className="font-display text-[22px] mt-1">Pick {positions} digits, 0–9</h2>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {digits.map((d, i) => (
            <DigitInput
              key={i}
              value={d}
              onChange={(v) => {
                const next = digits.slice();
                next[i] = v;
                setDigits(next);
              }}
            />
          ))}
          <button
            onClick={compute}
            className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-ink font-medium text-sm hover:bg-accent/90 transition-colors"
          >
            {computing ? "Computing…" : "Run check"}
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="panel p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Exact straight matches</div>
              <div className="font-display text-[32px] mt-2 tabular-nums">{result.exactStraightOccurrences.length}</div>
              <div className="mt-1 text-[11px] text-dim">across {draws.length.toLocaleString()} historical draws</div>
              {result.exactStraightOccurrences.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto text-[11px] font-mono text-dim space-y-1">
                  {result.exactStraightOccurrences.slice(0, 50).map((o, i) => (
                    <div key={i}>{o.date} {o.stream && o.stream !== "other" ? `· ${o.stream}` : ""}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="panel p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Box (any-order) matches</div>
              <div className="font-display text-[32px] mt-2 tabular-nums">{result.exactBoxOccurrences}</div>
              <div className="mt-1 text-[11px] text-dim">same digits, any order</div>
            </div>
            <div className="panel p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Your sum</div>
              <div className="font-display text-[32px] mt-2 tabular-nums">{result.sum}</div>
              <div className="mt-1 text-[11px] text-dim">
                in the <span className="text-text">{(result.sumPercentile * 100).toFixed(1)}th</span> percentile of historical sums
              </div>
            </div>
          </div>
          <div className="panel p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Per-digit appearance count</div>
            <h3 className="font-display text-[18px] mt-1">Total slot occurrences across history</h3>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {result.perDigitCounts.map(({ digit, count }) => (
                <div key={digit} className="panel-inner p-3 flex items-center justify-between">
                  <NumberBall value={digit} variant="digit" size="sm" />
                  <div className="text-right font-mono tabular-nums text-[14px]">{count.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Sum context</div>
            <h3 className="font-display text-[18px] mt-1">Where your sum sits historically</h3>
            <div className="mt-3">
              <SumDistribution dist={result.sumDistribution} maxSum={maxSum} highlight={result.sum} height={240} />
            </div>
            <p className="mt-3 text-[12px] text-dim">
              The peak near the middle isn&rsquo;t a strategy tip — it&rsquo;s a mathematical fact. There are more
              combinations that add up to mid-range sums than to extremes, just like rolling two dice.
            </p>
          </div>
        </>
      )}
    </>
  );
}

function DigitInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange((value + 9) % 10)}
        className="h-9 w-7 rounded-md border border-edge text-dim hover:bg-white/[0.04] hover:text-text"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        maxLength={1}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= 0 && v <= 9) onChange(v);
        }}
        className="h-12 w-12 text-center font-mono text-[20px] rounded-md border border-edge bg-panel2 focus:outline-none focus:border-accent"
      />
      <button
        onClick={() => onChange((value + 1) % 10)}
        className="h-9 w-7 rounded-md border border-edge text-dim hover:bg-white/[0.04] hover:text-text"
      >
        +
      </button>
    </div>
  );
}

function BallGameChecker({
  draws,
  game,
  whitePool,
  redPool,
}: {
  draws: Draw[];
  game: Game;
  whitePool: number;
  redPool: number;
}) {
  const [whites, setWhites] = useState<number[]>([1, 2, 3, 4, 5]);
  const [red, setRed] = useState(1);
  const [result, setResult] = useState<ReturnType<typeof checkPowerball> | null>(null);
  const [computing, startCompute] = useTransition();
  // top 5 of whitePool, summed
  const maxSum = whitePool + (whitePool - 1) + (whitePool - 2) + (whitePool - 3) + (whitePool - 4);
  const specialLabel = game === "megamillions" ? "Mega Ball" : "Powerball";

  const compute = () => {
    // dedupe + sort
    const set = Array.from(new Set(whites)).slice(0, 5);
    if (set.length !== 5) return;
    set.sort((a, b) => a - b);
    setWhites(set);
    startCompute(() => {
      setResult(checkPowerball(draws, set, red));
    });
  };

  return (
    <>
      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Your numbers</div>
        <h2 className="font-display text-[22px] mt-1">5 white balls (1–{whitePool}) + 1 {specialLabel} (1–{redPool})</h2>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          {whites.map((w, i) => (
            <RangeInput
              key={i}
              value={w}
              min={1}
              max={whitePool}
              variant="white"
              onChange={(v) => {
                const next = whites.slice();
                next[i] = v;
                setWhites(next);
              }}
            />
          ))}
          <span className="mx-2 text-dim text-[20px]">+</span>
          <RangeInput value={red} min={1} max={redPool} variant="red" onChange={setRed} />
          <button
            onClick={compute}
            className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-ink font-medium text-sm hover:bg-accent/90 transition-colors"
          >
            {computing ? "Computing…" : "Run check"}
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="panel p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Exact jackpot matches</div>
              <div className="font-display text-[32px] mt-2 tabular-nums">{result.exactJackpotMatches.length}</div>
              <div className="mt-1 text-[11px] text-dim">5 whites + red, current era</div>
            </div>
            <div className="panel p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">5-white matches (any red)</div>
              <div className="font-display text-[32px] mt-2 tabular-nums">{result.fiveWhiteMatches}</div>
              <div className="mt-1 text-[11px] text-dim">exact white set</div>
            </div>
            <div className="panel p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Your red ball count</div>
              <div className="font-display text-[32px] mt-2 tabular-nums">{result.redCount}</div>
              <div className="mt-1 text-[11px] text-dim">times {red} was the Powerball</div>
            </div>
          </div>
          <div className="panel p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Per-white appearance count</div>
            <h3 className="font-display text-[18px] mt-1">Times each of your whites was drawn</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {result.perWhiteCounts.map(({ n, count }) => (
                <div key={n} className="panel-inner px-3 py-2 flex items-center gap-3">
                  <NumberBall value={n} variant="white" size="sm" />
                  <span className="font-mono text-[13px] tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Sum context</div>
            <h3 className="font-display text-[18px] mt-1">Where your sum ({result.sum}) sits in history</h3>
            <p className="mt-1 text-[11px] text-dim">In the <span className="text-text">{(result.sumPercentile * 100).toFixed(1)}th</span> percentile.</p>
            <div className="mt-3">
              <SumDistribution dist={result.sumDistribution} maxSum={maxSum} highlight={result.sum} height={240} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function RangeInput({
  value,
  min,
  max,
  onChange,
  variant,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  variant: "white" | "red";
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-9 w-7 rounded-md border border-edge text-dim hover:bg-white/[0.04] hover:text-text"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= min && v <= max) onChange(v);
        }}
        className={`h-12 w-14 text-center font-mono text-[16px] rounded-md border bg-panel2 focus:outline-none ${
          variant === "red" ? "border-hot/40 focus:border-hot" : "border-edge focus:border-accent"
        }`}
      />
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-9 w-7 rounded-md border border-edge text-dim hover:bg-white/[0.04] hover:text-text"
      >
        +
      </button>
    </div>
  );
}
