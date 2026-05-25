"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ButtonHTMLAttributes, ForwardedRef } from "react";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
}

const STYLES: Record<Variant, string> = {
  primary:
    "bg-accent text-ink hover:bg-accent/90 font-medium",
  secondary:
    "border border-edge text-text bg-white/[0.02] hover:bg-white/[0.05]",
  ghost:
    "text-dim hover:text-text hover:bg-white/[0.04]",
  danger:
    "border border-hot/40 text-hot hover:bg-hot/[0.06]",
};

export const MotionButton = forwardRef(function MotionButton(
  { variant = "secondary", full, className = "", children, ...rest }: Props,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  const reduce = useReducedMotion();
  const motionProps = reduce
    ? {}
    : {
        whileHover: { y: -1 },
        whileTap: { scale: 0.96 },
        transition: { type: "spring" as const, bounce: 0.4, duration: 0.4 },
      };
  return (
    <motion.button
      ref={ref}
      {...(motionProps as any)}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
        STYLES[variant]
      } ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
