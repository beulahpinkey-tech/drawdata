"use client";

/**
 * BallfieldBackground — site-wide scroll-driven 3D lottery-ball field.
 *
 * The user's brief (see chat 2026-06-10): the lottery-ball imagery
 * should live BEHIND every page, and the balls should "reveal" one by
 * one as the user scrolls — a scroll-vibes background like a 3D
 * portfolio site, while all text/headings stay exactly as they are.
 *
 * How it works
 * ─────────────
 * · 14 numbered spheres at varied depths (z −6 … −1.5). Each ball has
 *   a `revealAt` threshold in [0, 0.85]. As page scroll progress
 *   passes a ball's threshold, it scales/fades in over an 8% scroll
 *   window (smoothstep — no pop).
 * · Parallax: each ball also drifts vertically with scroll at a rate
 *   proportional to its depth — closer balls move faster, far balls
 *   barely move. Classic depth cue.
 * · Ambient: soft per-ball bob + slow self-rotation (≤ 0.15 rad/s).
 * · Numbers are painted onto each sphere via an offscreen 2D canvas
 *   (radial-shaded ball color + white patch + digit) → CanvasTexture.
 *   No WebGL font loading, matches the NumberBall look.
 * · Scroll progress = scrollY / (docHeight − viewport), read each
 *   frame from a ref (passive listener, no re-renders per scroll).
 *   Works on every route automatically — short pages just reveal
 *   fewer balls; long pages reveal the full set.
 *
 * House-style guardrails
 * ──────────────────────
 * · Colors come from the DrawData palette (amber/teal/coral) plus
 *   muted deep variants — not candy/casino colors.
 * · Opacity is capped low (0.5–0.7) and the field sits behind a
 *   vignette so data panels always win the eye.
 * · prefers-reduced-motion: every ball renders at full scale, no
 *   scroll reveal, no bob, frameloop="demand" (single still frame).
 * · pointer-events-none + fixed inset-0 z-0 — never intercepts UI.
 * · Perf: 14 meshes (32-segment spheres), 1 ambient + 2 lights,
 *   dpr capped at 1.5. Well inside the skill's budget.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";

// ─── Ball spec table ──────────────────────────────────────────────
// Positions hand-placed to frame content (center column stays clear).
// revealAt staggers the scroll reveal; depth drives parallax speed.
type BallSpec = {
  n: number;            // digit painted on the ball
  color: string;        // base color (house palette + deep variants)
  x: number; y: number; z: number;
  r: number;            // radius
  revealAt: number;     // 0..0.85 — scroll progress threshold
};

const BALLS: BallSpec[] = [
  { n: 9, color: "#E9B84A", x: -4.6, y:  2.0, z: -3.0, r: 0.85, revealAt: 0.00 },
  { n: 8, color: "#2E4B8F", x:  4.4, y:  2.4, z: -2.6, r: 0.95, revealAt: 0.00 },
  { n: 6, color: "#1C1F28", x:  0.9, y:  2.9, z: -4.5, r: 0.45, revealAt: 0.05 },
  { n: 5, color: "#E1664C", x:  0.4, y:  1.2, z: -3.8, r: 0.50, revealAt: 0.10 },
  { n: 2, color: "#7A5BC8", x: -1.2, y:  0.2, z: -3.2, r: 0.60, revealAt: 0.16 },
  { n: 1, color: "#5BC8B0", x:  2.6, y: -0.1, z: -2.8, r: 0.65, revealAt: 0.22 },
  { n: 3, color: "#C9A23A", x: -5.0, y: -0.6, z: -4.2, r: 1.05, revealAt: 0.30 },
  { n: 4, color: "#A33B28", x:  5.2, y: -0.8, z: -4.6, r: 0.95, revealAt: 0.36 },
  { n: 7, color: "#3E7A48", x: -3.2, y: -2.4, z: -2.4, r: 0.90, revealAt: 0.44 },
  { n: 4, color: "#B0486E", x:  0.6, y: -1.8, z: -4.0, r: 0.40, revealAt: 0.52 },
  { n: 3, color: "#C9A23A", x:  3.9, y: -2.6, z: -3.0, r: 0.80, revealAt: 0.60 },
  { n: 0, color: "#5BC8B0", x: -1.8, y:  3.4, z: -5.5, r: 0.55, revealAt: 0.68 },
  { n: 5, color: "#2E4B8F", x: -4.2, y:  4.0, z: -6.0, r: 0.60, revealAt: 0.76 },
  { n: 8, color: "#E9B84A", x:  4.8, y:  4.2, z: -5.8, r: 0.60, revealAt: 0.84 },
];

// ─── Texture painter — lottery-ball face on a 2D canvas ──────────
function makeBallTexture(color: string, n: number): THREE.CanvasTexture {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d")!;
  // Base — radial shading from upper-left highlight to deep edge.
  const grad = ctx.createRadialGradient(S * 0.35, S * 0.3, S * 0.1, S * 0.5, S * 0.5, S * 0.75);
  const c = new THREE.Color(color);
  const lighter = c.clone().lerp(new THREE.Color("#ffffff"), 0.35).getStyle();
  const darker = c.clone().lerp(new THREE.Color("#000000"), 0.45).getStyle();
  grad.addColorStop(0, lighter);
  grad.addColorStop(0.55, c.getStyle());
  grad.addColorStop(1, darker);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  // White number patch — slightly off-center so the sphere wrap
  // presents it like a real lotto ball.
  ctx.beginPath();
  ctx.arc(S * 0.5, S * 0.5, S * 0.21, 0, Math.PI * 2);
  ctx.fillStyle = "#ECE9E0";
  ctx.fill();
  // Digit — mono to match the site's numeral voice.
  ctx.fillStyle = "#0E0F13";
  ctx.font = `700 ${S * 0.24}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), S * 0.5, S * 0.51);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ─── A single ball ────────────────────────────────────────────────
function Ball({
  spec,
  scrollRef,
  reduce,
  seed,
}: {
  spec: BallSpec;
  scrollRef: React.MutableRefObject<number>;
  reduce: boolean;
  seed: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => makeBallTexture(spec.color, spec.n), [spec.color, spec.n]);
  useEffect(() => () => texture.dispose(), [texture]);

  // Depth factor: z −6 (far) → slow, z −1.5 (near) → fast.
  const parallax = (6 + spec.z) / 4.5 + 0.25; // ~0.25 … 1.25

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const p = scrollRef.current;
    // Reveal: scale + opacity ramp over an 8% scroll window.
    const reveal = reduce ? 1 : smoothstep(spec.revealAt, spec.revealAt + 0.08, p);
    m.scale.setScalar(spec.r * (0.6 + 0.4 * reveal));
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.opacity = reveal * 0.7;
    if (reduce) {
      m.position.set(spec.x, spec.y, spec.z);
      return;
    }
    const t = clock.elapsedTime;
    // Parallax drift + soft per-ball bob (seeded so they desync).
    m.position.x = spec.x + Math.sin(t * 0.22 + seed) * 0.12;
    m.position.y = spec.y - p * 3.2 * parallax + Math.cos(t * 0.3 + seed * 2) * 0.1;
    m.position.z = spec.z;
    m.rotation.y = t * 0.12 + seed;
    m.rotation.x = Math.sin(t * 0.1 + seed) * 0.15;
  });

  return (
    <mesh ref={mesh} position={[spec.x, spec.y, spec.z]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.35}
        metalness={0.08}
        transparent
        opacity={reduce ? 0.7 : 0}
      />
    </mesh>
  );
}

// ─── Scene ────────────────────────────────────────────────────────
function Scene({ reduce }: { reduce: boolean }) {
  const scrollRef = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      scrollRef.current = Math.min(1, window.scrollY / max);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Re-measure on route-driven height changes.
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 5, 3]} intensity={0.7} />
      <pointLight position={[-5, -3, 2]} intensity={0.25} color="#E9B84A" />
      {BALLS.map((b, i) => (
        <Ball key={i} spec={b} scrollRef={scrollRef} reduce={reduce} seed={i * 1.7} />
      ))}
    </>
  );
}

export default function BallfieldBackground() {
  const reduce = useReducedMotion();
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 4], fov: 50 }}
        frameloop={reduce ? "demand" : "always"}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene reduce={!!reduce} />
      </Canvas>
      {/* Vignette — keeps the field below the eye line of the data.
          Center column darkened so panels/text always win contrast. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 40%, rgba(14,15,19,0.62), rgba(14,15,19,0.18) 75%, rgba(14,15,19,0.05) 100%)",
        }}
      />
    </div>
  );
}
