"use client";

/**
 * PanelRevealObserver — site-wide scroll reveal for every .panel.
 *
 * Mounted once in the root layout. Marks <html> with `fx-ready`
 * (turning on the hidden initial state in tokens.css), then watches
 * every .panel with an IntersectionObserver and stamps `.panel-in`
 * the first time it enters the viewport. A MutationObserver re-scans
 * for panels added later — route changes, lazy-mounted views, modals —
 * so the effect follows the user across Frequency / Positional / Gaps /
 * Coverage / Check / everywhere, in every browser.
 *
 * Why not CSS animation-timeline: only the newest Chrome supports it;
 * the user sees nothing in other browsers. IO works everywhere Next
 * runs.
 *
 * Safety: the hidden state is gated on html.fx-ready, so if this
 * component never runs (no JS, crash), panels render fully visible.
 * prefers-reduced-motion: we never add fx-ready — CSS state stays
 * inert and panels are static.
 */

import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";

export function PanelRevealObserver() {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const root = document.documentElement;
    root.classList.add("fx-ready");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("panel-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );

    const scan = () => {
      document
        .querySelectorAll<HTMLElement>(".panel:not(.panel-in):not([data-fx-seen])")
        .forEach((el) => {
          el.dataset.fxSeen = "1";
          io.observe(el);
        });
    };

    scan();
    // Catch panels mounted after this effect: route changes, lazy
    // views, dialogs. Debounced through rAF so bursts of DOM writes
    // cost one scan.
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
      root.classList.remove("fx-ready");
    };
  }, [reduce]);

  return null;
}
