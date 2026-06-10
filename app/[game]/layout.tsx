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
  const slug = params.game;
  const label = (GAME_LABELS as any)[slug] ?? slug;
  const blurb = (GAME_BLURB as any)[slug] ?? "";
  const m = (META as any)[slug];

  // schema.org Dataset is THE structured-data type Google looks for
  // when it wants to surface a "Dataset" rich result. Pure win — it's
  // free indexability juice as long as the underlying claims are real.
  // Everything here is derived from META so the numbers stay honest.
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${label} — winning numbers history`,
    description: blurb,
    url: `https://draw-data.com/${slug}`,
    creator: { "@id": "https://draw-data.com/#org" },
    publisher: { "@id": "https://draw-data.com/#org" },
    license: "https://creativecommons.org/publicdomain/zero/1.0/",
    isAccessibleForFree: true,
    keywords: [
      label,
      "lottery",
      "winning numbers",
      "draw history",
      "analytics",
    ].join(", "),
    ...(m?.earliest && m?.latest
      ? {
          temporalCoverage: `${m.earliest}/${m.latest}`,
          variableMeasured: "winning digits per draw",
        }
      : {}),
    ...(m?.count
      ? {
          distribution: [
            {
              "@type": "DataDownload",
              encodingFormat: "application/json",
              contentUrl: `https://draw-data.com/lib/data/${slug}.json`,
            },
          ],
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />
      {children}
    </>
  );
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
