"use client";

/**
 * The 10,000 Combination Explorer.
 *
 * Layout follows the site's existing tool pages: filters on top, a
 * 60/40 split below on desktop (reel left, analysis right and sticky),
 * and a single stacked column on phones in the order someone actually
 * uses it — pick a state, dial a number, read the card, go deeper.
 *
 * State lives in the URL (?g, ?s, ?from, ?to, ?n, ?deep) exactly as
 * /explore does it, so any view is a shareable link and a reload keeps
 * your place. The reel's live position is separate from the committed
 * selection: scrolling re-renders rows, but the analysis card and the URL
 * only update once the reel settles.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HonestyNote } from "@/components/HonestyNote";
import { track } from "@/lib/analytics";
import { COMBO_UNIVERSE, comboLabel, parseCombo } from "@/lib/combos/universe";
import type { ComboFilter, StreamFilter } from "@/lib/combos/index-build";
import { useComboIndex } from "@/lib/hooks/useComboIndex";
import {
  ALL_STATES,
  COMBO_GAMES,
  comboGame,
  DEFAULT_COMBO_GAME,
  scopeDrawCount,
  scopeLabel,
  scopeStreams,
  type ComboScope,
} from "@/lib/combos/games";
import type { SavedAnalysis } from "@/lib/combos/storage";
import { ComboReel } from "@/components/combinations/ComboReel";
import { ScopeControls } from "@/components/combinations/ScopeControls";
import { ComboSearch, DigitReels } from "@/components/combinations/DigitReels";
import { ComboAnalysis, TierLegend } from "@/components/combinations/ComboAnalysis";
import { DeepMode } from "@/components/combinations/DeepMode";

const VALID_SCOPES = new Set<string>([...COMBO_GAMES.map((g) => g.game), ALL_STATES]);

export function CombinationExplorer() {
  const router = useRouter();
  const sp = useSearchParams();
  const reduce = useReducedMotion();

  const scope = (VALID_SCOPES.has(sp.get("g") ?? "") ? sp.get("g") : DEFAULT_COMBO_GAME) as ComboScope;
  const streamParam = sp.get("s") ?? "all";
  const stream = (
    streamParam === "all" || scopeStreams(scope).includes(streamParam as never)
      ? streamParam
      : "all"
  ) as StreamFilter;
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const deep = sp.get("deep") === "1";
  const urlCombo = parseCombo(sp.get("n") ?? "");

  // `active` tracks the reel while it moves; `selected` is what the rest of
  // the page analyses. They differ only during a flick.
  const [selected, setSelected] = useState(urlCombo ?? 0);
  const [active, setActive] = useState(urlCombo ?? 0);

  const filter = useMemo<ComboFilter>(() => ({ stream, from, to }), [stream, from, to]);

  // A 440px reel eats half a phone screen. Start at the desktop height so
  // server and client render the same markup, then measure.
  const [reelHeight, setReelHeight] = useState(440);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setReelHeight(mq.matches ? 308 : 440);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const { index, loading, progress, error } = useComboIndex(scope, filter);

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      router.replace(`/combinations?${next.toString()}`, { scroll: false });
    },
    [router, sp],
  );

  // A settled reel writes the combination back to the URL.
  const commit = useCallback(
    (combo: number) => {
      setSelected(combo);
      if ((sp.get("n") ?? "") !== comboLabel(combo)) setParams({ n: comboLabel(combo) });
    },
    [setParams, sp],
  );

  // Selection driven from elsewhere: digit reels, search, universe, saved sets.
  const selectCombo = useCallback(
    (combo: number) => {
      const clamped = Math.max(0, Math.min(COMBO_UNIVERSE - 1, Math.round(combo)));
      setActive(clamped);
      commit(clamped);
    },
    [commit],
  );

  // An inbound URL (shared link, back button) wins over local state.
  useEffect(() => {
    if (urlCombo != null && urlCombo !== selected) {
      setSelected(urlCombo);
      setActive(urlCombo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCombo]);

  const onScope = (next: ComboScope) => {
    track("Combination Scope", { scope: String(next) });
    // Streams differ between states; drop one the new scope doesn't run.
    const keepStream = stream === "all" || scopeStreams(next).includes(stream as never);
    setParams({ g: next, s: keepStream ? (stream === "all" ? null : stream) : null });
  };

  const onRestore = (entry: SavedAnalysis) => {
    const target = COMBO_GAMES.find((g) => entry.scopeLabel === `${g.stateLabel} ${g.gameLabel}`);
    setParams({
      g: target ? target.game : ALL_STATES,
      s: entry.stream === "all" ? null : entry.stream,
      from: entry.from ?? null,
      to: entry.to ?? null,
      n: entry.selectedCombo != null ? comboLabel(entry.selectedCombo) : null,
    });
  };

  const bounds = useMemo(() => {
    const games = scope === ALL_STATES ? COMBO_GAMES : COMBO_GAMES.filter((g) => g.game === scope);
    if (games.length === 0) return null;
    return {
      earliest: games.reduce((a, g) => (g.earliest < a ? g.earliest : a), games[0].earliest),
      latest: games.reduce((a, g) => (g.latest > a ? g.latest : a), games[0].latest),
    };
  }, [scope]);

  const emptySelection = !loading && index !== null && index.totalDraws === 0;

  return (
    <div className="space-y-6">
      <ScopeControls
        scope={scope}
        stream={stream}
        from={from}
        to={to}
        bounds={bounds}
        onScope={onScope}
        onStream={(s) => setParams({ s: s === "all" ? null : s })}
        onRange={(f, t) => setParams({ from: f || null, to: t || null })}
      />

      <ScopeSummary
        scope={scope}
        loading={loading}
        progress={progress}
        error={error}
        totalDraws={index?.totalDraws ?? null}
        earliest={index?.earliest ?? null}
        latest={index?.latest ?? null}
        emptySelection={emptySelection}
      />

      <AnimatePresence mode="wait" initial={false}>
        {deep ? (
          <motion.div
            key="deep"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <DeepMode
              index={index}
              scope={scope}
              filter={filter}
              selected={selected}
              onSelect={selectCombo}
              onRestore={onRestore}
              onBack={() => setParams({ deep: null })}
            />
          </motion.div>
        ) : (
          <motion.div
            key="reel"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {/* One column on a phone, in the order the flow reads: dial a
                number, read the card, then go deeper. On desktop the card
                moves to a sticky right-hand rail and "Go deeper" tucks
                under the reel. */}
            <div className="grid grid-cols-1 lg:grid-cols-[62fr_38fr] lg:grid-rows-[auto_auto] gap-6">
              <div className="space-y-4 lg:col-start-1 lg:row-start-1">
                <div className="panel p-4 sm:p-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
                        Combination reel
                      </div>
                      <h2 className="mt-1 font-display text-[22px] leading-tight">
                        0000 → 9999
                      </h2>
                    </div>
                    <ComboSearch onSubmit={selectCombo} />
                  </div>

                  <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
                    <DigitReels value={active} onChange={selectCombo} />
                    <div className="hidden sm:block">
                      <TierLegend />
                    </div>
                  </div>

                  <div className="mt-5 rounded-md border border-edge bg-[color:var(--bg-base)]/40">
                    <ComboReel
                      index={index}
                      active={active}
                      onActiveChange={setActive}
                      onCommit={commit}
                      height={reelHeight}
                    />
                  </div>

                  <p className="mt-3 text-[11px] text-dim">
                    Scroll, flick or use ↑ ↓, Page Up / Page Down, Home and End. The centred row is
                    the active combination.
                  </p>
                  <div className="mt-3 sm:hidden">
                    <TierLegend />
                  </div>
                </div>
              </div>

              <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
                <div className="lg:sticky lg:top-28">
                  <ComboAnalysis
                    index={index}
                    combo={selected}
                    scope={scope}
                    filter={filter}
                    loading={loading}
                  />
                </div>
              </div>

              <div className="lg:col-start-1 lg:row-start-2">
                <button
                  type="button"
                  onClick={() => {
                    track("Combination Deep Mode", { scope: String(scope) });
                    setParams({ deep: "1" });
                  }}
                  className="group relative w-full overflow-hidden rounded-lg border border-accent/30 bg-gradient-to-br from-accent/[0.12] to-transparent p-5 text-left transition-colors hover:border-accent/60"
                >
                  <span className="text-[11px] uppercase tracking-[0.2em] font-mono text-accent">
                    Go deeper
                  </span>
                  <span className="mt-1 block font-display text-[24px] leading-tight">
                    Explore the full 10,000-combination universe
                  </span>
                  <span className="mt-1 block text-[12px] text-dim">
                    Every combination at once, the last 50 draws in detail, and the exploratory
                    ranking model.
                  </span>
                  <span
                    aria-hidden
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-accent transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </button>
              </div>
            </div>

            <HonestyNote>
              Every figure here counts draws that have already happened. A four-digit game has
              10,000 equally likely outcomes and each draw is independent, so a combination with
              more historical hits is <strong>not</strong> more likely to come up next — and one
              with none is not overdue.
            </HonestyNote>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScopeSummary({
  scope,
  loading,
  progress,
  error,
  totalDraws,
  earliest,
  latest,
  emptySelection,
}: {
  scope: ComboScope;
  loading: boolean;
  progress: number;
  error: string | null;
  totalDraws: number | null;
  earliest: string | null;
  latest: string | null;
  emptySelection: boolean;
}) {
  const expected = scopeDrawCount(scope);
  const game = scope === ALL_STATES ? null : comboGame(scope);

  if (error) {
    return (
      <div className="rounded-lg border border-hot/30 bg-hot/[0.05] p-4 text-[13px]">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-hot">
          Could not load
        </div>
        <p className="mt-1 text-dim">
          {error} The draw history for {scopeLabel(scope)} did not load. Reload the page, or pick
          another state in the meantime.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1 text-[12px]">
      <div className="text-dim">
        <span className="text-text">{scopeLabel(scope)}</span>
        {loading ? (
          <span className="ml-2">
            loading {expected.toLocaleString()} draws
            {scope === ALL_STATES ? ` · ${Math.round(progress * 100)}%` : "…"}
          </span>
        ) : (
          <span className="ml-2 tabular-nums">
            {(totalDraws ?? 0).toLocaleString()} draws
            {earliest && latest ? ` · ${earliest} → ${latest}` : ""}
          </span>
        )}
      </div>
      {emptySelection && (
        <p className="text-hot">
          No draws match this selection. {game ? `${game.stateLabel} has history from ${game.earliest}.` : ""}{" "}
          Widen the date range or choose another draw type.
        </p>
      )}
    </div>
  );
}
