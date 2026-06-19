import type { Metadata } from "next";
import { OddsView } from "./OddsView";

export const metadata: Metadata = {
  title: "Lottery Odds, Honestly — How Many Tickets to Win?",
  description:
    "The real jackpot odds for Powerball, Mega Millions, Pick 3 and Pick 4 — and exactly how many tickets (and dollars) it takes to reach a 1%, 50%, or guaranteed chance. Play every draw for a lifetime and see your true odds. Educational, no predictions.",
  alternates: { canonical: "https://draw-data.com/odds" },
  openGraph: {
    type: "website",
    title: "Lottery Odds, Honestly — DrawData",
    description:
      "Exact jackpot odds and the brutal arithmetic of 'buying your way up.' No systems, just the math.",
    url: "https://draw-data.com/odds",
    siteName: "DrawData",
  },
};

export default function OddsPage() {
  return (
    <>
      <div className="border-b border-edge bg-radial-amber">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
          <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">
            Odds, Honestly
          </div>
          <h1 className="mt-2 font-display text-[40px] sm:text-[48px] leading-tight tracking-tight">
            The odds are the odds.
          </h1>
          <p className="mt-3 text-dim max-w-3xl leading-relaxed">
            Here&rsquo;s the real chance of a jackpot, and exactly how many tickets — and dollars —
            it takes to move that number. Slide it out over a lifetime of play and watch the gap
            between what you spend and what you&rsquo;d likely win. No system narrows it; only buying
            a slice of every possible combination does, and that costs a fortune. This is the math
            the tipsters hope you never run.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <OddsView />
      </div>
    </>
  );
}
