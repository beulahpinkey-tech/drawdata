export const metadata = { title: "Terms of Service — DrawData" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-8 text-[14px] leading-relaxed">
      <header>
        <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">Legal</div>
        <h1 className="mt-2 font-display text-[40px] tracking-tight leading-tight">Terms of Service</h1>
        <p className="mt-2 text-dim text-[12px]">Last updated: 2026-05-25. Please review with counsel before publishing commercially.</p>
      </header>

      <Section title="1. Acceptable use">
        <p>
          DrawData is a descriptive data tool. You agree to use it only as intended: viewing,
          exploring, and exporting analyses of public lottery draw history for personal, non-commercial
          analysis and entertainment purposes. You agree not to scrape the site at a rate that would
          interfere with other users, reverse-engineer it for commercial competing use without
          permission, or use it as a basis for placing bets or representing predictions to others.
        </p>
      </Section>

      <Section title="2. Descriptive, not predictive">
        <p>
          <strong>Nothing on DrawData predicts future lottery draws or improves your odds of
          winning.</strong> Lottery draws are random and independent events. Every chart, analysis,
          backtest, and ranking on this site describes historical results. You acknowledge this
          and agree not to treat any content on the site as betting advice.
        </p>
      </Section>

      <Section title="3. No affiliation">
        <p>
          DrawData is not affiliated with, endorsed by, or sponsored by the Wisconsin Lottery, the
          Multi-State Lottery Association, or any other official lottery, government body, or
          gambling operator. Lottery brand names, marks, and trade dress are the property of their
          respective owners and used here only for factual reference.
        </p>
      </Section>

      <Section title="4. Age restriction">
        <p>
          You must be at least <strong>18 years old</strong> to use this site. By using DrawData you
          represent that you meet this age requirement.
        </p>
      </Section>

      <Section title="5. No warranty">
        <p>
          The site is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong> without warranties of any
          kind, express or implied, including merchantability, fitness for a particular purpose, or
          non-infringement. We do not guarantee that the data is current, complete, accurate, or
          free from error. Data refreshes are manual.
        </p>
      </Section>

      <Section title="6. Limitation of liability">
        <p>
          To the maximum extent permitted by law, DrawData and its operators are not liable for any
          indirect, incidental, special, consequential, or punitive damages, or for any loss of
          profits or revenues, whether incurred directly or indirectly, arising out of your access
          to or use of this site, including any reliance on the analytics displayed.
        </p>
      </Section>

      <Section title="7. Responsible play">
        <p>
          If gambling is causing problems for you or someone you know, in the U.S. call{" "}
          <strong>1-800-GAMBLER</strong> or visit <a href="https://www.ncpgambling.org" target="_blank" rel="noreferrer noopener" className="underline-offset-2 hover:underline">ncpgambling.org</a>.
        </p>
      </Section>

      <Section title="8. Governing law">
        <p>
          These terms are governed by the laws of the State of <strong>Wisconsin, USA</strong>,
          without regard to its conflict-of-laws principles. (Site owner: please confirm with
          counsel for your jurisdiction.)
        </p>
      </Section>

      <Section title="9. Changes">
        <p>
          We may update these terms over time. Material changes will be reflected in the &ldquo;Last
          updated&rdquo; date above. Continued use of the site after changes constitutes acceptance.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[22px] tracking-tight">{title}</h2>
      <div className="divider mt-3 mb-4" />
      {children}
    </section>
  );
}
