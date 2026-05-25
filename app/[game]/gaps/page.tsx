import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { GapsView } from "./GapsView";
import { getAgg } from "@/lib/data";
import type { Game } from "@/lib/types";

export default function GapsPage({ params }: { params: { game: string } }) {
  const game = params.game as Game;
  const agg = getAgg(game);
  return (
    <>
      <GameHeader game={game} view="gaps & recency" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote tone="myth">
          A number being &ldquo;due&rdquo; is the most famous lottery myth. The gap distribution here is
          <strong> geometric</strong> — memoryless. After 30 draws without a 7, the chance of a 7 on the
          next draw is still 1-in-10 (Pick 3/4) or whatever it always was. The dashed line is what
          pure randomness predicts; observed values track it closely.
        </HonestyNote>
        <GapsView game={game} agg={agg} />
      </div>
    </>
  );
}
