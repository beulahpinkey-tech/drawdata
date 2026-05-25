export const runtime = "edge";

import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { StreamsView } from "./StreamsView";
import { getAgg } from "@/lib/data";
import type { Game } from "@/lib/types";
import { notFound } from "next/navigation";

export default function StreamsPage({ params }: { params: { game: string } }) {
  const game = params.game as Game;
  if (game === "powerball" || game === "megamillions") notFound();
  const agg = getAgg(game);
  return (
    <>
      <GameHeader game={game} view="midday vs evening" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          Midday and Evening are two <strong>independent</strong> drawings, even though they share a date.
          Differences you see here are sample noise — neither stream &ldquo;runs hotter&rdquo; than the other.
        </HonestyNote>
        <StreamsView game={game as "pick3" | "pick4"} agg={agg} />
      </div>
    </>
  );
}
