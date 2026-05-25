import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { CheckView } from "./CheckView";
import type { Game } from "@/lib/types";

export default function CheckPage({ params }: { params: { game: string } }) {
  const game = params.game as Game;
  return (
    <>
      <GameHeader game={game} view="check your numbers" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          Enter a set of numbers. We&rsquo;ll tell you, factually, how often each one has appeared,
          where your set&rsquo;s sum sits in the historical distribution, and whether the exact
          combination has ever come up. <strong>Every combination has identical odds.</strong> This is
          a description of the past, not a prediction of the future.
        </HonestyNote>
        <CheckView game={game} />
      </div>
    </>
  );
}
