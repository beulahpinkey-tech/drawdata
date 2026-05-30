export const runtime = "edge";

import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { PositionalView } from "./PositionalView";
import { META, getAgg } from "@/lib/data";
import type { Game } from "@/lib/types";
import { redirect } from "next/navigation";

export default function PositionalPage({ params }: { params: { game: string } }) {
  const game = params.game as Game;
  if (game === "powerball" || game === "megamillions") {
    return <BallGameSums game={game} />;
  }
  const agg = getAgg(game);
  return (
    <>
      <GameHeader game={game} view="positional" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          Each cell shows how often a digit landed in a particular slot. If the draws are fair,
          every slot should look like 0–9 picked from a hat — about 10% each, with sample noise.
          Any heat pattern you can see by eye is almost certainly within that noise band.
        </HonestyNote>
        <PositionalView game={game} agg={agg} />
      </div>
    </>
  );
}

function BallGameSums({ game }: { game: Game }) {
  const label = game === "megamillions" ? "Mega Millions" : "Powerball";
  return (
    <>
      <GameHeader game={game} view="positional" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          {label} isn&rsquo;t positional — the five white balls are reported in sorted order, so
          &ldquo;digit in position 2&rdquo; doesn&rsquo;t have a meaning here. For shape-style analysis, see the
          sum distribution on the <a className="text-accent hover:underline" href={`/${game}/check`}>check page</a>{" "}
          or look at coverage and frequency in their respective views.
        </HonestyNote>
      </div>
    </>
  );
}
