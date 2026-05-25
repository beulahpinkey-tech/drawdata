"use client";

import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error" | "missing-key";

const TYPES = ["Bug", "Feature idea", "Feedback", "Other"] as const;
type FType = (typeof TYPES)[number];

export function FeedbackForm({ compact, onClose }: { compact?: boolean; onClose?: () => void }) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<FType>("Feedback");
  const [honeypot, setHoneypot] = useState(""); // bots fill this; humans don't
  const [state, setState] = useState<FormState>("idle");
  const [errMsg, setErrMsg] = useState("");

  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) {
      setState("success"); // pretend success for bots
      return;
    }
    if (!message.trim()) {
      setErrMsg("Please enter a message.");
      setState("error");
      return;
    }
    if (!accessKey) {
      setState("missing-key");
      return;
    }
    setState("submitting");
    setErrMsg("");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `[DrawData] ${type}`,
          from_name: "DrawData feedback",
          replyto: email || undefined,
          message,
          type,
          page: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setState("success");
        setMessage("");
        setEmail("");
      } else {
        setErrMsg(data.message || "Submission failed.");
        setState("error");
      }
    } catch (err: any) {
      setErrMsg(err?.message ?? "Network error.");
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className={compact ? "py-6 text-center" : "panel p-8 text-center"}>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cool/15 text-cool">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="mt-3 font-display text-[22px]">Thanks for writing in.</h3>
        <p className="mt-2 text-[13px] text-dim">We&rsquo;ve received your message. {email && `If you left an email, expect a reply at ${email}.`}</p>
        {onClose && (
          <button onClick={onClose} className="mt-4 text-[12px] text-dim underline-offset-2 hover:underline">close</button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "space-y-4" : "panel p-6 space-y-4"}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-1">Type</div>
        <div className="inline-flex items-center rounded-md border border-edge p-0.5 bg-white/[0.02] flex-wrap">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1 text-[12px] rounded-[5px] transition-colors ${
                type === t ? "bg-white/[0.08] text-text" : "text-dim hover:text-text"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-1">Message *</div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          placeholder="What did you see, want, or wish was different?"
          className="w-full rounded-md border border-edge bg-panel2 px-3 py-2 text-[14px] focus:outline-none focus:border-accent resize-y"
        />
      </label>

      <label className="block">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-1">Email (optional, only if you want a reply)</div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-md border border-edge bg-panel2 px-3 py-2 text-[14px] focus:outline-none focus:border-accent"
        />
      </label>

      {/* honeypot — visually hidden, bots fill it */}
      <input
        type="text"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[10000px] h-0 w-0 opacity-0"
        aria-hidden
      />

      {state === "error" && (
        <div className="rounded-md border border-hot/30 bg-hot/[0.05] px-3 py-2 text-[12px] text-hot">
          {errMsg}
        </div>
      )}
      {state === "missing-key" && (
        <div className="rounded-md border border-cool/30 bg-cool/[0.05] px-3 py-2 text-[12px] text-dim">
          <strong className="text-text">Form not configured yet.</strong> The site owner needs to set{" "}
          <code className="font-mono text-text">NEXT_PUBLIC_WEB3FORMS_KEY</code> in <code className="font-mono">.env.local</code> before submissions can be received.
          You can copy your message and email it to the owner directly.
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-dim">
          By submitting you agree to our <a href="/privacy" className="underline-offset-2 hover:underline">privacy policy</a>.
          We only use your email to reply.
        </p>
        <button
          type="submit"
          disabled={state === "submitting"}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-ink font-medium text-sm hover:bg-accent/90 disabled:opacity-50"
        >
          {state === "submitting" ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
