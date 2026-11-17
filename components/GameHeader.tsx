import { META, GAME_BLURB, GAME_LABELS, isBallGame, hasStreams, presentStreams, STREAM_LABEL } from "@/lib/data";
import type { Game } from "@/lib/types";
import { Breadcrumbs } from "./Breadcrumbs";
import type { Crumb } from "@/lib/seo/breadcrumbs";

/**
 * Build the default breadcrumb trail for a game page. The overview page
 * (view "overview") is just Home / Game; every spoke is Home / Game / View
 * with the spoke as the current (link-less) crumb. Pages with deeper
 * nesting (results archives) pass an explicit `crumbs` instead.
 */
function defaultCrumbs(game: Game, view: string): Crumb[] {
  const label = GAME_LABELS[game];
  if (view === "overview") return [{ name: "Home", path: "/" }, { name: label }];
  return [{ name: "Home", path: "/" }, { name: label, path: `/${game}` }, { name: view }];
}

export function GameHeader({
  game,
  view,
  crumbs,
}: {
  game: Game;
  view: string;
  crumbs?: Crumb[];
}) {
  const m = (META as any)[game];
  const isBall = isBallGame(game);
  return (
    <div className="border-b border-edge bg-radial-amber">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="mb-4">
          <Breadcrumbs crumbs={crumbs ?? defaultCrumbs(game, view)} />
        </div>
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
          {!isBall && hasStreams(game) && (
            <>
              {presentStreams(game).map((s) => (
                <span key={s}>
                  {STREAM_LABEL[s].toLowerCase()}:{" "}
                  <span className="text-text tabular-nums">
                    {(m[`count${STREAM_LABEL[s]}`] ?? 0).toLocaleString()}
                  </span>
                </span>
              ))}
            </>
          )}
          {isBall && "currentEra" in m && (
            <span>current era: <span className="text-text">{m.currentEra.label}</span></span>
          )}
        </div>
        {m.stale && (
          // Set by scripts/precompute.ts when the newest draw is older than its
          // freshness cap. Without this, a state whose official feed broke
          // (Georgia, Sept 2026) looked current while silently going out of date.
          <p
            role="status"
            className="mt-4 max-w-3xl rounded-md border border-hot/30 bg-hot/[0.06] px-3 py-2 text-[13px] text-text"
          >
            Updates paused: the most recent draw we have is from{" "}
            <span className="font-mono">{m.latest}</span>. The official results feed changed and newer
            draws haven&apos;t been added yet. Everything on this page covers history up to that date.
          </p>
        )}
      </div>
    </div>
  );
}
