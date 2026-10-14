// Per-page Dataset JSON-LD builder. The game hub already emits a Dataset
// (app/[game]/layout.tsx + GameJsonLd) describing the whole history; the
// archetype pages (results archives, frequency, gaps, …) each describe a
// SLICE, so they get their own Dataset with a slice-specific name,
// description, temporalCoverage, and variableMeasured. dateModified comes
// from the twice-daily refresh (meta.lastCsvUpdated) so Google sees the
// data as fresh after every bot commit.

import { META, GAME_LABELS } from "@/lib/data";
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
    isPartOf: { "@id": `${BASE}/${game}#dataset` },
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
