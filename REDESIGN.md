# DrawData premium redesign — delivery report

> Branch: `UI-Change` · 6 commits · framework: Next.js 14 (unchanged) ·
> approach: additive design system, zero call-site breakage, every
> existing route and feature preserved.

This document is the closing report for the 6-phase redesign defined in
[AUDIT.md](AUDIT.md). It explains what shipped, why each phase was
scoped the way it was, the expected performance and SEO delta, and
what is intentionally left untouched.

---

## At a glance

| Phase | Commit | Scope | Risk |
|---|---|---|---|
| **0 · Audit** | `a8a9651` | Stack, route tree, token inventory, top-10 problems, decisions to confirm | None — read-only |
| **1 · Design system** | `f9ca59f` | Role-named tokens, fluid type scale, 4 radii, motion tokens, button/link utilities | Zero — all legacy names preserved as aliases |
| **2 · Signature moment** | `fd85668` | Replaced decorative 5.8 MB hero video with a self-drawing Powerball frequency chart | Low — only the homepage hero touched |
| **3 · Motion system** | `334f984` | `.card-hover`, `<ScrollReveal>`, aligned ease constant | Zero — additive |
| **4 · Section treatment** | `fc771af` | New SiteFooter + CTA band, `.card-hover` on game cards, About page rewrite | Low — DisclaimerBar replaced |
| **5 · Quality bar** | `b782c5e` | Lab page metadata + SoftwareApplication JSON-LD | None — additive metadata |
| **6 · Delivery** | *(this commit)* | REDESIGN.md | Documentation only |

Every commit passes `npm run typecheck` and `npm run build`. The
production Next.js bundle's First Load JS is unchanged (87.7 kB
shared chunks); the only visible bundle delta is the new
SignatureDataViz component on the homepage, which is small and
client-only.

---

## The design system, in one paragraph

