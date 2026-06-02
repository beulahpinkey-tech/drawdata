"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { GameSwitcher } from "./GameSwitcher";
import { readActiveGame, writeActiveGame, type ActiveGame } from "@/lib/clientState";

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

const GAMES = ["wi-pick3", "wi-pick4", "pa-pick3", "pa-pick4", "nj-pick3", "nj-pick4", "powerball", "megamillions"];

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
  const isPick = effectiveGame && /^(wi|pa|nj)-pick[34]$/.test(effectiveGame);
  const labHref = isPick
    ? `/lab?game=${effectiveGame}`
    : effectiveGame === "powerball" || effectiveGame === "megamillions"
    ? `/lab?from=${effectiveGame}`
    : "/lab";

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
              <Link
                href={labHref}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  pathname.startsWith("/lab")
                    ? "text-accent bg-white/[0.04]"
                    : "hover:text-text"
                }`}
              >
                Formula Lab
              </Link>
              <Link
                href="/contact"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  pathname === "/contact"
                    ? "text-text bg-white/[0.04]"
                    : "hover:text-text"
                }`}
              >
                Feedback
              </Link>
              <Link
                href="/about"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  pathname === "/about"
                    ? "text-text bg-white/[0.04]"
                    : "hover:text-text"
                }`}
              >
                About
              </Link>
            </nav>
          </div>
          <div className="md:hidden">
            <GameSwitcher
              currentGame={urlGame}
              storedGame={storedGame}
              currentView={currentView}
              compact
            />
          </div>
        </div>
        {urlGame && (
          <div className="hidden md:flex h-10 items-center gap-1 overflow-x-auto border-t border-edge -mx-4 px-4 sm:-mx-6 sm:px-6">
            {NAV_FULL.filter((n) => !n.pickOnly || /^(wi|pa|nj)-pick[34]$/.test(urlGame!)).map((n) => {
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
