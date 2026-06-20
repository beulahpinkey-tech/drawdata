export const runtime = "edge";

import Link from "next/link";
import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { StreamsView } from "./StreamsView";
import { getAgg, hasStreams, GAME_LABELS } from "@/lib/data";
import type { Game } from "@/lib/types";
import { notFound } from "next/navigation";

export default function StreamsPage({ params }: { params: { game: string } }) {
  const game = params.game as Game;
  if (game === "powerball" || game === "megamillions") notFound();

  // Single-draw games (e.g. Washington's once-nightly Daily Game) have no
  // midday/evening split. Render an honest explainer instead of an empty
  // comparison — not a thin page, and it points back to the real analytics.
  if (!hasStreams(game)) {
    return (
      <>
        <GameHeader game={game} view="midday vs evening" />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
          <HonestyNote>
            {GAME_LABELS[game]} is a <strong>single nightly drawing</strong> — there is no separate midday
            draw, so there&rsquo;s nothing to compare here. Every result is one independent draw.
          </HonestyNote>
          <p className="text-[14px] text-dim">
            Looking for the breakdowns?{" "}
            <Link href={`/${game}/frequency`} className="text-accent hover:underline">digit frequency</Link>,{" "}
            <Link href={`/${game}/gaps`} className="text-accent hover:underline">gaps &amp; recency</Link>, and the{" "}
            <Link href={`/${game}/results`} className="text-accent hover:underline">full results archive</Link>{" "}
            all apply.
          </p>
        </div>
      </>
    );
  }

  const agg = getAgg(game);
  return (
    <>
      <GameHeader game={game} view="midday vs evening" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <HonestyNote>
          Midday and Evening are two <strong>independent</strong> drawings, even though they share a date.
          Differences you see here are sample noise — neither stream &ldquo;runs hotter&rdquo; than the other.
        </HonestyNote>
        <StreamsView game={game} agg={agg} />
      </div>
    </>
  );
}
