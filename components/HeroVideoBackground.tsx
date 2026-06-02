"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Hero video background. Mounted inside the home page's amber-radial section
 * as an absolute-positioned <video>, with a layered darken + amber grading
 * overlay so the existing heading and CTAs stay readable.
 *
 * Reduced-motion: video is paused and stays on its first frame (which the
 * browser shows via `preload="metadata"`). Users who opt out of motion see
 * a still, not nothing.
 *
 * Performance: served from /public/hero-balls.mp4 (~5.6 MB). For the home
 * page only — every other route is unaffected. The video is `preload="auto"`
 * but the section is above the fold so this is the right call; downstream
 * we can transcode to WebM/h.264 multi-source if we want it lighter.
 */
export function HeroVideoBackground() {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (reduce) {
      v.pause();
      v.currentTime = 0;
    } else {
      // Some browsers (esp. Safari iOS) refuse autoplay without an explicit
      // play() call after the video element mounts. Quiet the rejection
      // promise — if it fails (e.g. tab is backgrounded), the next user
      // gesture will start it.
      v.play().catch(() => {});
    }
  }, [reduce]);

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-2xl"
      aria-hidden
    >
      <video
        ref={ref}
        src="/hero-balls.mp4"
        poster="/hero-balls-poster.svg"
        autoPlay={!reduce}
        muted
        loop
        playsInline
        preload="auto"
        // Decorative: never indexed as a video result, paired with
        // X-Robots-Tag in public/_headers and a Disallow in robots.txt.
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Darken pass — keeps text legible over the bright balls. */}
      <div className="absolute inset-0 bg-ink/65" />
      {/* Amber radial wash from the top — re-establishes the existing
          bg-radial-amber feel above the video. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(233,184,74,0.18), transparent 65%)",
        }}
      />
      {/* Edge vignette — pushes the eye toward the center where the copy is. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(14,15,19,0.55) 100%)",
        }}
      />
    </div>
  );
}
