"use client";

/**
 * Pattern Research — the honest home for "secret lottery systems."
 *
 * People sell systems: mirror numbers, "+1 to everything," reversals,
 * "the number repeats," law-of-attraction streaks. This page takes the
 * CODIFIABLE ones, encodes each as a Formula Lab rule, backtests it
 * across the full draw history of the selected game, and shows the
 * observed hit rate next to the pure-chance baseline. Spoiler: they
 * match. Nothing here is advice — it's a scoreboard for claims.
 *
 * (Non-codifiable beliefs like "manifest a win by raising your
 * vibration" have no rule to test — addressed honestly in the closing
 * note, not as a feature.)
 */

import { useMemo, useState } from "react";
import { useGameDraws } from "@/lib/hooks/useGameDraws";
import { backtestRule, type Rule, type RuleStep } from "@/lib/analytics/formula";
import { GAME_LABELS } from "@/lib/data";
import type { Game } from "@/lib/types";

const DIGIT_GAMES: Game[] = [
  "wi-pick3", "pa-pick3", "nj-pick3", "tx-pick3", "nc-pick3",
  "wi-pick4", "pa-pick4", "nj-pick4", "tx-pick4", "nc-pick4",
];

type System = {
  id: string;
  name: string;
  claim: string;
  /** Build the rule's steps for a given position count (3 or 4). */
  steps: (P: number) => RuleStep[];
};

