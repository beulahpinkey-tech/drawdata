import { Suspense } from "react";
import { HonestyNote } from "@/components/HonestyNote";
import { LabView } from "./LabView";
import { LabSuggestionPrompt } from "@/components/LabSuggestionPrompt";

export default function LabPage() {
  return (
    <>
      <div className="border-b border-edge bg-radial-amber">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">Formula Lab</div>
          <h1 className="mt-2 font-display text-[42px] sm:text-[48px] leading-tight tracking-tight">
            Test a theory, see the truth.
          </h1>
          <p className="mt-3 text-dim max-w-3xl leading-relaxed">
            Build a transformation rule from the previous draw — shifts, mirrors, swaps, anchors.
            We&rsquo;ll run it against every consecutive draw in history and show the empirical hit rate
            beside what pure chance predicts. Both straight and box matches are scored. Out-of-sample
            split tests show whether any apparent edge holds up — it rarely does.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote tone="myth">
          The Lab is not a tipster. It is an honest scoreboard. Every rule is evaluated on its full
          historical record; the chance baseline sits next to the observed rate so you can see, with
          your own eyes, that they match. No candidate generated here is a recommendation.
        </HonestyNote>
        <Suspense fallback={<div className="panel p-8 text-center text-dim text-sm">Loading lab…</div>}>
          <LabView />
        </Suspense>
      </div>
      <LabSuggestionPrompt />
    </>
  );
}
