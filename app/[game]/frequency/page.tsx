export const runtime = "edge";

import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { FrequencyView } from "./FrequencyView";
import { META, getAgg } from "@/lib/data";
import type { Game } from "@/lib/types";

export default function FrequencyPage({ params }: { params: { game: string } }) {
  const game = params.game as Game;
  const agg = getAgg(game);
  const m = META[game];
  return (
    <>
      <GameHeader game={game} view="frequency" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote tone="myth">
          &ldquo;Hot&rdquo; and &ldquo;cold&rdquo; are <strong>history</strong>, not destiny. With a fair process,
          every number is equally likely on every draw — past frequencies tell you nothing about the next one.
          The dashed line below is what you&rsquo;d expect if the draws were perfectly random. Real data wiggles
          around it because samples are finite.
        </HonestyNote>
        <FrequencyView game={game} agg={agg} meta={m} />
      </div>
    </>
  );
}
