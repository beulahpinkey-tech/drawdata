import { Suspense } from "react";
import type { Metadata } from "next";
import { CombinationExplorer } from "./CombinationExplorer";

export const metadata: Metadata = {
  title: "10,000 Combination Explorer — Every Pick 4 Outcome",
  description:
    "Map every four-digit draw in twelve states onto the fixed universe of 10,000 combinations, 0000 to 9999. Historical hit counts, first and last seen, full occurrence history, and cross-state comparison. Descriptive only — no predictions.",
  alternates: { canonical: "https://draw-data.com/combinations" },
  openGraph: {
    type: "website",
    title: "10,000 Combination Explorer — DrawData",
    description:
      "Every four-digit combination from 0000 to 9999, mapped against real draw history across twelve states.",
    url: "https://draw-data.com/combinations",
    siteName: "DrawData",
  },
};

export default function CombinationsPage() {
  return (
    <>
      <div className="border-b border-edge bg-radial-amber">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12">
          <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">
            Combination Explorer
          </div>
          <h1 className="mt-2 font-display text-[40px] sm:text-[48px] leading-tight tracking-tight">
            All 10,000 combinations, one at a time.
          </h1>
          <p className="mt-3 max-w-3xl text-dim leading-relaxed">
            A four-digit game has exactly 10,000 ordered outcomes, 0000 through 9999. This maps
            every draw on record into that fixed universe, so you can see how often any
            combination has actually come up in a given state — and how often it hasn&rsquo;t.
            Leading zeroes are real numbers here: 0042 is not 42.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <Suspense
          fallback={
            <div className="panel p-8 text-center text-dim text-sm">Loading combination explorer…</div>
          }
        >
          <CombinationExplorer />
        </Suspense>
      </div>
    </>
  );
}
