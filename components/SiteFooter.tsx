import Link from "next/link";
import { META } from "@/lib/data";

/**
 * SiteFooter — Phase 4 premium footer.
 *
 * Composition (top → bottom):
 *   1. CtaBand (full-bleed) — one headline, one CTA, amber wash @ 8%.
 *   2. Footer columns grid — Games, Tools, Project, Last refresh.
 *   3. Oversized wordmark — clamp(4rem, 14vw, 12rem), text-fg-quiet.
 *      The visual anchor that ends every page.
 *   4. Legal line — disclaimer + links + version.
 *
 * The pre-Phase-4 <DisclaimerBar> was only step 4. Steps 1–3 turn the
 * end of every page from "fine print" into a final beat.
 */
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function SiteFooter() {
  const last = (META as any).lastCsvUpdated as string | undefined;
  return (
    <footer className="mt-section">
      {/* ── 1. CTA band ── */}
      <CtaBand />

      {/* ── 2 + 3. Columns + oversized wordmark ── */}
      <div className="border-t border-hairline">
        <div className="mx-auto max-w-narrow px-4 sm:px-6 pt-16 pb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <Column
              heading="Games"
              links={[
                { href: "/powerball", label: "Powerball" },
                { href: "/megamillions", label: "Mega Millions" },
                { href: "/picker", label: "Pick by state" },
              ]}
            />
            <Column
              heading="Tools"
              links={[
                { href: "/lab", label: "Formula Lab" },
                { href: "/powerball/frequency", label: "Frequency" },
                { href: "/powerball/gaps", label: "Gaps" },
                { href: "/powerball/coverage", label: "Coverage" },
              ]}
            />
            <Column
              heading="Project"
              links={[
                { href: "/learn", label: "Learn (Q&A)" },
                { href: "/about", label: "About & methodology" },
                { href: "/contact", label: "Feedback" },
                { href: "/privacy", label: "Privacy" },
                { href: "/terms", label: "Terms" },
              ]}
            />
            <div>
              <div className="t-data-label mb-3">Last refresh</div>
              <div className="font-mono text-small text-fg-secondary">
                {last ? fmtDate(last) : "—"}
              </div>
              <div className="mt-1 t-caption text-fg-tertiary">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-pill bg-data-fair" />
                  Twice daily via GitHub Actions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Oversized wordmark — the final visual beat ── */}
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="font-display select-none leading-none text-center pointer-events-none"
            style={{
              fontSize: "clamp(4rem, 14vw, 12rem)",
              fontWeight: 600,
              letterSpacing: "-0.04em",
              color: "var(--text-quiet)",
              fontOpticalSizing: "auto",
              fontVariationSettings: '"opsz" 144',
              lineHeight: 0.85,
              padding: "0.4em 0 0.2em",
            }}
          >
            DrawData
          </div>
        </div>

        {/* ── 4. Legal line ── */}
        <div className="border-t border-hairline">
          <div className="mx-auto max-w-narrow px-4 sm:px-6 py-6 text-small text-fg-tertiary leading-body">
            <p className="max-w-4xl">
              <span className="text-fg-primary font-medium">For analysis and entertainment only.</span>{" "}
              Lottery draws are random and independent. This app describes past results
              and does not predict future numbers, improve your chances of winning, or
              constitute betting advice. Sources: official lottery publications from
              California, Colorado, Florida, Georgia, Maryland, Massachusetts,
              Michigan, New Jersey, North Carolina, Pennsylvania, Texas, Washington
              and Wisconsin, plus New York State open data (data.ny.gov) for the New
              York and Mega Millions draws.{" "}
              <strong className="text-fg-primary">Not affiliated with or endorsed by any official lottery.</strong> 18+.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 t-caption">
              <Link href="/about" className="link-underline hover:text-fg-primary">
                About
              </Link>
              <span className="text-fg-quiet">·</span>
              <Link href="/privacy" className="link-underline hover:text-fg-primary">
                Privacy
              </Link>
              <span className="text-fg-quiet">·</span>
              <Link href="/terms" className="link-underline hover:text-fg-primary">
                Terms
              </Link>
              <span className="text-fg-quiet">·</span>
              <Link href="/contact" className="link-underline hover:text-fg-primary">
                Feedback
              </Link>
              <span className="text-fg-quiet">·</span>
              <span>DrawData v0.3</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Column({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <div className="t-data-label mb-3">{heading}</div>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-small text-fg-secondary link-underline hover:text-fg-primary"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * CtaBand — the "one final ask" before the legal line.
 * Full-bleed amber wash @ 8% opacity, one display headline, one CTA.
 */
function CtaBand() {
  return (
    <section
      className="relative overflow-hidden border-t border-hairline"
      style={{
        background:
          "radial-gradient(ellipse 80% 70% at 50% 0%, rgba(233,184,74,0.08), transparent 70%)",
      }}
    >
      <div className="mx-auto max-w-narrow px-4 sm:px-6 py-section flex flex-col items-center text-center gap-6">
        <div className="t-data-label">One last thing</div>
        <h2 className="t-h2 max-w-3xl">
          Over 330,000 draws.<br />
          <span className="text-brand-500">Pick one and look.</span>
        </h2>
        <p className="text-fg-secondary max-w-prose text-body">
          The Formula Lab takes a transformation rule from the last draw and
          backtests it across every consecutive transition we have on file.
          Try yours.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 justify-center">
          <Link href="/lab" className="btn btn-primary">
            Open the Formula Lab
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7h8m0 0L7 3m4 4l-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link href="/picker" className="btn btn-ghost">
            Pick by state
          </Link>
        </div>
      </div>
    </section>
  );
}
