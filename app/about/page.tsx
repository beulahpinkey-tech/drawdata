import { META } from "@/lib/data";
import { POWERBALL_ERAS } from "@/lib/ingest/eras";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-10">
      <header>
        <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">About</div>
        <h1 className="mt-2 font-display text-[40px] leading-tight tracking-tight">
          DrawData is a data observatory, not a tipster.
        </h1>
        <p className="mt-4 text-dim leading-relaxed">
          We turn public Wisconsin Lottery (and multi-state Powerball) draw history into interactive,
          honest analytics. The point of view is structural: lottery draws are independent and
          random, so every view here describes the past — none claims to predict the future.
        </p>
        {(META as any).lastCsvUpdated && (
          <div className="mt-4 inline-flex items-center gap-2 text-[12px] font-mono text-dim panel-inner px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cool" />
            Data last updated: <span className="text-text">{new Date((META as any).lastCsvUpdated).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
          </div>
        )}
      </header>

      <Section title="Data sources">
        <p>
          The historical draw data comes from the <strong className="text-text">Wisconsin Lottery</strong>{" "}
          public draw history. Winning numbers are public facts, but we want to be explicit:{" "}
          <strong className="text-text">DrawData is not affiliated with, endorsed by, or sponsored by the Wisconsin Lottery or any other official lottery.</strong>
        </p>
        <p className="mt-3">
          Three CSV files live in <code className="font-mono text-text bg-white/[0.04] px-1.5 py-0.5 rounded">data/wi/</code> inside the project and are
          processed at build time by <code className="font-mono text-text bg-white/[0.04] px-1.5 py-0.5 rounded">npm run ingest</code>:
        </p>
        <ul className="mt-3 space-y-2 text-[13px]">
          {[
            { slug: "wi-pick3", label: "Wisconsin Pick 3" },
            { slug: "wi-pick4", label: "Wisconsin Pick 4" },
            { slug: "pa-pick3", label: "Pennsylvania Pick 3" },
            { slug: "pa-pick4", label: "Pennsylvania Pick 4" },
            { slug: "powerball", label: "Powerball" },
            { slug: "megamillions", label: "Mega Millions" },
          ].map(({ slug, label }) => {
            const m = (META as any)[slug];
            if (!m) return null;
            return (
              <li key={slug}>
                <strong className="text-text">{label}</strong> — {m.count.toLocaleString()} draws,{" "}
                {m.earliest} → {m.latest}.
                {m.skipped > 0 && <span className="text-dim"> ({m.skipped} malformed rows skipped)</span>}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-dim text-[13px]">
          Mega Millions is a national game (same draws everywhere); Wisconsin started selling in 2010,
          hence the start date there. Pennsylvania&rsquo;s Pick 3 has the deepest record — back to 1977.
        </p>
        <p className="mt-3 text-dim">
          Pick 3 and Pick 4 are Wisconsin state-scoped games. Powerball is multi-state; its drawing
          matrix has changed seven times since 1992.
        </p>
      </Section>

      <Section title="Powerball eras">
        <p>
          Cross-number analytics in DrawData default to the current matrix only — apples-to-apples
          comparisons require it. Every draw is tagged with its era at ingest:
        </p>
        <div className="mt-3 panel-inner divide-y divide-edge font-mono text-[12px]">
          {POWERBALL_ERAS.map((e) => (
            <div key={e.id} className="px-3 py-2 flex justify-between gap-3">
              <span className="text-dim">{e.start} → {e.end ?? "present"}</span>
              <span className="text-text">{e.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Methodology">
        <ul className="mt-3 space-y-3 text-[13px]">
          <li>
            <strong className="text-text">Frequency.</strong> Raw count per number / digit. The dashed
            line on every frequency chart is the count you&rsquo;d expect if the draws were perfectly
            random (total slots ÷ pool size).
          </li>
          <li>
            <strong className="text-text">Gaps.</strong> &ldquo;Current gap&rdquo; is the number of draws since a
            value last appeared. The full gap distribution is geometric (memoryless) under a fair
            process — we overlay that theoretical curve for comparison.
          </li>
          <li>
            <strong className="text-text">Coverage.</strong> Running count of unique values ever drawn.
            Classic coupon-collector behaviour: fast at first, then slowing.
          </li>
          <li>
            <strong className="text-text">Sums &amp; shapes.</strong> Distributions of digit sums and
            of repeat patterns (doubles, triples, quads). These distributions are mathematical
            features of independent uniform digits — not strategy signals.
          </li>
          <li>
            <strong className="text-text">Formula Lab.</strong> Each user-built rule is evaluated against
            every consecutive (prev → next) transition. We report straight (exact-position) and box
            (any-order) hit rates with the chance baseline computed as <span className="font-mono">E[|candidate set|] ÷ outcome space</span>. A
            split test (first half vs second half) flags overfitting.
          </li>
        </ul>
      </Section>

      <Section title="What we will never do">
        <ul className="mt-3 space-y-2 text-[13px]">
          <li>Claim a chart, ranking, or rule improves your odds of winning.</li>
          <li>Use language like &ldquo;due&rdquo;, &ldquo;hot pick&rdquo;, &ldquo;best play&rdquo;, or &ldquo;system that beats the lottery.&rdquo;</li>
          <li>Sell tickets, take bets, route to sportsbooks, or run lottery affiliate links.</li>
          <li>Imitate the branding or layout of any official lottery or government website.</li>
        </ul>
      </Section>

      <Section title="Standing disclaimer">
        <p className="text-[13px] text-dim">
          For analysis and entertainment only. Lottery draws are random and independent. This app
          describes past results and does not predict future numbers, improve your chances of
          winning, or constitute betting advice. Not affiliated with or endorsed by any official
          lottery. 18+.
        </p>
      </Section>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[24px] tracking-tight">{title}</h2>
      <div className="divider mt-3 mb-4" />
      <div className="text-[14px] leading-relaxed">{children}</div>
    </section>
  );
}
