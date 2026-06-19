"use client";

/**
 * Draw Machine — realistic lottery machine simulator.
 *
 * Two machine types, matching how real draws actually look:
 *  - Digit games (Pick 3 / Pick 4): the VERTICAL multi-chamber machine —
 *    a clear glass housing with one tall tube per digit, balls pooled and
 *    air-churning at the bottom, and a number display window on top of
 *    each tube where the drawn ball lands. (Matches the user's reference.)
 *  - Ball games (Powerball / Mega Millions): a round air-mix DRUM (white
 *    pool) plus a smaller special-ball drum — which is the real format
 *    for those games — feeding a row of display windows.
 *
 * Produces a TRUE uniform-random draw (crypto, rejection-sampled): the
 * same fair odds as a real machine. No system, no formula, no special
 * numbers. Full disclaimer below. prefers-reduced-motion: no churn,
 * results reveal instantly.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { track } from "@/lib/analytics";

type Mode = "pick3" | "pick4" | "powerball" | "megamillions";
type GameCfg = {
  label: string; kind: "digit" | "ball";
  digitChambers?: number;
  whitePool?: number; whiteCount?: number; specialPool?: number; specialLabel?: string;
};
const GAMES: Record<Mode, GameCfg> = {
  pick3: { label: "Pick 3", kind: "digit", digitChambers: 3 },
  pick4: { label: "Pick 4", kind: "digit", digitChambers: 4 },
  powerball: { label: "Powerball", kind: "ball", whitePool: 69, whiteCount: 5, specialPool: 26, specialLabel: "Powerball" },
  megamillions: { label: "Mega Millions", kind: "ball", whitePool: 70, whiteCount: 5, specialPool: 24, specialLabel: "Mega Ball" },
};

function randInt(maxExclusive: number): number {
  const a = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
  let x = 0;
  do { crypto.getRandomValues(a); x = a[0]; } while (x >= limit);
  return x % maxExclusive;
}
function sampleDistinct(pool: number, count: number): number[] {
  const set = new Set<number>();
  while (set.size < count) set.add(randInt(pool) + 1);
  return [...set].sort((a, b) => a - b);
}

const BALL_COLORS = ["#E9B84A", "#5BC8B0", "#E1664C", "#2E4B8F", "#7A5BC8", "#3E7A48", "#C9A23A", "#D7E2EA"];

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Vertical tube chamber (Pick 3/4) — balls pool + churn at the base ──
function VerticalChamber({ w, h, ballCount, agitateRef }: {
  w: number; h: number; ballCount: number; agitateRef: React.MutableRefObject<number>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rad = 7, pad = 6;
    const minX = pad + rad, maxX = w - pad - rad, minY = pad + rad, maxY = h - pad - rad;

    type B = { x: number; y: number; vx: number; vy: number; color: string };
    const balls: B[] = Array.from({ length: ballCount }, () => ({
      x: minX + Math.random() * (maxX - minX),
      y: maxY - Math.random() * (h * 0.35),
      vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
      color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
    }));

    let raf = 0;
    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      // glass tube
      roundRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 14);
      ctx.fillStyle = "rgba(12,16,18,0.66)"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(214,226,234,0.22)"; ctx.stroke();
      // left glass highlight
      ctx.save(); roundRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 14); ctx.clip();
      const hl = ctx.createLinearGradient(0, 0, w, 0);
      hl.addColorStop(0, "rgba(255,255,255,0.10)"); hl.addColorStop(0.2, "rgba(255,255,255,0)");
      ctx.fillStyle = hl; ctx.fillRect(0, 0, w, h);
      // base air glow
      const g = ctx.createLinearGradient(0, h, 0, h * 0.5);
      g.addColorStop(0, "rgba(233,184,74,0.20)"); g.addColorStop(1, "rgba(233,184,74,0)");
      ctx.fillStyle = g; ctx.fillRect(0, h * 0.5, w, h * 0.5);
      ctx.restore();

      const air = reduce ? 0 : 0.5 + agitateRef.current * 3.2;
      for (const b of balls) {
        if (air > 0) {
          b.vy += 0.22;                              // gravity
          b.vy -= Math.random() * air * 0.55;        // air blows up
          b.vx += (Math.random() - 0.5) * air * 0.45;
          b.vx *= 0.97; b.vy *= 0.97;
          b.x += b.vx; b.y += b.vy;
          if (b.x < minX) { b.x = minX; b.vx = -b.vx * 0.6; }
          if (b.x > maxX) { b.x = maxX; b.vx = -b.vx * 0.6; }
          if (b.y > maxY) { b.y = maxY; b.vy = -Math.abs(b.vy) * 0.45; }
          if (b.y < minY) { b.y = minY; b.vy = Math.abs(b.vy) * 0.45; }
        }
        ctx.beginPath(); ctx.arc(b.x, b.y, rad, 0, Math.PI * 2);
        const bg = ctx.createRadialGradient(b.x - rad * 0.4, b.y - rad * 0.4, 1, b.x, b.y, rad);
        bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.3, b.color); bg.addColorStop(1, "rgba(0,0,0,0.4)");
        ctx.fillStyle = bg; ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    if (reduce) frame(); else raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [w, h, ballCount, reduce, agitateRef]);
  return <canvas ref={ref} style={{ width: w, height: h, display: "block" }} aria-hidden />;
}

// ── Round drum (Powerball / Mega Millions) ──
function Drum({ diameter, ballCount, agitateRef }: {
  diameter: number; ballCount: number; agitateRef: React.MutableRefObject<number>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const D = diameter; canvas.width = D * dpr; canvas.height = D * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = D / 2, cy = D / 2, R = D / 2 - 4, rad = D < 120 ? 7 : 9;
    type B = { x: number; y: number; vx: number; vy: number; color: string };
    const balls: B[] = Array.from({ length: ballCount }, () => {
      const ang = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * (R - rad);
      return { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)] };
    });
    let raf = 0;
    const frame = () => {
      ctx.clearRect(0, 0, D, D);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10,11,15,0.9)"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(214,226,234,0.2)"; ctx.stroke();
      const speed = reduce ? 0 : 1 + agitateRef.current * 3.5;
      for (const b of balls) {
        if (speed > 0) {
          b.vy += -0.06 * speed + (Math.random() - 0.5) * 0.6 * speed;
          b.vx += (Math.random() - 0.5) * 0.6 * speed;
          b.vx *= 0.95; b.vy *= 0.95; b.x += b.vx * speed; b.y += b.vy * speed;
          const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy), max = R - rad;
          if (dist > max) { const nx = dx / dist, ny = dy / dist; b.x = cx + nx * max; b.y = cy + ny * max; const dot = b.vx * nx + b.vy * ny; b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; b.vx *= 0.7; b.vy *= 0.7; }
        }
        ctx.beginPath(); ctx.arc(b.x, b.y, rad, 0, Math.PI * 2);
        const bg = ctx.createRadialGradient(b.x - rad * 0.4, b.y - rad * 0.4, 1, b.x, b.y, rad);
        bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.3, b.color); bg.addColorStop(1, "rgba(0,0,0,0.4)");
        ctx.fillStyle = bg; ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    if (reduce) frame(); else raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [diameter, ballCount, reduce, agitateRef]);
  return <canvas ref={ref} style={{ width: diameter, height: diameter }} aria-hidden />;
}

function Display({ value, kind }: { value: number | null; kind?: "white" | "special" }) {
  const filled = value != null;
  return (
    <div className="flex items-center justify-center rounded-md border font-mono tabular-nums font-semibold transition-all duration-300"
      style={{
        width: 54, height: 50,
        background: filled ? "rgba(233,184,74,0.10)" : "rgba(0,0,0,0.55)",
        borderColor: filled ? (kind === "special" ? "rgba(225,102,76,0.7)" : "rgba(233,184,74,0.6)") : "rgba(214,226,234,0.18)",
        color: filled ? (kind === "special" ? "#E1664C" : "#E9B84A") : "rgba(214,226,234,0.25)",
        fontSize: 24,
        textShadow: filled ? "0 0 12px currentColor" : "none",
        boxShadow: filled ? "inset 0 0 18px rgba(233,184,74,0.12)" : "inset 0 2px 8px rgba(0,0,0,0.5)",
      }}>
      {filled ? value : "–"}
    </div>
  );
}

export function DrawMachine() {
  const [mode, setMode] = useState<Mode>("pick3");
  const [spinning, setSpinning] = useState(false);
  const [digits, setDigits] = useState<(number | null)[]>([]);
  const [whites, setWhites] = useState<(number | null)[]>([]);
  const [special, setSpecial] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const cfg = GAMES[mode];
  const agitateRef = useRef(0);

  const reset = () => {
    if (cfg.kind === "digit") setDigits(new Array(cfg.digitChambers!).fill(null));
    else { setWhites(new Array(cfg.whiteCount!).fill(null)); setSpecial(null); }
  };
  useEffect(reset, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = () => {
    if (spinning) return;
    track("Draw Generate", { game: mode });
    reset();
    if (cfg.kind === "digit") {
      const result = Array.from({ length: cfg.digitChambers! }, () => randInt(10));
      if (reduce) { setDigits(result); return; }
      setSpinning(true); agitateRef.current = 1;
      result.forEach((d, i) => {
        window.setTimeout(() => {
          setDigits((prev) => prev.map((v, j) => (j === i ? d : v)));
          if (i === result.length - 1) { agitateRef.current = 0; setSpinning(false); }
        }, 1000 + i * 650);
      });
    } else {
      const w = sampleDistinct(cfg.whitePool!, cfg.whiteCount!);
      const s = randInt(cfg.specialPool!) + 1;
      if (reduce) { setWhites(w); setSpecial(s); return; }
      setSpinning(true); agitateRef.current = 1;
      w.forEach((val, i) => window.setTimeout(() => setWhites((prev) => prev.map((v, j) => (j === i ? val : v))), 1000 + i * 500));
      window.setTimeout(() => { setSpecial(s); agitateRef.current = 0; setSpinning(false); }, 1000 + w.length * 500);
    }
  };

  return (
    <div className="space-y-5">
      {/* Game selector */}
      <div className="panel p-4" style={{ background: "var(--ink)" }}>
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-2">Choose a game</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(GAMES) as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} disabled={spinning}
              className={`px-3 py-1.5 rounded-md text-[13px] border transition-colors disabled:opacity-50 ${
                m === mode ? "border-accent/50 bg-accent/10 text-accent" : "border-edge text-dim hover:text-text hover:bg-white/[0.04]"
              }`}>
              {GAMES[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* THE MACHINE — opaque glass housing with a faint green back glow,
          matching a real Pick draw machine. */}
      <div
        className="rounded-lg border-2 border-edge overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 60%, rgba(62,122,72,0.18), transparent 70%), linear-gradient(180deg,#14171c,#0b0d10)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-edge" style={{ background: "rgba(0,0,0,0.4)" }}>
          <span className="text-[11px] uppercase tracking-[0.2em] text-accent font-mono">DrawData · Draw Machine</span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-dim font-mono">{cfg.label}</span>
        </div>

        <div className="p-5 sm:p-8">
          {cfg.kind === "digit" ? (
            <div className="flex items-end justify-center gap-4 sm:gap-7 flex-wrap">
              {Array.from({ length: cfg.digitChambers! }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  {/* display window on top of the tube */}
                  <Display value={digits[i] ?? null} />
                  {/* the clear vertical tube with balls churning at the base */}
                  <div className="mt-2"><VerticalChamber w={84} h={240} ballCount={10} agitateRef={agitateRef} /></div>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-dim font-mono">Chamber {i + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
              <div className="flex flex-col items-center">
                <Drum diameter={220} ballCount={42} agitateRef={agitateRef} />
                <span className="mt-1 text-[10px] uppercase tracking-wider text-dim font-mono">White drum · 1–{cfg.whitePool}</span>
              </div>
              <div className="hidden sm:block" style={{ width: 38, height: 8, background: "rgba(214,226,234,0.10)", borderRadius: 99, border: "1px solid rgba(214,226,234,0.14)" }} aria-hidden />
              <div className="flex flex-col gap-3">
                <div className="text-[10px] uppercase tracking-wider text-dim font-mono">Drawn</div>
                <div className="flex gap-2 flex-wrap max-w-[280px]">
                  {whites.map((wv, i) => <Display key={i} value={wv} kind="white" />)}
                  <span className="self-center text-dim">·</span>
                  <Display value={special} kind="special" />
                </div>
                <div className="text-[10px] text-dim font-mono">5 white + {cfg.specialLabel}</div>
              </div>
            </div>
          )}

          {/* base / stand */}
          <div className="mx-auto mt-1 rounded-b-md" style={{ maxWidth: cfg.kind === "digit" ? 520 : 360, height: 10, background: "linear-gradient(180deg, rgba(214,226,234,0.10), rgba(0,0,0,0.3))", borderTop: "1px solid rgba(214,226,234,0.12)" }} aria-hidden />

          <div className="mt-7 flex items-center justify-center">
            <button onClick={generate} disabled={spinning} className="btn btn-primary disabled:opacity-60">
              {spinning ? "Drawing…" : "Generate a draw"}
            </button>
          </div>
        </div>
      </div>

      <div className="panel-inner p-4 text-[12px] text-dim leading-relaxed" style={{ background: "rgba(0,0,0,0.35)" }}>
        <strong className="text-text">For fun and education only.</strong> This machine produces a
        uniformly random draw — exactly the same odds as a real ticket, no better. It does{" "}
        <strong className="text-text">not</strong> predict winning numbers, improve your chances, or
        constitute a system, strategy, or betting advice. Any use of these numbers to play is entirely
        at your own discretion and risk. DrawData makes no claims and accepts no liability. Not
        affiliated with or endorsed by any official lottery. 18+.
      </div>
    </div>
  );
}
