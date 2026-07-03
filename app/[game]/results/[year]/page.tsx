export const runtime = "edge";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GameHeader } from "@/components/GameHeader";
import { NumberBall } from "@/components/NumberBall";
import { GAME_LABELS, isBallGame } from "@/lib/data";
import { ALL_GAMES } from "@/lib/types";
import type { Game } from "@/lib/types";
import { yearBuckets, drawsInYear } from "@/lib/results";
import { pageDatasetJsonLd } from "@/lib/seo/dataset";
import type { Crumb } from "@/lib/seo/breadcrumbs";

type Params = { game: string; year: string };

export async function generateStaticParams() {
  const out: Params[] = [];
  for (const game of ALL_GAMES) {
    for (const y of await yearBuckets(game)) out.push({ game, year: y.year });
  }
  return out;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { game, year } = params;
  const label = (GAME_LABELS as any)[game] ?? game;
  const draws = await drawsInYear(game as Game, year);
  if (!draws.length) return {};
  const path = `/${game}/results/${year}`;
  const description = `${label} winning numbers for ${year} — all ${draws.length} draws, organized by month. Complete descriptive archive from DrawData. No predictions.`;
  return {
    title: `${label} Results — ${year}`,
    description,
    alternates: { canonical: `https://draw-data.com${path}` },
    openGraph: { type: "website", title: `${label} results ${year} — DrawData`, description, url: `https://draw-data.com${path}` },
    twitter: { card: "summary_large_image", title: `${label} results ${year}`, description },
  };
}

export default async function YearArchivePage({ params }: { params: Params }) {
  const { game, year } = params;
  const g = game as Game;
  const label = (GAME_LABELS as any)[game] ?? game;

  const years = await yearBuckets(g);
  const yi = years.findIndex((y) => y.year === year);
  if (yi === -1) notFound();
  const bucket = years[yi];
  const newer = yi > 0 ? years[yi - 1] : null; // years sorted newest-first
  const older = yi < years.length - 1 ? years[yi + 1] : null;

  const yearDraws = await drawsInYear(g, year);
  const latest = yearDraws[0]; // newest first
  const ball = isBallGame(g);

  const path = `/${g}/results/${year}`;
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: label, path: `/${g}` },
    { name: "Results", path: `/${g}/results` },
    { name: year },
  ];
  const dataset = pageDatasetJsonLd({
    game: g,
    path,
    sliceName: `results for ${year}`,
    description: `All ${bucket.count} ${label} draws in ${year}, by month.`,
    temporalCoverage: year,
    count: bucket.count,
  });

  return (
    <>
      <GameHeader game={g} view={`results · ${year}`} crumbs={crumbs} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h2 className="font-display text-[24px]">
            {label} results — {year}
          </h2>
          <p className="mt-2 text-[14px] text-dim max-w-2xl leading-relaxed">
            {bucket.count.toLocaleString()} draws across {bucket.months.length}{" "}
            {bucket.months.length === 1 ? "month" : "months"}. Pick a month for the full draw table.
            {latest && (
              <>
                {" "}Most recent that year:{" "}
                <span className="inline-flex items-center gap-1 align-middle">
                  {ball
                    ? latest.whites?.map((w, i) => <NumberBall key={i} value={w} variant="white" size="sm" />)
                    : latest.digits?.map((d, i) => <NumberBall key={i} value={d} variant="digit" size="sm" />)}
                  {ball && latest.special != null && <NumberBall value={latest.special} variant="red" size="sm" />}
                </span>{" "}
                on {latest.date}.
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {bucket.months.map((m) => (
            <Link
              key={m.month}
              href={`/${g}/results/${year}/${m.month}`}
              className="panel-inner px-3 py-3 text-[13px] hover:bg-white/[0.04] transition-colors flex items-baseline justify-between"
            >
              <span>{m.monthName}</span>
              <span className="text-dim tabular-nums text-[12px]">{m.count}</span>
            </Link>
          ))}
        </div>

        <nav className="flex items-center justify-between gap-3 text-[13px]" aria-label="Year navigation">
          {older ? (
            <Link href={`/${g}/results/${older.year}`} className="text-accent hover:underline">← {older.year}</Link>
          ) : <span />}
          <Link href={`/${g}/results`} className="text-dim hover:text-text">All results →</Link>
          {newer ? (
            <Link href={`/${g}/results/${newer.year}`} className="text-accent hover:underline">{newer.year} →</Link>
          ) : <span />}
        </nav>
      </div>
    </>
  );
}
