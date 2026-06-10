import { META, GAME_LABELS } from "@/lib/data";
import { ALL_GAMES } from "@/lib/types";
import { POWERBALL_ERAS } from "@/lib/ingest/eras";

export default function AboutPage() {
  // Auto-generate the data sources list from META so this page never
  // goes stale when a new state lands (audit §5 — pre-Phase-4 list was
  // hardcoded to 6 of 12 games).
  const datasetRows = ALL_GAMES
    .map((slug) => ({ slug, label: (GAME_LABELS as any)[slug] as string, m: (META as any)[slug] }))
    .filter((r) => r.m);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-10">
      <header>
        <div className="t-data-label">About</div>
        <h1 className="mt-2 t-h1">
          DrawData is a data observatory, not a tipster.
        </h1>
        <p className="mt-4 text-fg-secondary leading-body">
          We turn public state and national lottery draw history into interactive,
          honest analytics. The point of view is structural: lottery draws are
          independent and random, so every view here describes the past — none claims
          to predict the future. Coverage spans Powerball, Mega Millions, and Pick 3 /
          Pick 4 games across Wisconsin, Pennsylvania, New Jersey, Texas, and North
          Carolina — over a quarter-million draws in all.
        </p>
        {(META as any).lastCsvUpdated && (
          <div className="mt-4 inline-flex items-center gap-2 text-caption font-mono text-fg-tertiary panel-inner px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-pill bg-data-fair" />
            Data last updated: <span className="text-fg-primary">{new Date((META as any).lastCsvUpdated).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
          </div>
        )}
      </header>

      <Section title="Data sources">
        <p>
          Historical draw data is pulled directly from the relevant state lottery
          publications and from <strong className="text-fg-primary">data.ny.gov</strong> Open
          Data (Mega Millions). Winning numbers are public facts, but we want to be
          explicit:{" "}
          <strong className="text-fg-primary">DrawData is not affiliated with, endorsed by, or sponsored by the Wisconsin, Pennsylvania, New Jersey, Texas, or North Carolina Lotteries, the Multi-State Lottery Association, or any other official lottery.</strong>
        </p>
        <p className="mt-3">
          CSVs live under{" "}
          <code className="font-mono text-fg-primary bg-white/[0.04] px-1.5 py-0.5 rounded-sm">data/{"<state>"}/</code>{" "}
          in the project and are processed at build time by{" "}
          <code className="font-mono text-fg-primary bg-white/[0.04] px-1.5 py-0.5 rounded-sm">npm run ingest</code>.
          Every dataset currently in the system:
        </p>
        <ul className="mt-3 space-y-2 text-small tabular-nums">
          {datasetRows.map(({ slug, label, m }) => (
            <li key={slug}>
              <strong className="text-fg-primary">{label}</strong> — {m.count.toLocaleString()} draws,{" "}
              {m.earliest} → {m.latest}.
              {m.skipped > 0 && <span className="text-fg-tertiary"> ({m.skipped} malformed rows skipped)</span>}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-fg-secondary text-small">
          Mega Millions and Powerball are national games (same numbers everywhere);
          their start dates here reflect when our chosen feed begins, not when the
          game launched. Pennsylvania&rsquo;s Pick 3 has the deepest single-state record
          in the system — back to 1977. Texas runs four draws daily; we expose the
          Day and Night flagship times as Midday/Evening to match the other states.
        </p>
        <p className="mt-3 text-fg-secondary">
          Powerball is multi-state; its drawing matrix has changed seven times since
          1992 (see era table below). Mega Millions changed its matrix again in
          April 2025 (now 5/70 + 1/24).
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