Three families of tokens live in [`styles/tokens.css`](styles/tokens.css):
the **brand ramp** (`--accent-100…900`, derived from the historical
amber `#E9B84A`), the **semantic data accents** (`--data-fair` teal
for "expected/on-baseline" and `--data-divergent` coral for "off-
baseline"), and the **structural neutrals** (`--bg-base/elevated/
surface`, `--text-primary/secondary/tertiary/quiet`, `--edge-default/
hover`). Every color in the wild now maps to one of those tokens —
no hex literals scattered through component files. A single
`--gradient-cta = linear-gradient(135deg, accent-600, accent-400)`
is reserved exclusively for the primary CTA on hero/footer. The
typography is a fluid scale via `clamp()` exposed both as CSS
variables (`--text-hero/h1/h2/h3/h4/body/small/caption`) and as
Tailwind utilities (`text-hero`, `text-h1`, etc.). Fraunces is
retained as the display face (per audit decision A) but tuned with
`font-optical-sizing: auto` + `font-variation-settings: "opsz"` so
hero and h1 render at the 144 / 96 axis values for dramatic stroke
contrast at large sizes. Spacing is on an 8-px grid via `--space-1
…8`, and section vertical rhythm comes from
`--section-y: clamp(5rem, 12vh, 10rem)`. Radii are exactly four:
`--r-sm: 8`, `--r-md: 14`, `--r-lg: 24`, `--r-pill: 999`. Motion has
one easing (`--ease-premium: cubic-bezier(0.22, 1, 0.36, 1)`) and
four durations (`--dur-micro/standard/entrance/hero`); both the CSS
and JS sides (`primitives.tsx`) reference the same curve. The full
system is additive: every legacy name (`text-dim`, `bg-accent`,
`text-cool`, `text-hot`, `border-edge`, etc.) is still a valid
Tailwind class because it resolves through a CSS variable to the
new role-named token. That's why this branch can land without
touching ~50 of the 56 `.tsx` files in the repo.

---

## The signature moment

[`components/hero/SignatureDataViz.tsx`](components/hero/SignatureDataViz.tsx)
replaces the previous `HeroVideoBackground` (5.8 MB MP4 of decorative
lottery balls). The new hero element shows the *real* Powerball
white-ball frequency series — current-era, 1,365 draws across balls
1–69 — as a self-drawing SVG line. The mathematically expected count
(≈ 98.9 per ball, given the draw count and pool size) overlays as a
dashed teal baseline; the actual values wiggle between 78 and 127.
That gap *is* DrawData's thesis. The animation choreography lasts
1.6 s end-to-end:

| Time | Beat |
|---|---|
| 0.00 s | Chart container fades in (poster instant). |
| 0.05 s | Amber line begins drawing left → right (1.4 s, `--ease-premium`). |
| 0.70 s | Area fill under the line fades in. |
| 1.10 s | Dashed teal "expected" baseline fades in. |
| 1.30 s | "EXPECTED · 98.9" label appears at right of baseline. |
| 1.45 s | Cursor magnetization engages. |
| 1.50 s | Bottom caption ("POWERBALL · WHITE BALL FREQUENCY · 1,365 DRAWS · 2015–PRESENT" + range "78 … 127") fades in. |

Cursor interaction is subtle and informational rather than performative:
the data point nearest the cursor (within 120 px in chart space) gets
a glow halo, an accent dot, and a vertical guide; a mono caption below
the chart reads `BALL N · count drawn`. `prefers-reduced-motion`
disables the drawing animation and the cursor magnetization — the
chart paints in final state, baseline visible from t=0.

Why this is the right signature: anyone who lands on the homepage
sees in 1.5 s, without reading a word, exactly what DrawData *is*.
A wiggle around a steady baseline is the entire visual argument
against "due numbers" or "hot streaks." That's premium signal —
the moment people remember.

---

## Performance: expected impact

I do not have headless-browser access from this shell, so the
production Lighthouse numbers should be captured against the deployed
`UI-Change` build (or after this branch is merged to main and CF
Pages publishes). Here is what to expect based on the changes:

### LCP (Largest Contentful Paint)

Cloudflare Web Analytics before this branch showed LCP at **13.8 s
P50 / 58 s P99 — 100 % of visits in the "Poor" bucket.** Root cause,
already shipped pre-redesign: the 5.8 MB hero video downloaded on the
critical path.

After this branch's Phase 2, the hero contains a small SVG (a few KB
of path data + the Powerball aggregate JSON, which Next.js bundles
into the page). The H1 (Fraunces, served via Google Fonts) is now
the LCP candidate.

**Expected LCP after deploy:** 1.5–2.5 s P75 (well inside Google's
2.5 s "Good" threshold) on cable/fast 4G, ≤ 4 s on slow 4G. The
ceiling is set by Google Fonts CSS fetch + woff2 download time,
which is *the* remaining performance bottleneck and is called out
under "What's intentionally left as a follow-up" below.

### CLS (Cumulative Layout Shift)

CLS was already ✅ before the redesign. The new hero uses absolute
positioning inside a fixed-min-height section; nothing reflows after
the chart appears. The new footer reserves its own space; the
oversized wordmark uses `clamp()` for its size so it doesn't snap
at breakpoints. Expected CLS: < 0.05.

### INP (Interaction to Next Paint)

INP was ✅ before, and Phase 3 didn't change anything heavy on the
interaction path. The cursor magnetization in the hero runs in a
single `setState` per pointermove and is gated behind a `useState`
boolean that's false for the first 1.45 s. Expected INP: < 100 ms.

### Bundle size

- First Load JS shared chunks: **87.7 kB** (unchanged).
- Homepage delta: the SignatureDataViz adds ~3 kB gzipped (small SVG
  + a few `useEffect`s); the removal of `HeroVideoBackground` saves
  similar plus the 5.8 MB MP4 from network.
- Per-game routes: unchanged. The new `<ScrollReveal>` primitive only
  emits markup when used.

### SEO

- WebSite + Organization + per-game Dataset + Lab SoftwareApplication
  JSON-LD now all ship as inline `<script type="application/ld+json">`.
- Sitemap, robots.txt, canonical-host middleware, og:image (SVG),
  Twitter cards: all in place.
- The About page is no longer stale; iterating over `ALL_GAMES` means
  adding a new state (`KS-pick3`, etc.) updates the page automatically.

---

## What's intentionally left untouched

Per the audit's §8 ("What I'll explicitly leave untouched unless told
otherwise"):

1. **The 9 per-game sub-route view components** (`FrequencyView`,
   `GapsView`, `PairsView`, `PositionalView`, `CarryoverView`,
   `StreamsView`, `CoverageView`, `LookupView`, `CheckView`) — they
   are working data instruments. The redesign updated only the page
   chrome (`/[game]/layout.tsx`, headers, panel borders, eyebrow
   typography) — never the charts inside them.
2. **`app/lab/LabView.tsx`** (742 lines) — the rule-builder logic.
   Only the hero of `app/lab/page.tsx` was touched.
3. **The data refresh pipeline** — `scripts/fetch-*.ts`, the GitHub
   Actions workflow, `precompute.ts`. Pure infrastructure.
4. **Legal / consent components** — `CookieConsent`, `AgeGate`,
   `DisclaimerBar` (now unmounted but file preserved in case the
   pattern is reused). Copy must not change without legal review.
5. **`HeroVideoBackground.tsx`** — the file is on disk but no longer
   imported. Kept because the "poster paints instantly, video swaps in
   after `window.load`" pattern is reusable for future media sections
   and we don't want to lose the snippet.

---

## What's intentionally left as a follow-up

These are real wins that need work outside the constraints of this
branch:

1. **Self-host the three Google Fonts.** This is the single biggest
   remaining LCP optimization — the Google Fonts `<link>` is still
   render-blocking, with two cross-origin handshakes
   (`fonts.googleapis.com` → `fonts.gstatic.com`). The earlier
   `next/font/google` attempt failed with `ECONNRESET` during the
   build, which is too fragile (a single failure would break the CF
   Pages deploy). The right path: manually download the woff2 files
   into `public/fonts/`, write `@font-face` rules in `tokens.css`,
   keep `font-display: swap`. ~30 minutes of work, no build-time
   network dependency. Owner: TBD.
2. **Lighthouse run on the deployed `UI-Change` build.** I cannot
   measure from this shell. Expected scores are documented above;
   actual scores should land in this file once captured.
3. **Responsive screenshot pass.** The brief asked for full-page
   captures at 390 / 768 / 1440 px widths. Recommend Playwright
   running against the production deploy (or `npm run dev`) to
   produce them; small visual adjustments (cramped sections, off-grid
   spacing) tend to surface only in this kind of multi-viewport
   review.
4. **Apply `.card-hover` + Phase-1 type utilities to the 9 per-game
   view files.** Right now they still use legacy names (`text-dim`,
   `text-[11px]`, etc.) — which work because of the alias layer, but
   visual consistency improves once they migrate. This is the
   "Phase 4½" cleanup.
5. **Sitemap submission to Google Search Console + Bing Webmaster
   Tools.** Code-side is ready (`/sitemap.xml` lists every route
   including all 12 game slugs). Manual verification + submission
   still required.

---

## Constraints honored throughout

From the original brief:

> Never delete content or break a route. Never invent fake testimonials,
> fake logos, or fake metrics — if a section needs content that doesn't
> exist, use clearly-marked placeholder copy and flag it in REDESIGN.md.

✅ No routes deleted. No content lost. No fake data added — every
number on the new homepage and footer comes from `lib/data/meta.json`
or `lib/data/powerball.agg.json`. The CTA band's headline ("A
quarter-million draws.") is a true statement (total across all 12
datasets ≈ 250,000).

> One accent color, one gradient, one easing, four radii. If you find
> yourself adding a fifth radius or second gradient, stop and reuse.

✅ One brand accent (`--accent-brand`). One gradient (`--gradient-cta`).
One easing (`--ease-premium`, mirrored in JS as `[0.22, 1, 0.36, 1]`).
Four radii (`sm`, `md`, `lg`, `pill`). The two semantic data accents
(`--data-fair`, `--data-divergent`) are explicitly *not* chrome accents
— they appear inside charts and stats only.

> Restraint is the premium signal: when in doubt, remove the effect.

✅ The hero went from a 5.8 MB animated video to a single self-drawing
line. The shimmer animation defined in `tailwind.config.ts` is unused
(no ambient auto-animation in the wild). The new footer wordmark is
text-`--text-quiet` (12 % opacity) — visible but not loud.

---

## How to read the diff

The fastest tour of the branch:

```bash
# What did each phase actually change?
git log --oneline a8a9651^..HEAD

# Diff against main, summarized by file:
git diff --stat main..UI-Change

# The design system itself:
git show f9ca59f -- styles/tokens.css tailwind.config.ts

# The signature moment:
git show fd85668 -- components/hero/SignatureDataViz.tsx

# The new footer:
git show fc771af -- components/SiteFooter.tsx
```

`AUDIT.md` (Phase 0) remains the canonical "why we chose what we
chose" document. This file (`REDESIGN.md`) is the "what we did."
Together they're the brief and the spec for anyone picking up the
follow-up items above.
