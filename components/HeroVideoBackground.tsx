"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Hero video background. Mounted inside the home page's amber-radial section
 * as an absolute-positioned <video>, with a layered darken + amber grading
 * overlay so the existing heading and CTAs stay readable.
 *
 * Reduced-motion: video is never mounted; users see only the poster.
 *
 * Performance — LCP fix (2026-06-06):
 *   The original implementation set `preload="auto"` on a 5.8 MB MP4 in
 *   the hero region. That tanked LCP to 13s P50 / 58s P99 in Cloudflare
 *   Web Analytics — the browser couldn't measure the largest contentful
 *   element until it had decided whether the video or the H1 text won,
 *   and on anything slower than fast 4G the video download blocked that
 *   decision.
 *
 *   New behavior:
 *   - Until React hydrates, the section renders WITHOUT the <video>.
 *     The CSS poster background paints instantly and counts as the LCP
 *     element, so LCP becomes whatever the H1 paint time is (sub-second).
 *   - After window 'load' (everything else is done), we mount the video
 *     with `preload="metadata"`. The 5.8 MB transfer happens off the
 *     critical path; the poster smoothly cross-fades into the video.
 *   - The CSS poster is a 1 KB SVG. The MP4 only ever loads if the user
 *     stays on the page long enough for it to matter.
 */
export function HeroVideoBackground() {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (reduce) return; // Reduced motion: never load the video.
    // Wait for the document to be fully loaded so the video can't
    // interfere with anything still on the critical path.
    if (document.readyState === "complete") {
      setShowVideo(true);
    } else {
      const onLoad = () => setShowVideo(true);
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }
  }, [reduce]);

  useEffect(() => {
    if (!showVideo) return;
    const v = ref.current;
    if (!v) return;
    // Safari iOS won't autoplay without an explicit play() call.
    v.play().catch(() => {});
  }, [showVideo]);

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-2xl"
      aria-hidden
      style={{
        // Paints instantly — no network needed. The SVG is 1 KB and is
        // the only "background" until/unless the video loads.
        backgroundImage: "url(/hero-balls-poster.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {showVideo && (
        <video
          ref={ref}
          src="/hero-balls.mp4"
          poster="/hero-balls-poster.svg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          // Decorative: never indexed as a video result, paired with
          // X-Robots-Tag in public/_headers and a Disallow in robots.txt.
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
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
