import Link from "next/link";
import { META } from "@/lib/data";
import { ScrollReveal } from "@/components/motion/primitives";
import { HeroVideoBackground } from "@/components/HeroVideoBackground";
import { Magnet } from "@/components/motion/Magnet";
import { AnimatedText } from "@/components/motion/AnimatedText";
import { GameStack, type GameGroup } from "@/components/home/GameStack";
import { AdSlot } from "@/components/ads/AdSlot";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "https://draw-data.com" },
};

const GAMES: { id: "wi-pick3" | "wi-pick4" | "pa-pick3" | "pa-pick4" | "nj-pick3" | "nj-pick4" | "tx-pick3" | "tx-pick4" | "nc-pick3" | "nc-pick4" | "powerball" | "megamillions"; label: string; tag: string; blurb: string }[] = [
  { id: "wi-pick3", label: "Wisconsin Pick 3", tag: "3-digit · twice daily", blurb: "Wisconsin Lottery's twice-daily 3-digit game. History since 1992." },
  { id: "wi-pick4", label: "Wisconsin Pick 4", tag: "4-digit · twice daily", blurb: "Wisconsin Lottery's 10,000-outcome game. History since 1997." },
  { id: "pa-pick3", label: "Pennsylvania Pick 3", tag: "3-digit · twice daily", blurb: "Pennsylvania Pick 3. The deepest record on the site — back to 1977." },
  { id: "pa-pick4", label: "Pennsylvania Pick 4", tag: "4-digit · twice daily", blurb: "Pennsylvania Pick 4. 23k+ draws since 1980." },
  { id: "nj-pick3", label: "New Jersey Pick 3", tag: "3-digit · twice daily", blurb: "New Jersey Pick-3. Midday 12:59 PM / Evening 10:57 PM ET." },
  { id: "nj-pick4", label: "New Jersey Pick 4", tag: "4-digit · twice daily", blurb: "New Jersey Pick-4. Twice-daily 4-digit game." },
  { id: "tx-pick3", label: "Texas Pick 3", tag: "3-digit · Day + Night", blurb: "Texas Lottery Pick 3 (Day + Night). Texas runs four draws daily; we show the two flagship times." },
  { id: "tx-pick4", label: "Texas Daily 4", tag: "4-digit · Day + Night", blurb: "Texas Lottery Daily 4. Same two-draw model as Pick 3 — 11k+ draws since 2007." },
  { id: "nc-pick3", label: "North Carolina Pick 3", tag: "3-digit · twice daily", blurb: "NC Education Lottery Pick 3. Day + Evening draws — 13k+ records back to October 2006." },
  { id: "nc-pick4", label: "North Carolina Pick 4", tag: "4-digit · twice daily", blurb: "NC Education Lottery Pick 4. Day + Evening — full history since April 2009." },
  { id: "powerball", label: "Powerball", tag: "5/69 + 1/26", blurb: "Multi-state. Current 5/69+1/26 era began Oct 2015; older eras tagged separately." },
  { id: "megamillions", label: "Mega Millions", tag: "5/70 + 1/24", blurb: "National. Matrix revamped April 2025 to 5/70 + 1/24; earlier eras tagged separately." },
];

// Sticky-stack grouping: National first, then the five states in the
// order they shipped. Counts/dates resolved server-side from META so
// the client component receives plain props (no META in the bundle).
const GROUP_DEFS: { key: string; title: string; ids: string[] }[] = [
  { key: "national", title: "National games", ids: ["powerball", "megamillions"] },
  { key: "wi", title: "Wisconsin", ids: ["wi-pick3", "wi-pick4"] },
  { key: "pa", title: "Pennsylvania", ids: ["pa-pick3", "pa-pick4"] },
  { key: "nj", title: "New Jersey", ids: ["nj-pick3", "nj-pick4"] },
  { key: "tx", title: "Texas", ids: ["tx-pick3", "tx-pick4"] },
  { key: "nc", title: "North Carolina", ids: ["nc-pick3", "nc-pick4"] },
];

