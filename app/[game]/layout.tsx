import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ALL_GAMES } from "@/lib/types";

const GAMES = new Set<string>(ALL_GAMES);

// Fully-static prerendering for the 6 known slugs.
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
  return ALL_GAMES.map((game) => ({ game }));
}
