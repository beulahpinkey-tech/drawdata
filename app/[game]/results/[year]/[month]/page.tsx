export const runtime = "edge";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GameHeader } from "@/components/GameHeader";
import { DrawsTable } from "@/components/results/DrawsTable";
import { GAME_LABELS } from "@/lib/data";
import { ALL_GAMES } from "@/lib/types";
import type { Game } from "@/lib/types";
import { drawsInMonth, monthSequence, MONTH_NAMES } from "@/lib/results";
import { pageDatasetJsonLd } from "@/lib/seo/dataset";
import type { Crumb } from "@/lib/seo/breadcrumbs";

type Params = { game: string; year: string; month: string };

export async function generateStaticParams() {
  const out: Params[] = [];
  for (const game of ALL_GAMES) {
    for (const m of await monthSequence(game)) {
      out.push({ game, year: m.year, month: m.month });
    }
  }
  return out;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { game, year, month } = params;
  const label = (GAME_LABELS as any)[game] ?? game;
  const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
  const draws = await drawsInMonth(game as Game, year, month);
  if (!draws.length) return {};
  const path = `/${game}/results/${year}/${month}`;
  const description = `Every ${label} winning number drawn in ${monthName} ${year} — all ${draws.length} draws with dates, digits${
    /pick/.test(game) ? ", streams" : ""
  } and sums. Complete, descriptive archive. No predictions.`;
  return {
    title: `${label} Results — ${monthName} ${year}`,
    description,
    alternates: { canonical: `https://draw-data.com${path}` },
    openGraph: { type: "website", title: `${label} results, ${monthName} ${year} — DrawData`, description, url: `https://draw-data.com${path}` },
    twitter: { card: "summary_large_image", title: `${label} results, ${monthName} ${year}`, description },
  };
}

export default async function MonthArchivePage({ params }: { params: Params }) {
  const { game, year, month } = params;
  const g = game as Game;
  const label = (GAME_LABELS as any)[game] ?? game;
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx];
  if (!monthName) notFound();

  const draws = await drawsInMonth(g, year, month);
  if (!draws.length) notFound(); // anti-thin guard — no empty shells

  // prev/next month within this game's actual history
  const seq = await monthSequence(g);
  const here = seq.findIndex((m) => m.year === year && m.month === month);
  const prev = here > 0 ? seq[here - 1] : null;
  const next = here >= 0 && here < seq.length - 1 ? seq[here + 1] : null;

  const path = `/${g}/results/${year}/${month}`;
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: label, path: `/${g}` },
    { name: "Results", path: `/${g}/results` },
    { name: year, path: `/${g}/results/${year}` },
    { name: monthName },
  ];
  const dataset = pageDatasetJsonLd({
    game: g,
    path,
    sliceName: `results for ${monthName} ${year}`,
    description: `All ${draws.length} ${label} draws in ${monthName} ${year}.`,
    temporalCoverage: `${year}-${month}`,
    count: draws.length,
  });

  return (
    <>
      <GameHeader game={g} view={`results · ${monthName} ${year}`} crumbs={crumbs} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }} />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h2 className="font-display text-[24px]">
            {label} results — {monthName} {year}
          </h2>
          <p className="mt-2 text-[14px] text-dim max-w-2xl leading-relaxed">
            {draws.length} {draws.length === 1 ? "draw" : "draws"} drawn this month, newest first. Numbers
            are the official winning results — shown for the historical record, never as a prediction of what
            comes next.
          </p>
        </div>

        <DrawsTable game={g} draws={draws} />

        <nav className="flex items-center justify-between gap-3 text-[13px]" aria-label="Month navigation">
          {prev ? (
            <Link href={`/${g}/results/${prev.year}/${prev.month}`} className="text-accent hover:underline">
              ← {prev.monthName} {prev.year}
            </Link>
          ) : <span />}
          <Link href={`/${g}/results/${year}`} className="text-dim hover:text-text">All of {year} →</Link>
          {next ? (
            <Link href={`/${g}/results/${next.year}/${next.month}`} className="text-accent hover:underline">
              {next.monthName} {next.year} →
            </Link>
          ) : <span />}
        </nav>
      </div>
    </>
  );
}
