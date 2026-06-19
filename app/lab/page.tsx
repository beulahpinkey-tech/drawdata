import { Suspense } from "react";
import type { Metadata } from "next";
import { HonestyNote } from "@/components/HonestyNote";
import { LabView } from "./LabView";
import { LabSuggestionPrompt } from "@/components/LabSuggestionPrompt";

export const metadata: Metadata = {
  title: "Formula Lab — Backtest a Lottery System",
  description:
    "Build a transformation rule from the previous draw and backtest it across every consecutive draw in 250,000+ historical Powerball, Mega Millions, Pick 3, and Pick 4 records. Compare the empirical hit rate against the chance baseline. Descriptive, not predictive.",
  alternates: { canonical: "https://draw-data.com/lab" },
  openGraph: {
    type: "website",
    title: "Formula Lab — DrawData",
    description:
      "Backtest any number-derivation rule against every consecutive draw on file. The chance baseline sits next to the observed rate so you can see, with your own eyes, that they match.",
    url: "https://draw-data.com/lab",
    siteName: "DrawData",
  },
};

// schema.org SoftwareApplication — the Lab is a tool. Google has a
// distinct rich result for this type; surfacing the Lab as a free,
// browser-based tool widens our SERP eligibility beyond the homepage
// + per-game Dataset results.
const labJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DrawData Formula Lab",
  description:
    "Free, browser-based backtester for lottery number-derivation rules. Build a transformation, run it against every consecutive draw in history, compare to the chance baseline.",
  applicationCategory: "AnalyticsApplication",
  operatingSystem: "Any (web)",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  url: "https://draw-data.com/lab",
  publisher: { "@id": "https://draw-data.com/#org" },
  isAccessibleForFree: true,
};

export default function LabPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(labJsonLd) }}
      />
      <div className="border-b border-hairline bg-radial-amber">
        <div className="mx-auto max-w-narrow px-4 sm:px-6 py-10 sm:py-14">
          <div className="t-data-label">Formula Lab</div>
          <h1 className="mt-2 t-h1 text-fg-primary">
            Test a theory, <span className="text-brand-500">see the truth.</span>
          </h1>
          <p className="mt-4 text-fg-secondary max-w-prose leading-body">
            Build a transformation rule from the previous draw — shifts, mirrors,
            swaps, anchors. We&rsquo;ll run it against every consecutive draw in
            history and show the empirical hit rate beside what pure chance predicts.
            Both straight and box matches are scored. Out-of-sample split tests show
            whether any apparent edge holds up — it rarely does.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-narrow px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote tone="myth">
          The Lab is not a tipster. It is an honest scoreboard. Every rule is
          evaluated on its full historical record; the chance baseline sits next to
          the observed rate so you can see, with your own eyes, that they match. No
          candidate generated here is a recommendation.
        </HonestyNote>
        <Suspense
          fallback={
            <div className="panel p-8 text-center text-fg-tertiary text-small">
              Loading lab…
            </div>
          }
        >
          <LabView />
        </Suspense>
      </div>
      <LabSuggestionPrompt />
    </>
  );
}
