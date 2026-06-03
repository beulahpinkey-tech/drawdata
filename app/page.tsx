import Link from "next/link";
import { META } from "@/lib/data";
import { StaggerGroup, StaggerItem } from "@/components/motion/primitives";
import { HeroVideoBackground } from "@/components/HeroVideoBackground";

const GAMES: { id: "wi-pick3" | "wi-pick4" | "pa-pick3" | "pa-pick4" | "nj-pick3" | "nj-pick4" | "tx-pick3" | "tx-pick4" | "powerball" | "megamillions"; label: string; tag: string; blurb: string }[] = [
  { id: "wi-pick3", label: "Wisconsin Pick 3", tag: "3-digit · twice daily", blurb: "Wisconsin Lottery's twice-daily 3-digit game. History since 1992." },
  { id: "wi-pick4", label: "Wisconsin Pick 4", tag: "4-digit · twice daily", blurb: "Wisconsin Lottery's 10,000-outcome game. History since 1997." },
  { id: "pa-pick3", label: "Pennsylvania Pick 3", tag: "3-digit · twice daily", blurb: "Pennsylvania Pick 3. The deepest record on the site — back to 1977." },
  { id: "pa-pick4", label: "Pennsylvania Pick 4", tag: "4-digit · twice daily", blurb: "Pennsylvania Pick 4. 23k+ draws since 1980." },
  { id: "nj-pick3", label: "New Jersey Pick 3", tag: "3-digit · twice daily", blurb: "New Jersey Pick-3. Midday 12:59 PM / Evening 10:57 PM ET." },
  { id: "nj-pick4", label: "New Jersey Pick 4", tag: "4-digit · twice daily", blurb: "New Jersey Pick-4. Twice-daily 4-digit game." },
  { id: "tx-pick3", label: "Texas Pick 3", tag: "3-digit · Day + Night", blurb: "Texas Lottery Pick 3 (Day + Night). Texas runs four draws daily; we show the two flagship times." },
  { id: "tx-pick4", label: "Texas Daily 4", tag: "4-digit · Day + Night", blurb: "Texas Lottery Daily 4. Same two-draw model as Pick 3 — 11k+ draws since 2007." },
  { id: "powerball", label: "Powerball", tag: "5/69 + 1/26", blurb: "Multi-state. Current 5/69+1/26 era began Oct 2015; older eras tagged separately." },
  { id: "megamillions", label: "Mega Millions", tag: "5/70 + 1/24", blurb: "National. Matrix revamped April 2025 to 5/70 + 1/24; earlier eras tagged separately." },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
      <section className="relative overflow-hidden rounded-2xl border border-edge p-8 sm:p-14 min-h-[420px]">
        <HeroVideoBackground />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-cool" />
            a data observatory
          </div>
          <h1 className="font-display text-[42px] sm:text-[64px] leading-[0.95] tracking-tight">
            Decades of draws.<br />
            <span className="text-accent">No predictions.</span>
          </h1>
          <p className="mt-6 text-dim text-[17px] max-w-2xl leading-relaxed">
            DrawData turns public lottery history — Pick 3, Pick 4, and Powerball — into
            an interactive, honest data instrument. Watch frequencies converge, gaps
            wander, sums settle into a bell. Test your favorite &ldquo;system&rdquo; in the Formula Lab
            and see, with your own eyes, why randomness is randomness.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/powerball" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-accent text-ink font-medium text-sm hover:bg-accent/90 transition-colors">
              Open the data
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <Link href="/lab" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-edge text-text hover:bg-white/[0.04] transition-colors text-sm">
              Try the Formula Lab
            </Link>
          </div>
        </div>
      </section>

      <StaggerGroup className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" delay={0.05}>
        {GAMES.map((g) => {
          const m = (META as any)[g.id];
          return (
            <StaggerItem key={g.id}>
              <Link
                href={`/${g.id}`}
                className="panel p-6 group hover:border-accent/40 transition-colors block h-full"
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">{g.tag}</div>
                <div className="mt-1 font-display text-[22px] leading-tight">{g.label}</div>
                <p className="mt-3 text-[13px] text-dim leading-relaxed">{g.blurb}</p>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="font-mono text-[11px] text-dim">draws on file</div>
                    <div className="font-display text-[28px] tabular-nums leading-none">{m.count.toLocaleString()}</div>
                  </div>
                  <div className="text-[11px] text-dim font-mono text-right">
                    {m.earliest}<br />→ {m.latest}
                  </div>
                </div>
                <div className="mt-5 inline-flex items-center gap-1 text-[12px] text-accent">
                  Explore <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </Link>
            </StaggerItem>
          );
        })}
      </StaggerGroup>

      <section className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-cool font-mono">Principle</div>
          <h2 className="font-display text-[22px] mt-2">Descriptive, not predictive.</h2>
          <p className="mt-3 text-[14px] text-dim leading-relaxed">
            Every chart in DrawData shows you what <em className="text-text not-italic">has happened</em>.
            No chart, ranking, or tool here is designed to tell you what <em className="text-text not-italic">will</em>.
            Lottery draws are independent and random — the past does not pull on the future.
          </p>
        </div>
        <div className="panel p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-mono">Centerpiece</div>
          <h2 className="font-display text-[22px] mt-2">The Formula Lab.</h2>
          <p className="mt-3 text-[14px] text-dim leading-relaxed">
            Compose a transformation rule from the previous draw — shifts, mirrors, anchors —
            and backtest it across every consecutive draw. See the empirical hit rate beside
            the chance baseline, side by side. Spoiler: they match.
          </p>
          <Link href="/lab" className="mt-4 inline-flex text-[13px] text-accent hover:underline">Test a theory →</Link>
        </div>
      </section>
    </div>
  );
}
