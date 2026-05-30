"use client";

// Tiny client-side wrapper around HomeHero so the home page (a server
// component) can mount it without trying to SSR three.js. R3F + drei +
// three weigh ~250 KB gzipped; we keep them out of the initial JS chunk.

import dynamic from "next/dynamic";

const HomeHero = dynamic(() => import("./HomeHero"), {
  ssr: false,
  // The hero already has its own backdrop (bg-radial-amber); no loading
  // skeleton needed — the scene fades in when ready.
  loading: () => null,
});

export function HomeHeroMount() {
  return <HomeHero />;
}
