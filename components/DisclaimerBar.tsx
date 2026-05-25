import Link from "next/link";
import { META } from "@/lib/data";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function DisclaimerBar() {
  const last = (META as any).lastCsvUpdated as string | undefined;
  return (
    <footer className="border-t border-edge mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 text-[12px] text-dim leading-relaxed">
        <p className="max-w-4xl">
          <span className="text-text font-medium">For analysis and entertainment only.</span>{" "}
          Lottery draws are random and independent. This app describes past results and does
          not predict future numbers, improve your chances of winning, or constitute betting
          advice. Source: Wisconsin Lottery public draw history. <strong className="text-text">Not affiliated with or endorsed by any official lottery.</strong> 18+.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-dim">
          <Link href="/about" className="hover:text-text">About & methodology</Link>
          <span className="opacity-30">·</span>
          <Link href="/privacy" className="hover:text-text">Privacy</Link>
          <span className="opacity-30">·</span>
          <Link href="/terms" className="hover:text-text">Terms</Link>
          <span className="opacity-30">·</span>
          <Link href="/contact" className="hover:text-text">Feedback &amp; contact</Link>
          <span className="opacity-30">·</span>
          {last && (
            <span className="font-mono text-[11px] inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cool" />
              Last updated: {fmtDate(last)}
            </span>
          )}
          <span className="opacity-30">·</span>
          <span className="font-mono text-[11px]">DrawData v0.2</span>
        </div>
      </div>
    </footer>
  );
}
