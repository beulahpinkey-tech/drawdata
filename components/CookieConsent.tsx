"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const KEY = "drawdata_cookie_consent_v1";
const spring = { type: "spring" as const, bounce: 0.4, duration: 1 };

type Choice = "accept" | "essential-only";

export function CookieConsent() {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY) as Choice | null;
      if (v === "accept" || v === "essential-only") {
        setChoice(v);
      } else {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const persist = (c: Choice) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* ignore */
    }
    setChoice(c);
    setOpen(false);
    setManage(false);
  };

  const visible = open || manage;
  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 12, filter: "blur(5px)" }}
            transition={spring}
            className="fixed bottom-0 inset-x-0 z-30 px-4 pb-4"
          >
            <div className="mx-auto max-w-4xl panel p-5">
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div className="text-[13px] text-dim leading-relaxed">
                  <div className="text-text font-medium mb-1">Cookies</div>
                  We use only essential storage by default. If we later enable analytics or ads,
                  you can opt in here. See our{" "}
                  <Link href="/privacy" className="underline-offset-2 hover:underline text-text">Privacy Policy</Link>{" "}
                  for details.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => persist("essential-only")}
                    className="px-3 py-2 rounded-md border border-edge text-[13px] text-dim hover:text-text hover:bg-white/[0.04]"
                  >
                    Essential only
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => persist("accept")}
                    className="px-4 py-2 rounded-md bg-accent text-ink font-medium text-[13px] hover:bg-accent/90"
                  >
                    Accept all
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!open && (
        <button
          onClick={() => setManage(true)}
          className="fixed bottom-3 left-3 z-30 text-[11px] text-dim hover:text-text font-mono opacity-50 hover:opacity-100 transition-opacity bg-ink/60 backdrop-blur-sm border border-edge rounded-md px-2.5 py-1"
          title={`Current choice: ${choice ?? "—"}`}
        >
          Manage cookies
        </button>
      )}
    </>
  );
}
