export const runtime = "edge";

import { Suspense } from "react";
import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { LookupView } from "./LookupView";
import type { Game } from "@/lib/types";
import { notFound } from "next/navigation";

export default function LookupPage({ params }: { params: { game: string } }) {
  const game = params.game as Game;
  if (game === "powerball" || game === "megamillions") notFound();
  return (
    <>
      <GameHeader game={game} view="number lookup" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          Type any exact Pick {game === "pick3" ? "3" : "4"} number to see every date it has hit,
          straight and any-order. <strong>Past appearances do not change future probability.</strong>
        </HonestyNote>
        <Suspense fallback={<div className="panel p-8 text-center text-dim text-sm">Loading…</div>}>
          <LookupView game={game as "pick3" | "pick4"} />
        </Suspense>
      </div>
    </>
  );
}
