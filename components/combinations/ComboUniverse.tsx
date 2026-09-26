"use client";

/**
 * All 10,000 combinations as a drifting field of points, on one canvas.
 *
 * Canvas rather than WebGL: the scene is 10,000 two-pixel marks with no
 * lighting and no depth, which 2D handles in about a millisecond a frame
 * — and the project's only 3D dependency (react-three-fiber) is reserved
 * for the marketing hero, so this adds nothing to the bundle.
 *
 * Positions are seeded from the combination index itself, so the field
 * looks identical on every load and a given combination is always in the
 * same place. Motion is a slow drift with a soft bounce off the jar wall;
 * "energised" merely raises the drift while a generation runs. Under
 * prefers-reduced-motion the field is painted once and never animates.
 *
 * The canvas is never the only way to the data: the parent renders the
 * same information as text, and hovering is mirrored into a live region.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { COMBO_UNIVERSE, comboLabel } from "@/lib/combos/universe";
import { tierOf, type ComboIndex, type Tier } from "@/lib/combos/index-build";
import { TIER_VAR } from "./tiers";

/** Deterministic per-combination pseudo-randomness — no Math.random. */
function hash01(n: number, salt: number): number {
  let x = (n + 1) * 2654435761 + salt * 40503;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 2246822519) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  return x / 4294967296;
}

type Hover = { combo: number; count: number; x: number; y: number } | null;

