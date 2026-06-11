"use client";

/**
 * Chart3D — press-to-tilt 3D motion for chart surfaces.
 *
 * Clicking (or touching) anywhere on a chart tilts the whole chart
 * plane in perspective toward the press point — like pushing on a
 * sheet of glass — then springs back on release with the site spring
 * (bounce 0.4). The bar/point you pressed is visually "driven in,"
 * which reads as 3D without fighting the SVG internals (SVG children
 * flatten CSS 3D, so the plane is the right unit of motion).
 *
 * Holding the pointer down and dragging keeps steering the tilt.
 * Keyboard/AT users lose nothing — this is purely decorative; the
 * underlying chart keeps its own tooltips and interactions because
 * pointer events pass through to the SVG as normal.
 *
 * prefers-reduced-motion: renders children with no transform at all.
 */

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";

const SPRING = { stiffness: 320, damping: 22, mass: 0.9 };
const HOVER_TILT = 3.5; // degrees while the cursor glides over the chart
const PRESS_TILT = 8;   // degrees while pressing — the "push the glass" beat

export function Chart3D({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const s = useMotionValue(1);
  const srx = useSpring(rx, SPRING);
  const sry = useSpring(ry, SPRING);
  const ss = useSpring(s, SPRING);

  if (reduce) return <div className={className}>{children}</div>;

  const steer = (e: React.PointerEvent, tilt: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5; // −0.5 … 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5;
    // The cursor's side dips INTO the screen: hovering the right edge
    // rotates the plane so the right side recedes (negative Y-rot
    // for positive nx is screen-correct with CSS rotateY).
    ry.set(nx * 2 * tilt);
    rx.set(-ny * 2 * tilt * 0.6); // less vertical tilt — charts are wide
  };

  const release = () => {
    rx.set(0);
    ry.set(0);
    s.set(1);
  };

  return (
    <div className={className} style={{ perspective: 1100 }}>
      <motion.div
        ref={ref}
        style={{
          rotateX: srx,
          rotateY: sry,
          scale: ss,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        onPointerDown={(e) => {
          steer(e, PRESS_TILT);
          s.set(0.985);
        }}
        onPointerMove={(e) => {
          // Hover glides the plane gently; pressing deepens the tilt.
          // Touch devices skip hover (pointermove without buttons
          // doesn't fire between taps), so they keep press-only.
          steer(e, e.buttons > 0 ? PRESS_TILT : HOVER_TILT);
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") steer(e, HOVER_TILT);
        }}
        onPointerUp={(e) => {
          // Mouse: settle back to hover-follow; touch: spring home.
          if (e.pointerType === "mouse") {
            s.set(1);
            steer(e, HOVER_TILT);
          } else {
            release();
          }
        }}
        onPointerLeave={release}
        onPointerCancel={release}
      >
        {children}
      </motion.div>
    </div>
  );
}
