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
    description,
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
