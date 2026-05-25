import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const GAMES = new Set(["pick3", "pick4", "powerball", "megamillions"]);

// Fully-static: only the four params below are prerendered, anything else
// 404s without an SSR fallback. This is what Cloudflare Pages needs — it
// has no Node.js runtime, only the Edge runtime, and we don't need either
// because the data is baked in at build time.
export const dynamicParams = false;
export const dynamic = "force-static";

export default function GameLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { game: string };
}) {
  if (!GAMES.has(params.game)) notFound();
  return <>{children}</>;
}

export function generateStaticParams() {
  return [
    { game: "pick3" },
    { game: "pick4" },
    { game: "powerball" },
    { game: "megamillions" },
  ];
}
