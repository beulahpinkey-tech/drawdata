import { GameHeader } from "@/components/GameHeader";
import { StatCard } from "@/components/StatCard";
import { NumberBall } from "@/components/NumberBall";
import { HonestyNote } from "@/components/HonestyNote";
import { FrequencyBars } from "@/components/charts/FrequencyBars";
import Link from "next/link";
import { META, getAgg, GAME_LABELS, isBallGame } from "@/lib/data";
import type { Game } from "@/lib/types";

type Props = { params: { game: string } };

export default function GameOverviewPage({ params }: Props) {
  const game = params.game as Game;
  const m = (META as any)[game];
  const agg = getAgg(game);

  if (isBallGame(game)) {
    return <BallGameOverview game={game} agg={agg} m={m} />;
  }
  return <PickOverview game={game as "pick3" | "pick4"} agg={agg} m={m} />;
}

function PickOverview({ game, agg, m }: { game: "pick3" | "pick4"; agg: any; m: any }) {
  const combined = agg.combined;
  const counts: number[] = combined.allPositions;
  const positions = game === "pick3" ? 3 : 4;
  const totalDigits = counts.reduce((a, b) => a + b, 0);
  const expected = totalDigits / 10;
  const maxIdx = counts.indexOf(Math.max(...counts));
  const minIdx = counts.indexOf(Math.min(...counts));
  const latest = m.latestDraw;
  const data = counts.map((v, i) => ({ label: String(i), value: v, expected }));
  const shapes = combined.shapes;
  const drawSpace = Math.pow(10, positions);

  return (
    <>
      <GameHeader game={game} view="overview" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total draws" value={m.count.toLocaleString()} sub={`since ${m.earliest}`} />
          <StatCard
            label="Latest draw"
            value={
              <div className="flex items-center gap-1.5">
                {latest?.digits?.map((d: number, i: number) => (
                  <NumberBall key={i} value={d} variant="digit" size="md" />
                ))}
              </div>
            }
            sub={`${latest?.date}${latest?.stream && latest.stream !== "other" ? ` · ${latest.stream}` : ""}`}
          />
          <StatCard label="Outcome space" value={drawSpace.toLocaleString()} sub={`${positions} digits, 0–9`} accent />
          <StatCard
            label="Most / least drawn"
            value={
              <span className="flex items-center gap-2">
                <span className="text-accent">{maxIdx}</span>
                <span className="text-dim text-[18px]">/</span>
                <span className="text-cool">{minIdx}</span>
              </span>
            }
            sub={`across all positions, ${counts[maxIdx].toLocaleString()} vs ${counts[minIdx].toLocaleString()}`}
          />
        </div>

        <HonestyNote>
          &ldquo;Most&rdquo; and &ldquo;least&rdquo; here are <strong>history</strong>, not destiny. Across {totalDigits.toLocaleString()} digit
          slots the gap between the most and least drawn digit is only{" "}
          <strong>{(counts[maxIdx] - counts[minIdx]).toLocaleString()}</strong> — well within the noise you&rsquo;d
          expect from a fair process. Every draw resets to the same 1-in-10 odds per digit.
        </HonestyNote>

        <div className="panel p-6">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Digit frequency</div>
              <h2 className="font-display text-[22px] mt-1">All positions, all draws</h2>
            </div>
            <Link href={`/${game}/frequency`} className="text-[12px] text-accent hover:underline">More detail →</Link>
          </div>
          <FrequencyBars data={data} highlightMax unit="occurrences" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="panel p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Draw shapes</div>
            <h2 className="font-display text-[22px] mt-1">{game === "pick3" ? "Three-digit" : "Four-digit"} patterns</h2>
            <div className="mt-4 space-y-3">
              {[
                ["all_diff", "All distinct"],
                ["double", "Has a double"],
                ["triple", "Has a triple"],
                ["quad", "Has a quad"],
              ].map(([k, label]) => {
                const v = shapes[k as keyof typeof shapes] as number;
                const pct = (v / m.count) * 100;
                return (
                  <div key={k}>
                    <div className="flex justify-between text-[12px] font-mono">
                      <span className="text-dim">{label}</span>
                      <span>{v.toLocaleString()} <span className="text-dim">· {pct.toFixed(1)}%</span></span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full bg-accent/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Where to go next</div>
            <h2 className="font-display text-[22px] mt-1">Eight views, one story</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["frequency", "Frequency"],
                ["positional", "Positional + sums"],
                ["pairs", "Pair frequency"],
                ["gaps", "Gaps & recency"],
                ["carryover", "Carryover + mirror"],
                ["streams", "Midday vs evening"],
                ["coverage", "Coverage over time"],
                ["lookup", "Number lookup"],
                ["check", "Check your numbers"],
              ].map(([slug, label]) => (
                <Link
                  key={slug}
                  href={`/${game}/${slug}`}
                  className="panel-inner px-3 py-2.5 text-[13px] hover:bg-white/[0.04] transition-colors"
                >
                  {label} <span className="text-dim">→</span>
                </Link>
              ))}
              <Link
                href={`/lab?game=${game}`}
                className="panel-inner px-3 py-2.5 text-[13px] text-accent hover:bg-white/[0.04] transition-colors col-span-2"
              >
                Formula Lab — backtest a transformation rule <span className="text-dim">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function BallGameOverview({ game, agg, m }: { game: Game; agg: any; m: any }) {
  const whiteCounts: number[] = agg.whiteCounts;
  const redCounts: number[] = agg.redCounts;
  const pool = agg.whitePool;
  const redPool = agg.redPool;
  const drawCount = agg.currentCount;
  const expWhite = (drawCount * 5) / pool;
  const expRed = drawCount / redPool;

  const whiteData = [];
  for (let i = 1; i <= pool; i++) whiteData.push({ label: String(i), value: whiteCounts[i] ?? 0, expected: expWhite });
  const redData = [];
  for (let i = 1; i <= redPool; i++) redData.push({ label: String(i), value: redCounts[i] ?? 0, expected: expRed });

  let maxW = 1, maxC = -1;
  for (let i = 1; i <= pool; i++) if ((whiteCounts[i] ?? 0) > maxC) { maxC = whiteCounts[i]; maxW = i; }
  let minW = 1, minC = Infinity;
  for (let i = 1; i <= pool; i++) if ((whiteCounts[i] ?? 0) < minC) { minC = whiteCounts[i]; minW = i; }

  const latest = m.latestDraw;
  const isMM = game === "megamillions";
  const specialLabel = isMM ? "Mega Ball" : "Powerball";
  const outcomeSpace = (() => {
    // C(pool, 5) * redPool
    let c = 1;
    for (let i = 0; i < 5; i++) c = (c * (pool - i)) / (i + 1);
    return Math.round(c * redPool);
  })();

  return (
    <>
      <GameHeader game={game} view="overview" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total draws (current era)" value={drawCount.toLocaleString()} sub={`since ${agg.earliestCurrent}`} />
          <StatCard
            label="Latest draw"
            value={
              <div className="flex items-center gap-1.5 flex-wrap">
                {latest?.whites?.map((w: number, i: number) => (
                  <NumberBall key={i} value={w} variant="white" size="sm" />
                ))}
                <span className="mx-0.5 text-dim text-[12px]">·</span>
                <NumberBall value={latest?.special} variant="red" size="sm" />
              </div>
            }
            sub={`${latest?.date}`}
          />
          <StatCard label="Outcome space" value={outcomeSpace.toLocaleString()} sub={`C(${pool},5) × ${redPool}`} accent />
          <StatCard
            label="Most / least drawn white"
            value={
              <span className="flex items-center gap-2">
                <span className="text-accent">{maxW}</span>
                <span className="text-dim text-[18px]">/</span>
                <span className="text-cool">{minW}</span>
              </span>
            }
            sub={`${maxC} vs ${minC} appearances`}
          />
        </div>

        <HonestyNote>
          {isMM
            ? `Mega Millions' matrix changed five times between 1996 and 2025; the current 5/${pool} + 1/${redPool} format began April 8, 2025. With only ~${drawCount} draws in this era, the expected count per ball is just `
            : `The matrix changed seven times between 1992 and 2015, so cross-number stats here are filtered to the current 5/${pool} + 1/${redPool} era (${drawCount.toLocaleString()} draws since ${agg.earliestCurrent}). With only ~${drawCount} draws and ${pool} white balls, the expected count per ball is just `}
          <strong>{expWhite.toFixed(1)}</strong> — the noise band is wide. Don&rsquo;t over-read the differences.
        </HonestyNote>

        <div className="panel p-6">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">White ball frequency</div>
              <h2 className="font-display text-[22px] mt-1">Counts across {drawCount.toLocaleString()} draws · pool 1–{pool}</h2>
            </div>
            <Link href={`/${game}/frequency`} className="text-[12px] text-accent hover:underline">More detail →</Link>
          </div>
          <FrequencyBars data={whiteData} highlightMax unit="picks" />
        </div>

        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">{specialLabel} frequency</div>
          <h2 className="font-display text-[22px] mt-1">Counts across {drawCount.toLocaleString()} draws · pool 1–{redPool}</h2>
          <div className="mt-3">
            <FrequencyBars data={redData} highlightMax unit="picks" height={220} />
          </div>
        </div>

        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Where to go next</div>
          <h2 className="font-display text-[22px] mt-1">Five lenses on the same data</h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              ["frequency", "Frequency"],
              ["gaps", "Gaps & recency"],
              ["coverage", "Coverage"],
              ["check", "Check numbers"],
              ["positional", "Sums & shape"],
            ].map(([slug, label]) => (
              <Link
                key={slug}
                href={`/${game}/${slug}`}
                className="panel-inner px-3 py-2.5 text-[13px] hover:bg-white/[0.04] transition-colors"
              >
                {label} <span className="text-dim">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
