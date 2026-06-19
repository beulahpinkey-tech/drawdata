"use client";

/**
 * AnimatedText — character-by-character scroll-driven reveal.
 *
 * Each character starts at opacity 0.2 and brightens to 1 as the
 * paragraph scrolls through the viewport window ['start 0.8',
 * 'end 0.2'] — the portfolio-style "the text reads itself in as you
 * scroll" effect. Words are kept as inline-blocks so wrapping never
 * breaks mid-word.
 *
 * prefers-reduced-motion renders the plain paragraph.
 */

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

export function AnimatedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.2"],
  });

  if (reduce) {
    return (
      <p ref={ref} className={className}>
        {text}
      </p>
    );
  }

  const words = text.split(" ");
  const total = text.length;
  let cursor = 0;

  return (
    <p ref={ref} className={className} aria-label={text}>
      {words.map((word, wi) => {
        const start = cursor;
        cursor += word.length + 1; // +1 for the following space
        return (
          <span
            key={wi}
            aria-hidden
            style={{ display: "inline-block", whiteSpace: "pre" }}
          >
            {word.split("").map((ch, ci) => (
              <Char
                key={ci}
                ch={ch}
                progress={scrollYProgress}
                start={(start + ci) / total}
                end={(start + ci + 1) / total}
              />
            ))}
            {wi < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </p>
  );
}

function Char({
  ch,
  progress,
  start,
  end,
}: {
  ch: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const opacity = useTransform(progress, [start, end], [0.2, 1]);
  return <motion.span style={{ opacity }}>{ch}</motion.span>;
}
