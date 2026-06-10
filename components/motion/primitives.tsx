"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import type { Transition, Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

// Aligned with ShowmoreInteraction spec — same spring across the app.
export const spring: Transition = { type: "spring", bounce: 0.4, duration: 1 };
// Phase 3: ease tuple = the same curve as --ease-premium
// (cubic-bezier(0.22, 1, 0.36, 1)). One easing across the whole site.
export const ease: Transition = { duration: 0.3, ease: [0.22, 1, 0.36, 1] };

export function useMotion() {
  const reduce = useReducedMotion();
  return { reduce };
}

/**
 * Stagger reveal — wrap a section to animate children in sequence on mount.
 *
 * `intensity`:
 *   "default" — bouncy spring, 50 ms between children. Best for ≤ 8 items.
 *   "fast"    — snappy ease, 25 ms between children, no blur. Best for grids
 *               of 20+ where a 1-second spring per item would crawl.
 */
type Intensity = "default" | "fast";

const StaggerContext = createContext<Intensity>("default");

export function StaggerGroup({
  children,
  className,
  delay = 0,
  intensity = "default",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  intensity?: Intensity;
}) {
  const { reduce } = useMotion();
  const stagger = intensity === "fast" ? 0.025 : 0.05;
  const variants: Variants = {
    hidden: { opacity: reduce ? 1 : 0 },
    show: {
      opacity: 1,
      transition: reduce
        ? { duration: 0 }
        : { staggerChildren: stagger, delayChildren: delay },
    },
  };
  return (
    <StaggerContext.Provider value={intensity}>
      <motion.div
        className={className}
        variants={variants}
        initial="hidden"
        animate="show"
      >
        {children}
      </motion.div>
    </StaggerContext.Provider>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { reduce } = useMotion();
  const intensity = useContext(StaggerContext);
  const variants: Variants =
    intensity === "fast"
      ? {
          hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 6 },
          show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
        }
      : {
          hidden: reduce ? { opacity: 1 } : { opacity: 0, scale: 0.95, filter: "blur(4px)" },
          show: { opacity: 1, scale: 1, filter: "blur(0px)", transition: spring },
        };
  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Route-change transition: re-mount the wrapper on pathname change so the
 * CSS keyframe animation re-fires.
 *
 * IMPORTANT: this used to use AnimatePresence with `mode="wait"`, which on
 * the Next.js App Router could occasionally get wedged — the new page would
 * mount but its `initial={opacity:0}` state was never animated to 1,
 * leaving the body blank until a hard refresh. Keying a plain div on
 * pathname and animating with CSS is bulletproof: the old node unmounts
 * synchronously and the new node always becomes visible.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { reduce } = useMotion();
  return (
    <div key={pathname} className={reduce ? undefined : "animate-fade-up"}>
      {children}
    </div>
  );
}

/**
 * Count-up animation for numeric displays. Mounts at `from` and animates to `to`.
 */
export function CountUp({
  value,
  decimals = 0,
  className,
  suffix,
}: {
  value: number;
  decimals?: number;
  className?: string;
  suffix?: string;
}) {
  const { reduce } = useMotion();
  const [display, setDisplay] = useState<number>(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const start = display;
    const delta = value - start;
    const duration = 600;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);
  return (
    <span className={className}>
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/**
 * ScrollReveal — viewport-triggered entrance for further-down sections.
 *
 * Phase 3 spec: every section's children fade-up 24px with 60ms stagger,
 * triggered at 20% viewport visibility, once only. Use this for sections
 * BELOW the fold; use <StaggerGroup> for above-the-fold groups that
 * should animate on initial mount.
 *
 * One element at a time pattern: wrap the section in <ScrollReveal>,
 * and the element fades up when 20% of it enters the viewport. For
 * stagger across children, pass `stagger` and wrap each child in
 * <ScrollReveal.Item>.
 *
 * Reduced motion: instant, no transform.
 */
export function ScrollReveal({
  children,
  className,
  stagger = false,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
  delay?: number;
}) {
  const { reduce } = useMotion();
  if (reduce) return <div className={className}>{children}</div>;
  const variants: Variants = stagger
    ? {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.06, delayChildren: delay },
        },
      }
    : {
        hidden: { opacity: 0, y: 24 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
        },
      };
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

ScrollReveal.Item = function ScrollRevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { reduce } = useMotion();
  if (reduce) return <div className={className}>{children}</div>;
  const variants: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
};

export { motion, AnimatePresence };
