"use client";

/**
 * Odds, Honestly — the real probability of a jackpot, and exactly how
 * many tickets (and dollars) it takes to "beat" it.
 *
 * The honest payload of the whole site in one tool: the odds are fixed
 * at 1-in-N, no system changes N, and the only way to raise your chance
 * is to buy a proportional slice of all N combinations — which costs a
 * fortune and still isn't a guarantee unless you literally buy them all.
 *
 * Math (all exact, all honest):
 *  - Single draw, T distinct tickets → P(win) = T / N.
 *  - To reach probability p in one draw → T = ceil(p · N) tickets.
 *  - Over D draws at T tickets each → P(≥1 win) = 1 − (1 − T/N)^D.
 * Nothing here predicts or recommends. It just does the arithmetic the
 * tipsters hope you never do.
 */

import { useMemo, useState } from "react";
import { track } from "@/lib/analytics";

type Mode = "pick3" | "pick4" | "powerball" | "megamillions";

function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}
function fact(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
// Binomial P(exactly c of n positions match) for Pick 3/4, where each
// position independently has p = 1/10 of matching your pick. This is the
// honest analog of Keno's "catch C of K" — Pick games are positional, so
// it's a binomial, not Keno's hypergeometric.
function binom(n: number, c: number, p: number): number {
  return choose(n, c) * Math.pow(p, c) * Math.pow(1 - p, n - c);
}

// `pay` = the fixed top prize on one base ticket, for games that have one
// (Pick 3 straight ≈ $500 on $1; Pick 4 straight ≈ $5,000 on $1 — typical
// state payouts). Jackpot games have variable, rolling jackpots, so no
// fixed `pay` — for those the honest point is "chance stays ~zero," not
// expected value. `schedule` makes the draw-frequency assumption visible.
type Cfg = {
  label: string; N: number; price: number; drawsPerYear: number;
  jackpot: string; schedule: string; pay?: number;
};
const GAMES: Record<Mode, Cfg> = {
  pick3: { label: "Pick 3", N: 1000, price: 1, drawsPerYear: 730, jackpot: "exact 3-digit straight match", schedule: "2 draws/day", pay: 500 },
  pick4: { label: "Pick 4", N: 10000, price: 1, drawsPerYear: 730, jackpot: "exact 4-digit straight match", schedule: "2 draws/day", pay: 5000 },
  powerball: { label: "Powerball", N: choose(69, 5) * 26, price: 2, drawsPerYear: 156, jackpot: "5 white + Powerball", schedule: "3 draws/week · Mon·Wed·Sat" },
  megamillions: { label: "Mega Millions", N: choose(70, 5) * 24, price: 5, drawsPerYear: 104, jackpot: "5 white + Mega Ball", schedule: "2 draws/week · Tue·Fri" },
};

// How many tickets (sets) you play each draw — the dropdown options.
const SET_OPTIONS = [1, 2, 3, 5, 10, 20, 50, 100];
// Counts compared side-by-side in the "one set vs many" table.
const COMPARE = [1, 2, 3, 5, 10];

// Explicit "en-US" locale — without it, the server (whose Node may
// default to e.g. en-IN lakh/crore grouping) and the browser format big
// numbers differently and React throws a hydration mismatch.
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const money = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${fmt(n)}`;
function pctLabel(p: number): string {
  if (p >= 0.01) return `${(p * 100).toFixed(2)}%`;
  if (p <= 0) return "0%";
  return `${(p * 100).toPrecision(2)}%`;
}
function oneIn(p: number): string {
  if (p <= 0) return "—";
  return `1 in ${fmt(1 / p)}`;
}

export function OddsView() {
  const [mode, setMode] = useState<Mode>("powerball");
  const cfg = GAMES[mode];
  const N = cfg.N;

  const [perDraw, setPerDraw] = useState(1);
  const [years, setYears] = useState(20);

  // Pick 3 → 3 positions, Pick 4 → 4. 0 for ball games (no positional match).
  const positions = mode === "pick3" ? 3 : mode === "pick4" ? 4 : 0;

  const thresholds = [0.01, 0.1, 0.5, 1]; // 1%, 10%, 50%, guaranteed
  const rows = thresholds.map((p) => {
    const tickets = Math.ceil(p * N);
    return { p, tickets, cost: tickets * cfg.price };
  });

  const lifetime = useMemo(() => {
    const D = cfg.drawsPerYear * years;
    const perDrawP = Math.min(1, perDraw / N);
    const cumulative = 1 - Math.pow(1 - perDrawP, D);
    const ticketsBought = D * perDraw;
    const spend = ticketsBought * cfg.price;
    // For fixed-prize games (Pick 3/4): expected winnings = tickets × prize/N.
    // This is the honest metric for digit games — you DO win regularly, but
    // the prize is worth less than the ticket, so you lose money over time.
    const expectedWin = cfg.pay != null ? (ticketsBought * cfg.pay) / N : null;
    const net = expectedWin != null ? expectedWin - spend : null;
    return { D, cumulative, ticketsBought, spend, expectedWin, net };
  }, [cfg, N, perDraw, years]);

  // Chance of ≥1 jackpot across one year at `sets` tickets per draw.
  const yearChance = (sets: number) => 1 - Math.pow(1 - Math.min(1, sets / N), cfg.drawsPerYear);

  return (
    <div className="space-y-5">
      {/* Game */}
      <div className="panel p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-2">Game</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(GAMES) as Mode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); track("Odds Game", { game: m }); }}
              className={`px-3 py-1.5 rounded-md text-[13px] border transition-colors ${
                m === mode ? "border-accent/50 bg-accent/10 text-accent" : "border-edge text-dim hover:text-text hover:bg-white/[0.04]"
              }`}>
              {GAMES[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* The odds */}
      <div className="panel p-6 text-center">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">Jackpot odds · {cfg.jackpot}</div>
        <div className="mt-2 font-display tabular-nums leading-none" style={{ fontSize: "clamp(2.5rem,7vw,4.5rem)" }}>
          1 in {fmt(N)}
        </div>
        <p className="mt-3 text-[13px] text-dim max-w-2xl mx-auto leading-relaxed">
          A single ticket has exactly this chance — every draw, forever. No frequency, gap, mirror,
          or “system” changes it, because every draw is independent.
        </p>
        <div className="mt-3 text-[11px] text-dim font-mono uppercase tracking-wider">
          {cfg.schedule} · ~{fmt(cfg.drawsPerYear)} draws a year
        </div>
      </div>

      {/* Pick 3/4 matching breakdown — the Keno "catch" idea, done as a
          binomial because Pick games are positional. */}
      {positions > 0 && (
        <div className="panel p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-cool font-mono mb-1">Matching breakdown</div>
          <h3 className="font-display text-[20px]">How many of your {positions} digits will you match?</h3>
          <p className="mt-2 text-[13px] text-dim max-w-3xl leading-relaxed">
            Each position independently has a <strong className="text-text">1-in-10</strong> chance of matching
            your pick, so the number you get right follows a clean binomial. Here&rsquo;s one straight ticket:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-dim text-[11px] uppercase tracking-wider font-mono">
                  <th className="text-left py-2 pr-2 font-normal">Digits matched (in position)</th>
                  <th className="text-right py-2 px-2 font-normal">Probability</th>
                  <th className="text-right py-2 pl-2 font-normal">Roughly</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {Array.from({ length: positions + 1 }, (_, i) => positions - i).map((c) => {
                  const p = binom(positions, c, 0.1);
                  const isJackpot = c === positions;
                  return (
                    <tr key={c} className={`border-t border-edge ${isJackpot ? "bg-accent/[0.06]" : ""}`}>
                      <td className={`py-2 pr-2 ${isJackpot ? "text-accent" : "text-text"}`}>
                        {c} of {positions}{isJackpot ? " — straight win" : ""}
                      </td>
                      <td className="py-2 px-2 text-right">{pctLabel(p)}</td>
                      <td className="py-2 pl-2 text-right text-dim">{oneIn(p)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Straight vs box — the real plannable choice */}
          <h4 className="mt-6 font-display text-[16px]">Straight vs box — same numbers, two ways to play</h4>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-dim text-[11px] uppercase tracking-wider font-mono">
                  <th className="text-left py-2 pr-2 font-normal">Bet type</th>
                  <th className="text-right py-2 px-2 font-normal">Odds</th>
                  <th className="text-right py-2 pl-2 font-normal">Note</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                <tr className="border-t border-edge">
                  <td className="py-2 pr-2 text-text">Straight (exact order)</td>
                  <td className="py-2 px-2 text-right">{oneIn(1 / N)}</td>
                  <td className="py-2 pl-2 text-right text-dim">biggest payout</td>
                </tr>
                <tr className="border-t border-edge">
                  <td className="py-2 pr-2 text-text">Box · all different</td>
                  <td className="py-2 px-2 text-right">{oneIn(fact(positions) / N)}</td>
                  <td className="py-2 pl-2 text-right text-dim">any order · smaller payout</td>
                </tr>
                <tr className="border-t border-edge">
                  <td className="py-2 pr-2 text-text">Box · one pair</td>
                  <td className="py-2 px-2 text-right">{oneIn((fact(positions) / 2) / N)}</td>
                  <td className="py-2 pl-2 text-right text-dim">fewer arrangements</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-dim leading-relaxed">
            Box improves your <em className="not-italic text-text">odds of matching</em> by accepting any order —
            but the payout drops by exactly the same factor, so the expected value is unchanged. It&rsquo;s a
            real choice (more frequent, smaller wins vs rarer, bigger ones), not an edge.
          </p>
        </div>
      )}

      {/* Tickets to "beat" the probability */}
      <div className="panel p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-cool font-mono mb-1">Buying your way up</div>
        <h3 className="font-display text-[20px]">How many tickets to reach each chance — in one draw</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-dim text-[11px] uppercase tracking-wider font-mono">
                <th className="text-left py-2 pr-2 font-normal">Chance of winning</th>
                <th className="text-right py-2 px-2 font-normal">Distinct tickets needed</th>
                <th className="text-right py-2 pl-2 font-normal">Cost @ ${cfg.price}</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {rows.map((r) => (
                <tr key={r.p} className="border-t border-edge">
                  <td className="py-2 pr-2">{r.p === 1 ? "Guaranteed (100%)" : `${r.p * 100}%`}</td>
                  <td className="py-2 px-2 text-right text-text">{fmt(r.tickets)}</td>
                  <td className="py-2 pl-2 text-right text-hot">{money(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-dim leading-relaxed">
          A <strong className="text-text">coin-flip</strong> shot at this jackpot in one draw means buying{" "}
          <strong className="text-text">{fmt(rows[2].tickets)}</strong> different tickets for{" "}
          <strong className="text-hot">{money(rows[2].cost)}</strong>. Guaranteeing it means buying{" "}
          <strong className="text-text">all {fmt(N)}</strong> combinations — and if the jackpot is smaller
          than that cost, you&rsquo;d <em className="not-italic text-text">lose money winning</em>.
        </p>
      </div>

      {/* Play-the-same-numbers explorer: per-year + lifetime + compare */}
      <div className="panel p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-cool font-mono mb-1">If you play the same numbers every draw</div>
        <h3 className="font-display text-[20px]">Pick how many sets you play — see a year, and a lifetime.</h3>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block">
            <div className="text-[12px] text-dim mb-1 font-mono">Sets (tickets) per draw</div>
            <select
              value={perDraw}
              onChange={(e) => setPerDraw(+e.target.value)}
              className="w-full bg-panel2 border border-edge rounded-md px-3 py-2 text-[14px] text-text"
            >
              {SET_OPTIONS.map((o) => (
                <option key={o} value={o}>{o} {o === 1 ? "set" : "sets"} per draw</option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="text-[12px] text-dim mb-1 font-mono">Years played: <span className="text-text">{years}</span></div>
            <input type="range" min={1} max={70} value={years} onChange={(e) => setYears(+e.target.value)} className="w-full accent-[var(--accent)]" />
          </label>
        </div>

        {/* In one year */}
        <div className="mt-5 text-[11px] uppercase tracking-wider text-dim font-mono">
          In one year · {fmt(cfg.drawsPerYear)} draws
        </div>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <Stat label="Per single draw" value={pctLabel(Math.min(1, perDraw / N))} sub={oneIn(Math.min(1, perDraw / N))} />
          <Stat label="Tickets / year" value={fmt(cfg.drawsPerYear * perDraw)} />
          <Stat label="Spent / year" value={money(cfg.drawsPerYear * perDraw * cfg.price)} tone="hot" />
          <Stat label="Chance in a year" value={pctLabel(yearChance(perDraw))} sub={oneIn(yearChance(perDraw))} tone="cool" />
        </div>

        {/* Over the chosen lifetime */}
        <div className="mt-5 text-[11px] uppercase tracking-wider text-dim font-mono">
          Over {years} year{years > 1 ? "s" : ""} · {fmt(lifetime.D)} draws
        </div>
        <div className={`mt-2 grid grid-cols-2 gap-3 text-center ${lifetime.expectedWin != null ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          <Stat label="Total spent" value={money(lifetime.spend)} tone="hot" />
          {lifetime.expectedWin != null ? (
            <>
              <Stat label="Expected winnings" value={money(lifetime.expectedWin)} tone="cool" />
              <Stat label="Net result" value={`${lifetime.net! < 0 ? "−" : "+"}${money(Math.abs(lifetime.net!))}`} tone="hot" />
              <Stat label="Chance you win ≥ once" value={pctLabel(lifetime.cumulative)} />
            </>
          ) : (
            <>
              <Stat label="Tickets bought" value={fmt(lifetime.ticketsBought)} />
              <Stat label="Chance of ever winning" value={pctLabel(lifetime.cumulative)} sub={oneIn(lifetime.cumulative)} tone="cool" />
            </>
          )}
        </div>

        {/* One set vs many — a single year, side by side */}
        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-wider text-dim font-mono mb-2">
            One set vs many — your chance across a single year
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-dim text-[11px] uppercase tracking-wider font-mono">
                  <th className="text-left py-2 pr-2 font-normal">Sets per draw</th>
                  <th className="text-right py-2 px-2 font-normal">Tickets / year</th>
                  <th className="text-right py-2 px-2 font-normal">Spent / year</th>
                  <th className="text-right py-2 pl-2 font-normal">Chance in a year</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {COMPARE.map((s) => (
                  <tr key={s} className={`border-t border-edge ${s === perDraw ? "bg-accent/[0.06]" : ""}`}>
                    <td className="py-2 pr-2 text-text">{s} {s === 1 ? "set" : "sets"}</td>
                    <td className="py-2 px-2 text-right">{fmt(cfg.drawsPerYear * s)}</td>
                    <td className="py-2 px-2 text-right text-hot">{money(cfg.drawsPerYear * s * cfg.price)}</td>
                    <td className="py-2 pl-2 text-right text-cool">{pctLabel(yearChance(s))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {lifetime.expectedWin != null ? (
          <p className="mt-4 text-[13px] text-dim leading-relaxed">
            Here&rsquo;s the honest part for {cfg.label}: you <em className="not-italic text-text">do</em> win — a
            straight match pays about <strong className="text-text">${fmt(cfg.pay!)}</strong>, and at 1-in-{fmt(N)}
            you&rsquo;ll hit it fairly often. But each ${cfg.price} ticket is only worth about{" "}
            <strong className="text-text">${(cfg.pay! / N).toFixed(2)}</strong>, so over {years} year{years > 1 ? "s" : ""} at{" "}
            {perDraw} set{perDraw > 1 ? "s" : ""}/draw you&rsquo;d spend <strong className="text-hot">{money(lifetime.spend)}</strong>{" "}
            and win back about <strong className="text-cool">{money(lifetime.expectedWin)}</strong> — a net{" "}
            <strong className="text-hot">{lifetime.net! < 0 ? "loss" : "gain"} of {money(Math.abs(lifetime.net!))}</strong>.
            Winning often isn&rsquo;t the same as winning money. No system changes that ~50¢-on-the-dollar math —
            it&rsquo;s built into the prize table.
          </p>
        ) : (
          <p className="mt-4 text-[13px] text-dim leading-relaxed">
            Notice the punchline in that table: going from <strong className="text-text">one set to two</strong>{" "}
            only <em className="not-italic text-text">doubles</em> a number that&rsquo;s already almost zero — it&rsquo;s
            still essentially zero. Even at {perDraw} set{perDraw > 1 ? "s" : ""} every draw for {years} year{years > 1 ? "s" : ""},
            your chance of <em className="not-italic text-text">ever</em> winning {cfg.label} is{" "}
            <strong className="text-cool">{pctLabel(lifetime.cumulative)}</strong> after spending{" "}
            <strong className="text-hot">{money(lifetime.spend)}</strong>. The odds are fixed at 1 in {fmt(N)};
            no system moves them — only buying more of the {fmt(N)} combinations does, and that&rsquo;s the whole trick.
          </p>
        )}
      </div>

      <div className="panel-inner p-4 text-[12px] text-dim leading-relaxed">
        <strong className="text-text">For education only.</strong> These are exact probabilities for a fair
        draw; they don&rsquo;t predict outcomes or suggest how to play. Buying more tickets raises your chance
        only in direct proportion to how many of the N combinations you cover — never beyond it. Play for
        fun, within your means. 18+.
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "hot" | "cool" }) {
  return (
    <div className="panel-inner py-3 px-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono">{label}</div>
      <div className={`mt-1 font-display text-[22px] tabular-nums leading-none ${tone === "hot" ? "text-hot" : tone === "cool" ? "text-cool" : "text-text"}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[10px] text-dim font-mono">{sub}</div>}
    </div>
  );
}
