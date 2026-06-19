"use client";

/**
 * SignatureDataViz — the hero's signature moment.
 *
 * Premise: the most honest possible "what is DrawData?" in one frame.
 * We render the REAL Powerball white-ball frequency series (current era,
 * 1,365 draws, balls 1–69) as a self-drawing line — and overlay the
 * dashed mathematical baseline (expected count if draws were perfectly
 * uniform). The story is told without a word of copy: amber wiggle =
 * what happened, teal dashed line = what was supposed to happen, gap
 * between them = the noise we describe but never sell as a signal.
 *
 * Motion choreography (1.6s total):
 *   t=0.00s  curtain rises (chart container fades in 200ms)
 *   t=0.05s  line begins drawing left → right (1.4s, --ease-premium)
 *   t=1.10s  dashed expected baseline fades in over 400ms
 *   t=1.45s  cursor interactivity engages (slight delay so the user
 *            sees the drawing finish before the chart "wakes up")
 *
 * Cursor interaction (subtle):
 *   - We track pointer X within the chart.
 *   - The data point nearest the cursor (within ~120px in chart space)
 *     gets a small accent circle + glow, and a floating mono caption
 *     shows "ball N · count" beneath the chart.
 *   - On pointer leave, the highlight fades out over 300ms.
 *
 * Reduced motion: the chart paints in its final state immediately,
 * baseline is visible from t=0, cursor highlight still works (it's
 * informational, not motion).
 *
 * Layout: the SVG is rendered inside an absolutely-positioned wrapper
 * that fills the hero section. The H1 + CTAs in app/page.tsx sit on
 * top of it via z-10. Vignette + amber wash overlays keep the text
 * readable without dimming the data so far that it loses its identity.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import powerballAgg from "@/lib/data/powerball.agg.json";

type Point = { x: number; y: number; ball: number; count: number };

// SVG viewBox — wide hero aspect. Choosing a generous space so the line
// breathes and the cursor magnetization radius (120px in chart-space)
// feels right against the rest of the layout.
const VIEW_W = 1000;
const VIEW_H = 360;
const PAD = { top: 40, right: 32, bottom: 52, left: 32 };
const CHART_W = VIEW_W - PAD.left - PAD.right;
const CHART_H = VIEW_H - PAD.top - PAD.bottom;

// Smooth Catmull–Rom-style path through points — quadratic Bezier
// midpoint smoothing. Beats `Q` chains for a "premium drawn-with-a-pen"
// feel; bumps don't show kinks at every data marker.
function smoothPath(pts: Point[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x} ${p0.y} ${mx} ${my}`;
  }
  d += ` T ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  return d;
}

export function SignatureDataViz() {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState<number>(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [interactive, setInteractive] = useState<boolean>(false);

  // ─── Derive geometry from real data ──────────────────────────────
  const { points, areaPath, baselineY, expectedCount, range } = useMemo(() => {
    const counts: number[] = (powerballAgg as any).whiteCounts;
    const pool: number = (powerballAgg as any).whitePool;
    const drawCount: number = (powerballAgg as any).currentCount;
    // Balls 1..pool — index 0 is unused in the data
    const values: number[] = [];
    for (let i = 1; i <= pool; i++) values.push(counts[i] ?? 0);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const span = Math.max(maxV - minV, 1);
    // Plot range gives a little headroom above/below so the line isn't
    // pinned to the edges of the chart area.
    const lo = minV - span * 0.18;
    const hi = maxV + span * 0.18;
    const yFor = (v: number) =>
      PAD.top + (1 - (v - lo) / (hi - lo)) * CHART_H;
    const pts: Point[] = values.map((v, i) => ({
      x: PAD.left + (i / (values.length - 1)) * CHART_W,
      y: yFor(v),
      ball: i + 1,
      count: v,
    }));
    const expected = (drawCount * 5) / pool;
    const baseY = yFor(expected);
    // Area path — line down to bottom, back across, close.
    const linePath = smoothPath(pts);
    const area =
      linePath +
      ` L ${PAD.left + CHART_W} ${PAD.top + CHART_H}` +
      ` L ${PAD.left} ${PAD.top + CHART_H} Z`;
    return {
      points: pts,
      areaPath: area,
      baselineY: baseY,
      expectedCount: expected,
      range: { min: minV, max: maxV },
    };
  }, []);

  const linePath = useMemo(() => smoothPath(points), [points]);

  // ─── Capture path length once after mount so the drawing animation
  //     uses the EXACT total path length, not an oversized fallback ─
  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    setPathLen(len);
  }, [linePath]);

  // Engage cursor interactivity AFTER the drawing finishes, so the
  // hover highlight doesn't appear half-painted.
  useEffect(() => {
    if (reduce) {
      setInteractive(true);
      return;
    }
    const t = setTimeout(() => setInteractive(true), 1450);
    return () => clearTimeout(t);
  }, [reduce]);

  // ─── Cursor magnetization ────────────────────────────────────────
  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    // Map screen X → viewBox X, find nearest point.
    const screenX = e.clientX - rect.left;
    const vx = (screenX / rect.width) * VIEW_W;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - vx);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    // Magnetization radius — 120px in chart space. Beyond it, no highlight.
    setHoverIdx(bestDist <= 120 ? best : null);
  }
  function handleLeave() { setHoverIdx(null); }

  const hover = hoverIdx !== null ? points[hoverIdx] : null;

  // Reduced motion: skip the dasharray reveal — paint instantly.
  const dashAttr = reduce
    ? undefined
    : pathLen
      ? { strokeDasharray: pathLen, strokeDashoffset: pathLen }
      : undefined;

  return (
    <div
      ref={wrapRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      aria-hidden
      className="absolute inset-0 overflow-hidden rounded-2xl select-none"
      style={{
        // Quiet base wash so the chart sits on the section's own
        // surface tone, not pure black.
        background:
          "radial-gradient(ellipse 90% 70% at 50% 30%, rgba(28,31,40,0.5), rgba(14,15,19,0.95) 80%)",
      }}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Powerball white-ball frequency: 1,365 draws across 69 balls, plotted against the mathematically expected count."
      >
        <defs>
          {/* Soft amber glow for the active cursor point. */}
          <filter id="ddv-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Area fill — amber bleeding into transparent below the line. */}
          <linearGradient id="ddv-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-brand)" stopOpacity="0.22" />
            <stop offset="60%" stopColor="var(--accent-brand)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--accent-brand)" stopOpacity="0" />
          </linearGradient>
          {/* The line itself — subtle gradient along its length for a
              hand-drawn-with-a-fine-pen feel. */}
          <linearGradient id="ddv-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-400)" />
            <stop offset="50%" stopColor="var(--accent-500)" />
            <stop offset="100%" stopColor="var(--accent-600)" />
          </linearGradient>
        </defs>

        {/* Faint grid — sparse horizontal hairlines as visual quiet. */}
        <g stroke="rgba(236, 233, 224, 0.04)" strokeWidth="1">
          {[0.25, 0.5, 0.75].map((t) => {
            const y = PAD.top + CHART_H * t;
            return <line key={t} x1={PAD.left} x2={PAD.left + CHART_W} y1={y} y2={y} />;
          })}
        </g>

        {/* Area under the curve. Fades in with the line. */}
        <path
          d={areaPath}
          fill="url(#ddv-area)"
          opacity={reduce ? 1 : 0}
          style={
            reduce
              ? undefined
              : { animation: "ddvAreaIn 900ms 700ms var(--ease-premium) both" }
          }
        />

        {/* The expected-count baseline (teal, dashed).
            Appears after the line settles — the "and here's the math"
            beat of the choreography. */}
        <line
          x1={PAD.left}
          x2={PAD.left + CHART_W}
          y1={baselineY}
          y2={baselineY}
          stroke="var(--data-fair)"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          opacity={reduce ? 0.7 : 0}
          style={
            reduce
              ? undefined
              : { animation: "ddvBaselineIn 600ms 1100ms var(--ease-premium) both" }
          }
        />
        <text
          x={PAD.left + CHART_W}
          y={baselineY - 8}
          textAnchor="end"
          fontFamily="var(--font-mono)"
          fontSize="11"
          letterSpacing="0.16em"
          fill="var(--data-fair)"
          opacity={reduce ? 0.85 : 0}
          style={
            reduce
              ? undefined
              : { animation: "ddvBaselineIn 600ms 1300ms var(--ease-premium) both" }
          }
        >
          EXPECTED · {expectedCount.toFixed(1)}
        </text>

        {/* THE LINE — self-drawing via stroke-dashoffset. */}
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke="url(#ddv-line)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...dashAttr}
          style={
            reduce || !pathLen
              ? undefined
              : { animation: `ddvDraw 1400ms 80ms var(--ease-premium) forwards` }
          }
        />

        {/* Active point — magnetized cursor highlight. */}
        {hover && (
          <g style={{ transition: "opacity 300ms var(--ease-premium)" }}>
            {/* Vertical guide */}
            <line
              x1={hover.x}
              x2={hover.x}
              y1={PAD.top}
              y2={PAD.top + CHART_H}
              stroke="rgba(236, 233, 224, 0.18)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
            {/* Glow halo */}
            <circle
              cx={hover.x}
              cy={hover.y}
              r="14"
              fill="var(--accent-brand)"
              opacity="0.18"
              filter="url(#ddv-glow)"
            />
            {/* Point */}
            <circle
              cx={hover.x}
              cy={hover.y}
              r="5"
              fill="var(--accent-400)"
              stroke="var(--bg-base)"
              strokeWidth="2"
            />
            {/* Mono caption */}
            <g transform={`translate(${hover.x}, ${PAD.top + CHART_H + 28})`}>
              <text
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="11"
                letterSpacing="0.14em"
                fill="var(--text-primary)"
              >
                BALL {hover.ball.toString().padStart(2, "0")}
                <tspan fill="var(--text-tertiary)"> · </tspan>
                <tspan fill="var(--accent-400)">{hover.count}</tspan>
                <tspan fill="var(--text-tertiary)"> drawn</tspan>
              </text>
            </g>
          </g>
        )}

        {/* Caption — bottom-left, fades in last. */}
        <g
          opacity={reduce ? 1 : 0}
          style={
            reduce
              ? undefined
              : { animation: "ddvCaptionIn 600ms 1500ms var(--ease-premium) both" }
          }
        >
          <text
            x={PAD.left}
            y={VIEW_H - 18}
            fontFamily="var(--font-mono)"
            fontSize="10"
            letterSpacing="0.18em"
            fill="var(--text-tertiary)"
          >
            POWERBALL · WHITE BALL FREQUENCY · 1,365 DRAWS · 2015–PRESENT
          </text>
          <text
            x={PAD.left + CHART_W}
            y={VIEW_H - 18}
            textAnchor="end"
            fontFamily="var(--font-mono)"
            fontSize="10"
            letterSpacing="0.18em"
            fill="var(--text-tertiary)"
          >
            RANGE {range.min}<tspan fill="var(--text-quiet)"> … </tspan>{range.max}
          </text>
        </g>
      </svg>

      {/* Vignette + amber wash overlays — keep the H1 / CTAs readable
          without dimming the data so far that its identity is lost. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 30% 50%, rgba(14,15,19,0.7), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(233,184,74,0.10), transparent 65%)",
        }}
      />

      {/* Keyframes — scoped to this component. Reduced motion is
          handled globally in tokens.css. */}
      <style>{`
        @keyframes ddvDraw {
          from { stroke-dashoffset: ${pathLen}; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes ddvAreaIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ddvBaselineIn {
          from { opacity: 0; }
          to   { opacity: 0.85; }
        }
        @keyframes ddvCaptionIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
