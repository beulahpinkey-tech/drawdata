"use client";

/**
 * Four 0–9 digit reels plus the direct four-digit entry.
 *
 * Both are just views of the same integer: the reels write digits back
 * through comboFromDigits, the input through parseCombo, and the parent
 * owns the value — so the big reel, the digit reels and the input can
 * never disagree about what is selected.
 *
 * The input is strict about leading zeroes on purpose: type 0042 and you
 * go to 0042, never to 42. Fewer than four digits is refused with a
 * message rather than silently padded.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { comboDigits, comboFromDigits, comboLabel, parseCombo } from "@/lib/combos/universe";

const DIGIT_H = 46;
const POSITION_LABELS = ["1st", "2nd", "3rd", "4th"];

export function DigitReels({
  value,
  onChange,
}: {
  value: number;
  onChange: (combo: number) => void;
}) {
  const digits = comboDigits(value);

  const setDigit = (position: number, digit: number) => {
    const next = digits.slice();
    next[position] = ((digit % 10) + 10) % 10;
    const combo = comboFromDigits(next);
    if (combo !== null) onChange(combo);
  };

  return (
    <div className="flex items-start gap-2 sm:gap-3">
      {digits.map((d, i) => (
        <DigitColumn
          key={i}
          position={i}
          value={d}
          onChange={(next) => setDigit(i, next)}
        />
      ))}
    </div>
  );
}

function DigitColumn({
  position,
  value,
  onChange,
}: {
  position: number;
  value: number;
  onChange: (digit: number) => void;
}) {
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  // Keep the strip aligned when the value changes from elsewhere (the big
  // reel, the search box, a click in the universe).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const target = value * DIGIT_H;
    if (Math.abs(el.scrollTop - target) < 1) return;
    syncing.current = true;
    el.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
    const t = setTimeout(() => (syncing.current = false), 400);
    return () => clearTimeout(t);
  }, [value, reduce]);

  const onScroll = () => {
    const el = track.current;
    if (!el || syncing.current) return;
    const next = Math.max(0, Math.min(9, Math.round(el.scrollTop / DIGIT_H)));
    if (next !== value) onChange(next);
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-dim">
        {POSITION_LABELS[position]}
      </span>
      <div className="relative">
        <div
          ref={track}
          onScroll={onScroll}
          tabIndex={0}
          role="spinbutton"
          aria-label={`${POSITION_LABELS[position]} digit`}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={9}
          aria-valuetext={String(value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(value + (e.key === "ArrowUp" ? -1 : 1));
            } else if (/^[0-9]$/.test(e.key)) {
              e.preventDefault();
              onChange(parseInt(e.key, 10));
            }
          }}
          className="h-[46px] w-[52px] sm:w-[58px] overflow-y-auto overscroll-contain rounded-md border border-edge bg-panel2 outline-none focus-visible:border-accent [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: reduce ? "none" : "y mandatory" }}
        >
          <div style={{ height: DIGIT_H * 10 }} className="relative">
            {Array.from({ length: 10 }, (_, d) => (
              <div
                key={d}
                className={`absolute inset-x-0 flex items-center justify-center font-mono tabular-nums transition-colors ${
                  d === value ? "text-text" : "text-dim"
                }`}
                style={{
                  top: d * DIGIT_H,
                  height: DIGIT_H,
                  fontSize: d === value ? 22 : 19,
                  scrollSnapAlign: reduce ? undefined : "center",
                }}
              >
                {d}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <StepButton label={`Decrease ${POSITION_LABELS[position]} digit`} onClick={() => onChange(value - 1)}>
          −
        </StepButton>
        <StepButton label={`Increase ${POSITION_LABELS[position]} digit`} onClick={() => onChange(value + 1)}>
          +
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      // 44px tall keeps the touch target at the platform minimum even
      // though the control reads as small.
      className="h-11 w-6 sm:w-7 -my-1.5 text-dim hover:text-text transition-colors leading-none"
    >
      {children}
    </button>
  );
}

/** Four-digit entry. Leading zeroes survive; short input is refused. */
export function ComboSearch({ onSubmit }: { onSubmit: (combo: number) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCombo(text);
    if (parsed === null) {
      setError(
        /^\d+$/.test(text.trim())
          ? "Enter exactly four digits — 42 is not 0042."
          : "Four digits, 0000 to 9999.",
      );
      return;
    }
    setError(null);
    setText(comboLabel(parsed));
    onSubmit(parsed);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="combo-search">
          Go to combination
        </label>
        <input
          id="combo-search"
          value={text}
          onChange={(e) => {
            setText(e.target.value.replace(/[^\d]/g, "").slice(0, 4));
            setError(null);
          }}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0042"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "combo-search-error" : undefined}
          className="h-11 w-[104px] rounded-md border border-edge bg-panel2 px-3 text-center font-mono tabular-nums tracking-[0.2em] text-[17px] focus:outline-none focus:border-accent"
        />
        <button type="submit" className="btn btn-ghost h-11 px-4 text-[13px]">
          Go
        </button>
      </div>
      {error && (
        <p id="combo-search-error" role="alert" className="text-[11px] text-hot">
          {error}
        </p>
      )}
    </form>
  );
}
