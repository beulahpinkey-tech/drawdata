"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const KEY = "drawdata_lab_prompt_seen_v1";

export function LabSuggestionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setVisible(true), 12000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, "yes");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, filter: "blur(5px)", y: 16 }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
          exit={{ opacity: 0, scale: 0.9, filter: "blur(5px)", y: 8 }}
          transition={{ type: "spring", bounce: 0.4, duration: 1 }}
          className="fixed bottom-4 right-4 z-40 max-w-sm panel p-5"
          role="status"
        >
          <button
            onClick={dismiss}
            aria-label="dismiss"
            className="absolute top-2 right-2 text-dim hover:text-text h-7 w-7 grid place-items-center rounded-md hover:bg-white/[0.04]"
          >
            ×
          </button>
          <div className="text-[10px] uppercase tracking-[0.18em] text-cool font-mono">A note from the Lab</div>
          <h3 className="mt-1 font-display text-[18px] leading-tight">How could we make this better?</h3>
          <p className="mt-2 text-[13px] text-dim">
            What rule, chart, or view would you love to see? Share an idea — we read every one.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              href="/contact"
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-accent text-ink font-medium hover:bg-accent/90"
            >
              Suggest something
            </Link>
            <button
              onClick={dismiss}
              className="text-[12px] text-dim hover:text-text px-2 py-1.5"
            >
              Not now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
