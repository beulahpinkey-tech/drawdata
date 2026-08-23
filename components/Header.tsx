"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { GameSwitcher } from "./GameSwitcher";
import { readActiveGame, writeActiveGame, type ActiveGame } from "@/lib/clientState";
import { ALL_GAMES, isPickSlug } from "@/lib/types";

const NAV_FULL = [
  { href: "overview", label: "Overview" },
  { href: "frequency", label: "Frequency" },
  { href: "positional", label: "Positional" },
  { href: "pairs", label: "Pairs", pickOnly: true },
  { href: "gaps", label: "Gaps" },
  { href: "carryover", label: "Carryover", pickOnly: true },
  { href: "streams", label: "Streams", pickOnly: true },
  { href: "coverage", label: "Coverage" },
  { href: "check", label: "Check" },
  { href: "lookup", label: "Lookup", pickOnly: true },
];

// Recognised URL slugs. Hardcoding this list let it fall 15 datasets behind:
// any game missing here parsed as `urlGame = null`, so its per-game tab bar
// (Overview / Frequency / Gaps / ...) silently never rendered.
const GAMES: string[] = ALL_GAMES;

export function Header() {
  const pathname = usePathname() || "/";
  const segments = pathname.split("/").filter(Boolean);
  const urlGame = GAMES.includes(segments[0]) ? (segments[0] as ActiveGame) : null;
  const currentView = segments[1] ?? "overview";

  const [storedGame, setStoredGame] = useState<ActiveGame | null>(null);
  useEffect(() => {
    if (urlGame) {
      setStoredGame(urlGame);
      writeActiveGame(urlGame);
    } else {
      setStoredGame(readActiveGame());
    }
  }, [urlGame]);

  // The "effective" game used for non-game pages (Lab/About) — falls back to last selected.
  const effectiveGame = urlGame ?? storedGame;
  // Build Lab link with ?game= so the Lab respects context.
  const isPick = effectiveGame && isPickSlug(effectiveGame);
  const labHref = isPick
    ? `/lab?game=${effectiveGame}`
    : effectiveGame === "powerball" || effectiveGame === "megamillions"
    ? `/lab?from=${effectiveGame}`
    : "/lab";

  // One definition of the primary nav, shared by the desktop bar and the
  // mobile sheet, so the two can never drift apart.
  const siteLinks = [
    { href: "/explore", label: "Explorer", active: pathname.startsWith("/explore") },
    { href: labHref, label: "Formula Lab", active: pathname.startsWith("/lab") },
    { href: "/patterns", label: "Patterns", active: pathname.startsWith("/patterns") },
    { href: "/draw-machine", label: "Machine", active: pathname.startsWith("/draw-machine") },
    { href: "/odds", label: "Odds", active: pathname.startsWith("/odds") },
    { href: "/contact", label: "Feedback", active: pathname === "/contact" },
    { href: "/about", label: "About", active: pathname === "/about" },
  ];

  const [mobileOpen, setMobileOpen] = useState(false);
  // Close on navigation, otherwise the sheet stays open over the new page.
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Scroll-driven cinematic feedback. Pure visual values, no layout impact.
  const reduce = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const shadow = useTransform(
    scrollY,
    [0, 80],
    [
      "0 0 0 rgba(0,0,0,0)",
      "0 10px 30px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04) inset",
    ],
  );
  const bgAlpha = useTransform(scrollY, [0, 80], [0.55, 0.92]);
  const bg = useTransform(bgAlpha, (a) => `rgba(14, 15, 19, ${a})`);

  return (
    <motion.header
      style={reduce ? undefined : { background: bg, boxShadow: shadow }}
      className="sticky top-0 z-40 backdrop-blur-md border-b border-edge bg-ink/70"
    >
      {/* Cinematic scroll progress — pinned to the very top of the header. */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] bg-accent origin-left"
          style={{ scaleX: scrollYProgress }}
        />
      )}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo />
            <span className="font-display text-[20px] leading-none tracking-tight">
              Draw<span className="text-accent">Data</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <GameSwitcher
              currentGame={urlGame}
              storedGame={storedGame}
              currentView={currentView}
            />
            <nav className="hidden lg:flex items-center gap-1 text-sm text-dim">
              {siteLinks.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    l.active ? "text-accent bg-white/[0.04]" : "hover:text-text"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          {/* Below lg the primary nav is hidden, so without this button the
              Explorer / Lab / Patterns / Machine / Odds pages are simply
              unreachable on a phone or tablet — there was no menu at all. */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="md:hidden">
              <GameSwitcher
                currentGame={urlGame}
                storedGame={storedGame}
                currentView={currentView}
                compact
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-edge text-dim hover:text-text hover:bg-white/[0.04] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                {mobileOpen ? (
                  <>
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </>
                ) : (
                  <>
                    <path d="M3 12h18" />
                    <path d="M3 6h18" />
                    <path d="M3 18h18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile / tablet sheet. Carries BOTH the primary nav and, when a
            game is selected, its analytic views — the per-game tab bar below
            is hidden under md, so those pages had no reachable navigation on
            a phone either. */}
        {mobileOpen && (
          <div id="mobile-menu" className="lg:hidden border-t border-edge py-3">
            <nav className="flex flex-col text-sm">
              {siteLinks.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className={`px-2 py-2.5 rounded-md transition-colors ${
                    l.active ? "text-accent bg-white/[0.04]" : "text-dim hover:text-text"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            {urlGame && (
              <div className="mt-3 border-t border-edge pt-3">
                <p className="px-2 pb-2 text-[11px] uppercase tracking-wider text-dim/70">
                  This game
                </p>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {NAV_FULL.filter((n) => !n.pickOnly || isPickSlug(urlGame!)).map((n) => {
                    const href = `/${urlGame}/${n.href === "overview" ? "" : n.href}`.replace(/\/$/, "");
                    const active = currentView === n.href;
                    return (
                      <Link
                        key={n.href}
                        href={href || `/${urlGame}`}
                        className={`text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
                          active
                            ? "text-accent border-accent/30 bg-accent/[0.06]"
                            : "text-dim border-edge hover:text-text"
                        }`}
                      >
                        {n.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {urlGame && (
          <div className="hidden md:flex h-10 items-center gap-1 overflow-x-auto border-t border-edge -mx-4 px-4 sm:-mx-6 sm:px-6">
            {NAV_FULL.filter((n) => !n.pickOnly || isPickSlug(urlGame!)).map((n) => {
              const href = `/${urlGame}/${n.href === "overview" ? "" : n.href}`.replace(/\/$/, "");
              const active = currentView === n.href;
              return (
                <Link
                  key={n.href}
                  href={href || `/${urlGame}`}
                  className={`relative text-[13px] px-3 py-1 rounded-full transition-colors whitespace-nowrap ${
                    active ? "text-accent" : "text-dim hover:text-text"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="active-tab"
                      className="absolute inset-0 rounded-full border border-accent/30 bg-accent/[0.06]"
                      transition={{ type: "spring", bounce: 0.4, duration: 0.7 }}
                    />
                  )}
                  <span className="relative z-10">{n.label}</span>
                </Link>
              );
            })}
            <span className="mx-2 h-4 w-px bg-edge" />
            <Link
              href={labHref}
              className="text-[13px] px-3 py-1 rounded-full text-dim hover:text-text whitespace-nowrap"
            >
              Formula Lab
            </Link>
          </div>
        )}
      </div>
    </motion.header>
  );
}

function Logo() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-accent"
    >
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  );
}
