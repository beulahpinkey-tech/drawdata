"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const spring = { type: "spring" as const, bounce: 0.4, duration: 1 };

export function WaitlistModal({
  open,
  state,
  onClose,
}: {
  open: boolean;
  state: { state: string; abbr: string } | null;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error" | "missing-key">("idle");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      // reset after close animation
      const t = setTimeout(() => {
        setStatus("idle");
        setEmail("");
        setNote("");
        setErrMsg("");
      }, 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) {
      setStatus("success");
      return;
    }
    if (!email.trim()) {
      setErrMsg("Email is required.");
      setStatus("error");
      return;
    }
    const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;
    if (!accessKey) {
      setStatus("missing-key");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `Waitlist request: ${state?.state ?? "Unknown"}`,
          from_name: "DrawData waitlist",
          replyto: email,
          state: state?.state,
          state_abbr: state?.abbr,
          note,
          page: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
      } else {
        setErrMsg(data.message || "Submission failed.");
        setStatus("error");
      }
    } catch (err: any) {
      setErrMsg(err?.message ?? "Network error.");
      setStatus("error");
    }
  };

  return (
    <AnimatePresence>
      {open && state && (
        <motion.div
          className="fixed inset-0 z-[60] bg-ink/85 backdrop-blur-md grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12, filter: "blur(5px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.96, y: 4, filter: "blur(5px)" }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
            className="panel w-full max-w-md p-6 max-h-[90vh] overflow-y-auto overscroll-contain"
            role="dialog"
            aria-modal
            aria-labelledby="waitlist-title"
          >
            {status === "success" ? (
              <div className="text-center py-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cool/15 text-cool mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="font-display text-[24px]">You&rsquo;re on the list for {state.state}.</h2>
                <p className="mt-2 text-[13px] text-dim">
                  We&rsquo;ll email <span className="text-text font-mono">{email}</span> when {state.state}{" "}
                  goes live. Thanks for the demand signal.
                </p>
                <button
                  onClick={onClose}
                  className="mt-5 px-4 py-2 rounded-md border border-edge text-[13px] hover:bg-white/[0.04]"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-cool font-mono">Waitlist</div>
                  <h2 id="waitlist-title" className="mt-1 font-display text-[24px] leading-tight">
                    DrawData doesn&rsquo;t have {state.state} yet.
                  </h2>
                  <p className="mt-2 text-[13px] text-dim leading-relaxed">
                    Want these analytics for {state.state}? Leave your email and we&rsquo;ll notify you
                    when it&rsquo;s live. We use the address only to write back — never sold.
                  </p>
                </div>

                <label className="block">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-1">State</div>
                  <input
                    type="text"
                    value={`${state.state} (${state.abbr})`}
                    readOnly
                    className="w-full rounded-md border border-edge bg-panel2/50 px-3 py-2 text-[14px] text-dim cursor-not-allowed"
                  />
                </label>

                <label className="block">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-1">Email *</div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-md border border-edge bg-panel2 px-3 py-2 text-[14px] focus:outline-none focus:border-cool"
                  />
                </label>

                <label className="block">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
                    Which views matter most? (optional)
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="e.g. frequency by digit, pairs, midday-vs-evening…"
                    className="w-full rounded-md border border-edge bg-panel2 px-3 py-2 text-[14px] focus:outline-none focus:border-cool resize-y"
                  />
                </label>

                {/* honeypot */}
                <input
                  type="text"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  className="absolute -left-[10000px] h-0 w-0 opacity-0"
                />

                {status === "error" && (
                  <div className="rounded-md border border-hot/30 bg-hot/[0.05] px-3 py-2 text-[12px] text-hot">
                    {errMsg}
                  </div>
                )}
                {status === "missing-key" && (
                  <div className="rounded-md border border-cool/30 bg-cool/[0.05] px-3 py-2 text-[12px] text-dim">
                    Form not configured yet. Set <code className="text-text">NEXT_PUBLIC_WEB3FORMS_KEY</code> in <code className="font-mono">.env.local</code>.
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-[13px] text-dim hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cool text-ink font-medium text-sm hover:bg-cool/90 disabled:opacity-50"
                  >
                    {status === "sending" ? "Sending…" : "Join the waitlist"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
