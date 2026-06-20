export const runtime = "edge";

import Link from "next/link";
import type { Metadata } from "next";
import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { DrawsTable } from "@/components/results/DrawsTable";
import { GAME_LABELS, META } from "@/lib/data";
import { ALL_GAMES } from "@/lib/types";
import type { Game } from "@/lib/types";
import { drawsNewestFirst, yearBuckets } from "@/lib/results";
import { pageDatasetJsonLd } from "@/lib/seo/dataset";
import type { Crumb } from "@/lib/seo/breadcrumbs";

const LATEST_N = 50;

export function generateStaticParams() {
  return ALL_GAMES.map((game) => ({ game }));
}

export function generateMetadata({ params }: { params: { game: string } }): Metadata {
  const { game } = params;
  const label = (GAME_LABELS as any)[game] ?? game;
  const m = (META as any)[game] ?? {};
  const path = `/${game}/results`;
  const description = `Latest ${label} winning numbers plus the full results archive back to ${m.earliest ?? "the start"} — ${
    m.count ? m.count.toLocaleString() + " draws" : "complete history"
  }, browsable by year and month. Descriptive record only. No predictions.`;
  return {
    title: `${label} Results & Past Winning Numbers`,
    description,
    alternates: { canonical: `https://draw-data.com${path}` },
    openGraph: { type: "website", title: `${label} results archive — DrawData`, description, url: `https://draw-data.com${path}` },
    twitter: { card: "summary_large_image", title: `${label} results archive`, description },
  };
}

export default function ResultsIndexPage({ params }: { params: { game: string } }) {
  const g = params.game as Game;
  const label = (GAME_LABELS as any)[g] ?? g;
  const m = (META as any)[g] ?? {};

  const latest = drawsNewestFirst(g).slice(0, LATEST_N);
  const years = yearBuckets(g);

  const path = `/${g}/results`;
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: label, path: `/${g}` },
    { name: "Results" },
  ];
  const dataset = pageDatasetJsonLd({
    game: g,
    path,
    sliceName: "results archive",
    description: `Complete ${label} draw history, browsable by year and month, with the latest ${LATEST_N} draws on this page.`,
    count: m.count,
  });

  return (
    <>
      <GameHeader game={g} view="results" crumbs={crumbs} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }} />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          This is the historical <strong>record</strong> — what was actually drawn. We publish it so the
          past is easy to look up, not because past results say anything about the next draw. Every draw is
          independent.
        </HonestyNote>

        <div>
          <h2 className="font-display text-[24px]">Latest {label} results</h2>
          <p className="mt-2 text-[14px] text-dim">
            The {latest.length} most recent draws. Browse the full archive by year below.
          </p>
        </div>

        <DrawsTable game={g} draws={latest} />

        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Full archive</div>
          <h2 className="font-display text-[20px] mt-1">Results by year</h2>
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {years.map((y) => (
              <Link
                key={y.year}
                href={`/${g}/results/${y.year}`}
                className="panel-inner px-3 py-2.5 text-[13px] hover:bg-white/[0.04] transition-colors flex items-baseline justify-between"
              >
                <span className="tabular-nums">{y.year}</span>
                <span className="text-dim text-[11px] tabular-nums">{y.count}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="text-[13px] text-dim">
          More for {label}:{" "}
          <Link href={`/${g}`} className="text-accent hover:underline">overview</Link>{" · "}
          <Link href={`/${g}/frequency`} className="text-accent hover:underline">frequency</Link>{" · "}
          <Link href={`/${g}/gaps`} className="text-accent hover:underline">gaps</Link>
        </div>
      </div>
    </>
  );
}
