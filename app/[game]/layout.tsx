import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const GAMES = new Set(["pick3", "pick4", "powerball", "megamillions"]);

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
