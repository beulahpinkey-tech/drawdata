"use client";

/**
 * The analysis card for whatever combination is selected: the headline
 * count, the six descriptive stats around it, the full occurrence list,
 * and the cross-state comparison.
 *
 * Every number here is a count of things that happened. The wording is
 * held to that — "historical hits", "last seen", "draw share" — and the
 * tooltip under the headline says outright that none of it moves the odds
 * of the next draw.
 */

import { useMemo, useState } from "react";
import { CountUp } from "@/components/motion/primitives";
import { HonestyNote } from "@/components/HonestyNote";
import { NumberBall } from "@/components/NumberBall";
import { comboDigits, comboLabel } from "@/lib/combos/universe";
import type { ComboFilter, ComboIndex } from "@/lib/combos/index-build";
import { useCrossStateCounts } from "@/lib/hooks/useComboIndex";
import { comboGame, scopeLabel, type ComboScope } from "@/lib/combos/games";
import { fmtDate, fmtDateShort, fmtPercent, streamLabel, TIER_TEXT, TIER_VAR } from "./tiers";
import { tierOf } from "@/lib/combos/index-build";

const DESCRIPTIVE_NOTE =
  "Historical patterns describe previous draws and do not change the theoretical odds of an independent future draw.";

export function ComboAnalysis({
  index,
  combo,
  scope,
  filter,
  loading,
}: {
  index: ComboIndex | null;
  combo: number;
  scope: ComboScope;
  filter: ComboFilter;
  loading: boolean;
}) {
  const stats = index?.stats(combo) ?? null;
  const label = comboLabel(combo);
  const digits = comboDigits(combo);

  return (
    <div className="space-y-4">
      <div className="panel p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
            Selected combination
          </div>
          <span
            className="mt-0.5 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-mono text-dim"
            title={DESCRIPTIVE_NOTE}
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: TIER_VAR[tierOf(stats?.count ?? 0)] }}
            />
            {TIER_TEXT[tierOf(stats?.count ?? 0)]}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 sm:gap-2.5" aria-hidden>
          {digits.map((d, i) => (
            <NumberBall key={i} value={d} variant="digit" size="lg" />
          ))}
        </div>
        <div className="sr-only" aria-live="polite">
          Combination {label.split("").join(" ")} selected.{" "}
          {stats ? `${stats.count} historical ${stats.count === 1 ? "occurrence" : "occurrences"}.` : ""}
        </div>

        <div className="mt-5 border-t border-edge pt-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
            Historical hits
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-[46px] leading-none tabular-nums text-accent">
              {loading || !stats ? "—" : <CountUp value={stats.count} />}
            </span>
            <span className="text-[12px] text-dim">
              in {scopeLabel(scope)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-dim leading-relaxed">{DESCRIPTIVE_NOTE}</p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-edge pt-4">
          <Field label="First seen" value={fmtDate(stats?.firstSeen)} />
          <Field label="Last seen" value={fmtDate(stats?.lastSeen)} />
          <Field
            label="Draws since"
            value={stats?.drawsSince != null ? stats.drawsSince.toLocaleString() : "—"}
          />
          <Field
            label="Frequency"
            value={
              index
                ? `${(stats?.count ?? 0).toLocaleString()} / ${index.totalDraws.toLocaleString()}`
                : "—"
            }
          />
          <Field label="Draw share" value={stats ? fmtPercent(stats.share) : "—"} />
          <Field
            label="Period"
            value={
              index?.earliest && index?.latest
                ? `${index.earliest.slice(0, 4)}–${index.latest.slice(0, 4)}`
                : "—"
            }
          />
        </dl>
      </div>

      <HitHistory index={index} combo={combo} />
      <CrossState combo={combo} filter={filter} scope={scope} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.16em] font-mono text-dim">{label}</dt>
      <dd className="mt-1 text-[15px] tabular-nums">{value}</dd>
    </div>
  );
}

