export const metadata = {
  title: "Privacy Policy — DrawData",
  alternates: { canonical: "https://draw-data.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-8 text-[14px] leading-relaxed">
      <header>
        <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">Legal</div>
        <h1 className="mt-2 font-display text-[40px] tracking-tight leading-tight">Privacy Policy</h1>
        <p className="mt-2 text-dim text-[12px]">Last updated: 2026-05-25</p>
      </header>

      <p>
        DrawData is a static analytics website for displaying public lottery draw history. This
        policy describes what we do (and don&rsquo;t) collect.
      </p>

      <Section title="What we collect">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Nothing about you by default.</strong> The site does not require an account; no
            cookies are set for analytics or advertising unless you opt in via the consent banner.
          </li>
          <li>
            <strong>Feedback form.</strong> When you submit the form at <a className="underline-offset-2 hover:underline" href="/contact">/contact</a>,
            we transmit your message and, if you provided one, your email to the owner via{" "}
            <a href="https://web3forms.com" target="_blank" rel="noreferrer noopener" className="underline-offset-2 hover:underline">Web3Forms</a>.
            Web3Forms handles the email delivery; see their privacy policy for their data handling.
            We only use your email to reply.
          </li>
          <li>
            <strong>Waitlist.</strong> When you join a state waitlist from the picker, we transmit your
            email, the chosen state, and any free-text note via the same Web3Forms endpoint. We use this
            address <em className="text-text not-italic">only</em> to notify you when that state&rsquo;s analytics go live.
            It is not sold, not shared with any third party for marketing, and you can ask us to delete
            it at any time via the contact form.
          </li>
          <li>
            <strong>Local storage on your device.</strong> We store two small flags in your
            browser&rsquo;s localStorage so the experience is smoother across visits:{" "}
            <code className="font-mono text-text">drawdata_age_confirmed</code> (your 18+ confirmation)
            and <code className="font-mono text-text">drawdata_active_game</code> (the last game you
            were viewing). These never leave your device.
          </li>
          <li>
            <strong>Privacy-first analytics (aggregate only).</strong> If enabled, we use a
            cookieless, privacy-focused analytics tool (Plausible) that records{" "}
            <em className="text-text not-italic">aggregate</em> usage — page views and which tools/games
            are popular — with <strong>no cookies and no personal data</strong>. It cannot identify you
            or track you across sites; we only ever see counts like &ldquo;the Odds tool was viewed for
            Powerball N times.&rdquo; No consent banner is required for it because it stores nothing on
            your device.
          </li>
          <li>
            <strong>Optional ad cookies.</strong> If we enable advertising in future, any ad cookies
            will be gated by the cookie-consent banner and disabled until you accept. You can revisit
            your choice at any time via the banner&rsquo;s &ldquo;Manage&rdquo; link.
          </li>
        </ul>
      </Section>

      <Section title="What we never do">
        <ul className="list-disc pl-5 space-y-2">
          <li>We do not sell or trade your data.</li>
          <li>We do not profile users to predict future behavior.</li>
          <li>We do not accept payments or take bets on the site.</li>
          <li>We do not store messages beyond what is needed to respond.</li>
        </ul>
      </Section>

      <Section title="Children">
        <p>
          DrawData is restricted to viewers <strong>18 years of age or older</strong>. We do not
          knowingly collect any personal information from anyone under 18.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For privacy questions or to request deletion of any data tied to a feedback submission,
          email through the <a href="/contact" className="underline-offset-2 hover:underline">contact form</a>.
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
      {children}
    </section>
  );
}
