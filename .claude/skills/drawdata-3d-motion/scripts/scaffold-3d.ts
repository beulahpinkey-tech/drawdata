/**
 * Scaffold a Mode-A React Three Fiber component for DrawData.
 *
 * Run:
 *   npx tsx .claude/skills/drawdata-3d-motion/scripts/scaffold-3d.ts \
 *     --pattern hero-scene \
 *     --name HomeHero \
 *     --accent amber \
 *     --intensity medium
 *
 * Writes `components/3d/<Name>.tsx`. Wires nothing else — the caller is
 * expected to add the next/dynamic import on the host page. Refuses to
 * overwrite existing files unless --force is passed.
 *
 * This script intentionally embeds the same canonical skeletons that
 * `references/motion-patterns.md` documents. If you edit the skeletons,
 * keep both in sync — the reference file is what Claude reads when
 * authoring inline; this script is for one-shot generation.
 */

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type Pattern = "orbit" | "particles" | "glow-orb" | "hero-scene";
type Accent = "amber" | "cool" | "hot" | "mixed";
type Intensity = "subtle" | "medium" | "bold";

const ACCENT_HEX: Record<Accent, string> = {
  amber: "#E9B84A",
  cool: "#5BC8B0",
  hot: "#E1664C",
  mixed: "#E9B84A", // primary; secondary picked inside the template
};

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const pattern = (arg("--pattern") || "glow-orb") as Pattern;
const name = arg("--name") || "Hero3D";
const accent = (arg("--accent", "amber") as Accent) ?? "amber";
const intensity = (arg("--intensity", "medium") as Intensity) ?? "medium";
const force = process.argv.includes("--force");

const COMPONENT_DIR = join(process.cwd(), "components", "3d");
mkdirSync(COMPONENT_DIR, { recursive: true });
const outPath = join(COMPONENT_DIR, `${name}.tsx`);
if (existsSync(outPath) && !force) {
  console.error(`Refusing to overwrite ${outPath}. Pass --force to override.`);
  process.exit(1);
}

const primary = ACCENT_HEX[accent];
const secondary = ACCENT_HEX[accent === "amber" ? "cool" : "amber"];

const PARTICLE_COUNT = intensity === "bold" ? 280 : intensity === "medium" ? 180 : 110;
const FLOAT_INTENSITY = intensity === "bold" ? 0.8 : intensity === "medium" ? 0.5 : 0.3;

const TEMPLATES: Record<Pattern, string> = {
  "orbit": `"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";

function OrbitCamera({ radius = 4, speed = 0.06 }: { radius?: number; speed?: number }) {
  const reduce = useReducedMotion();
  const { camera } = useThree();
  useFrame(() => {
    if (reduce) return;
    const t = performance.now() * speed * 0.0005;
    camera.position.x = Math.cos(t) * radius;
    camera.position.z = Math.sin(t) * radius;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function FocalObject() {
  const ref = useRef<THREE.Mesh>(null);
  return (
    <Float speed={1} rotationIntensity={${FLOAT_INTENSITY}} floatIntensity={${FLOAT_INTENSITY}}>
      <mesh ref={ref}>
        <torusGeometry args={[1.1, 0.045, 16, 200]} />
        <meshStandardMaterial color="${primary}" emissive="${primary}" emissiveIntensity={0.45} roughness={0.4} />
      </mesh>
    </Float>
  );
}

export default function ${name}() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 -z-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 4], fov: 45 }}
        frameloop={reduce ? "demand" : "always"}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 4, 2]} intensity={0.4} />
        <OrbitCamera />
        <FocalObject />
      </Canvas>
    </div>
  );
}
`,

  "particles": `"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";

function ParticleField({ count = ${PARTICLE_COUNT}, color = "${primary}", spread = 7 }: { count?: number; color?: string; spread?: number }) {
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
      <pointsMaterial color={color} size={0.025} sizeAttenuation transparent opacity={0.55} />
    </points>
  );
}

export default function ${name}() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 -z-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 50 }}
        frameloop={reduce ? "demand" : "always"}
        gl={{ alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <ParticleField />
      </Canvas>
    </div>
  );
}
`,

  "glow-orb": `"use client";

import { Canvas } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";

function GlowOrb({ color = "${primary}" }: { color?: string }) {
  return (
    <Float speed={1.2} rotationIntensity={${FLOAT_INTENSITY}} floatIntensity={${FLOAT_INTENSITY}}>
      <mesh>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.4} />
      </mesh>
      <pointLight color={color} intensity={1.5} distance={4} />
    </Float>
  );
}

export default function ${name}() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 -z-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 3], fov: 45 }}
        frameloop={reduce ? "demand" : "always"}
        gl={{ alpha: true }}
      >
        <ambientLight intensity={0.25} />
        <GlowOrb />
      </Canvas>
    </div>
  );
}
`,

  "hero-scene": `"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";

function OrbitCamera({ radius = 5, speed = 0.05 }: { radius?: number; speed?: number }) {
  const reduce = useReducedMotion();
  const { camera } = useThree();
  useFrame(() => {
    if (reduce) return;
    const t = performance.now() * speed * 0.0005;
    camera.position.x = Math.cos(t) * radius;
    camera.position.z = Math.sin(t) * radius;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function FocalTorus() {
  return (
    <Float speed={0.8} rotationIntensity={${FLOAT_INTENSITY}} floatIntensity={${FLOAT_INTENSITY}}>
      <mesh>
        <torusGeometry args={[1.3, 0.04, 16, 220]} />
        <meshStandardMaterial color="${primary}" emissive="${primary}" emissiveIntensity={0.45} roughness={0.5} />
      </mesh>
    </Float>
  );
}

function ParticleField({ count = ${PARTICLE_COUNT}, color = "${secondary}", spread = 9 }: { count?: number; color?: string; spread?: number }) {
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
    ref.current.rotation.y += dt * 0.015;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.022} sizeAttenuation transparent opacity={0.5} />
    </points>
  );
}

export default function ${name}() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 -z-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 45 }}
        frameloop={reduce ? "demand" : "always"}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 2]} intensity={0.5} />
        <OrbitCamera />
        <FocalTorus />
        <ParticleField />
      </Canvas>
    </div>
  );
}
`,
};

const template = TEMPLATES[pattern];
if (!template) {
  console.error(`Unknown pattern: ${pattern}. Valid: ${Object.keys(TEMPLATES).join(", ")}`);
  process.exit(1);
}

writeFileSync(outPath, template);
console.log(`Wrote ${outPath} (${pattern}, accent=${accent}, intensity=${intensity})`);
console.log(`\nNext: add this on the host page:`);
console.log(`  import dynamic from "next/dynamic";`);
console.log(`  const ${name} = dynamic(() => import("@/components/3d/${name}"), { ssr: false });`);
console.log(`\nIf react-three/fiber isn't installed yet:`);
console.log(`  npm i three @react-three/fiber @react-three/drei`);
console.log(`  npm i -D @types/three`);
