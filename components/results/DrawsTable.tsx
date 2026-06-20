import { NumberBall } from "@/components/NumberBall";
import { isBallGame } from "@/lib/data";
import type { Draw, Game } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-06-12" → "Fri, Jun 12, 2026" — parsed as UTC to avoid TZ drift. */
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${WEEKDAYS[dt.getUTCDay()]}, ${mon} ${d}, ${y}`;
}

/**
 * Server-rendered results table — the real, page-specific data every
 * archive page must carry. Renders digit games and ball games from the
 * same `Draw[]`. Lives in the initial HTML (no client JS) so it's fully
 * crawlable.
 */
export function DrawsTable({ game, draws }: { game: Game; draws: Draw[] }) {
  const ball = isBallGame(game);
  return (
    <div className="panel overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-edge text-[11px] uppercase tracking-[0.14em] text-dim font-mono">
            <th className="text-left px-4 py-3 font-normal">Date</th>
            {!ball && <th className="text-left px-4 py-3 font-normal">Stream</th>}
            <th className="text-left px-4 py-3 font-normal">{ball ? "Winning numbers" : "Digits"}</th>
            {!ball && <th className="text-right px-4 py-3 font-normal hidden sm:table-cell">Sum</th>}
          </tr>
        </thead>
        <tbody>
          {draws.map((d, i) => {
            const sum =
              d.digits?.reduce((a, b) => a + b, 0) ??
              ((d.whites?.reduce((a, b) => a + b, 0) ?? 0) + (d.special ?? 0));
            return (
              <tr key={i} className="border-b border-edge/40 last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{fmtDate(d.date)}</td>
                {!ball && (
                  <td className="px-4 py-2.5 text-dim capitalize">
                    {d.stream && d.stream !== "other" ? d.stream : "—"}
                  </td>
                )}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ball ? (
                      <>
                        {d.whites?.map((w, j) => (
                          <NumberBall key={j} value={w} variant="white" size="sm" />
                        ))}
                        <span className="mx-0.5 text-dim text-[12px]">·</span>
                        <NumberBall value={d.special ?? "?"} variant="red" size="sm" />
                      </>
                    ) : (
                      d.digits?.map((dig, j) => (
                        <NumberBall key={j} value={dig} variant="digit" size="sm" />
                      ))
                    )}
                  </div>
                </td>
                {!ball && (
                  <td className="px-4 py-2.5 text-right tabular-nums text-dim hidden sm:table-cell">{sum}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
