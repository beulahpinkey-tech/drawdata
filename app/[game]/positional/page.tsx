export const runtime = "edge";

import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { getAgg, presentStreams, STREAM_LABEL, type NamedStream } from "@/lib/data";
import type { Game } from "@/lib/types";

/**
 * Positional view — server-rendered end to end.
 *
 * WHY THERE IS NO CLIENT COMPONENT HERE
 *
 * This route used to render PositionalView, a large client tree (heatmap,
 * recharts sum chart, zoom overlay, panel actions). In production every
 * digit game's /positional returned 500 — fifteen URLs, all of them logged
 * by Search Console as server errors — with:
 *
 *   TypeError: Cannot read properties of undefined (reading 'default')
 *     at resolveClientReference
 *
 * The RSC payload for the same URL rendered fine at 200; only the SSR pass
 * failed, which is the pass that has to load client modules. Bisecting on
 * Cloudflare preview deployments showed it is not any one component: each
 * piece rendered fine in isolation, a brand-new two-hook client component
 * failed the same way, and merely adding an unused import moved the chunk
 * boundary and made the page pass. Pure server rendering passed every time.
 *
 * So the route no longer crosses the client boundary at all. Everything it
 * showed is still here, now from precomputed aggregates: the heatmap, the
 * sum distribution, draw shapes, digital roots and box types. The stream
 * switch is a set of links rather than React state, which a crawler can
 * follow — and the page no longer ships ~25k draws to the browser to
 * compute what the build already knows.
 *
 * Interactive extras that did not survive: click-to-zoom and CSV export.
 * Worth restoring behind a small, isolated island once the bundling fault
 * is understood; not worth 500ing fifteen pages for.
 */

type Slice = {
  count: number;
  freqByPosition: { position: number; counts: number[] }[];
  shapes: Record<string, number>;
  sums: Record<number, number>;
  rootDist?: Record<number, number>;
  boxTypes?: { type: string; count: number; share: number; expected: number }[];
};

export default function PositionalPage({
  params,
  searchParams,
}: {
  params: { game: string };
  searchParams?: { stream?: string };
}) {
  const game = params.game as Game;
  if (game === "powerball" || game === "megamillions") {
    return <BallGameSums game={game} />;
  }

  const agg = getAgg(game);
  const streams = presentStreams(game);
  const requested = searchParams?.stream ?? "combined";
  const stream = requested !== "combined" && streams.includes(requested as NamedStream)
    ? requested
    : "combined";
  const slice = (agg[stream] ?? agg.combined) as Slice;
  const positions = game.endsWith("pick3") ? 3 : 4;
  const maxSum = positions * 9;

  return (
    <>
      <GameHeader game={game} view="positional" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          Each cell shows how often a digit landed in a particular slot. If the draws are fair,
          every slot should look like 0–9 picked from a hat — about 10% each, with sample noise.
          Any heat pattern you can see by eye is almost certainly within that noise band.
        </HonestyNote>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[12px] text-dim font-mono">
            showing <span className="text-text">{slice.count.toLocaleString()}</span> draws ({stream})
          </div>
          {streams.length > 1 && (
            <nav
              aria-label="Draw stream"
              className="inline-flex items-center rounded-md border border-edge p-0.5 bg-white/[0.02]"
            >
              {(["combined", ...streams] as const).map((s) => {
                const active = s === stream;
                const href =
                  s === "combined"
                    ? `/${game}/positional`
                    : `/${game}/positional?stream=${s}`;
                return (
                  <a
                    key={s}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`px-3 py-1 text-[12px] rounded-[5px] transition-colors ${
                      active ? "bg-white/[0.08] text-text" : "text-dim hover:text-text"
                    }`}
                  >
                    {s === "combined" ? "Combined" : STREAM_LABEL[s as NamedStream]}
                  </a>
                );
              })}
            </nav>
          )}
        </div>

        <Heatmap slice={slice} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SumDistributionPanel slice={slice} maxSum={maxSum} />
          <ShapesPanel slice={slice} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RootPanel slice={slice} />
          <BoxTypePanel slice={slice} positions={positions} />
        </div>
      </div>
    </>
  );
}

