import { META, GAME_LABELS, GAME_BLURB } from "@/lib/data";
import type { Game } from "@/lib/types";

const BASE = "https://draw-data.com";

/**
 * Emits a JSON-LD <script> describing this game's draw history as a
 * Dataset. Google's Dataset Search uses this to surface DrawData
 * for queries like "powerball winning numbers history" or "pa pick 3
 * past results". Same payload also helps regular Search results show
 * rich metadata snippets.
 */
export function GameJsonLd({ game }: { game: Game }) {
  const m = (META as any)[game] ?? {};
  const label = GAME_LABELS[game];
  const earliest = m.earliest ?? "1992-01-01";
  const latest = m.latest ?? new Date().toISOString().slice(0, 10);
  const count = typeof m.count === "number" ? m.count : 1000;

  const json = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${label} winning numbers history`,
    alternateName: label,
    description:
      `${GAME_BLURB[game]} Updated daily with the latest draws. ` +
      `Includes frequency, gap, sum, pair, and coverage analytics — purely descriptive, never predictive.`,
    url: `${BASE}/${game}`,
    keywords: [
      label.toLowerCase(),
      `${label.toLowerCase()} history`,
      `${label.toLowerCase()} past numbers`,
      `${label.toLowerCase()} frequency`,
      "lottery analytics",
    ],
    creator: {
      "@type": "Organization",
      name: "DrawData",
      url: BASE,
    },
    license: "https://creativecommons.org/publicdomain/zero/1.0/",
    isAccessibleForFree: true,
    temporalCoverage: `${earliest}/${latest}`,
    variableMeasured: [
      "draw date",
      "winning numbers",
      "draw frequency",
      "current gap",
      "digit sum",
    ],
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "text/html",
        contentUrl: `${BASE}/${game}`,
      },
    ],
    citation: "https://draw-data.com/about",
    measurementTechnique: "Aggregation of official lottery draw history",
    size: { "@type": "QuantitativeValue", value: count, unitText: "draws" },
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
