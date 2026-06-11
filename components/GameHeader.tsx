import { META, GAME_BLURB, GAME_LABELS, isBallGame } from "@/lib/data";
import type { Game } from "@/lib/types";
import { GameJsonLd } from "./GameJsonLd";

export function GameHeader({ game, view }: { game: Game; view: string }) {
  const m = (META as any)[game];
  const isBall = isBallGame(game);
  return (
    <div className="border-b border-edge bg-radial-amber">
      <GameJsonLd game={game} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="flex items-baseline gap-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">
            {GAME_LABELS[game]} · {view}
          </div>
        </div>
        <h1 className="mt-2 t-h1 text-fg-primary">
          {GAME_LABELS[game]} <span className="text-dim">— {view}</span>
        </h1>
        <p className="mt-3 text-[15px] text-dim max-w-3xl leading-relaxed">{GAME_BLURB[game]}</p>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[13px] font-mono text-dim">
          <span>
            <span className="text-text tabular-nums">{m.count.toLocaleString()}</span> draws
          </span>
          <span>
            <span className="text-text">{m.earliest}</span> → <span className="text-text">{m.latest}</span>
          </span>
          {!isBall && "countMidday" in m && (
            <>
              <span>midday: <span className="text-text tabular-nums">{m.countMidday.toLocaleString()}</span></span>
              <span>evening: <span className="text-text tabular-nums">{m.countEvening.toLocaleString()}</span></span>
              {m.countOther > 0 && (
                <span>untagged: <span className="text-text tabular-nums">{m.countOther.toLocaleString()}</span></span>
              )}
            </>
          )}
          {isBall && "currentEra" in m && (
            <span>current era: <span className="text-text">{m.currentEra.label}</span></span>
          )}
        </div>
      </div>
    </div>
  );
}
