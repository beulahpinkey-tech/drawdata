"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGameDraws } from "@/lib/hooks/useGameDraws";
import { numberLookup, digitalRoot } from "@/lib/analytics/digits";
import { NumberBall } from "@/components/NumberBall";

import type { Game } from "@/lib/types";

export function LookupView({ game }: { game: Game }) {
  const { draws, loading } = useGameDraws(game);
  const router = useRouter();
  const search = useSearchParams();
  const positions = game.endsWith("pick3") ? 3 : 4;
  const urlN = search.get("n");
  const initial = parseUrl(urlN, positions);
  const [digits, setDigits] = useState<number[]>(initial);
  const [submitted, setSubmitted] = useState<number[] | null>(initial[0] === 0 && initial.every((d) => d === 0) && !urlN ? null : initial);

  useEffect(() => {
    if (!submitted) return;
    const n = submitted.join("");
    const sp = new URLSearchParams(search.toString());
    if (sp.get("n") !== n) {
      sp.set("n", n);
      router.replace(`?${sp.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  const result = useMemo(() => {
    if (!draws || !submitted) return null;
    return numberLookup(draws, submitted);
  }, [draws, submitted]);

  if (loading) return <div className="panel p-8 text-center text-dim text-sm">Loading draws…</div>;

  return (
    <>
      <div className="panel p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Number lookup</div>
        <h2 className="font-display text-[22px] mt-1">Show every date this number has hit</h2>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {digits.map((d, i) => (
            <DigitInput
              key={i}
              value={d}
              onChange={(v) => {
                const next = digits.slice();
                next[i] = v;
                setDigits(next);
              }}
            />
          ))}
          <button
            onClick={() => setSubmitted(digits.slice())}
            className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-ink font-medium text-sm hover:bg-accent/90"
          >
            Look up
          </button>
        </div>
      </div>

      {result && submitted && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Straight hits (exact order)" value={result.straightCount.toLocaleString()} sub={result.lastSeenStraight ? `last: ${result.lastSeenStraight}` : "never"} />
            <Stat label="Box hits (any order)" value={result.boxCount.toLocaleString()} sub={result.lastSeenBox ? `last: ${result.lastSeenBox}` : "never"} />
            <Stat label="Digit sum" value={String(result.sum)} sub="0..9 + …" />
            <Stat label="Digital root" value={String(result.root)} sub="sum reduced to single digit" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="panel p-6">
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Straight history</div>
              <h3 className="font-display text-[18px] mt-1">Exact-order hits</h3>
              {result.exact.length === 0 ? (
                <div className="mt-4 text-[13px] text-dim">This exact sequence has never been drawn.</div>
              ) : (
                <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-edge text-[12px] font-mono">
                  {result.exact.slice(0, 200).map((o, i) => (
                    <div key={i} className="py-1.5 flex justify-between">
                      <span>{o.date}</span>
                      {o.stream && o.stream !== "other" && (
                        <span className="text-dim">{o.stream}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="panel p-6">
              <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Box history</div>
              <h3 className="font-display text-[18px] mt-1">Any-order hits (showing actual draw order)</h3>
              {result.box.length === 0 ? (
                <div className="mt-4 text-[13px] text-dim">This digit set has never been drawn.</div>
              ) : (
                <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-edge text-[12px] font-mono">
                  {result.box.slice(0, 200).map((o, i) => (
                    <div key={i} className="py-1.5 flex justify-between items-center gap-3">
                      <span>{o.date}</span>
                      <div className="flex gap-1">
                        {o.ordered.map((d, j) => (
                          <NumberBall key={j} value={d} variant="digit" size="sm" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function parseUrl(s: string | null, positions: number): number[] {
  if (!s || !/^\d+$/.test(s) || s.length !== positions) return new Array(positions).fill(0);
  return s.split("").map((c) => parseInt(c, 10));
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel-inner p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-dim font-mono">{label}</div>
      <div className="font-display text-[28px] mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-dim mt-0.5">{sub}</div>}
    </div>
  );
}

function DigitInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange((value + 9) % 10)}
        className="h-9 w-7 rounded-md border border-edge text-dim hover:bg-white/[0.04] hover:text-text"
      >−</button>
      <input
        type="text"
        inputMode="numeric"
        maxLength={1}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= 0 && v <= 9) onChange(v);
        }}
        className="h-12 w-12 text-center font-mono text-[20px] rounded-md border border-edge bg-panel2 focus:outline-none focus:border-accent"
      />
      <button
        onClick={() => onChange((value + 1) % 10)}
        className="h-9 w-7 rounded-md border border-edge text-dim hover:bg-white/[0.04] hover:text-text"
      >+</button>
    </div>
  );
}
