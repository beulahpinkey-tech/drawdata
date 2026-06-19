import type { Metadata } from "next";
import { DrawMachine } from "./DrawMachine";

export const metadata: Metadata = {
  title: "Draw Machine — Random Lottery Draw Simulator",
  description:
    "A realistic air-mix lottery chamber simulator. Watch the balls churn and pull a uniformly-random Pick 3, Pick 4, Powerball, or Mega Millions draw — the same fair odds as a real machine. A fun, educational toy: it predicts nothing and changes no odds.",
  alternates: { canonical: "https://draw-data.com/draw-machine" },
  openGraph: {
    type: "website",
    title: "Draw Machine — DrawData",
    description:
      "Watch the chambers churn and pull a genuinely random draw. Fun and educational — no system, no predictions.",
    url: "https://draw-data.com/draw-machine",
    siteName: "DrawData",
  },
};

export default function DrawMachinePage() {
  return (
    <>
      <div className="border-b border-edge bg-radial-amber">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
          <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">
            Draw Machine
          </div>
          <h1 className="mt-2 font-display text-[40px] sm:text-[48px] leading-tight tracking-tight">
            Spin the chamber.
          </h1>
          <p className="mt-3 text-dim max-w-3xl leading-relaxed">
            A faithful little air-mix machine. Pick a game, hit generate, and watch the balls
            churn before they drop — every draw is genuinely, uniformly random, the same odds
            as the real thing. It&rsquo;s a toy and a teaching aid: a fair draw has no memory and
            no pattern, which is exactly the point of this whole site.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <DrawMachine />
      </div>
    </>
  );
}
