import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const GAMES = new Set(["pick3", "pick4", "powerball", "megamillions"]);

// Cloudflare Pages requires every dynamic-segment route to declare
// `runtime = 'edge'` on the page itself (see each /[game]/*/page.tsx).
// At the layout level we just lock the param set: any slug not in
// generateStaticParams 404s without an SSR fallback.
export const dynamicParams = false;

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
