"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { STATE_GAMES, type StateGame } from "@/lib/states";
import { WaitlistModal } from "@/components/WaitlistModal";
import { writeActiveGame } from "@/lib/clientState";
import { StaggerGroup, StaggerItem } from "@/components/motion/primitives";

const spring = { type: "spring" as const, bounce: 0.4, duration: 0.7 };

const NATIONAL: { id: "powerball" | "megamillions"; label: string; tag: string }[] = [
  { id: "powerball", label: "Powerball", tag: "5/69 + 1/26 · multi-state" },
  { id: "megamillions", label: "Mega Millions", tag: "5/70 + 1/24 · multi-state" },
];

export function PickerView() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [waitlistState, setWaitlistState] = useState<StateGame | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATE_GAMES;
    return STATE_GAMES.filter(
      (s) =>
        s.state.toLowerCase().includes(q) ||
        s.abbr.toLowerCase() === q ||
        s.pick3Name.toLowerCase().includes(q) ||
        (s.pick4Name ?? "").toLowerCase().includes(q),
    );
  }, [query]);

  const enterNational = (id: "powerball" | "megamillions") => {
    writeActiveGame(id);
    router.push(`/${id}`);
  };

  const handleStateClick = (s: StateGame) => {
    if (s.status === "available") {
      const slug =
        s.abbr === "WI" ? "wi-pick3" : s.abbr === "PA" ? "pa-pick3" : null;
      if (slug) {
        writeActiveGame(slug as any);
        router.push(`/${slug}`);
        return;
      }
    }
    setWaitlistState(s);
  };

  return (
    <>
      <section>
        <div className="text-[10px] uppercase tracking-[0.2em] text-cool font-mono mb-3">National games · always available</div>
        <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NATIONAL.map((g) => (
            <StaggerItem key={g.id}>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => enterNational(g.id)}
                className="panel p-6 text-left group hover:border-accent/40 transition-colors w-full h-full"
              >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-[26px]">{g.label}</div>
                  <div className="text-[12px] text-dim font-mono mt-1">{g.tag}</div>
                </div>
                <div className="text-accent">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M5 11h12m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
                <p className="mt-4 text-[13px] text-dim">
                  Explore the history of {g.label}. Multi-state game — same numbers everywhere.
                </p>
              </motion.button>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-accent font-mono">State daily games · Pick 3 / Pick 4</div>
            <p className="text-[12px] text-dim mt-1 max-w-xl">
              Each state runs its own daily 3- or 4-digit game. Only Wisconsin&rsquo;s history is loaded today —
              tap any other state to join its waitlist.
            </p>
          </div>
          <label className="block w-full sm:w-72">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search state or game name…"
              className="w-full rounded-md border border-edge bg-panel2 px-3 py-2 text-[14px] focus:outline-none focus:border-accent"
            />
          </label>
        </div>

        <StaggerGroup
          intensity="fast"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
        >
          {filtered.map((s) => (
            <StaggerItem key={s.abbr}>
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => handleStateClick(s)}
                className={`text-left panel-inner p-4 transition-colors w-full h-full ${
                  s.status === "available"
                    ? "hover:bg-accent/[0.06] hover:border-accent/40 border-cool/30"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-[15px] font-medium">{s.state}</div>
                  <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-dim">{s.abbr}</div>
                </div>
                <div className="mt-1.5 text-[12px] font-mono text-dim">
                  {s.pick3Name}{s.pick4Name ? ` · ${s.pick4Name}` : ""}
                </div>
                <div className="mt-3">
                  {s.status === "available" ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-cool font-mono uppercase tracking-[0.14em]">
                      <span className="h-1.5 w-1.5 rounded-full bg-cool" /> available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-dim font-mono uppercase tracking-[0.14em]">
                      <span className="h-1.5 w-1.5 rounded-full bg-dim" /> waitlist
                    </span>
                  )}
                </div>
              </motion.button>
            </StaggerItem>
          ))}
        </StaggerGroup>
        {filtered.length === 0 && (
          <div className="panel-inner p-6 text-center text-dim text-[13px] mt-4">
            No matches. Try another spelling, or use the state abbreviation.
          </div>
        )}
      </section>

      <p className="text-[11px] text-dim text-center">
        DrawData describes past results only. It does not predict future numbers or improve your odds.
      </p>

      <WaitlistModal
        open={!!waitlistState}
        state={waitlistState ? { state: waitlistState.state, abbr: waitlistState.abbr } : null}
        onClose={() => setWaitlistState(null)}
      />
    </>
  );
}
