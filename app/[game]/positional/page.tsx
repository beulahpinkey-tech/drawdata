export const runtime = "edge";

import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { PositionalMount } from "./PositionalMount";
import { META, getAgg } from "@/lib/data";
import type { Game } from "@/lib/types";
import { redirect } from "next/navigation";

export default function PositionalPage({
  params,
  searchParams,
}: {
  params: { game: string };
  searchParams?: { diag?: string };
}) {
  const game = params.game as Game;
  if (game === "powerball" || game === "megamillions") {
    return <BallGameSums game={game} />;
  }
  // TEMP probe: does the digit branch fail even with nothing but the shell?
  if (searchParams?.diag === "shell") return <BallGameSums game={game} />;
  // TEMP probe: shell + getAgg(), no client mount.
  if (searchParams?.diag === "agg") {
    const probe = getAgg(game);
    return (
      <>
        <GameHeader game={game} view="positional" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <div className="panel p-6 font-mono text-[12px]">
            agg loaded: {String(!!probe?.combined)} · draws {probe?.combined?.count ?? "?"}
          </div>
        </div>
      </>
    );
  }
  // TEMP probe: shell + the static server table, no client mount.
  if (searchParams?.diag === "static") {
    const probe = getAgg(game);
    return (
      <>
        <GameHeader game={game} view="positional" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <StaticPositional agg={probe} positions={game.endsWith("pick3") ? 3 : 4} />
        </div>
      </>
    );
  }
  const agg = getAgg(game);
  return (
    <>
      <GameHeader game={game} view="positional" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          Each cell shows how often a digit landed in a particular slot. If the draws are fair,
          every slot should look like 0–9 picked from a hat — about 10% each, with sample noise.
          Any heat pattern you can see by eye is almost certainly within that noise band.
        </HonestyNote>
        <PositionalMount game={game} agg={agg}>
          <StaticPositional agg={agg} positions={game.endsWith("pick3") ? 3 : 4} />
        </PositionalMount>
      </div>
    </>
  );
}

function BallGameSums({ game }: { game: Game }) {
  const label = game === "megamillions" ? "Mega Millions" : "Powerball";
  return (
    <>
      <GameHeader game={game} view="positional" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          {label} isn&rsquo;t positional — the five white balls are reported in sorted order, so
          &ldquo;digit in position 2&rdquo; doesn&rsquo;t have a meaning here. For shape-style analysis, see the
          sum distribution on the <a className="text-accent hover:underline" href={`/${game}/check`}>check page</a>{" "}
          or look at coverage and frequency in their respective views.
        </HonestyNote>
      </div>
    </>
  );
}

/**
 * The same numbers as the interactive heatmap, server-rendered as a plain
 * table. This is what crawlers (and anyone before the client view loads)
 * see, so the page's actual data lives in the initial HTML rather than
 * depending on JavaScript.
 */
function StaticPositional({ agg, positions }: { agg: any; positions: number }) {
  const slice = agg?.combined;
  if (!slice?.freqByPosition) return null;
  const maxSum = positions * 9;
  const sums: number[] = slice.sums ?? [];
  const topSums = sums
    .map((count: number, sum: number) => ({ sum, count }))
    .filter((r: { sum: number }) => r.sum <= maxSum)
    .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="panel p-6 space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Digit-by-position heatmap
        </div>
        <h2 className="font-display text-[22px] mt-1">Which digit shows up where</h2>
        <p className="mt-1 text-[12px] text-dim">
          {slice.count?.toLocaleString?.() ?? slice.count} draws, all streams combined.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[12px] font-mono tabular-nums">
            <caption className="sr-only">
              How often each digit 0–9 landed in each of the {positions} positions
            </caption>
            <thead>
              <tr className="text-dim">
                <th scope="col" className="text-left py-2 pr-2 font-normal">pos \ digit</th>
                {Array.from({ length: 10 }).map((_, d) => (
                  <th scope="col" key={d} className="py-2 px-1 text-center font-normal">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.freqByPosition.map((row: { position: number; counts: number[] }) => {
                const total = row.counts.reduce((a: number, b: number) => a + b, 0);
                return (
                  <tr key={row.position} className="border-t border-edge">
                    <th scope="row" className="py-1.5 pr-2 text-left font-normal text-dim">
                      P{row.position + 1}
                    </th>
                    {row.counts.map((v: number, i: number) => (
                      <td key={i} className="py-1 px-1 text-center">
                        <div className="rounded-md py-1.5 border border-edge">
                          <div className="text-[11px] text-text">{v}</div>
                          <div className="text-[9px] text-dim">
                            {((v / total) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {topSums.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
            Sum distribution
          </div>
          <h3 className="font-display text-[18px] mt-1">Most common digit sums (0–{maxSum})</h3>
          <ul className="mt-2 flex flex-wrap gap-3 text-[12px] font-mono">
            {topSums.map((r: { sum: number; count: number }) => (
              <li key={r.sum} className="panel-inner px-3 py-1.5">
                sum {r.sum} · {r.count.toLocaleString()} draws
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