function HitHistory({ index, combo }: { index: ComboIndex | null; combo: number }) {
  const [open, setOpen] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const occurrences = useMemo(() => {
    if (!index || !open) return [];
    const list = index.occurrences(combo);
    return newestFirst ? list : [...list].reverse();
  }, [index, combo, open, newestFirst]);

  const count = index?.countOf(combo) ?? 0;

  return (
    <div className="panel p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left min-h-11"
      >
        <span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono block">
            Occurrences
          </span>
          <span className="text-[15px]">View hit history</span>
        </span>
        <span className="text-[12px] font-mono text-dim">
          {count} {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="mt-4 border-t border-edge pt-3">
          {count === 0 ? (
            <p className="text-[13px] text-dim">
              {comboLabel(combo)} has not been drawn in this selection. That is unremarkable — most
              combinations go long stretches without appearing.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.16em] font-mono text-dim">
                  {comboLabel(combo)} · {count} {count === 1 ? "occurrence" : "occurrences"}
                </div>
                <button
                  type="button"
                  onClick={() => setNewestFirst((v) => !v)}
                  className="text-[11px] font-mono text-dim hover:text-text transition-colors min-h-11 px-1"
                >
                  {newestFirst ? "Newest first" : "Oldest first"} ⇅
                </button>
              </div>
              <div className="mt-2 max-h-72 overflow-y-auto">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-panel">
                    <tr className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono">
                      <th scope="col" className="text-left py-2 font-normal">Date</th>
                      <th scope="col" className="text-left py-2 font-normal">State</th>
                      <th scope="col" className="text-left py-2 font-normal">Draw</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums">
                    {occurrences.map((o, i) => (
                      <tr key={`${o.date}-${o.game}-${i}`} className="border-t border-edge/40">
                        <td className="py-1.5">{fmtDateShort(o.date)}</td>
                        <td className="py-1.5 uppercase text-dim">
                          {comboGame(o.game)?.state ?? "—"}
                        </td>
                        <td className="py-1.5 text-dim">{streamLabel(o.stream)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CrossState({
  combo,
  filter,
  scope,
}: {
  combo: number;
  filter: ComboFilter;
  scope: ComboScope;
}) {
  const [open, setOpen] = useState(false);
  const [sortByCount, setSortByCount] = useState(true);
  const { rows, loading, progress } = useCrossStateCounts(combo, filter, open);

  const sorted = useMemo(() => {
    const list = rows.map((r) => ({
      ...r,
      meta: comboGame(r.game),
    }));
    return list.sort((a, b) =>
      sortByCount
        ? b.count - a.count || (a.meta?.stateLabel ?? "").localeCompare(b.meta?.stateLabel ?? "")
        : (a.meta?.stateLabel ?? "").localeCompare(b.meta?.stateLabel ?? ""),
    );
  }, [rows, sortByCount]);

  const max = Math.max(1, ...sorted.map((r) => r.count));

  return (
    <div className="panel p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left min-h-11"
      >
        <span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono block">
            Cross-state
          </span>
          <span className="text-[15px]">Compare across states</span>
        </span>
        <span className="text-[12px] font-mono text-dim">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-4 border-t border-edge pt-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-dim">
              {comboLabel(combo)} across every four-digit game on the site
              {filter.stream !== "all" ? `, ${filter.stream} draws only` : ""}.
            </p>
            <button
              type="button"
              onClick={() => setSortByCount((v) => !v)}
              className="shrink-0 text-[11px] font-mono text-dim hover:text-text transition-colors min-h-11 px-1"
            >
              {sortByCount ? "By count" : "By state"} ⇅
            </button>
          </div>

          {loading && (
            <p className="mt-3 text-[12px] text-dim" role="status">
              Loading state histories… {Math.round(progress * 100)}%
            </p>
          )}

          <ul className="mt-3 space-y-1.5">
            {sorted.map((r) => (
              <li key={r.game} className="flex items-center gap-3 text-[12px]">
                <span className="w-28 shrink-0 truncate text-fg-secondary">
                  {r.meta?.stateLabel ?? r.game}
                </span>
                <span className="relative h-2 flex-1 rounded-pill bg-white/[0.04]">
                  <span
                    className="absolute inset-y-0 left-0 rounded-pill"
                    style={{
                      width: `${(r.count / max) * 100}%`,
                      background: r.game === scope ? "var(--accent-500)" : "var(--accent-800)",
                    }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right font-mono tabular-nums">{r.count}</span>
              </li>
            ))}
          </ul>

          {!loading && sorted.length > 0 && (
            <div className="mt-4">
              <HonestyNote>
                States have wildly different history lengths — Massachusetts goes back to 1976,
                Maryland to 2026 — so a bigger count usually means a longer record, not a
                friendlier combination.
              </HonestyNote>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TierLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-dim">
        Historical hits
      </span>
      {([0, 1, 2, 3, 4] as const).map((tier) => (
        <span key={tier} className="inline-flex items-center gap-1.5 text-[11px] text-dim">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ background: TIER_VAR[tier] }}
          />
          {TIER_TEXT[tier]}
        </span>
      ))}
    </div>
  );
}
