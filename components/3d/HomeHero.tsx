"use client";

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
    <Float speed={0.8} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh>
        <torusGeometry args={[1.3, 0.04, 16, 220]} />
        <meshStandardMaterial color="#E9B84A" emissive="#E9B84A" emissiveIntensity={0.45} roughness={0.5} />
      </mesh>
    </Float>
  );
}

function ParticleField({ count = 180, color = "#E9B84A", spread = 9 }: { count?: number; color?: string; spread?: number }) {
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

export default function HomeHero() {
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
