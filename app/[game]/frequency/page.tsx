export const runtime = "edge";

import Link from "next/link";
import { GameHeader } from "@/components/GameHeader";
import { HonestyNote } from "@/components/HonestyNote";
import { NumberBall } from "@/components/NumberBall";
import { FrequencyView } from "./FrequencyView";
import { META, getAgg, isBallGame, GAME_LABELS } from "@/lib/data";
import type { Game } from "@/lib/types";
import { numberStats } from "@/lib/numbers";

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

        <p className="text-[13px] text-dim">
          Curious which come up most?{" "}
          <Link href={`/learn/most-common-${game}-numbers`} className="text-accent hover:underline">
            The most common {GAME_LABELS[game]} numbers — and why frequency isn&rsquo;t an edge →
          </Link>
        </p>

        <NumberIndex game={game} />
      </div>
    </>
  );
}

/**
 * Server-rendered index of every per-number/per-digit page. Gives each
 * /{game}/number/{n} page an inbound link (no orphans) and lets visitors
 * jump straight to a single number's full history.
 */
function NumberIndex({ game }: { game: Game }) {
  const stats = numberStats(game);
  const ball = isBallGame(game);
  const whites = stats.filter((s) => s.kind === "white");
  const specials = stats.filter((s) => s.kind === "special");
  const digits = stats.filter((s) => s.kind === "digit");

  const cell = (slug: string, value: number, variant: "white" | "red" | "digit") => (
    <Link
      key={slug}
      href={`/${game}/number/${slug}`}
      className="flex items-center justify-center hover:scale-110 transition-transform"
      aria-label={`${value} history`}
    >
      <NumberBall value={value} variant={variant} size="sm" />
    </Link>
  );

  return (
    <div className="panel p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Per-number history</div>
      <h2 className="font-display text-[22px] mt-1">
        {ball ? "Open any ball for its full record" : "Open any digit for its full record"}
      </h2>
      <p className="mt-2 text-[13px] text-dim">
        Total draws, last-seen date, current gap, frequency rank and a per-year sparkline — one page per {ball ? "number" : "digit"}.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(ball ? whites : digits).map((s) => cell(s.slug, s.value, ball ? "white" : "digit"))}
      </div>
      {specials.length > 0 && (
        <>
          <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
            {game === "megamillions" ? "Mega Ball" : "Powerball"}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {specials.map((s) => cell(s.slug, s.value, "red"))}
          </div>
        </>
      )}
    </div>
  );
}
