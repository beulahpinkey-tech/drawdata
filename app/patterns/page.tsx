import { Suspense } from "react";
import type { Metadata } from "next";
import { PatternsView } from "./PatternsView";

export const metadata: Metadata = {
  title: "Pattern Research — Do Lottery Systems Work?",
  description:
    "Mirror numbers, +1 systems, reversals, 'due' numbers, manifestation — every codifiable lottery 'secret system' backtested against decades of real Pick 3 / Pick 4 history and shown against the pure-chance baseline. Descriptive, honest, no predictions.",
  alternates: { canonical: "https://draw-data.com/patterns" },
  openGraph: {
    type: "website",
    title: "Pattern Research — DrawData",
    description:
      "Every 'secret lottery system' you can write down, backtested against real history. They all land on the chance line.",
    url: "https://draw-data.com/patterns",
    siteName: "DrawData",
  },
};

export default function PatternsPage() {
  return (
    <>
      <div className="border-b border-edge bg-radial-amber">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12">
          <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">
            Pattern Research
          </div>
          <h1 className="mt-2 font-display text-[40px] sm:text-[48px] leading-tight tracking-tight">
            Do the “secret systems” work?
          </h1>
          <p className="mt-3 text-dim max-w-3xl leading-relaxed">
            People sell lottery systems — mirror numbers, “+1 to everything,” reversals,
            “it&rsquo;s due,” manifestation streaks. Here we take every system that can
            actually be written down, run it against the full history of real draws, and put
            the result next to what pure chance predicts. No advice, no picks — just the
            scoreboard.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <Suspense fallback={<div className="panel p-8 text-center text-dim text-sm">Loading…</div>}>
          <PatternsView />
        </Suspense>
      </div>
    </>
  );
}
