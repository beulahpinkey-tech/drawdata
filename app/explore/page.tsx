import { Suspense } from "react";
import type { Metadata } from "next";
import { ExploreView } from "./ExploreView";

export const metadata: Metadata = {
  title: "Draw Explorer — Filter Every Pick 3 / Pick 4 Draw",
  description:
    "Slice decades of Pick 3 and Pick 4 history across Wisconsin, Pennsylvania, New Jersey, Texas, and North Carolina. Filter by stream, date, digit position, sum, and shape; every view is a shareable URL. Descriptive only — no predictions.",
  alternates: { canonical: "https://draw-data.com/explore" },
  openGraph: {
    type: "website",
    title: "Draw Explorer — DrawData",
    description:
      "Faceted, shareable exploration of decades of real Pick 3 / Pick 4 draws.",
    url: "https://draw-data.com/explore",
    siteName: "DrawData",
  },
};

export default function ExplorePage() {
  return (
    <>
      <div className="border-b border-edge bg-radial-amber">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12">
          <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">
            Draw Explorer
          </div>
          <h1 className="mt-2 font-display text-[40px] sm:text-[48px] leading-tight tracking-tight">
            Explore every draw on record.
          </h1>
          <p className="mt-3 text-dim max-w-3xl leading-relaxed">
            Filter the full Pick 3 / Pick 4 history by stream, date, digit position, sum, and
            shape. Click any digit to drill in. Every view is a shareable link — copy the URL
            and send the exact slice you&rsquo;re looking at. It describes what happened; it never
            tells you what&rsquo;s next.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <Suspense fallback={<div className="panel p-8 text-center text-dim text-sm">Loading explorer…</div>}>
          <ExploreView />
        </Suspense>
      </div>
    </>
  );
}
