"use client";

/**
 * Shared presentation helpers for the Combination Explorer.
 *
 * Frequency colour comes from the existing ramp — accent 900→500 for the
 * ordinary tiers, the coral data accent for the top one, and a plain
 * hairline for never-drawn. No new palette, and nothing that reads as a
 * traffic light: a "hot" combination is not a better bet, and the colour
 * scale must not imply that it is.
 */

import { tierOf, type Tier } from "@/lib/combos/index-build";

export const TIER_VAR: Record<Tier, string> = {
  0: "var(--edge-hover)",
  1: "var(--accent-900)",
  2: "var(--accent-700)",
  3: "var(--accent-500)",
  4: "var(--data-divergent)",
};

export const TIER_TEXT: Record<Tier, string> = {
  0: "0 hits",
  1: "1 hit",
  2: "2 hits",
  3: "3 hits",
  4: "4+ hits",
};

export const tierColor = (count: number): string => TIER_VAR[tierOf(count)];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-03-04" → "Mar 04, 2025". UTC-parsed, so it can't drift a day. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${d}, ${y}`;
}

/** "2025-03-04" → "03/04/2025", for the dense occurrence table. */
export function fmtDateShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

export function fmtPercent(share: number): string {
  if (share === 0) return "0%";
  const pct = share * 100;
  return `${pct < 0.001 ? pct.toFixed(5) : pct.toFixed(4)}%`;
}

export const streamLabel = (s: string | undefined | null): string =>
  !s || s === "other" ? "—" : s.charAt(0).toUpperCase() + s.slice(1);

/** Screen-reader sentence for one combination. */
export function comboAnnouncement(label: string, count: number): string {
  const word = count === 0 ? "no" : count === 1 ? "one" : String(count);
  return `Combination ${label.split("").join(" ")}. ${word} historical ${count === 1 ? "occurrence" : "occurrences"}.`;
}
