// Dataset JSON-LD builders.
//
// Two shapes, one module:
//   * gameDatasetJsonLd — the WHOLE history of a game. Emitted once per page
//     by app/[game]/layout.tsx and identified by `${BASE}/<game>#dataset`.
//   * pageDatasetJsonLd — a SLICE (a results month, a number, …) that points
//     back to the whole via isPartOf → that same @id.
// Both live here so the @id a slice references is guaranteed to be the @id
// the game Dataset declares. They used to be built in three places (the
// layout, a GameJsonLd component and this file): every page carried two
// whole-game Datasets with different descriptions, neither declared the
// #dataset id the slices pointed at, and one advertised a download URL
// (/lib/data/<game>.json) that 404s.
//
// dateModified comes from the twice-daily refresh (meta.lastCsvUpdated) so
// Google sees the data as fresh after every bot commit.

import { META, GAME_LABELS, GAME_BLURB } from "@/lib/data";
import type { Game } from "@/lib/types";
import { BASE } from "./breadcrumbs";

/** ISO date the underlying CSVs were last refreshed by the GH Actions bot. */
export function dataModified(): string {
  return (META as any).lastCsvUpdated ?? (META as any).generatedAt ?? new Date().toISOString();
}

// Google's Dataset rich result rejects a `description` outside 50–5000
// characters ("Invalid string length in field 'description'"). The terse
// archive templates this file used to receive — "All 62 North Carolina Pick 4
// draws in July 2018." — landed at 34–49 characters, so 6,553 of 8,501
// Dataset pages (every short-named month and most years) were ineligible.
// Builders below produce informative descriptions well inside the range, and
// pageDatasetJsonLd enforces the bound for every caller regardless.
export const DESCRIPTION_MIN = 50;
export const DESCRIPTION_MAX = 5000;

const ARCHIVE_TAIL =
  "Part of DrawData's free, public-domain archive of official lottery results.";

const draws = (n: number) => `${n.toLocaleString("en-US")} draw${n === 1 ? "" : "s"}`;

export function resultsIndexDescription(label: string, latestN: number): string {
  return `Complete ${label} draw history, browsable by year and month, with the latest ${latestN} draws on this page.`;
}

export function resultsYearDescription(label: string, count: number, year: string): string {
  return `All ${draws(count)} of ${label} from ${year}, organized by month, each with its draw date and winning numbers. ${ARCHIVE_TAIL}`;
}

export function resultsMonthDescription(
  label: string,
  count: number,
  monthName: string,
  year: string,
): string {
  return `All ${draws(count)} of ${label} from ${monthName} ${year}, each listed with its draw date and winning numbers. ${ARCHIVE_TAIL}`;
}

export function numberDescription(
  thing: string,
  label: string,
  count: number,
  rank: number,
  poolSize: number,
): string {
  return `Appearances of ${thing} in ${label}: ${count} draws, rank ${rank} of ${poolSize}.`;
}

/**
 * Clamp a description into Google's accepted range. Short text is extended
 * with a factual provenance sentence rather than rejected, so a future caller
 * can't silently knock a page out of Dataset eligibility; overlong text is
 * cut at a word boundary.
 */
export function boundedDescription(text: string, label: string): string {
  let d = text.trim();
  if (d.length < DESCRIPTION_MIN) {
    d = `${d} Historical ${label} draw data from DrawData, free and in the public domain.`;
  }
  if (d.length > DESCRIPTION_MAX) {
    const cut = d.slice(0, DESCRIPTION_MAX - 1);
    const space = cut.lastIndexOf(" ");
    d = `${space > DESCRIPTION_MAX / 2 ? cut.slice(0, space) : cut}…`;
  }
  return d;
}

/** The @id every slice's isPartOf points at; declared by gameDatasetJsonLd. */
export const gameDatasetId = (game: Game) => `${BASE}/${game}#dataset`;

export function gameDatasetDescription(game: Game): string {
  return (
    `${GAME_BLURB[game]} Refreshed twice daily with the latest draws. ` +
    `Includes frequency, gap, sum, pair, and coverage analytics — purely descriptive, never predictive.`
  );
}

/**
 * The single whole-history Dataset for a game. No `distribution` is declared:
 * the site has no public bulk-download endpoint, and claiming one that 404s is
 * worse than omitting the recommended field.
 */
export function gameDatasetJsonLd(game: Game) {
  const m = (META as any)[game] ?? {};
  const label = GAME_LABELS[game];
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": gameDatasetId(game),
    name: `${label} winning numbers history`,
    alternateName: label,
    description: boundedDescription(gameDatasetDescription(game), label),
    url: `${BASE}/${game}`,
    keywords: [
      label,
      `${label} history`,
      `${label} past numbers`,
      `${label} frequency`,
      "lottery analytics",
    ],
    creator: { "@id": `${BASE}/#org` },
    publisher: { "@id": `${BASE}/#org` },
    license: "https://creativecommons.org/publicdomain/zero/1.0/",
    isAccessibleForFree: true,
    dateModified: dataModified(),
    // Only real values — never a placeholder date range or row count.
    ...(m.earliest && m.latest ? { temporalCoverage: `${m.earliest}/${m.latest}` } : {}),
    variableMeasured: ["draw date", "winning numbers", "draw frequency", "current gap", "digit sum"],
    measurementTechnique: "Aggregation of official lottery draw history",
    citation: `${BASE}/about`,
    ...(typeof m.count === "number"
      ? { size: { "@type": "QuantitativeValue", value: m.count, unitText: "draws" } }
      : {}),
  };
}

export type DatasetInput = {
  game: Game;
  /** Page path beginning with "/", e.g. "/pa-pick3/results/2026/06". */
  path: string;
  /** Human name of this slice, e.g. "results for June 2026". */
  sliceName: string;
  description: string;
  /** ISO range "start/end" for this slice; defaults to the game's full span. */
  temporalCoverage?: string;
  variableMeasured?: string[];
  /** Row count for this slice, if known. */
  count?: number;
};

export function pageDatasetJsonLd(input: DatasetInput) {
  const { game, path, sliceName, description, temporalCoverage, variableMeasured, count } = input;
  const m = (META as any)[game] ?? {};
  const label = GAME_LABELS[game];
  const coverage =
    temporalCoverage ?? (m.earliest && m.latest ? `${m.earliest}/${m.latest}` : undefined);

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${label} — ${sliceName}`,
    description: boundedDescription(description, label),
    url: `${BASE}${path}`,
    isPartOf: { "@id": gameDatasetId(game) },
    creator: { "@type": "Organization", name: "DrawData", url: BASE },
    publisher: { "@type": "Organization", name: "DrawData", url: BASE },
    license: "https://creativecommons.org/publicdomain/zero/1.0/",
    isAccessibleForFree: true,
    dateModified: dataModified(),
    ...(coverage ? { temporalCoverage: coverage } : {}),
    variableMeasured: variableMeasured ?? ["draw date", "winning numbers"],
    ...(typeof count === "number"
      ? { size: { "@type": "QuantitativeValue", value: count, unitText: "draws" } }
      : {}),
  };
}

/** Inline-able <script> JSON-LD string. */
export function jsonLdScript(obj: unknown): string {
  return JSON.stringify(obj);
}
