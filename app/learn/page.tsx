export const runtime = "edge";

import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { learnPages } from "@/lib/learn";
import { GAME_LABELS } from "@/lib/data";
import type { Crumb } from "@/lib/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Learn — Honest Answers to Lottery Questions",
  description:
    "Straight, data-backed answers to the questions people actually ask about the lottery — most common numbers, overdue numbers, randomness, Quick Pick. Descriptive, never predictive.",
  alternates: { canonical: "https://draw-data.com/learn" },
};

export default async function LearnIndexPage() {
  const pages = await learnPages();
  const concept = pages.filter((p) => !p.game);
  const byGame = pages.filter((p) => p.game);

  const crumbs: Crumb[] = [{ name: "Home", path: "/" }, { name: "Learn" }];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-8">
      <Breadcrumbs crumbs={crumbs} />
      <header>
        <h1 className="t-h1">Learn</h1>
        <p className="mt-3 text-[15px] text-dim max-w-2xl leading-relaxed">
          Honest, data-backed answers to the questions people search for about the lottery. Every answer is
          drawn from our own draw history — and every one is descriptive, never a prediction or a system.
        </p>
      </header>

      <section>
        <h2 className="font-display text-[20px]">The concepts</h2>
        <div className="mt-3 grid gap-2">
          {concept.map((p) => (
            <Link key={p.slug} href={`/learn/${p.slug}`} className="panel-inner px-4 py-3 hover:bg-white/[0.04] transition-colors">
              <div className="text-[15px]">{p.h1}</div>
              <div className="text-[12px] text-dim mt-0.5 line-clamp-1">{p.description}</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-[20px]">By game</h2>
        <p className="text-[13px] text-dim mt-1">Most-common and overdue breakdowns, with the honest caveat, for each game.</p>
        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          {byGame.map((p) => (
            <Link key={p.slug} href={`/learn/${p.slug}`} className="panel-inner px-4 py-3 hover:bg-white/[0.04] transition-colors flex items-baseline justify-between gap-3">
              <span className="text-[14px]">{p.h1}</span>
              <span className="text-[11px] text-dim font-mono whitespace-nowrap">{GAME_LABELS[p.game!]}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
