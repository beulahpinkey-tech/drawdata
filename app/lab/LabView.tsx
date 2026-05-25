"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  backtestRule,
  generateCandidates,
  OP_DOCS,
  type OpKind,
  type Rule,
  type RuleStep,
  type BacktestResult,
} from "@/lib/analytics/formula";
import type { Draw } from "@/lib/types";
import { NumberBall } from "@/components/NumberBall";
import { readActiveGame, writeActiveGame } from "@/lib/clientState";
import { CountUp } from "@/components/motion/primitives";
import { ShowmoreInteraction } from "@/components/ShowmoreInteraction";

type GamePick = "pick3" | "pick4";

export function LabView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlGame = searchParams.get("game");
  const fromGame = searchParams.get("from"); // e.g., "powerball" — show a notice

  // Initial game: URL ?game= (digit games only), else last selected (if digit), else pick3.
  const initialGame: GamePick = (() => {
    if (urlGame === "pick3" || urlGame === "pick4") return urlGame;
    const stored = typeof window !== "undefined" ? readActiveGame() : null;
    if (stored === "pick3" || stored === "pick4") return stored;
    return "pick3";
  })();
  const [game, setGame] = useState<GamePick>(initialGame);
  const [showFromPowerballNotice, setShowFromPowerballNotice] = useState(fromGame === "powerball");

  // Keep URL in sync with game choice (so this page is shareable / reload-stable).
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    if (sp.get("game") !== game) {
      sp.set("game", game);
      sp.delete("from");
      router.replace(`/lab?${sp.toString()}`, { scroll: false });
    }
    writeActiveGame(game);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const [draws, setDraws] = useState<Draw[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const mod: any =
        game === "pick3"
          ? await import("@/lib/data/pick3.json")
          : await import("@/lib/data/pick4.json");
      if (cancelled) return;
      setDraws(mod.draws ?? mod.default?.draws);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [game]);

  const positions = game === "pick3" ? 3 : 4;

  // Reset rule whenever game changes — defaults to "shift k=1, all positions → same positions".
  const [steps, setSteps] = useState<RuleStep[]>(() => makeDefaultRule(positions));
  useEffect(() => {
    setSteps(makeDefaultRule(positions));
    setResult(null);
  }, [positions]);

  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, startRun] = useTransition();

  const rule: Rule = useMemo(() => ({ game, steps, target: "straight" }), [game, steps]);

  const sampleCandidates: number[][] = useMemo(() => {
    if (!draws || draws.length === 0) return [];
    const lastPrev = draws[draws.length - 1].digits ?? [];
    return generateCandidates(rule, lastPrev).slice(0, 12);
  }, [draws, rule]);

  const run = () => {
    if (!draws) return;
    startRun(() => {
      const r = backtestRule(draws, rule);
      setResult(r);
    });
  };

  return (
    <>
      {showFromPowerballNotice && (
        <div className="panel-inner p-4 flex items-start justify-between gap-4 border-cool/30 bg-cool/[0.05]">
          <div className="text-[13px] text-dim">
            <strong className="text-text">Note:</strong> The Formula Lab works on digit games (Pick 3 / Pick 4) only.
            Powerball uses a sorted 5-out-of-69 + 1-out-of-26 selection, which doesn&rsquo;t lend itself to
            position-by-position transformations. We&rsquo;ve loaded Pick 3 for you.
          </div>
          <button onClick={() => setShowFromPowerballNotice(false)} className="text-dim hover:text-text text-[12px]">dismiss</button>
        </div>
      )}

      <HowToUse positions={positions} />

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[12px] text-dim font-mono uppercase tracking-[0.16em]">game</span>
        <div className="inline-flex items-center rounded-md border border-edge p-0.5 bg-white/[0.02]">
          {(["pick3", "pick4"] as GamePick[]).map((g) => (
            <button
              key={g}
              onClick={() => setGame(g)}
              className={`px-3 py-1 text-[12px] rounded-[5px] transition-colors ${
                game === g ? "bg-white/[0.08] text-text" : "text-dim hover:text-text"
              }`}
            >
              {g === "pick3" ? "Pick 3 (3 digits)" : "Pick 4 (4 digits)"}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-dim font-mono">
          {loading ? "loading…" : `${draws?.length.toLocaleString()} draws loaded · combined stream · ${Math.pow(10, positions).toLocaleString()} possible outcomes`}
        </span>
      </div>

      <div className="panel p-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Step 2 · Rule builder</div>
            <h2 className="font-display text-[22px] mt-1">
              Transform the previous draw into a candidate set
            </h2>
          </div>
          <div className="text-[12px] text-dim font-mono">
            current candidate-set size · <CountUp value={sampleCandidates.length || 0} className="text-text" />
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {steps.map((step, i) => (
            <StepEditor
              key={i}
              index={i}
              step={step}
              positions={positions}
              onChange={(s) => {
                const next = steps.slice();
                next[i] = s;
                setSteps(next);
              }}
              onRemove={steps.length > 1 ? () => setSteps(steps.filter((_, j) => j !== i)) : undefined}
            />
          ))}
          <button
            onClick={() => setSteps([...steps, { op: "shift", k: 1, sources: [0], targets: [0] }])}
            className="text-[13px] text-cool hover:underline"
          >
            + add another variant (its candidates are unioned with the rest)
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-edge">
          <div className="text-[12px] text-dim">
            Each variant generates candidate outcomes from the previous draw. We then check, across all{" "}
            <span className="text-text font-mono">{draws ? (draws.length - 1).toLocaleString() : "…"}</span>{" "}
            consecutive pairs in history, how often the actual next draw is in your set.
          </div>
          <button
            onClick={run}
            disabled={loading || !draws}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent text-ink font-medium text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {running ? "Running backtest…" : `Step 3 · Backtest now`}
          </button>
        </div>
      </div>

      {sampleCandidates.length > 0 && draws && (
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Live preview</div>
          <h3 className="font-display text-[18px] mt-1">Latest draw → candidates your rule generates</h3>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-[auto_auto_1fr] gap-4 items-center">
            <div className="rounded-xl border border-edge bg-white/[0.03] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-dim font-mono mb-2">
                prev draw · {draws[draws.length - 1].date}
              </div>
              <div className="flex gap-1.5">
                {draws[draws.length - 1].digits?.map((d, i) => (
                  <NumberBall key={i} value={d} variant="digit" size="md" />
                ))}
              </div>
            </div>
            <div className="hidden md:flex flex-col items-center text-cool">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M5 14h18m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[10px] uppercase tracking-[0.16em] font-mono mt-1">rule</span>
            </div>
            <div className="rounded-xl border border-cool/30 bg-cool/[0.06] px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-cool font-mono">
                  candidate set · {sampleCandidates.length}{sampleCandidates.length === 12 ? "+" : ""}
                </div>
                <div className="text-[10px] text-dim font-mono">not picks · descriptive only</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {sampleCandidates.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-cool/30 bg-ink/40 px-2 py-1.5 flex gap-1"
                  >
                    {c.map((d, j) => (
                      <NumberBall key={j} value={d} variant="digit" size="sm" />
                    ))}
                  </div>
                ))}
                {sampleCandidates.length === 12 && (
                  <span className="text-[11px] text-dim font-mono self-center">…(more)</span>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-dim">
            These are <strong className="text-text">not picks</strong>. They are the deterministic outputs of your
            rule, shown so you can see exactly what the backtester is scoring against actual draws.
          </p>
        </div>
      )}

      {result && <ResultPanel result={result} positions={positions} rule={rule} />}

      {!result && !loading && (
        <div className="panel-inner p-4 text-[12px] text-dim text-center">
          Step 3: click <span className="text-text font-medium">Backtest now</span> above to score your rule against{" "}
          {(draws?.length ?? 0) - 1} consecutive transitions.
        </div>
      )}
    </>
  );
}

function makeDefaultRule(positions: number): RuleStep[] {
  return [
    {
      op: "shift",
      k: 1,
      sources: Array.from({ length: positions }, (_, i) => i),
      targets: Array.from({ length: positions }, (_, i) => i),
    },
  ];
}

function HowToUse({ positions }: { positions: number }) {
  const space = Math.pow(10, positions);
  return (
    <div className="panel p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-mono">How to use the Lab</div>
      <h2 className="font-display text-[22px] mt-1">Three steps. One honest scoreboard.</h2>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Step
          num={1}
          title="Pick a game"
          body={
            <>
              Choose Pick 3 (3 digits, 1,000 outcomes) or Pick 4 (4 digits, 10,000 outcomes). The Lab
              loads the full history for that game so backtests run on every transition we have.
            </>
          }
        />
        <Step
          num={2}
          title="Build a rule"
          body={
            <>
              A rule transforms the <em className="not-italic text-text">previous draw</em> into a{" "}
              <em className="not-italic text-text">candidate set</em> for the next. Operations include
              shift (+k mod 10), mirror (+5), reverse, swap, multiply pair, and anchor. Stack variants
              with &ldquo;+ add another variant&rdquo; — their candidates are merged.
            </>
          }
        />
        <Step
          num={3}
          title="Read the scoreboard"
          body={
            <>
              We score <span className="text-text">straight</span> (exact position match) and{" "}
              <span className="text-text">box</span> (any-order match). The chance baseline is shown
              beside the observed rate. Chance = mean candidate-set size ÷ {space.toLocaleString()} outcomes.
            </>
          }
        />
      </div>
      <div className="mt-5 panel-inner p-4 text-[12px] text-dim">
        <span className="font-mono uppercase tracking-[0.14em] text-cool">Example</span>{" "}
        — A &ldquo;mirror every digit&rdquo; rule generates exactly one candidate per transition, so its chance
        baseline is <span className="font-mono text-text">1 / {space.toLocaleString()} = {(100 / space).toFixed(2)}%</span>.
        Real history will land very close to that number, with sample noise.
      </div>
    </div>
  );
}

function Step({ num, title, body }: { num: number; title: string; body: React.ReactNode }) {
  return (
    <div className="panel-inner p-4">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[28px] text-accent leading-none tabular-nums">{num}</span>
        <span className="text-[15px] font-medium">{title}</span>
      </div>
      <p className="mt-2 text-[12px] text-dim leading-relaxed">{body}</p>
    </div>
  );
}

function StepEditor({
  index,
  step,
  positions,
  onChange,
  onRemove,
}: {
  index: number;
  step: RuleStep;
  positions: number;
  onChange: (s: RuleStep) => void;
  onRemove?: () => void;
}) {
  const ops: OpKind[] = ["shift", "mirror", "reverse", "swap", "multiply_pair_2digit", "anchor"];
  const allPos = Array.from({ length: positions }, (_, i) => i);
  return (
    <div className="panel-inner p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-[0.16em] text-dim font-mono">variant {index + 1}</span>
          <select
            value={step.op}
            onChange={(e) => {
              const op = e.target.value as OpKind;
              const next: RuleStep = { op, sources: step.sources, targets: step.targets, k: step.k };
              if (op === "swap") next.sources = step.sources.slice(0, 2);
              if (op === "multiply_pair_2digit") {
                next.sources = step.sources.slice(0, 2).concat(step.sources.length < 2 ? [0, 1].slice(step.sources.length) : []);
                next.targets = (next.targets ?? [0, 1]).slice(0, 2);
              }
              onChange(next);
            }}
            className="bg-panel2 border border-edge rounded-md text-[13px] px-2 py-1.5 focus:outline-none focus:border-accent"
          >
            {ops.map((o) => (
              <option key={o} value={o}>{OP_DOCS[o].label}</option>
            ))}
          </select>
          {step.op === "shift" && (
            <div className="flex items-center gap-1">
              <span className="text-[12px] text-dim font-mono">k =</span>
              <input
                type="number"
                value={step.k ?? 0}
                onChange={(e) => onChange({ ...step, k: parseInt(e.target.value, 10) || 0 })}
                className="w-14 h-8 text-center font-mono text-[13px] rounded-md border border-edge bg-panel2 focus:outline-none focus:border-accent"
              />
            </div>
          )}
        </div>
        {onRemove && (
          <button onClick={onRemove} className="text-[12px] text-dim hover:text-hot">remove</button>
        )}
      </div>
      <p className="text-[11px] text-dim leading-relaxed">{OP_DOCS[step.op].desc}</p>
      <PositionPicker
        label="source positions (read from previous draw)"
        all={allPos}
        selected={step.sources}
        onChange={(s) => onChange({ ...step, sources: s })}
        ordered={step.op === "reverse" || step.op === "multiply_pair_2digit"}
      />
      {step.op !== "anchor" && step.op !== "swap" && (
        <PositionPicker
          label="target positions (where to place the result in the candidate)"
          all={allPos}
          selected={step.targets ?? step.sources}
          onChange={(t) => onChange({ ...step, targets: t })}
          ordered
        />
      )}
    </div>
  );
}

function PositionPicker({
  label,
  all,
  selected,
  onChange,
  ordered,
}: {
  label: string;
  all: number[];
  selected: number[];
  onChange: (s: number[]) => void;
  ordered?: boolean;
}) {
  const toggle = (p: number) => {
    if (selected.includes(p)) onChange(selected.filter((x) => x !== p));
    else onChange([...selected, p]);
  };
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-dim font-mono mb-1.5">{label}</div>
      <div className="flex gap-1.5 flex-wrap">
        {all.map((p) => {
          const idx = selected.indexOf(p);
          const active = idx !== -1;
          return (
            <button
              key={p}
              onClick={() => toggle(p)}
              className={`h-8 min-w-[36px] px-2 rounded-md border text-[12px] font-mono transition-colors ${
                active
                  ? "bg-accent/15 border-accent/40 text-accent"
                  : "border-edge text-dim hover:text-text hover:bg-white/[0.03]"
              }`}
              title={`position ${p + 1}`}
            >
              P{p + 1}{ordered && active ? <span className="ml-1 text-[10px] opacity-70">#{idx + 1}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  positions,
  rule,
}: {
  result: BacktestResult;
  positions: number;
  rule: Rule;
}) {
  const space = Math.pow(10, positions);
  const delta = (result.straightRate - result.straightChance) * 100;
  const deltaBox = (result.boxRate - result.boxChance) * 100;
  const verdict =
    Math.abs(delta) < 0.5 ? "no edge" : delta > 0 ? "tiny apparent edge (likely noise)" : "underperforming chance (also noise)";
  return (
    <>
      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Backtest result</div>
        <h2 className="font-display text-[26px] mt-1">
          {result.straightHits.toLocaleString()} straight hits in {result.transitions.toLocaleString()} transitions
        </h2>
        <p className="mt-2 text-[12px] text-dim max-w-3xl">
          For every consecutive pair (draw <span className="font-mono text-text">i</span> → draw{" "}
          <span className="font-mono text-text">i+1</span>) in history, we generate your rule&rsquo;s candidate set
          from draw <em className="text-text not-italic">i</em> and check whether draw <em className="text-text not-italic">i+1</em>{" "}
          is in it. The chance baseline is what the same rule would score against a fair random process.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScoreRow
            label="Straight hit rate (exact position match)"
            observed={result.straightRate}
            expected={result.straightChance}
            formula={`mean(|candidates|) / ${space.toLocaleString()} = ${result.meanCandidates.toFixed(2)} / ${space.toLocaleString()}`}
          />
          <ScoreRow
            label="Box hit rate (any-order match)"
            observed={result.boxRate}
            expected={result.boxChance}
            formula={`mean(|candidates|) × box-mult / ${space.toLocaleString()}`}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px] font-mono">
          <Metric label="mean candidate set size" value={result.meanCandidates.toFixed(2)} hint="avg number of outcomes your rule emits per transition" />
          <Metric label="outcome space" value={space.toLocaleString()} hint={`10^${positions} — all possible draws`} />
          <Metric label="straight delta vs chance" value={`${delta > 0 ? "+" : ""}${delta.toFixed(2)} pts`} tone={Math.abs(delta) < 0.5 ? "neutral" : delta > 0 ? "cool" : "hot"} hint="observed − chance" />
          <Metric label="box delta vs chance" value={`${deltaBox > 0 ? "+" : ""}${deltaBox.toFixed(2)} pts`} tone={Math.abs(deltaBox) < 0.5 ? "neutral" : deltaBox > 0 ? "cool" : "hot"} hint="observed − chance" />
        </div>

        <div className="mt-6 panel-inner p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-dim font-mono">Verdict</div>
          <div className="mt-1 text-[15px]">
            {verdict.startsWith("no") ? <span className="text-cool">{verdict}</span> : <span className="text-hot">{verdict}</span>}
            <span className="text-dim"> — observed {((result.straightRate) * 100).toFixed(2)}% vs chance {(result.straightChance * 100).toFixed(2)}%.</span>
          </div>
          <p className="mt-2 text-[12px] text-dim">
            A difference of less than ±0.5 percentage points is well within the noise band you&rsquo;d
            expect from any finite history. This rule is <strong className="text-text">not</strong> a
            recommendation; the candidates above are just the deterministic outputs of your transformation.
          </p>
        </div>
      </div>

      {result.splitTest && (
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Out-of-sample split test</div>
          <h3 className="font-display text-[20px] mt-1">Does the rate hold up on unseen draws?</h3>
          <p className="mt-1 text-[12px] text-dim max-w-3xl">
            Same rule, evaluated separately on the first half and second half of history. If a rule
            had real edge, both halves would agree (and both would beat chance). If it&rsquo;s
            overfitting, they diverge or collapse to chance. Expected behavior for a real lottery:{" "}
            <em className="text-text not-italic">both halves match chance</em>.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <HalfCard label="First half" half={result.splitTest.firstHalf} chance={result.straightChance} />
            <HalfCard label="Second half" half={result.splitTest.secondHalf} chance={result.straightChance} />
          </div>
        </div>
      )}

      {result.byYear.length > 0 && (
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Hit rate by year</div>
          <h3 className="font-display text-[20px] mt-1">A flat line across decades is the signature of chance</h3>
          <p className="mt-1 text-[12px] text-dim">
            Chance baseline for straight: <span className="text-cool font-mono">{(result.straightChance * 100).toFixed(2)}%</span>.
            Year-to-year wobble is expected — annual samples are small.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[12px] font-mono">
              <thead className="text-dim">
                <tr>
                  <th className="text-left py-1 pr-2 font-normal">year</th>
                  <th className="text-right px-2 font-normal">transitions</th>
                  <th className="text-right px-2 font-normal">straight</th>
                  <th className="text-right px-2 font-normal">straight %</th>
                  <th className="text-right pl-2 font-normal">box %</th>
                </tr>
              </thead>
              <tbody>
                {result.byYear.map((y) => (
                  <tr key={y.year} className="border-t border-edge">
                    <td className="py-1 pr-2 text-dim">{y.year}</td>
                    <td className="text-right px-2 tabular-nums">{y.transitions}</td>
                    <td className="text-right px-2 tabular-nums">{y.straight}</td>
                    <td className="text-right px-2 tabular-nums">{((y.straight / y.transitions) * 100).toFixed(2)}%</td>
                    <td className="text-right pl-2 tabular-nums">{((y.box / y.transitions) * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ShareCard result={result} rule={rule} />
    </>
  );
}

function Metric({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint?: string; tone?: "neutral" | "cool" | "hot" }) {
  const color = tone === "cool" ? "text-cool" : tone === "hot" ? "text-hot" : "text-text";
  return (
    <div className="panel-inner p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-dim">{label}</div>
      <div className={`mt-1 text-[16px] ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-dim font-sans">{hint}</div>}
    </div>
  );
}

function ScoreRow({
  label,
  observed,
  expected,
  formula,
}: {
  label: string;
  observed: number;
  expected: number;
  formula?: string;
}) {
  const max = Math.max(observed, expected, 0.0001);
  return (
    <div className="panel-inner p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-dim font-mono">{label}</div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-dim font-mono">observed</div>
          <div className="font-display text-[24px] tabular-nums">{(observed * 100).toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-[10px] text-cool font-mono">if random (chance baseline)</div>
          <div className="font-display text-[24px] tabular-nums text-cool">{(expected * 100).toFixed(2)}%</div>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/[0.04] relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-accent/70" style={{ width: `${(observed / max) * 100}%` }} />
        <div className="absolute inset-y-0 w-px bg-cool" style={{ left: `${(expected / max) * 100}%` }} />
      </div>
      {formula && (
        <div className="mt-2 text-[10px] text-dim font-mono">chance = {formula}</div>
      )}
    </div>
  );
}

function HalfCard({
  label,
  half,
  chance,
}: {
  label: string;
  half: { straightRate: number; boxRate: number; transitions: number };
  chance: number;
}) {
  const delta = (half.straightRate - chance) * 100;
  return (
    <div className="panel-inner p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-[0.16em] text-dim font-mono">{label}</div>
        <div className="text-[11px] text-dim font-mono">{half.transitions.toLocaleString()} transitions</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 font-mono">
        <div>
          <div className="text-[10px] text-dim">straight</div>
          <div className="text-[20px] tabular-nums">{(half.straightRate * 100).toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-[10px] text-dim">box</div>
          <div className="text-[20px] tabular-nums">{(half.boxRate * 100).toFixed(2)}%</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-dim font-mono">
        delta vs chance ({(chance * 100).toFixed(2)}%):{" "}
        <span className={Math.abs(delta) < 0.5 ? "text-cool" : delta > 0 ? "text-cool" : "text-hot"}>
          {delta > 0 ? "+" : ""}
          {delta.toFixed(2)} pts
        </span>
      </div>
    </div>
  );
}

function ShareCard({ result, rule }: { result: BacktestResult; rule: Rule }) {
  const summary = `Tested a ${rule.game === "pick3" ? "Pick 3" : "Pick 4"} rule (${rule.steps.length} step${rule.steps.length > 1 ? "s" : ""}).
Straight hit rate: ${(result.straightRate * 100).toFixed(2)}% vs ${(result.straightChance * 100).toFixed(2)}% chance.
Verdict: ${Math.abs(result.straightRate - result.straightChance) < 0.005 ? "no edge" : "noise"}.`;
  const copy = () => navigator.clipboard?.writeText(summary);
  const share = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: "DrawData · Formula Lab", text: summary });
      } catch {
        /* user dismissed */
      }
    } else {
      copy();
    }
  };
  const openMail = () => {
    const subj = encodeURIComponent("DrawData · Formula Lab result");
    const body = encodeURIComponent(summary + "\n\nhttps://drawdata.app/lab");
    window.location.href = `mailto:?subject=${subj}&body=${body}`;
  };
  const reset = () => {
    if (typeof window !== "undefined") window.location.reload();
  };
  return (
    <div className="panel p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Shareable result</div>
      <h3 className="font-display text-[20px] mt-1">A receipt for your theory</h3>
      <div className="mt-4 panel-inner p-5 bg-gradient-to-br from-panel to-panel2 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
        <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">DrawData · Formula Lab</div>
        <div className="mt-2 font-display text-[22px] leading-tight">
          Observed <span className="text-accent">{(result.straightRate * 100).toFixed(2)}%</span>
          {" "}vs chance <span className="text-cool">{(result.straightChance * 100).toFixed(2)}%</span>
        </div>
        <div className="mt-2 text-[12px] text-dim font-mono">
          {result.transitions.toLocaleString()} consecutive transitions · mean candidate set {result.meanCandidates.toFixed(1)}
        </div>
        <div className="mt-3 text-[12px] text-dim leading-relaxed max-w-xl">
          {summary.split("\n")[2]} Independent randomness, by definition, cannot be predicted from the previous draw.
        </div>
        <div className="mt-5 flex items-center justify-start">
          <ShowmoreInteraction
            items={[
              { id: "copy", label: "Copy summary", onClick: copy },
              { id: "share", label: "Share", onClick: share },
              { id: "email", label: "Email", onClick: openMail },
              { id: "reset", label: "Reset rule", onClick: reset },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
