"use client";

/**
 * The pinch/pan surface inside ChartZoom's overlay — split into its own
 * module so react-zoom-pan-pinch is never part of a server render.
 *
 * WHY THIS FILE EXISTS
 *
 * ChartZoom used to import TransformWrapper directly. The overlay only
 * mounts after a click, so the library never ran during SSR — but the
 * import still did, and on Cloudflare's runtime evaluating it inside the
 * worker left the client reference unresolved. Every digit game's
 * /positional page (the only route using ChartZoom) then 500'd in
 * production with:
 *
 *   TypeError: Cannot read properties of undefined (reading 'default')
 *     at resolveClientReference
 *
 * Fifteen URLs, and Search Console was reporting them as server errors.
 * Nothing reproduced locally: `next dev` and `next start` fail on every
 * edge route here, and next-on-pages cannot run on Windows — the tell was
 * that the one chunk unique to /positional was react-zoom-pan-pinch.
 *
 * Loading it through next/dynamic with ssr:false (the same pattern
 * components/3d/*Mount.tsx uses for react-three-fiber) keeps it out of the
 * server bundle entirely. The chart itself still server-renders, so the
 * heatmap table remains in the crawlable HTML; only the zoom surface is
 * client-only, and it now downloads when someone actually opens it.
 */

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function ChartZoomSurface({ children }: { children: React.ReactNode }) {
  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.5}
      maxScale={6}
      wheel={{ step: 0.2 }}
      doubleClick={{ mode: "reset" }}
      panning={{ velocityDisabled: false }}
    >
      <TransformComponent
        wrapperStyle={{ width: "100%", height: "100%" }}
        contentStyle={{ width: "100%", height: "100%" }}
      >
        <div className="w-full h-full p-4">{children}</div>
      </TransformComponent>
    </TransformWrapper>
  );
}
