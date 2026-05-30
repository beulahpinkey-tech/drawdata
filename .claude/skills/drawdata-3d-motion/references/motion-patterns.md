# Motion patterns — canonical skeletons

For each of the 8 patterns, this file gives you a working skeleton. Tune the parameters from the user's spec (intensity, accent, motion mode), but don't reinvent the structure. Anything **not** here, ask before authoring.

## Contents

1. [`tilt` (Mode B)](#tilt) — hover tilt on a card
2. [`parallax` (Mode B)](#parallax) — mouse/scroll-driven layered depth
3. [`orbit` (Mode A)](#orbit) — camera orbit around an object
4. [`particles` (Mode A)](#particles) — drifting points field
5. [`depth-stack` (Mode B)](#depth-stack) — layered cards with z offset
6. [`glow-orb` (Mode A)](#glow-orb) — pulsing volumetric light
7. [`floating-card` (Mode B)](#floating-card) — soft bob + shadow
8. [`hero-scene` (Mode A)](#hero-scene) — composed background scene

---

## Common preamble (Mode A)

Every Mode A component starts with this shell. Drop your scene contents inside `<Canvas>`.

```tsx
"use client";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";

export default function MyScene() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 -z-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 4], fov: 45 }}
        frameloop={reduce ? "demand" : "always"}
        gl={{ antialias: true, alpha: true }}
      >
        {/* lights */}
        <ambientLight intensity={0.4} />
        {/* scene */}
      </Canvas>
    </div>
  );
}
```

Notes:
- `pointer-events-none` keeps clicks falling through to UI behind.
- `-z-0` keeps it under hero text (which should be `z-10`).
- `dpr={[1, 1.5]}` caps pixel ratio.
- `frameloop="demand"` when reduced motion is on — no animation loop.

---

## tilt

Mode B. CSS-3D + Framer Motion. No three.js needed.

```tsx
"use client";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useReducedMotion } from "framer-motion";

export function TiltCard({ children, intensity = 8 }: { children: React.ReactNode; intensity?: number }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [intensity, -intensity]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-intensity, intensity]), { stiffness: 200, damping: 20 });

  if (reduce) return <div>{children}</div>;

  return (
    <motion.div
      onPointerMove={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { mx.set(0.5); my.set(0.5); }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", transformPerspective: 600 }}
    >
      {children}
    </motion.div>
  );
}
```

`intensity`: `subtle = 4`, `medium = 8`, `bold = 14`.

To apply to existing JSX, wrap the panel:

```tsx
<TiltCard intensity={8}>
  <Link href="/wi-pick3" className="panel p-6 …">…</Link>
</TiltCard>
```

---

## parallax

Mode B. Inner layers translate against scroll or mouse position. Good for panel headers with a "title plane" + "subtitle plane".

```tsx
"use client";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

export function ParallaxLayer({ depth = 1, children, className = "" }: { depth?: number; children: React.ReactNode; className?: string }) {
  // depth: 0 = stationary, 1 = strong shift. Negative = inverse direction.
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(useTransform(mx, [-1, 1], [-12 * depth, 12 * depth]), { stiffness: 120, damping: 18 });
  const y = useSpring(useTransform(my, [-1, 1], [-8 * depth, 8 * depth]), { stiffness: 120, damping: 18 });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
    >
      {children}
    </motion.div>
  );
}
```

Pair multiple layers inside one panel with `depth=0.3`, `depth=0.6`, `depth=1.0` for a stacked feel.

---

## orbit

Mode A. Camera slowly orbits a central object. Use for hero scenes where one mesh is the focal point.

```tsx
import { Float, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";

function OrbitCamera({ radius = 4, speed = 0.08 }) {
  const reduce = useReducedMotion();
  const { camera } = useThree();
  useFrame((_, dt) => {
    if (reduce) return;
    const t = performance.now() * speed * 0.0005;
    camera.position.x = Math.cos(t) * radius;
    camera.position.z = Math.sin(t) * radius;
    camera.lookAt(0, 0, 0);
  });
  return null;
}
```

Don't include `<OrbitControls>` in the user's final scene — orbit is automatic, drag controls aren't appropriate for ambient background.

---

## particles

Mode A. Ambient drifting point field. The single most over-used 3D effect; keep it extremely subtle for DrawData.

```tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ParticleField({ count = 150, color = "#5BC8B0", spread = 6 }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3 + 0] = (Math.random() - 0.5) * spread;
      a[i * 3 + 1] = (Math.random() - 0.5) * spread;
      a[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    return a;
  }, [count, spread]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.02} sizeAttenuation transparent opacity={0.5} />
    </points>
  );
}
```

Defaults: 150 points, teal, 6-unit cube. Don't exceed 200 unless the spec says `bold`.

---

## depth-stack

Mode B. A grid of cards that lift and tilt as a group on hover — like a stack of physical cards splaying when you graze them.

```tsx
<div className="grid grid-cols-3 gap-4 [perspective:1200px]">
  {items.map((it, i) => (
    <motion.div
      key={it.id}
      className="panel p-6"
      whileHover={{ z: 24, rotateX: -4 }}
      transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* content */}
    </motion.div>
  ))}
</div>
```

Key: `[perspective:1200px]` on the grid container, `transformStyle: "preserve-3d"` on each card.

---

## glow-orb

Mode A. Single mesh + bloom. Used for idle / waiting states.

```tsx
import { Float } from "@react-three/drei";

function GlowOrb({ color = "#E9B84A" }) {
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh>
        <sphereGeometry args={[0.6, 48, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.4} />
      </mesh>
      <pointLight color={color} intensity={1.5} distance={4} />
    </Float>
  );
}
```

Skip `<EffectComposer>` + Bloom unless `intensity = "bold"` — they add 30 KB and a render pass.

---

## floating-card

Mode B. A panel that softly bobs and lifts on hover. Used for the Lab idle prompt or a featured tile.

```tsx
<motion.div
  className="panel p-6"
  animate={reduce ? {} : { y: [0, -4, 0] }}
  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
  whileHover={{ y: -8, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
>
  {children}
</motion.div>
```

---

## hero-scene

Mode A. The "big one" — composed scene with orbit camera + a focal object + ambient particles + soft glow. Reserve for `/` and `/picker` only.

```tsx
<Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 45 }} frameloop={reduce ? "demand" : "always"}>
  <ambientLight intensity={0.35} />
  <directionalLight position={[3, 4, 2]} intensity={0.5} />
  <OrbitCamera radius={5} speed={0.06} />
  <Float speed={0.8} rotationIntensity={0.3} floatIntensity={0.4}>
    <mesh>
      <torusGeometry args={[1.2, 0.04, 16, 200]} />
      <meshStandardMaterial color={tokens.accent} emissive={tokens.accent} emissiveIntensity={0.4} />
    </mesh>
  </Float>
  <ParticleField count={180} color={tokens.cool} spread={8} />
</Canvas>
```

Wrap in `next/dynamic` with `ssr: false` when imported on the page.

---

## Reduced-motion checklist

Before you finish any output, search the file for these:
- [ ] Does `useFrame` short-circuit on `reduce`?
- [ ] Does any `animate` prop have a `reduce ? {} : {…}` form?
- [ ] Does Mode A use `frameloop={reduce ? "demand" : "always"}`?
- [ ] Are you using the site's standard spring (`bounce: 0.4, duration: 1`) for hover/tap?

If any of these are no, fix before handing back to the user.
