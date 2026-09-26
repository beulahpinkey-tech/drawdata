"use client";

/**
 * The combination reel — all 10,000 outcomes on one vertical track.
 *
 * Virtualisation without a new dependency: the scroller holds a spacer of
 * 10,000 × ROW pixels and renders only the ~25 rows around the centre.
 * Snapping, momentum and touch flick are the browser's native scroll-snap,
 * which costs nothing, behaves correctly on iOS, and keeps the whole thing
 * usable with the scrollbar alone.
 *
 * Because row i's centre sits exactly at scrollTop = i × ROW (the track is
 * padded by half a viewport at each end), the active combination is a
 * division, not a search — no layout reads per frame.
 *
 * Depth is deliberately restrained: opacity and a little scale by distance
 * from centre. No perspective transforms, no blur on the active row, and
 * none of it under prefers-reduced-motion.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { COMBO_UNIVERSE, comboLabel } from "@/lib/combos/universe";
import type { ComboIndex } from "@/lib/combos/index-build";
import { comboAnnouncement, tierColor } from "./tiers";

const ROW = 44;
const OVERSCAN = 6;

export function ComboReel({
  index,
  active,
  onActiveChange,
  onCommit,
  height = 440,
}: {
  index: ComboIndex | null;
  /** The combination the reel should be showing. */
  active: number;
  /** Fires continuously while scrolling. */
  onActiveChange: (combo: number) => void;
  /** Fires once the reel settles — the expensive consumers listen to this. */
  onCommit: (combo: number) => void;
  height?: number;
}) {
  const reduce = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const [centre, setCentre] = useState(active);
  // Fractional position drives the depth ramp between rows.
  const [offset, setOffset] = useState(0);
  // Snapping is suspended during a jump — see the jump effect below.
  const [snapping, setSnapping] = useState(true);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Index a programmatic scroll is heading for, or null for a user scroll.
  // Without this the intermediate frames of a smooth scrollTo would be
  // reported as selections, the parent would push `active` back to
  // wherever the animation happened to be, and a jump to 0042 would die a
  // few rows from where it started.
  const programmatic = useRef<number | null>(null);

  const pad = (height - ROW) / 2;

  // The parent's callbacks change identity whenever the URL does (they
  // close over the search params). Holding them in refs keeps the scroll
  // handler and the jump effect stable — otherwise every committed
  // selection re-ran the effect and cancelled its own safety timer,
  // stranding the reel in "programmatic" mode where user scrolls stopped
  // propagating.
  const activeChangeRef = useRef(onActiveChange);
  const commitRef = useRef(onCommit);
  activeChangeRef.current = onActiveChange;
  commitRef.current = onCommit;

  const readScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const exact = el.scrollTop / ROW;
    const nearest = Math.max(0, Math.min(COMBO_UNIVERSE - 1, Math.round(exact)));
    setCentre(nearest);
    setOffset(exact - nearest);
    // Mid-animation frames of a programmatic jump are not selections.
    if (programmatic.current === null) activeChangeRef.current(nearest);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const landed = programmatic.current ?? nearest;
      programmatic.current = null;
      setSnapping(true);
      activeChangeRef.current(landed);
      commitRef.current(landed);
    }, 140);
  }, []);

  // Scroll events are already frame-throttled by the browser, and the work
  // here is a division plus two setStates — so no requestAnimationFrame
  // wrapper, which would silently stop updating in a backgrounded tab.
  const onScroll = readScroll;

  // Drive the reel from outside (digit reels, search, the universe view).
  //
  // What makes a jump non-obvious: mandatory scroll-snap only knows about
  // snap areas that are IN THE DOM, and virtualisation means the
  // destination row usually isn't — so a raw scrollTo gets clamped back to
  // the last rendered row. So snapping is suspended for the jump and
  // resumed once the reel has landed.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const target = active * ROW;
    if (Math.abs(el.scrollTop - target) < 1) {
      // Already parked here (e.g. the effect re-ran after a commit).
      // Leaving `programmatic` set would mute every later user scroll.
      if (programmatic.current !== null) {
        programmatic.current = null;
        setSnapping(true);
      }
      return;
    }
    programmatic.current = active;
    // Suspend snapping on the element immediately — waiting for React to
    // re-render with the new style loses the race against the scroll, and
    // a mandatory snap with no nearby snap area simply refuses to move.
    el.style.scrollSnapType = "none";
    setSnapping(false);
    setCentre(active);
    setOffset(0);
    // Smooth-scrolling thousands of rows is neither fast nor legible, so
    // long jumps land instantly and short ones glide.
    const far = Math.abs(el.scrollTop - target) > ROW * 40;
    // Scroll synchronously rather than waiting for a frame: requestAnimationFrame
    // is throttled in a hidden or backgrounded tab, and a reel that silently
    // stops following the URL there would be a real bug, not a cosmetic one.
    el.scrollTo({ top: target, behavior: reduce || far ? "auto" : "smooth" });
    // Self-healing finish. An instant jump can produce no scroll event at
    // all, and a smooth one does not animate in a backgrounded tab — in
    // both cases nothing else would re-enable snapping, and in the second
    // the reel would be left pointing at the wrong row. So: land it.
    const safety = setTimeout(() => {
      if (programmatic.current !== active) return;
      if (Math.abs(el.scrollTop - target) >= 1) el.scrollTo({ top: target, behavior: "auto" });
      programmatic.current = null;
      setSnapping(true);
      commitRef.current(active);
    }, 600);
    return () => clearTimeout(safety);
  }, [active, reduce]);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  // Keyboard moves hand the new index to the parent and let the jump effect
  // below do the scrolling, so every programmatic move — key, search box,
  // digit reel, universe click — travels exactly one code path.
  const jump = useCallback(
    (delta: number) => {
      activeChangeRef.current(Math.max(0, Math.min(COMBO_UNIVERSE - 1, centre + delta)));
    },
    [centre],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowUp: -1,
      ArrowDown: 1,
      PageUp: -10,
      PageDown: 10,
    };
    if (e.key in moves) {
      e.preventDefault();
      jump(moves[e.key]);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      activeChangeRef.current(0);
    } else if (e.key === "End") {
      e.preventDefault();
      activeChangeRef.current(COMBO_UNIVERSE - 1);
    }
  };

  const rows = useMemo(() => {
    const visible = Math.ceil(height / ROW) + OVERSCAN * 2;
    const start = Math.max(0, centre - Math.floor(visible / 2));
    const end = Math.min(COMBO_UNIVERSE - 1, start + visible);
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  }, [centre, height]);

  return (
    <div className="relative">
      {/* The selection window — a fixed centre band the reel moves through. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 z-20"
        style={{ top: pad, height: ROW }}
      >
        <div className="absolute inset-x-3 top-0 h-px bg-accent/50" />
        <div className="absolute inset-x-3 bottom-0 h-px bg-accent/50" />
        <div className="absolute inset-x-3 inset-y-0 rounded-sm bg-accent/[0.05]" />
      </div>
      {/* Top and bottom fades, so the track reads as continuous. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[color:var(--bg-elevated)] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-[color:var(--bg-elevated)] to-transparent"
      />

      <div
        ref={scroller}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="listbox"
        aria-label="Combination reel, 0000 to 9999"
        aria-activedescendant={`combo-row-${centre}`}
        className="relative overflow-y-auto overscroll-contain outline-none focus-visible:ring-1 focus-visible:ring-accent/60 rounded-md"
        style={{
          height,
          scrollSnapType: reduce || !snapping ? "none" : "y mandatory",
          // Momentum scrolling on iOS; the reel is meant to be flicked.
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ height: COMBO_UNIVERSE * ROW + (height - ROW), position: "relative" }}>
          {rows.map((i) => {
            const distance = i - centre - offset;
            const abs = Math.abs(distance);
            const count = index?.countOf(i) ?? 0;
            const isActive = i === centre;
            const depth = reduce
              ? { opacity: 1, transform: "none" }
              : {
                  opacity: Math.max(0.18, 1 - abs * 0.17),
                  transform: `scale(${Math.max(0.86, 1 - abs * 0.035)})`,
                };
            return (
              <div
                key={i}
                id={`combo-row-${i}`}
                role="option"
                aria-selected={isActive}
                aria-label={comboAnnouncement(comboLabel(i), count)}
                onClick={() => scroller.current?.scrollTo({ top: i * ROW, behavior: reduce ? "auto" : "smooth" })}
                className="absolute inset-x-0 flex items-center justify-between px-5 cursor-pointer select-none"
                style={{
                  top: pad + i * ROW,
                  height: ROW,
                  // tokens.css gives every element with an id a 7rem
                  // scroll-margin (for anchor links under the sticky
                  // header). That margin also shifts a snap area's
                  // centre, which would park every row 56px off the
                  // selection window. Rows opt out.
                  scrollMargin: 0,
                  scrollSnapAlign: reduce || !snapping ? undefined : "center",
                  willChange: reduce ? undefined : "opacity, transform",
                  ...depth,
                }}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className={`font-mono tabular-nums tracking-[0.18em] transition-colors ${
                      isActive ? "text-[22px] text-text" : "text-[17px] text-fg-secondary"
                    }`}
                  >
                    {comboLabel(i)}
                  </span>
                  {isActive && (
                    <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-accent">
                      selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono tabular-nums text-dim">
                    {index ? count : "·"}
                  </span>
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: tierColor(count) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
