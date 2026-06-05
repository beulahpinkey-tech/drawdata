import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ALL_GAMES } from "@/lib/types";
import { GAME_LABELS, GAME_BLURB, META } from "@/lib/data";

const GAMES = new Set<string>(ALL_GAMES);

// Fully-static prerendering for every known slug.
export const dynamicParams = false;

export default function GameLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { game: string };
}) {
  if (!GAMES.has(params.game)) notFound();
  return <>{children}</>;
}

export function generateStaticParams() {
  return ALL_GAMES.map((game) => ({ game }));
}

/**
 * Per-game metadata. Without this every game page inherits the same
 * generic root <title> and <meta description>, which collapses
 * indexability — Google sees ten near-duplicate pages instead of ten
 * distinct ones. With unique title + description + canonical, each
 * /[game] route is its own indexable entity.
 */
export function generateMetadata({
  params,
}: {
  params: { game: string };
}): Metadata {
  const slug = params.game;
  if (!GAMES.has(slug)) return {};
  const label = (GAME_LABELS as any)[slug] ?? slug;
  const blurb = (GAME_BLURB as any)[slug] ?? "";
  const m = (META as any)[slug];
  const count = m?.count ? `${m.count.toLocaleString()} draws` : "complete history";
  const range =
    m?.earliest && m?.latest ? ` (${m.earliest} → ${m.latest})` : "";
  const description = `${blurb} Free interactive analytics on ${count}${range}: frequency, gaps, sums, pairs, positional and stream breakdowns. Descriptive only — no predictions.`;
  return {
    title: `${label} History & Analytics`,
    description,
    alternates: { canonical: `https://draw-data.com/${slug}` },
    openGraph: {
      type: "website",
      title: `${label} — DrawData`,
      description,
      url: `https://draw-data.com/${slug}`,
      siteName: "DrawData",
    },
    twitter: {
      card: "summary_large_image",
      title: `${label} — DrawData`,
      description,
    },
  };
}