export function ComboUniverse({
  index,
  selected,
  highlight,
  energised,
  onSelect,
  height = 420,
}: {
  index: ComboIndex | null;
  selected: number;
  /** Combinations to mark — the generated sets, drawn as they land. */
  highlight: number[];
  energised: boolean;
  onSelect: (combo: number) => void;
  height?: number;
}) {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: height });
  const [hover, setHover] = useState<Hover>(null);

  // Unit-circle positions and velocities, stable across renders.
  const field = useMemo(() => {
    const x = new Float32Array(COMBO_UNIVERSE);
    const y = new Float32Array(COMBO_UNIVERSE);
    const vx = new Float32Array(COMBO_UNIVERSE);
    const vy = new Float32Array(COMBO_UNIVERSE);
    for (let i = 0; i < COMBO_UNIVERSE; i++) {
      const r = Math.sqrt(hash01(i, 1));
      const theta = hash01(i, 2) * Math.PI * 2;
      x[i] = r * Math.cos(theta);
      y[i] = r * Math.sin(theta);
      const speed = 0.006 + hash01(i, 3) * 0.012;
      const dir = hash01(i, 4) * Math.PI * 2;
      vx[i] = Math.cos(dir) * speed;
      vy[i] = Math.sin(dir) * speed;
    }
    return { x, y, vx, vy };
  }, []);

  // Points grouped by frequency tier, so a frame is five fill styles
  // instead of ten thousand.
  const buckets = useMemo(() => {
    const out: number[][] = [[], [], [], [], []];
    for (let c = 0; c < COMBO_UNIVERSE; c++) {
      out[index ? tierOf(index.countOf(c)) : 0].push(c);
    }
    return out as [number[], number[], number[], number[], number[]];
  }, [index]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Measure once up front: a ResizeObserver callback is delivered on the
    // frame lifecycle, which a hidden or throttled tab may never run — and
    // an unmeasured canvas silently renders at its intrinsic 300×150.
    setSize({ w: el.getBoundingClientRect().width, h: height });
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  const colors = useRef<string[]>([]);
  useEffect(() => {
    // Resolve the theme tokens once — the canvas can't use CSS variables.
    const style = getComputedStyle(document.documentElement);
    colors.current = ([0, 1, 2, 3, 4] as Tier[]).map((t) => {
      const name = TIER_VAR[t].replace("var(", "").replace(")", "");
      return style.getPropertyValue(name).trim() || "#888";
    });
  }, []);

  const geometry = useCallback(() => {
    const { w, h } = size;
    return { cx: w / 2, cy: h / 2, rx: Math.max(10, w / 2 - 14), ry: Math.max(10, h / 2 - 14) };
  }, [size]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || size.w === 0) return;
    const { cx, cy, rx, ry } = geometry();
    ctx.clearRect(0, 0, size.w, size.h);

    // The jar.
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 6, ry + 6, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(236,233,224,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let t = 0; t < 5; t++) {
      ctx.fillStyle = colors.current[t] ?? "#888";
      ctx.globalAlpha = t === 0 ? 0.35 : 0.85;
      const list = buckets[t];
      const size2 = t === 0 ? 1.6 : 2.2;
      for (let k = 0; k < list.length; k++) {
        const i = list[k];
        ctx.fillRect(cx + field.x[i] * rx, cy + field.y[i] * ry, size2, size2);
      }
    }
    ctx.globalAlpha = 1;

    const ring = (combo: number, colour: string, radius: number) => {
      ctx.beginPath();
      ctx.arc(cx + field.x[combo] * rx, cy + field.y[combo] * ry, radius, 0, Math.PI * 2);
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(cx + field.x[combo] * rx, cy + field.y[combo] * ry, 2.4, 0, Math.PI * 2);
      ctx.fill();
    };

    for (const combo of highlight) ring(combo, colors.current[4] ?? "#E1664C", 8);
    ring(selected, "#ECE9E0", 6);
    if (hover && hover.combo !== selected) ring(hover.combo, "rgba(236,233,224,0.6)", 5);
  }, [buckets, field, geometry, highlight, hover, selected, size.h, size.w]);

  // Resize the backing store for the device pixel ratio, then paint.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }, [size, draw]);

  // Drift. One rAF loop, stopped entirely when motion is reduced.
  useEffect(() => {
    if (reduce || size.w === 0) return;
    let raf = 0;
    let last = performance.now();
    const speed = energised ? 3.2 : 1;
    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      const { x, y, vx, vy } = field;
      for (let i = 0; i < COMBO_UNIVERSE; i++) {
        x[i] += vx[i] * dt * speed;
        y[i] += vy[i] * dt * speed;
        const d2 = x[i] * x[i] + y[i] * y[i];
        if (d2 > 1) {
          // Soft reflection off the jar wall — no jitter, no escape.
          const d = Math.sqrt(d2);
          const nx = x[i] / d;
          const ny = y[i] / d;
          const dot = vx[i] * nx + vy[i] * ny;
          vx[i] -= 2 * dot * nx;
          vy[i] -= 2 * dot * ny;
          x[i] = nx * 0.999;
          y[i] = ny * 0.999;
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draw, energised, field, reduce, size.w]);

  useEffect(() => {
    if (reduce) draw();
  }, [reduce, draw, highlight, selected]);

  /** Nearest point to a pointer position, within a forgiving radius. */
  const pick = (clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { cx, cy, rx, ry } = geometry();
    let best = -1;
    let bestD = 14 * 14; // generous for touch
    for (let i = 0; i < COMBO_UNIVERSE; i++) {
      const dx = cx + field.x[i] * rx - px;
      const dy = cy + field.y[i] * ry - py;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best >= 0 ? best : null;
  };

  const onMove = (e: React.PointerEvent) => {
    const combo = pick(e.clientX, e.clientY);
    if (combo == null) {
      setHover(null);
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    setHover({
      combo,
      count: index?.countOf(combo) ?? 0,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div ref={wrapRef} className="relative" style={{ height }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`All 10,000 combinations. ${
          index
            ? `${index.distribution().seen.toLocaleString()} have been drawn at least once; ${index
                .distribution()
                .neverSeen.toLocaleString()} never have.`
            : ""
        } The same figures are listed below the graphic.`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const combo = pick(e.clientX, e.clientY);
          if (combo != null) onSelect(combo);
        }}
        className="touch-pan-y cursor-crosshair"
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-edge bg-panel/95 px-2.5 py-1.5 text-[11px] shadow-card backdrop-blur-sm"
          style={{
            left: Math.min(Math.max(hover.x + 12, 4), Math.max(4, size.w - 150)),
            top: Math.max(4, hover.y - 40),
          }}
        >
          <div className="font-mono tabular-nums tracking-[0.18em] text-text">
            {comboLabel(hover.combo)}
          </div>
          <div className="text-dim">Historical hits: {hover.count}</div>
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        {hover ? `${comboLabel(hover.combo)}, ${hover.count} historical hits.` : ""}
      </div>
    </div>
  );
}
