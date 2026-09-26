"use client";

/**
 * Renders the server-built static table until the interactive view has
 * loaded on the client, then swaps to it.
 *
 * WHY
 *
 * /positional has the largest client tree on the site, and past some size
 * next-on-pages ships this route with a client reference the Cloudflare
 * worker cannot resolve. Every digit game's page then 500s in production —
 * fifteen URLs, all logged by Search Console as server errors — while the
 * RSC payload for the same URL renders fine at 200. It is a bundling
 * threshold, not a bad component: rendering each of the page's client
 * components alone on a preview deploy worked, and merely adding an unused
 * import moved the chunk boundary and made the whole page pass.
 *
 * Chasing that boundary is a losing game — any future edit can cross it
 * again, silently, in production only. So the route no longer server-renders
 * the heavy tree at all. This mount is the only client component in the SSR
 * graph (useState + useEffect, no chart libraries), and the interactive view
 * arrives via next/dynamic with ssr:false.
 *
 * Crawlers keep the data: `children` is a plain server-rendered table of the
 * same numbers, present in the initial HTML, shown until the swap. No
 * hydration mismatch, because the first client render returns `children` too.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Game } from "@/lib/types";

const PositionalView = dynamic(
  () => import("./PositionalView").then((m) => m.PositionalView),
  { ssr: false, loading: () => null },
);

export function PositionalMount({
  game,
  agg,
  children,
}: {
  game: Game;
  agg: unknown;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;
  return <PositionalView game={game} agg={agg} />;
}
