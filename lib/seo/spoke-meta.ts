import type { Metadata } from "next";
import { ALL_GAMES } from "@/lib/types";
import { GAME_LABELS, META } from "@/lib/data";

/**
 * Title / description / self-canonical for the per-game analytic pages
 * (/[game]/frequency, /gaps, /pairs …).
 *
 * Without this, all nine spokes inherited the hub's metadata from
 * app/[game]/layout.tsx — so 233 distinct pages declared the HUB as their
 * canonical (telling Google "don't index me, index /wi-pick3") and 260 pages
 * shared just 27 titles. Each spoke now names itself.
 */
export type Spoke =
  | "frequency" | "positional" | "gaps" | "pairs" | "coverage"
  | "check" | "lookup" | "carryover" | "streams";

const SPOKES: Record<Spoke, { title: string; what: string }> = {
  frequency: { title: "Number Frequency", what: "How often every number has been drawn, hot and cold counts across the full history" },
  positional: { title: "Positional Digits & Sums", what: "Digit counts by position and the distribution of draw sums" },
  gaps: { title: "Gaps & Overdue Numbers", what: "How many draws since each number last appeared, with longest and average gaps" },
  pairs: { title: "Pair Frequency", what: "How often each pair of digits has appeared together in the same draw" },
  coverage: { title: "Combination Coverage", what: "Which combinations have and have not been drawn yet" },
  check: { title: "Check Your Numbers", what: "Check any ticket against every past draw to see when it would have matched" },
  lookup: { title: "Number Lookup", what: "Look up any combination and see every date it was drawn" },
  carryover: { title: "Carryover Transitions", what: "How often digits repeat from one draw into the next" },
  streams: { title: "Midday vs Evening", what: "Side-by-side comparison of each daily drawing stream" },
};

const GAMES = new Set<string>(ALL_GAMES);

export function spokeMetadata(slug: string, spoke: Spoke): Metadata {
  if (!GAMES.has(slug)) return {};
  const label = (GAME_LABELS as Record<string, string>)[slug] ?? slug;
  const m = (META as Record<string, { count?: number; earliest?: string }>)[slug] ?? {};
  const { title, what } = SPOKES[spoke];
  const span = m.count ? ` — ${m.count.toLocaleString()} draws${m.earliest ? ` since ${m.earliest}` : ""}` : "";
  const description = `${label}: ${what}${span}. Free, descriptive analytics only — no predictions.`;
  const url = `https://draw-data.com/${slug}/${spoke}`;
  return {
    title: `${label} ${title}`, // "— DrawData" comes from the [game] layout template
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: `${label} ${title} — DrawData`, description, url, siteName: "DrawData" },
    twitter: { card: "summary_large_image", title: `${label} ${title} — DrawData`, description },
  };
}
