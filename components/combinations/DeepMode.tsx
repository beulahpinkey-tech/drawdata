"use client";

/**
 * Deep mode — the whole universe at once, the last 50 draws in detail, and
 * the exploratory ranking model.
 *
 * The honesty constraints are structural here, not cosmetic: the generator
 * is `generateExploratorySets` (deterministic, explainable, versioned), the
 * five results are labelled Model Selections, each one shows the feature
 * scores that produced it, and the dates beside them come from the game's
 * own observed schedule — so a set is never pinned to a day the game
 * doesn't draw.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HonestyNote } from "@/components/HonestyNote";
import { track } from "@/lib/analytics";
import { comboDigits, comboLabel } from "@/lib/combos/universe";
import type { ComboFilter, ComboIndex } from "@/lib/combos/index-build";
import {
  analyzeWindow,
  generateExploratorySets,
  WEIGHT_LABELS,
  type GenerationResult,
} from "@/lib/combos/engine";
import { nextDrawSlots } from "@/lib/combos/schedule";
import {
  deleteAnalysis,
  listAnalyses,
  saveAnalysis,
  statusOf,
  type SavedAnalysis,
} from "@/lib/combos/storage";
import { scopeLabel, type ComboScope } from "@/lib/combos/games";
import { ComboUniverse } from "./ComboUniverse";
import { TierLegend } from "./ComboAnalysis";
import { fmtDate, streamLabel, tierColor } from "./tiers";

const WINDOW_SIZE = 50;

const PHASES = [
  "Analysing 10,000 combinations…",
  "Last 50 draws loaded",
  "Historical mapping loaded",
  "Position frequencies calculated",
  "Combination scores calculated",
];

export function DeepMode({
  index,
  scope,
  filter,
  selected,
  onSelect,
  onRestore,
  onBack,
}: {
  index: ComboIndex | null;
  scope: ComboScope;
  filter: ComboFilter;
  selected: number;
  onSelect: (combo: number) => void;
  onRestore: (entry: SavedAnalysis) => void;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  const window50 = useMemo(() => (index ? analyzeWindow(index, WINDOW_SIZE) : null), [index]);

  const [result, setResult] = useState<GenerationResult | null>(null);
  const [phase, setPhase] = useState(-1);
  const [revealed, setRevealed] = useState(0);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [saved, setSaved] = useState<SavedAnalysis[]>([]);
  const [universeHeight, setUniverseHeight] = useState(420);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => setSaved(listAnalyses()), []);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setUniverseHeight(mq.matches ? 300 : 420);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // A new scope invalidates a generated run — the window it came from is gone.
  useEffect(() => {
    setResult(null);
    setPhase(-1);
    setRevealed(0);
  }, [scope, filter.stream, filter.from, filter.to]);

  const slots = useMemo(
    () =>
      index
        ? nextDrawSlots(index.all(), 5, new Date().toISOString().slice(0, 10))
        : null,
    [index],
  );

  const finish = useCallback((generated: GenerationResult) => {
    setResult(generated);
    setPhase(PHASES.length - 1);
    setRevealed(5);
    setRunning(false);
  }, []);

  const generate = () => {
    if (!index || !window50) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    track("Combination Generate", { scope: String(scope), window: window50.analysed });

    const generated = generateExploratorySets(index, window50);
    if (reduce) {
      finish(generated);
      return;
    }
    setRunning(true);
    setResult(null);
    setRevealed(0);
    setPhase(0);
    // ~1.6s of staged analysis, then the five sets at ~260ms apart: under
    // three seconds end to end, and skippable at any point.
    PHASES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setPhase(i), i * 340));
    });
    timers.current.push(
      setTimeout(() => {
        setResult(generated);
        for (let i = 1; i <= 5; i++) {
          timers.current.push(setTimeout(() => setRevealed(i), i * 260));
        }
        timers.current.push(setTimeout(() => setRunning(false), 5 * 260 + 120));
      }, PHASES.length * 340),
    );
  };

  const skip = () => {
    if (!index || !window50) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    finish(result ?? generateExploratorySets(index, window50));
  };

  const save = () => {
    if (!result) return;
    const entry = saveAnalysis({
      scopeLabel: scopeLabel(scope),
      games: index?.games ?? [],
      stream: filter.stream,
      from: filter.from,
      to: filter.to,
      selectedCombo: selected,
      picks: result.picks.map((p, i) => ({
        combo: p.combo,
        score: p.score,
        slot: slots?.[i] ?? null,
      })),
      algorithm: result.algorithm,
      weights: result.weights,
      windowSize: result.provenance.windowSize,
      windowAnalysed: result.provenance.windowAnalysed,
      totalDraws: result.provenance.totalDraws,
    });
    setSaved([entry, ...saved.filter((s) => s.id !== entry.id)]);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2400);
  };

  const highlight = result ? result.picks.slice(0, revealed).map((p) => p.combo) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent font-mono">
            Deep mode
          </div>
          <h2 className="mt-1 font-display text-[26px] sm:text-[30px] leading-tight">
            The full 10,000-combination universe
          </h2>
        </div>
        <button type="button" onClick={onBack} className="btn btn-ghost h-11 px-4 text-[13px]">
          ← Back to the reel
        </button>
      </div>

      <section className="panel p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-dim">
            One point per combination, positioned the same way every time. Hover or tap a point for
            its count; click to open it in the reel.
          </p>
          <TierLegend />
        </div>
        <div className="mt-4 rounded-md border border-edge bg-[color:var(--bg-base)]/40 overflow-hidden">
          <ComboUniverse
            index={index}
            selected={selected}
            highlight={highlight}
            energised={running}
            onSelect={onSelect}
            height={universeHeight}
          />
        </div>
        <UniverseFigures index={index} />
      </section>

      <Last50 index={index} window50={window50} onSelect={onSelect} />

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
              Exploratory selection
            </div>
            <h3 className="mt-1 font-display text-[22px]">Generate 5 exploratory combinations</h3>
            <p className="mt-2 max-w-2xl text-[13px] text-dim leading-relaxed">
              A transparent ranking of all 10,000 combinations against six descriptive features of
              the {window50?.analysed ?? 0} draws above. Same data in, same five out — every time.
              These are <strong className="text-text">model selections</strong>, not predictions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {running && (
              <button type="button" onClick={skip} className="btn btn-ghost h-11 px-4 text-[13px]">
                Skip animation
              </button>
            )}
            <button
              type="button"
              onClick={generate}
              disabled={!index || !window50 || window50.analysed === 0}
              className="btn btn-primary h-11 px-5 text-[13px] disabled:opacity-40"
            >
              {result ? "Regenerate" : "Generate 5"}
            </button>
          </div>
        </div>

        {index && window50 && window50.analysed < WINDOW_SIZE && window50.analysed > 0 && (
          <p className="mt-3 text-[12px] text-hot">
            Only {window50.analysed} historical draws are available for this selection. Analysis is
            based on those {window50.analysed}.
          </p>
        )}
        {index && window50?.analysed === 0 && (
          <p className="mt-3 text-[12px] text-hot">
            No draws match this selection, so there is nothing to analyse. Widen the date range or
            change the draw type.
          </p>
        )}

        {phase >= 0 && (
          <ol className="mt-4 space-y-1 font-mono text-[12px]">
            {PHASES.map((text, i) => (
              <li
                key={text}
                className={i <= phase ? "text-fg-secondary" : "text-dim/40"}
                aria-hidden={i > phase}
              >
                {i <= phase ? (i === phase && running ? "▸ " : "✓ ") : "· "}
                {text}
              </li>
            ))}
          </ol>
        )}

        {result && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <AnimatePresence initial={false}>
                {result.picks.slice(0, revealed).map((pick, i) => (
                  <motion.div
                    key={pick.combo}
                    initial={reduce ? false : { opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                    className="panel-inner p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-dim">
                        Set {i + 1}
                      </span>
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full"
                        style={{ background: tierColor(index?.countOf(pick.combo) ?? 0) }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelect(pick.combo)}
                      className="mt-2 font-mono tabular-nums tracking-[0.2em] text-[26px] hover:text-accent transition-colors min-h-11"
                    >
                      {comboLabel(pick.combo)}
                    </button>
                    <div className="mt-1 text-[11px] text-dim">
                      {index?.countOf(pick.combo) ?? 0} historical hits
                    </div>
                    <div className="mt-3 border-t border-edge pt-2">
                      <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-dim">
                        {slots?.[i] ? "Scheduled draw" : "Schedule"}
                      </div>
                      <div className="mt-0.5 text-[12px] tabular-nums">
                        {slots?.[i]
                          ? `${fmtDate(slots[i].date)}${
                              slots[i].stream ? ` · ${streamLabel(slots[i].stream)}` : ""
                            }`
                          : "Not enough recent history to project a date"}
                      </div>
                    </div>
                    <FeatureBars features={pick.features} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-4">
              <div className="font-mono text-[11px] text-dim">
                Algorithm {result.algorithm} · window {result.provenance.windowAnalysed} draws ·{" "}
                {result.provenance.totalDraws.toLocaleString()} draws analysed ·{" "}
                {new Date().toISOString().slice(0, 10)}
              </div>
              <button type="button" onClick={save} className="btn btn-ghost h-11 px-4 text-[13px]">
                {justSaved ? "Saved ✓" : "Save analysis"}
              </button>
            </div>

            <HonestyNote tone="myth">
              A four-digit draw has 10,000 equally likely outcomes, and every draw is independent of
              the ones before it. These five rank highly against the historical features listed
              above — that is all. They are not due, not favoured, and not more likely than any
              other combination, including 0000.
            </HonestyNote>
          </div>
        )}
      </section>

      <SavedAnalyses
        saved={saved}
        index={index}
        scope={scope}
        filter={filter}
        onRestore={onRestore}
        onDelete={(id) => {
          deleteAnalysis(id);
          setSaved(listAnalyses());
        }}
      />
    </div>
  );
}

function UniverseFigures({ index }: { index: ComboIndex | null }) {
  const dist = index?.distribution();
  const rows: [string, string][] = [
    ["10,000 possible sets", "the fixed universe"],
    ["Seen historically", dist ? dist.seen.toLocaleString() : "—"],
    ["Never seen", dist ? dist.neverSeen.toLocaleString() : "—"],
    ["Total draws", index ? index.totalDraws.toLocaleString() : "—"],
    ["Most common hit count", dist ? `${dist.modeCount}` : "—"],
    ["Average hits per combination", dist ? dist.meanCount.toFixed(2) : "—"],
    ["Median hits", dist ? dist.medianCount.toFixed(1) : "—"],
    ["Maximum hits", dist ? dist.maxCount.toLocaleString() : "—"],
  ];
  return (
    <details className="mt-4 group">
      <summary className="cursor-pointer list-none text-[12px] text-dim hover:text-text transition-colors min-h-11 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.16em] font-mono">
          Figures behind this graphic
        </span>
        <span aria-hidden className="group-open:hidden">▼</span>
        <span aria-hidden className="hidden group-open:inline">▲</span>
      </summary>
      <dl className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
        {rows.slice(1).map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] uppercase tracking-[0.14em] font-mono text-dim">{label}</dt>
            <dd className="mt-0.5 text-[15px] tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function FeatureBars({ features }: { features: Record<string, number> }) {
  return (
    <dl className="mt-3 space-y-1">
      {(Object.keys(WEIGHT_LABELS) as (keyof typeof WEIGHT_LABELS)[]).map((key) => (
        <div key={key} className="flex items-center gap-2">
          <dt className="w-[92px] shrink-0 truncate text-[10px] text-dim" title={WEIGHT_LABELS[key]}>
            {WEIGHT_LABELS[key]}
          </dt>
          <dd className="flex-1">
            <span className="block h-1 rounded-pill bg-white/[0.05]">
              <span
                className="block h-1 rounded-pill bg-accent"
                style={{ width: `${Math.round(Math.min(1, features[key] ?? 0) * 100)}%` }}
              />
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Last50({
  index,
  window50,
  onSelect,
}: {
  index: ComboIndex | null;
  window50: ReturnType<typeof analyzeWindow> | null;
  onSelect: (combo: number) => void;
}) {
  if (!index || !window50) {
    return (
      <section className="panel p-6 text-center text-[13px] text-dim">Loading draw history…</section>
    );
  }
  if (window50.analysed === 0) {
    return (
      <section className="panel p-6 text-[13px] text-dim">
        No draws match this selection, so there is no recent window to analyse.
      </section>
    );
  }

  const chronological = [...window50.draws].reverse();
  const maxDigit = Math.max(...window50.digitTotals);
  const repeats = window50.repeatedCombos.reduce((sum, r) => sum + r.count - 1, 0);
  const meanInterval = window50.repeatIntervals.length
    ? (
        window50.repeatIntervals.reduce((a, b) => a + b, 0) / window50.repeatIntervals.length
      ).toFixed(1)
    : "—";

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
            Recent activity
          </div>
          <h3 className="mt-1 font-display text-[22px]">
            Last {window50.analysed} draws
          </h3>
        </div>
        <div className="text-[11px] font-mono text-dim">
          {fmtDate(chronological[0]?.date)} → {fmtDate(chronological[chronological.length - 1]?.date)}
        </div>
      </div>

      <ol className="mt-4 flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {chronological.map((d, i) => (
          <li key={`${d.date}-${d.stream}-${i}`} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(d.combo)}
              title={`${d.date} · ${streamLabel(d.stream)}`}
              className="flex min-h-11 flex-col items-center gap-1 rounded-sm border border-edge px-2 py-1.5 hover:border-accent/50 transition-colors"
            >
              <span className="font-mono tabular-nums text-[13px] tracking-[0.12em]">
                {comboLabel(d.combo)}
              </span>
              <span
                aria-hidden
                className="h-1 w-full rounded-pill"
                style={{ background: tierColor(index.countOf(d.combo)) }}
              />
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Draws analysed" value={window50.analysed.toLocaleString()} />
        <MiniStat label="Unique combinations" value={window50.uniqueCombos.toLocaleString()} />
        <MiniStat label="Repeats in window" value={repeats.toLocaleString()} />
        <MiniStat label="Mean repeat interval" value={meanInterval} />
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-dim">
            Digit frequency by position
          </div>
          <table className="mt-2 w-full text-[11px]">
            <caption className="sr-only">
              How often each digit 0–9 appeared in each of the four positions across the last{" "}
              {window50.analysed} draws
            </caption>
            <thead>
              <tr className="text-dim font-mono">
                <th scope="col" className="w-8 text-left font-normal">Pos</th>
                {Array.from({ length: 10 }, (_, d) => (
                  <th key={d} scope="col" className="font-normal tabular-nums">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {window50.positionDigits.map((counts, p) => {
                const max = Math.max(1, ...counts);
                return (
                  <tr key={p}>
                    <th scope="row" className="text-left font-mono font-normal text-dim">
                      {p + 1}
                    </th>
                    {counts.map((c, d) => (
                      <td key={d} className="p-0.5">
                        <div className="relative h-7 rounded-sm border border-edge/60">
                          <div
                            aria-hidden
                            className="absolute inset-0 rounded-sm bg-accent"
                            style={{ opacity: (c / max) * 0.5 }}
                          />
                          <span className="relative flex h-full items-center justify-center tabular-nums">
                            {c}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-dim">
            Overall digit frequency
          </div>
          <ul className="mt-2 space-y-1.5">
            {window50.digitTotals.map((count, digit) => (
              <li key={digit} className="flex items-center gap-2 text-[11px]">
                <span className="w-3 font-mono tabular-nums text-dim">{digit}</span>
                <span className="relative h-2 flex-1 rounded-pill bg-white/[0.04]">
                  <span
                    className="absolute inset-y-0 left-0 rounded-pill bg-cool"
                    style={{ width: `${(count / Math.max(1, maxDigit)) * 100}%` }}
                  />
                </span>
                <span className="w-7 text-right font-mono tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
          {window50.repeatedCombos.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-dim">
                Repeated in this window
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {window50.repeatedCombos.map((r) => (
                  <button
                    key={r.combo}
                    type="button"
                    onClick={() => onSelect(r.combo)}
                    className="rounded-sm border border-edge px-2 py-1 font-mono text-[11px] tabular-nums hover:border-accent/50 transition-colors"
                  >
                    {comboLabel(r.combo)} ×{r.count}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-inner p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-dim">{label}</div>
      <div className="mt-1 font-display text-[22px] tabular-nums">{value}</div>
    </div>
  );
}

function SavedAnalyses({
  saved,
  index,
  scope,
  filter,
  onRestore,
  onDelete,
}: {
  saved: SavedAnalysis[];
  index: ComboIndex | null;
  scope: ComboScope;
  filter: ComboFilter;
  onRestore: (entry: SavedAnalysis) => void;
  onDelete: (id: string) => void;
}) {
  if (saved.length === 0) return null;

  return (
    <section className="panel p-5 sm:p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
        Recent analyses
      </div>
      <h3 className="mt-1 font-display text-[22px]">Saved on this device</h3>
      <p className="mt-2 text-[12px] text-dim">
        Stored in your browser only — nothing is uploaded. Once the real draw for a scheduled slot
        lands in the data, the set is checked against it automatically.
      </p>

      <ul className="mt-4 space-y-3">
        {saved.map((entry) => {
          const sameScope =
            entry.stream === filter.stream &&
            (entry.from ?? "") === (filter.from ?? "") &&
            (entry.to ?? "") === (filter.to ?? "") &&
            entry.scopeLabel === scopeLabel(scope);
          return (
            <li key={entry.id} className="panel-inner p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-[14px]">{entry.scopeLabel}</div>
                  <div className="font-mono text-[11px] text-dim">
                    {entry.savedAt.slice(0, 10)} · {entry.algorithm} · window{" "}
                    {entry.windowAnalysed} · stream {entry.stream}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!sameScope && (
                    <button
                      type="button"
                      onClick={() => onRestore(entry)}
                      className="text-[11px] font-mono text-accent hover:underline min-h-11"
                    >
                      Load this scope
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(entry.id)}
                    className="text-[11px] font-mono text-dim hover:text-hot transition-colors min-h-11"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                {entry.picks.map((pick, i) => {
                  const status =
                    sameScope && index ? statusOf(pick, index.all()) : ({ state: "unknown" } as const);
                  return (
                    <li key={`${pick.combo}-${i}`} className="rounded-sm border border-edge p-2.5">
                      <div className="font-mono tabular-nums tracking-[0.16em] text-[17px]">
                        {comboLabel(pick.combo)}
                      </div>
                      <div className="mt-1 text-[10px] font-mono text-dim">
                        {pick.slot
                          ? `${pick.slot.date}${pick.slot.stream ? ` · ${streamLabel(pick.slot.stream)}` : ""}`
                          : "no scheduled slot"}
                      </div>
                      <StatusPill status={status} pick={pick.combo} />
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatusPill({
  status,
  pick,
}: {
  status: ReturnType<typeof statusOf> | { state: "unknown" };
  pick: number;
}) {
  if (status.state === "unknown") {
    return (
      <div className="mt-2 text-[10px] uppercase tracking-[0.14em] font-mono text-dim">
        Load scope to check
      </div>
    );
  }
  if (status.state === "no-schedule") {
    return (
      <div className="mt-2 text-[10px] uppercase tracking-[0.14em] font-mono text-dim">
        No schedule
      </div>
    );
  }
  if (status.state === "upcoming") {
    return (
      <div className="mt-2 text-[10px] uppercase tracking-[0.14em] font-mono text-cool">
        Upcoming
      </div>
    );
  }
  const digits = comboDigits(pick);
  return (
    <div className="mt-2">
      <div
        className={`text-[10px] uppercase tracking-[0.14em] font-mono ${
          status.exact ? "text-accent" : "text-dim"
        }`}
      >
        {status.exact ? "Exact match ✓" : "No match"}
      </div>
      <div className="mt-1 flex items-center gap-1">
        {digits.map((d, i) => (
          <span
            key={i}
            className={`inline-flex h-5 w-5 items-center justify-center rounded-sm border font-mono text-[10px] tabular-nums ${
              status.positions[i] ? "border-accent/50 text-accent" : "border-edge text-dim"
            }`}
          >
            {d}
          </span>
        ))}
        <span className="ml-1 text-[10px] font-mono text-dim">
          drew {comboLabel(status.actual)}
        </span>
      </div>
    </div>
  );
}
