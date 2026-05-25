import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { CoverageView } from "./CoverageView";
import { getAgg, META } from "@/lib/data";
import type { Game } from "@/lib/types";

export default function CoveragePage({ params }: { params: { game: string } }) {
  const game = params.game as Game;
  const agg = getAgg(game);
  const m = META[game];
  return (
    <>
      <GameHeader game={game} view="coverage" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          This is the classic <strong>coupon-collector</strong> view: how many unique numbers have ever been
          drawn, as time marches on. It rises fast at first, then crawls — exactly the curve a fair
          process produces. Twice-a-day draws &ldquo;cover&rdquo; faster only because there are more of them.
        </HonestyNote>
        <CoverageView game={game} agg={agg} meta={m} />
      </div>
    </>
  );
}