export default function HomePage() {
  const groups: GameGroup[] = GROUP_DEFS.map((def) => ({
    key: def.key,
    title: def.title,
    games: def.ids.map((id) => {
      const g = GAMES.find((x) => x.id === id)!;
      const m = (META as any)[id];
      return {
        id: g.id,
        label: g.label,
        tag: g.tag,
        blurb: g.blurb,
        count: m?.count ?? 0,
        earliest: m?.earliest ?? "—",
        latest: m?.latest ?? "—",
      };
    }),
  }));

  return (
    // Wider, screen-percentage layout: 94% of the viewport (so the hero
    // rectangle box scales with the screen) capped at 1600px on large
    // displays — up from the old fixed ~1280px (max-w-7xl).
    <div className="mx-auto w-[94%] max-w-[1600px] py-10 sm:py-14">
      {/* Hero — the lottery-ball video plays behind, giving the balls
          the user wants; a LEFT-weighted scrim darkens only the text
          column so the headline stays crisp while the balls show
          clearly on the right. Fixes the original overlap without
          losing the balls. */}
      <section className="relative overflow-hidden rounded-lg border border-hairline p-8 sm:p-14 min-h-[480px] sm:min-h-[520px]">
        <HeroVideoBackground />
        {/* Readability scrim: strong on the text (left) side, fading to
            transparent on the right so the balls read clearly there. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(100deg, rgba(14,15,19,0.94) 0%, rgba(14,15,19,0.86) 34%, rgba(14,15,19,0.40) 62%, rgba(14,15,19,0.05) 100%)",
          }}
        />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-data-label text-fg-tertiary mb-5">
            <span className="h-1.5 w-1.5 rounded-pill bg-data-fair" />
            A DATA OBSERVATORY
          </div>
          <h1 className="t-hero text-fg-primary">
            Decades of draws.<br />
            <span className="text-brand-500">No predictions.</span>
          </h1>
          <p className="mt-6 text-fg-secondary text-body max-w-2xl leading-body">
            DrawData turns public lottery history into an interactive, honest data
            instrument. Powerball winning numbers since 1992. Mega Millions since 2002.
            Pick 3 and Pick 4 results from Wisconsin, Pennsylvania, New Jersey, Texas,
            and North Carolina — a quarter-million draws in all. Watch frequencies
            converge, gaps wander, sums settle into a bell. Test your favorite
            &ldquo;system&rdquo; in the Formula Lab and see, with your own eyes, why
            randomness is randomness.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Magnet padding={120} strength={4}>
              <Link href="/powerball" className="btn btn-primary">
                Open the data
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </Magnet>
            <Magnet padding={120} strength={5}>
              <Link href="/lab" className="btn btn-ghost">
                Try the Formula Lab
              </Link>
            </Magnet>
          </div>
        </div>
      </section>

      {/* Game deck — sticky stacking cards. Each state pins and scales
          back as the next scrolls over it. */}
      <div className="mt-12">
        <GameStack groups={groups} />
      </div>

      {/* Dormant ad slot (renders nothing until AdSense is approved +
          NEXT_PUBLIC_ADSENSE_CLIENT is set). Placed between content
          sections, never in the hero or the data tools. */}
      <AdSlot slot="home-mid" />

      <ScrollReveal>
        <section className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="panel p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-cool font-mono">Principle</div>
            <h2 className="font-display text-[22px] mt-2">Descriptive, not predictive.</h2>
            <AnimatedText
              className="mt-3 text-[14px] text-dim leading-relaxed"
              text="Every chart in DrawData shows you what has happened. No chart, ranking, or tool here is designed to tell you what will. Lottery draws are independent and random — the past does not pull on the future."
            />
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
      </ScrollReveal>

      {/* Crawlable summary section — natural-language sentences seeded
          with the queries real users actually type ("powerball winning
          numbers", "pa pick 3 history", "texas daily 4 results", etc.).
          Not SEO stuffing; it's the legitimate site overview, written
          to match search intent. Lives below the fold; the visual
          hierarchy above is unchanged. */}
      <ScrollReveal>
        <section className="mt-16 panel p-6 sm:p-8">
          <div className="text-[11px] uppercase tracking-[0.18em] text-cool font-mono">What's on this site</div>
          <h2 className="font-display text-[22px] mt-2">Five states, two national games, every draw on record.</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[14px] text-dim leading-relaxed">
            <p>
              <strong className="text-text">Powerball winning numbers</strong> back to the
              game's first 1992 draw, with separate era tagging through every matrix
              change (5/55 in 2002, 5/59 in 2009, 5/69 + 1/26 since October 2015).
            </p>
            <p>
              <strong className="text-text">Mega Millions history</strong> since the
              game launched in 2002, including the April 2025 matrix change to 5/70 +
              1/24. National draws, sourced from data.ny.gov.
            </p>
            <p>
              <strong className="text-text">Pennsylvania Pick 3 and Pick 4</strong> —
              the deepest record on the site, every draw since the PA Lottery began
              them in 1977 / 1980. Midday and Evening streams kept separate.
            </p>
            <p>
              <strong className="text-text">New Jersey Pick-3 and Pick-4</strong>
              Midday and Evening results since 2015. Pulled directly from
              njlottery.com.
            </p>
            <p>
              <strong className="text-text">Wisconsin Pick 3 and Pick 4</strong>
              history from 1992 / 1997 to today. Midday and Evening draws.
            </p>
            <p>
              <strong className="text-text">Texas Pick 3 and Daily 4</strong> — Texas
              runs four daily draws (Morning, Day, Evening, Night); we expose the two
              flagship Day + Night times since 1993 / 2007.
            </p>
            <p>
              <strong className="text-text">North Carolina Pick 3 and Pick 4</strong>
              Day and Evening winning numbers since the NC Education Lottery's first
              draws in 2006 / 2009.
            </p>
            <p>
              Every dataset feeds the same set of analytics: digit frequency, pair
              and triple co-occurrence, gap distributions, sums, positional bias,
              stream comparisons, and a draw-by-draw backtester in the Formula Lab.
              Nothing predicts the future. Everything describes the past.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-[13px]">
            <Link href="/picker" className="text-accent hover:underline">Pick a state →</Link>
            <span className="text-dim">·</span>
            <Link href="/about" className="text-accent hover:underline">How DrawData is built</Link>
            <span className="text-dim">·</span>
            <Link href="/lab" className="text-accent hover:underline">Try the Formula Lab</Link>
          </div>
        </section>
      </ScrollReveal>
    </div>
  );
}
