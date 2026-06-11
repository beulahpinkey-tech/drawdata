"use client";

/**
 * Magnet — mouse-following magnetic hover (portfolio-style).
 *
 * When the cursor comes within `padding` px of the element's bounds,
 * the element translates toward the cursor by (distance / strength).
 * Snaps back smoothly when the cursor leaves the active zone.
 *
 * Matches the reference spec: transform transition 0.3s ease-out while
 * active, 0.6s ease-in-out on release. translate3d for GPU compositing.
 * prefers-reduced-motion renders children statically.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function Magnet({
  children,
  padding = 100,
  strength = 3,
  className,
}: {
  children: React.ReactNode;
  padding?: number;
  strength?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inZone =
        e.clientX > r.left - padding &&
        e.clientX < r.right + padding &&
        e.clientY > r.top - padding &&
        e.clientY < r.bottom + padding;
      if (inZone) {
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        setOffset({ x: (e.clientX - cx) / strength, y: (e.clientY - cy) / strength });
        setActive(true);
      } else if (active) {
        setOffset({ x: 0, y: 0 });
        setActive(false);
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduce, padding, strength, active]);

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: active
          ? "transform 0.3s ease-out"
          : "transform 0.6s ease-in-out",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
