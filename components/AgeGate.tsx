"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { readActiveGame } from "@/lib/clientState";

const KEY = "drawdata_age_confirmed_v1";
const spring = { type: "spring" as const, bounce: 0.4, duration: 1 };

export function AgeGate() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [state, setState] = useState<"loading" | "needs" | "confirmed" | "declined">("loading");

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "yes") setState("confirmed");
      else setState("needs");
    } catch {
      setState("needs");
    }
  }, []);

  // After confirmation, send first-time visitors to /picker.
  useEffect(() => {
    if (state !== "confirmed") return;
    const onPickerOrPublic =
      pathname.startsWith("/picker") ||
      pathname.startsWith("/about") ||
      pathname.startsWith("/privacy") ||
      pathname.startsWith("/terms") ||
      pathname.startsWith("/contact");
    if (onPickerOrPublic) return;
    if (pathname !== "/") return; // only auto-redirect from the bare home root
    const active = readActiveGame();
    if (!active) router.replace("/picker");
  }, [state, pathname, router]);

  if (state === "loading" || state === "confirmed") return null;

  return (
    <AnimatePresence>
      {state === "declined" && (
        <motion.div
          key="declined"
          className="fixed inset-0 z-[100] grid place-items-center bg-ink/95 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: "blur(5px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(5px)" }}
            transition={spring}
            className="panel p-8 max-w-md w-full text-center"
          >
            <h2 className="font-display text-[26px]">Access not granted</h2>
            <p className="mt-3 text-[14px] text-dim leading-relaxed">
              DrawData displays lottery draw history and is restricted to viewers who are 18 or older.
              Please close this tab if you are under 18.
            </p>
            <button
              onClick={() => setState("needs")}
              className="mt-5 text-[12px] text-dim hover:text-text underline-offset-2 underline"
            >
              ← go back
            </button>
          </motion.div>
        </motion.div>
      )}
      {state === "needs" && (
        <motion.div
          key="needs"
          className="fixed inset-0 z-[100] grid place-items-center bg-ink/85 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8, filter: "blur(5px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, y: 4, filter: "blur(5px)" }}
            transition={spring}
            className="panel p-8 max-w-lg w-full"
          >
            <div className="text-[10px] uppercase tracking-[0.2em] text-cool font-mono">Before you enter</div>
            <h2 className="mt-2 font-display text-[30px] leading-tight">You must be 18 or older.</h2>
            <p className="mt-4 text-[14px] text-dim leading-relaxed">
              DrawData is a descriptive data tool that displays public lottery draw history for analysis
              and entertainment. It is restricted to viewers <span className="text-text">18+</span>.
            </p>
            <ul className="mt-4 space-y-1.5 text-[13px] text-dim">
              <li className="flex items-start gap-2"><span className="text-cool mt-1">●</span><span>No tickets are sold here. No bets are taken. No predictions are made.</span></li>
              <li className="flex items-start gap-2"><span className="text-cool mt-1">●</span><span>Lottery draws are random and independent — this site cannot improve your odds.</span></li>
              <li className="flex items-start gap-2"><span className="text-cool mt-1">●</span><span>By continuing you confirm you are 18+ and accept the standing disclaimer.</span></li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  try {
                    localStorage.setItem(KEY, "yes");
                  } catch {
                    /* ignore */
                  }
                  setState("confirmed");
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-accent text-ink font-medium text-sm hover:bg-accent/90 transition-colors"
              >
                I am 18 or older — continue
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setState("declined")}
                className="px-4 py-2.5 rounded-md border border-edge text-dim hover:text-text hover:bg-white/[0.04] transition-colors text-sm"
              >
                I am not
              </motion.button>
            </div>
            <p className="mt-4 text-[11px] text-dim leading-relaxed">
              Not affiliated with or endorsed by any official lottery. If gambling is a problem for you
              or someone you know, in the US call 1-800-GAMBLER.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
