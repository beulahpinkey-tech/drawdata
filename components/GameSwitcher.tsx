"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

type Props = {
  currentGame: string | null;
  storedGame?: string | null;
  currentView?: string;
  compact?: boolean;
};

type GroupKey = "national" | "wi" | "pa" | "nj" | "tx" | "nc" | "fl" | "ga" | "mi" | "ny" | "ca" | "ma" | "co" | "md" | "wa";

const GAMES: { id: string; label: string; tag: string; group: GroupKey }[] = [
  { id: "powerball", label: "Powerball", tag: "5/69 + 1/26", group: "national" },
  { id: "megamillions", label: "Mega Millions", tag: "5/70 + 1/24", group: "national" },
  { id: "wi-pick3", label: "Wisconsin Pick 3", tag: "3-digit", group: "wi" },
  { id: "wi-pick4", label: "Wisconsin Pick 4", tag: "4-digit", group: "wi" },
  { id: "pa-pick3", label: "Pennsylvania Pick 3", tag: "3-digit", group: "pa" },
  { id: "pa-pick4", label: "Pennsylvania Pick 4", tag: "4-digit", group: "pa" },
  { id: "nj-pick3", label: "New Jersey Pick 3", tag: "3-digit", group: "nj" },
  { id: "nj-pick4", label: "New Jersey Pick 4", tag: "4-digit", group: "nj" },
  { id: "tx-pick3", label: "Texas Pick 3", tag: "3-digit", group: "tx" },
  { id: "tx-pick4", label: "Texas Daily 4", tag: "4-digit", group: "tx" },
  { id: "nc-pick3", label: "North Carolina Pick 3", tag: "3-digit", group: "nc" },
  { id: "nc-pick4", label: "North Carolina Pick 4", tag: "4-digit", group: "nc" },
  { id: "fl-pick3", label: "Florida Pick 3", tag: "3-digit", group: "fl" },
  { id: "fl-pick4", label: "Florida Pick 4", tag: "4-digit", group: "fl" },
  { id: "ga-pick3", label: "Georgia Cash 3", tag: "3-digit", group: "ga" },
  { id: "ga-pick4", label: "Georgia Cash 4", tag: "4-digit", group: "ga" },
  { id: "mi-pick3", label: "Michigan Daily 3", tag: "3-digit", group: "mi" },
  { id: "mi-pick4", label: "Michigan Daily 4", tag: "4-digit", group: "mi" },
  { id: "ny-pick3", label: "New York Numbers", tag: "3-digit", group: "ny" },
  { id: "ny-pick4", label: "New York Win 4", tag: "4-digit", group: "ny" },
  { id: "ca-pick3", label: "California Daily 3", tag: "3-digit", group: "ca" },
  { id: "ca-pick4", label: "California Daily 4", tag: "4-digit", group: "ca" },
  { id: "ma-pick4", label: "Massachusetts The Numbers Game", tag: "4-digit", group: "ma" },
  { id: "co-pick3", label: "Colorado Pick 3", tag: "3-digit", group: "co" },
  { id: "md-pick3", label: "Maryland Pick 3", tag: "3-digit", group: "md" },
  { id: "md-pick4", label: "Maryland Pick 4", tag: "4-digit", group: "md" },
  { id: "wa-pick3", label: "Washington Daily Game", tag: "3-digit", group: "wa" },
];

const GROUPS: { key: GroupKey; title: string }[] = [
  { key: "national", title: "National games" },
  { key: "wi", title: "Wisconsin" },
  { key: "pa", title: "Pennsylvania" },
  { key: "nj", title: "New Jersey" },
  { key: "tx", title: "Texas" },
  { key: "nc", title: "North Carolina" },
  { key: "fl", title: "Florida" },
  { key: "ga", title: "Georgia" },
  { key: "mi", title: "Michigan" },
  { key: "ny", title: "New York" },
  { key: "ca", title: "California" },
  { key: "ma", title: "Massachusetts" },
  { key: "co", title: "Colorado" },
  { key: "md", title: "Maryland" },
  { key: "wa", title: "Washington" },
];

export function GameSwitcher({ currentGame, storedGame, currentView }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);

  const onGameRoute = !!currentGame;
  const effective = currentGame ?? storedGame ?? null;
  const current = GAMES.find((g) => g.id === effective);
  const dotColor = onGameRoute ? "bg-cool" : current ? "bg-accent/60" : "bg-dim";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Game switcher — current: ${current?.label ?? "none"}`}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-edge bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-sm"
      >
        <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden />
        <span className="font-medium">
          {current ? current.label : "Choose a game"}
        </span>
        {current && (
          <span className="text-[10px] uppercase tracking-[0.15em] text-cool font-mono ml-1">
            change
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-dim">
          <path d="M2 4l3 3 3-3" stroke="currentColor" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 panel p-1 z-30 max-h-[70vh] overflow-y-auto overscroll-contain">
          {GROUPS.map((grp, i) => {
            const items = GAMES.filter((g) => g.group === grp.key);
            if (items.length === 0) return null;
            return (
              <div key={grp.key}>
                {i > 0 && <div className="my-1 h-px bg-edge" />}
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-dim font-mono">{grp.title}</div>
                {items.map((g) => (
                  <GameRow
                    key={g.id}
                    g={g}
                    active={g.id === effective}
                    onGameRoute={onGameRoute}
                    currentView={currentView}
                    onSelect={() => setOpen(false)}
                  />
                ))}
              </div>
            );
          })}
          <div className="my-1 h-px bg-edge" />
          <Link
            href="/picker"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-3 py-2 rounded-md text-[13px] text-cool hover:bg-white/[0.04]"
          >
            Change game / state…
            <span className="text-dim">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function GameRow({
  g,
  active,
  onGameRoute,
  currentView,
  onSelect,
}: {
  g: { id: string; label: string; tag: string };
  active: boolean;
  onGameRoute: boolean;
  currentView?: string;
  onSelect: () => void;
}) {
  const view = currentView && currentView !== "overview" ? `/${currentView}` : "";
  const href = `/${g.id}${onGameRoute ? view : ""}`;
  return (
    <Link
      href={href}
      onClick={onSelect}
      className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
        active ? "bg-white/[0.05] text-accent" : "hover:bg-white/[0.04]"
      }`}
    >
      <div>
        <div className="text-[14px] leading-tight">{g.label}</div>
        <div className="text-[11px] text-dim font-mono">{g.tag}</div>
      </div>
      {active && (
        <span className="text-[10px] uppercase tracking-wider text-dim">
          {onGameRoute ? "current" : "last"}
        </span>
      )}
    </Link>
  );
}