// Each system is a real, widely-circulated "method." We encode the
// deterministic ones; each produces a small candidate set from the
// previous draw, and we measure how often the next draw actually lands
// in it versus chance.
const SYSTEMS: System[] = [
  {
    id: "mirror",
    name: "Mirror numbers",
    claim: "“Mirror” every digit (+5 on a 10-wheel: 0↔5, 1↔6…) and that's the next draw.",
    steps: (P) => [{ op: "mirror", sources: range(P) }],
  },
  {
    id: "plus-one",
    name: "+1 to every digit",
    claim: "Add 1 to each digit of the last draw (mod 10) to get the next.",
    steps: (P) => [{ op: "shift", k: 1, sources: range(P) }],
  },
  {
    id: "minus-one",
    name: "−1 from every digit",
    claim: "Subtract 1 from each digit of the last draw to get the next.",
    steps: (P) => [{ op: "shift", k: 9, sources: range(P) }],
  },
  {
    id: "reverse",
    name: "Reverse the number",
    claim: "The last draw, read backwards, is the next draw.",
    steps: (P) => [{ op: "reverse", sources: range(P) }],
  },
  {
    id: "repeat",
    name: "“It repeats”",
    claim: "The exact same number comes up again next draw.",
    steps: (P) => [{ op: "anchor", sources: range(P) }], // 0 free positions → candidate = prev
  },
  {
    id: "mirror-plus-reverse",
    name: "Mirror, then reverse",
    claim: "Combine two systems: mirror each digit AND reverse — twice the candidates, surely twice the luck.",
    steps: (P) => [
      { op: "mirror", sources: range(P) },
      { op: "reverse", sources: range(P) },
    ],
  },
];

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function PatternsView() {
  const [game, setGame] = useState<Game>("pa-pick3"); // deepest history
  const { draws, loading } = useGameDraws(game);
  const positions = game.endsWith("pick3") ? 3 : 4;

  const results = useMemo(() => {
    if (!draws || draws.length < 2) return [];
    return SYSTEMS.map((s) => {
      const rule: Rule = { game: game as any, steps: s.steps(positions), target: "straight" };
      const r = backtestRule(draws, rule);
      // "Edge" = how far observed sits above the chance baseline, in
      // relative terms. Within ±25% of chance is indistinguishable from
      // noise at these sample sizes → "no edge."
      const ratio = r.straightChance > 0 ? r.straightRate / r.straightChance : 0;
      const verdict =
        ratio <= 1.25 && ratio >= 0.4 ? "no-edge" : ratio > 1.25 ? "above" : "below";
      return { system: s, r, ratio, verdict };
    });
  }, [draws, game, positions]);

  return (
    <div className="space-y-6">
      {/* Game selector */}
      <div className="panel p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
          Test against
        </div>
        <div className="flex flex-wrap gap-2">
          {DIGIT_GAMES.map((g) => (
            <button
              key={g}
              onClick={() => setGame(g)}
              className={`px-3 py-1.5 rounded-md text-[13px] border transition-colors ${
                g === game
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-edge text-dim hover:text-text hover:bg-white/[0.04]"
              }`}
            >
              {GAME_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {loading || !draws ? (
        <div className="panel p-8 text-center text-dim text-sm">Running backtests…</div>
      ) : (
        <>
          <div className="text-[13px] text-dim">
            Backtested across{" "}
            <span className="text-text tabular-nums">{(draws.length - 1).toLocaleString()}</span>{" "}
            consecutive {GAME_LABELS[game]} transitions. “Chance” is what a fair, random
            process predicts for the same candidate set.
          </div>

          <div className="grid grid-cols-1 gap-4">
            {results.map(({ system, r, ratio, verdict }) => (
              <div key={system.id} className="panel p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="max-w-2xl">
                    <h3 className="font-display text-[20px] leading-tight">{system.name}</h3>
                    <p className="mt-1 text-[13px] text-dim leading-relaxed">{system.claim}</p>
                  </div>
                  <VerdictBadge verdict={verdict} />
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <Metric label="Straight — observed" value={pct(r.straightRate)} />
                  <Metric label="Straight — chance" value={pct(r.straightChance)} accent />
                  <Metric label="Box — observed" value={pct(r.boxRate)} />
                  <Metric label="Box — chance" value={pct(r.boxChance)} accent />
                </div>

                <div className="mt-3 text-[12px] text-dim font-mono">
                  observed ÷ chance ={" "}
                  <span className={ratio > 1.25 ? "text-hot" : "text-cool"}>
                    {ratio.toFixed(2)}×
                  </span>
                  {r.splitTest && (
                    <>
                      {"  ·  "}out-of-sample: 1st half {pct(r.splitTest.firstHalf.straightRate)} /
                      2nd half {pct(r.splitTest.secondHalf.straightRate)}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* The honest closing note — where the manifestation belief lands. */}
          <div className="panel p-6 border-cool/20">
            <div className="text-[11px] uppercase tracking-[0.18em] text-cool font-mono">
              What about “manifesting” a win?
            </div>
            <h3 className="font-display text-[20px] mt-2">There's no rule to test.</h3>
            <p className="mt-2 text-[14px] text-dim leading-relaxed">
              Some systems aren't numerical at all — “raise your vibration,” “visualize the
              win,” “believe and the universe provides.” There's nothing to encode and nothing
              to backtest, because a lottery draw is a sealed mechanical process with no input
              from your state of mind. Every system on this page that <em className="not-italic text-text">can</em> be
              written down lands on the chance line. The ones that can't be written down don't
              beat it either — they just can't be measured. Play for fun, never for a system.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="panel-inner py-3 px-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono">{label}</div>
      <div className={`mt-1 font-display text-[20px] tabular-nums ${accent ? "text-cool" : "text-text"}`}>
        {value}
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  if (verdict === "no-edge")
    return (
      <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cool/40 bg-cool/10 text-cool text-[12px] font-mono uppercase tracking-wider">
        ● Matches chance
      </span>
    );
  if (verdict === "above")
    return (
      <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-hot/40 bg-hot/10 text-hot text-[12px] font-mono uppercase tracking-wider">
        ● Above chance (noise)
      </span>
    );
  return (
    <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-edge text-dim text-[12px] font-mono uppercase tracking-wider">
      ● Below chance
    </span>
  );
}

function pct(x: number): string {
  if (x === 0) return "0%";
  if (x < 0.001) return `${(x * 100).toFixed(3)}%`;
  if (x < 0.01) return `${(x * 100).toFixed(2)}%`;
  return `${(x * 100).toFixed(1)}%`;
}
