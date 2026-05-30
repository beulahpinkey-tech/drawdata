export const runtime = "edge";

import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { PairsView } from "./PairsView";
import type { Game } from "@/lib/types";
import { isBallGame } from "@/lib/data";
import { notFound } from "next/navigation";

export default function PairsPage({ params }: { params: { game: string } }) {
  const game = params.game as Game;
  if (isBallGame(game)) notFound();
  return (
    <>
      <GameHeader game={game} view="pair frequency" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          Counts how often each pair of digits {`{a, b}`} appears together in the same draw,
          any positions. Larger numbers reflect <strong>history</strong>, not future bias.
        </HonestyNote>
        <PairsView game={game} />
      </div>
    </>
  );
}