function Heatmap({ slice }: { slice: Slice }) {
  let min = Infinity;
  let max = 0;
  for (const row of slice.freqByPosition) {
    for (const v of row.counts) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  const range = max - min || 1;

  return (
    <div id="heatmap" className="panel p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
        Digit-by-position heatmap
      </div>
      <h2 className="font-display text-[22px] mt-1">Which digit shows up where</h2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-[12px] font-mono tabular-nums">
          <caption className="sr-only">
            How often each digit 0–9 landed in each position
          </caption>
          <thead>
            <tr className="text-dim">
              <th scope="col" className="text-left py-2 pr-2 font-normal">
                pos / digit
              </th>
              {Array.from({ length: 10 }).map((_, d) => (
                <th scope="col" key={d} className="py-2 px-1 text-center font-normal">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.freqByPosition.map((row) => {
              const total = row.counts.reduce((a, b) => a + b, 0);
              return (
                <tr key={row.position} className="border-t border-edge">
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal text-dim">
                    P{row.position + 1}
                  </th>
                  {row.counts.map((v, i) => (
                    <td key={i} className="py-1 px-1 text-center">
                      <div
                        className="rounded-md py-1.5 border border-edge"
                        style={{ background: `rgba(233,184,74,${0.06 + ((v - min) / range) * 0.55})` }}
                        title={`${v} occurrences (${((v / total) * 100).toFixed(1)}%)`}
                      >
                        <div className="text-[11px] text-text">{v}</div>
                        <div className="text-[9px] text-dim">{((v / total) * 100).toFixed(1)}%</div>
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-[11px] text-dim flex items-center gap-3">
        <span>cooler</span>
        <span className="inline-block h-2 w-32 rounded-full bg-gradient-to-r from-white/[0.06] to-accent/60" />
        <span>warmer</span>
      </div>
    </div>
  );
}

function SumDistributionPanel({ slice, maxSum }: { slice: Slice; maxSum: number }) {
  const rows: { sum: number; count: number }[] = [];
  for (let s = 0; s <= maxSum; s++) rows.push({ sum: s, count: slice.sums?.[s] ?? 0 });
  const peak = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div id="sums" className="panel p-6 lg:col-span-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
        Sum distribution
      </div>
      <h2 className="font-display text-[22px] mt-1">All digits added together (0–{maxSum})</h2>
      <p className="mt-1 text-[12px] text-dim">
        Middling sums are commonest simply because more digit combinations produce them.
      </p>
      <table className="mt-4 w-full text-[11px] font-mono tabular-nums">
        <caption className="sr-only">Draw count for each possible digit sum</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.sum}>
              <th scope="row" className="w-8 text-right pr-2 font-normal text-dim">
                {r.sum}
              </th>
              <td className="py-[3px]">
                <span className="flex items-center gap-2">
                  <span className="relative h-2 flex-1 rounded-pill bg-white/[0.04]">
                    <span
                      className="absolute inset-y-0 left-0 rounded-pill bg-accent/70"
                      style={{ width: `${(r.count / peak) * 100}%` }}
                    />
                  </span>
                  <span className="w-12 text-right text-dim">{r.count.toLocaleString()}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShapesPanel({ slice }: { slice: Slice }) {
  const labels: [string, string][] = [
    ["all_diff", "All distinct"],
    ["double", "Has a double"],
    ["triple", "Has a triple"],
    ["quad", "Has a quad"],
  ];
  return (
    <div className="panel p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Draw shapes</div>
      <h2 className="font-display text-[22px] mt-1">Repeats inside one draw</h2>
      <div className="mt-4 space-y-3">
        {labels.map(([k, label]) => {
          const v = slice.shapes?.[k] ?? 0;
          const pct = slice.count ? (v / slice.count) * 100 : 0;
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
  );
}

function RootPanel({ slice }: { slice: Slice }) {
  const dist = slice.rootDist ?? {};
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="panel p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
        Digital root distribution
      </div>
      <h2 className="font-display text-[22px] mt-1">Sum reduced to a single digit (0–9)</h2>
      <p className="mt-1 text-[12px] text-dim">
        Digital root keeps adding digits until one is left. Reference under uniform digits ≈ 11.1%
        per class for 1–9, lower for 0.
      </p>
      <div className="mt-4 space-y-2">
        {Array.from({ length: 10 }).map((_, root) => {
          const v = dist[root] ?? 0;
          const pct = (v / total) * 100;
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
        })}
      </div>
    </div>
  );
}

function BoxTypePanel({ slice, positions }: { slice: Slice; positions: number }) {
  const rows = slice.boxTypes ?? [];
  return (
    <div className="panel p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
        Box-type breakdown
      </div>
      <h2 className="font-display text-[22px] mt-1">
        {positions === 3 ? "Pick 3 box types" : "Pick 4 box types"}
      </h2>
      <p className="mt-1 text-[12px] text-dim">
        Observed share vs the theoretical share under uniform random digits.
      </p>
      <div className="mt-4 space-y-3">
        {rows.map((b) => {
          const obs = b.share * 100;
          const exp = b.expected * 100;
          return (
            <div key={b.type}>
              <div className="flex justify-between text-[12px] font-mono">
                <span className="text-dim capitalize">{b.type.replace(/_/g, " ")}</span>
                <span>
                  {obs.toFixed(1)}% <span className="text-dim">· expected {exp.toFixed(1)}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full bg-accent/70" style={{ width: `${Math.min(100, obs)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
