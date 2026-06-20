export const runtime = "edge";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { StatCard } from "@/components/StatCard";
import { NumberBall } from "@/components/NumberBall";
import { Sparkline } from "@/components/Sparkline";
import { GAME_LABELS, isBallGame } from "@/lib/data";
import { ALL_GAMES } from "@/lib/types";
import type { Game } from "@/lib/types";
import { numberStats, numberStat } from "@/lib/numbers";
import { pageDatasetJsonLd } from "@/lib/seo/dataset";
import type { Crumb } from "@/lib/seo/breadcrumbs";

type Params = { game: string; n: string };

export function generateStaticParams() {
  const out: Params[] = [];
  for (const game of ALL_GAMES) {
    for (const s of numberStats(game)) out.push({ game, n: s.slug });
  }
  return out;
}

function noun(game: Game, kind: string, value: number) {
  const label = GAME_LABELS[game];
  if (kind === "digit") return `digit ${value}`;
  if (kind === "special") return `${label === "Mega Millions" ? "Mega Ball" : "Powerball"} ${value}`;
  return `number ${value}`;
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const { game, n } = params;
  const g = game as Game;
  const stat = numberStat(g, n);
  if (!stat) return {};
  const label = GAME_LABELS[g];
  const thing = noun(g, stat.kind, stat.value);
  const path = `/${g}/number/${n}`;
  const description = `How often has ${thing} been drawn in ${label}? ${stat.count.toLocaleString()} times${
    stat.lastSeen ? `, last on ${stat.lastSeen}` : ""
  } (${stat.currentGap} draw${stat.currentGap === 1 ? "" : "s"} ago), rank #${stat.rank} of ${stat.poolSize}. Full per-year history. Descriptive only — no predictions.`;
  return {
    title: `${label} — ${thing[0].toUpperCase()}${thing.slice(1)} history`,
    description,
    alternates: { canonical: `https://draw-data.com${path}` },
    openGraph: { type: "website", title: `${label}: ${thing} — DrawData`, description, url: `https://draw-data.com${path}` },
    twitter: { card: "summary_large_image", title: `${label}: ${thing}`, description },
  };
}

export default function NumberPage({ params }: { params: Params }) {
  const { game, n } = params;
  const g = game as Game;
  const label = GAME_LABELS[g];
  const ball = isBallGame(g);

  const all = numberStats(g);
  const idx = all.findIndex((s) => s.slug === n);
  if (idx === -1) notFound();
  const stat = all[idx];
  const thing = noun(g, stat.kind, stat.value);

  // prev/next within the same kind (white/special/digit), by value
  const sameKind = all.filter((s) => s.kind === stat.kind).sort((a, b) => a.value - b.value);
  const k = sameKind.findIndex((s) => s.slug === stat.slug);
  const prev = k > 0 ? sameKind[k - 1] : null;
  const next = k < sameKind.length - 1 ? sameKind[k + 1] : null;

  const ballVariant = stat.kind === "special" ? "red" : stat.kind === "digit" ? "digit" : "white";
  const pctVsExpected = (stat.ratio - 1) * 100;

  const path = `/${g}/number/${n}`;
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: label, path: `/${g}` },
    { name: "Numbers", path: `/${g}/frequency` },
    { name: thing },
  ];
  const dataset = pageDatasetJsonLd({
    game: g,
    path,
    sliceName: `${thing} draw history`,
    description: `Appearances of ${thing} in ${label}: ${stat.count} draws, rank ${stat.rank} of ${stat.poolSize}.`,
    variableMeasured: ["appearance count", "last drawn date", "current gap", "frequency rank"],
    count: stat.count,
  });

  return (
    <>
      <GameHeader game={g} view={thing} crumbs={crumbs} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <NumberBall value={stat.value} variant={ballVariant} size="lg" />
          <div>
            <h2 className="font-display text-[24px] capitalize">{thing} in {label}</h2>
            <p className="text-[13px] text-dim">
              {stat.count.toLocaleString()} appearance{stat.count === 1 ? "" : "s"} on record · rank #{stat.rank} of {stat.poolSize}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Times drawn" value={stat.count.toLocaleString()} sub={`rank #${stat.rank} of ${stat.poolSize}`} />
          <StatCard label="Last drawn" value={stat.lastSeen ?? "never"} sub={stat.lastSeen ? `${stat.currentGap} draw${stat.currentGap === 1 ? "" : "s"} ago` : "—"} />
          <StatCard label="Current gap" value={`${stat.currentGap}`} sub="draws since last hit" />
          <StatCard
            label="Vs. expected"
            value={`${pctVsExpected >= 0 ? "+" : ""}${pctVsExpected.toFixed(1)}%`}
            sub="if draws were perfectly uniform"
            accent
          />
        </div>

        <HonestyNote tone="myth">
          A {stat.currentGap}-draw gap doesn&rsquo;t make {thing} &ldquo;due.&rdquo; Draws are independent: its
          chance next time is exactly what it always is ({ball ? "set by the pool size" : "1 in 10 per position"}),
          regardless of how long it&rsquo;s been. The {pctVsExpected >= 0 ? "above" : "below"}-expected count here is
          ordinary sampling noise across {stat.poolSize === 10 ? "ten digits" : `${stat.poolSize} numbers`}.
        </HonestyNote>

        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Appearances by year</div>
          <h3 className="font-display text-[18px] mt-1">
            {stat.byYear.length ? `${stat.byYear[0].year} → ${stat.byYear[stat.byYear.length - 1].year}` : "—"}
          </h3>
          <div className="mt-4"><Sparkline data={stat.byYear} width={640} height={72} /></div>
        </div>

        {stat.byPosition && (
          <div className="panel p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">By position</div>
            <h3 className="font-display text-[18px] mt-1">Where digit {stat.value} lands</h3>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stat.byPosition.map((c, i) => (
                <div key={i} className="panel-inner px-3 py-2.5">
                  <div className="text-[11px] text-dim font-mono">Position {i + 1}</div>
                  <div className="text-[18px] tabular-nums mt-0.5">{c.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <nav className="flex items-center justify-between gap-3 text-[13px]" aria-label="Number navigation">
          {prev ? (
            <Link href={`/${g}/number/${prev.slug}`} className="text-accent hover:underline">← {noun(g, prev.kind, prev.value)}</Link>
          ) : <span />}
          <Link href={`/${g}/frequency`} className="text-dim hover:text-text">All frequencies →</Link>
          {next ? (
            <Link href={`/${g}/number/${next.slug}`} className="text-accent hover:underline">{noun(g, next.kind, next.value)} →</Link>
          ) : <span />}
        </nav>
      </div>
    </>
  );
}
