export const runtime = "edge";

import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { CarryoverView } from "./CarryoverView";
import type { Game } from "@/lib/types";
import { notFound } from "next/navigation";

export default function CarryoverPage({ params }: { params: { game: string } }) {
  const game = params.game as Game;
  if (game === "powerball" || game === "megamillions") notFound();
  return (
    <>
      <GameHeader game={game} view="carryover & mirror" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote tone="myth">
          &ldquo;Carryover&rdquo; (a digit reappearing in the next draw) and &ldquo;mirror&rdquo; (a +5 sibling appearing)
          are popular player concepts. They&rsquo;re fun to look at — but the observed rates here will
          match the chance baseline almost exactly. Past draws don&rsquo;t pull on the next one.
        </HonestyNote>
        <CarryoverView game={game as "pick3" | "pick4"} />
      </div>
    </>
  );
}
