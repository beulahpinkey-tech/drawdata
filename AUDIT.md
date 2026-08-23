# DrawData — Premium Redesign Audit (Phase 0)

> Generated 2026-06-10 on branch `UI-Change`. This file is the input to
> every later phase of the redesign — token decisions, motion choices,
> and section treatments all reference it. Do not delete or move it
> until the final REDESIGN.md ships.

---

## 1. Stack

| Layer | Detected |
|---|---|
| Framework | **Next.js 14.2.15**, App Router, deployed via `@cloudflare/next-on-pages` to Cloudflare Pages (serves `.vercel/output/static`). `output: "standalone"` is set on Linux only — nothing consumes `.next/standalone`, and on Windows it breaks `next build` with EBUSY while tracing edge chunks. Game routes run on the edge runtime, so they are server-rendered per request rather than statically exported. |
| Language | TypeScript (strict) end-to-end |
| Styling | **Tailwind 3.4.7** + a small `styles/tokens.css` of CSS custom properties + utility classes (`.panel`, `.panel-inner`, `.grain`, `.kbd`, `.divider`) |
| Animation | **framer-motion 11.18.2** (used in `components/motion/primitives.tsx` for `StaggerGroup`/`StaggerItem`), Tailwind keyframes (`fade-up`, `shimmer`) |
| 3D | **@react-three/fiber 8 + drei 9 + three 0.169** — present but only `components/3d/HomeHero.tsx` + `HomeHeroMount.tsx` exist. Not currently mounted on the homepage |
| Charts | **recharts 2.12.7** (dark-theme overrides live in `tokens.css`) |
| Fonts | Loaded via `<link>` from `fonts.googleapis.com`: **Fraunces** (display, serif), **Hanken Grotesk** (body), **JetBrains Mono** (mono) |
| Build | `npm run build:cf` runs precompute → `next build` → `@cloudflare/next-on-pages` |
| Refresh | GitHub Actions `pa-refresh.yml` runs `fetch:*` + `ingest` twice daily, commits back to main |

---

## 2. Route tree

```
/                          home — hero + 12-game grid + principles + crawlable summary
/picker                    state picker, search + waitlist for unavailable states
/lab                       Formula Lab (742-line LabView.tsx — biggest single view)
/about                     methodology, data sources, eras, "what we will never do"
/contact                   feedback form (Web3Forms)
/privacy
/terms

/[game]                    per-game overview (12 games: 10 picks + 2 ball games)
├ /frequency               digit / ball frequency
├ /positional              positional digit / sums
├ /pairs                   pair co-occurrence (pick games only)
├ /gaps                    gap distributions + recency
├ /coverage                coverage over time
├ /carryover               carryover + mirror (pick games only)
├ /streams                 midday vs evening (pick games only)
├ /lookup                  number lookup
└ /check                   check your numbers
```

12 game slugs × ~9 sub-routes + 7 top-level routes = **~115 distinct pages**, all static. 56 .tsx files total under `app/` + `components/`.

### Sections per page (current state)

| Page | Sections |
|---|---|
| `/` | (1) Sticky `Header`, (2) Hero w/ video background + H1 + 2 CTAs, (3) 12-card game grid, (4) two-up "Principle / Centerpiece", (5) crawlable "What's on this site" summary (just added), (6) DisclaimerBar (footer band) |
| `/picker` | (1) Header, (2) Search input + national-games block, (3) state grid w/ availability dots + waitlist modal trigger |
| `/lab` | (1) Header, (2) game selector, (3) rule-step builder, (4) backtest output, (5) ShowmoreInteraction prompt |
| `/about` | (1) Header, (2) eyebrow + H1 + intro, (3) "Data sources" w/ stale game list (see §5), (4) "Powerball eras" table, (5) "Methodology" bullets, (6) "What we will never do", (7) disclaimer |
| `/contact` | (1) Header, (2) eyebrow + H1 + intro, (3) FeedbackForm |
| `/[game]` | (1) GameHeader (sub-route tabs), (2) 4-stat row, (3) HonestyNote, (4) "All positions" panel w/ FrequencyBars, (5) "Draw shapes" panel + "Where to go next" link grid |
| `/[game]/<view>` | Custom per view; consistent panel chrome |
| sitewide | `Header`, `DisclaimerBar`, `AgeGate`, `CookieConsent`, `grain` overlay |

---

## 3. Design tokens — current inventory

### Color (9 named CSS variables in `tokens.css`)

| Token | Value | How it's used |
|---|---|---|
| `--ink` | `#0E0F13` | Base background — near-black with character (already aligned with brief's `--bg-base` guidance) |
| `--panel` | `#16181F` | Card top |
| `--panel2` | `#1C1F28` | Card bottom (used in a vertical gradient on `.panel`) |
| `--text` | `#ECE9E0` | Primary text — warm off-white |
| `--dim` | `#928F85` | Secondary text |
| `--edge` | `rgba(236, 233, 224, 0.08)` | Hairline border — already disciplined |
| `--accent` | `#E9B84A` | **Brand amber.** Used for CTAs, highlights, focus rings, links |
| `--cool` | `#5BC8B0` | Teal — used for "fair / expected" data states + Wisconsin / cool stats |
| `--hot` | `#E1664C` | Coral — used semantically for "hot streak" / divergent stats |

**Verdict:** the palette is already mostly disciplined and on-tone for a dark data product. `--cool` and `--hot` are **semantically loaded** (they encode data meaning, not decoration), so collapsing to a single accent per the brief would lose chart legibility. See §6 / decision A.

### Typography

- Display: **Fraunces** — characterful classical serif, opsz-variable. Sets DrawData's "data observatory, not tipster" tone. The brief recommends a grotesk; switching loses brand. See §6 / decision B.
- Body: **Hanken Grotesk** — neutral, highly legible. Already aligned with brief's "Inter-class" recommendation.
- Mono: **JetBrains Mono** — already aligned. Used on tabular numerals, kbd, captions.
- Sizes: ad-hoc Tailwind arbitrary values (`text-[42px]`, `text-[64px]`, `text-[22px]`, `text-[17px]`, `text-[13px]`, `text-[12px]`, `text-[11px]`, `text-[10px]`). **No fluid type scale.** No clamp() anywhere.
- Eyebrow style: uppercase + `tracking-[0.18em]–[0.20em]` + mono + `text-dim`. Used consistently — keep as the caption pattern.

### Spacing

- No 8px grid is enforced. Sections use `py-8`, `py-10`, `py-12`, `py-14` — arbitrary.
- `max-w-3xl`, `max-w-7xl` are used inconsistently across pages.

### Radii (used in the wild)

| Value | Where |
|---|---|
| 4px | `.kbd`, `:focus-visible` |
| 8px | `rounded-md` buttons, `.skip-link` |
| 10px | `.panel-inner` |
| 14px | `.panel` |
| 16px | `rounded-2xl` (HomeHero section) |
| 999px | `rounded-full` (dots, pills) |

Six distinct radii. Brief asks for four (`sm: 8`, `md: 14`, `lg: 24`, `pill: 999`). Need consolidation.

### Shadows

- `boxShadow.panel` in Tailwind config: `0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 60px rgba(0,0,0,0.4)` — already aligned with the brief's "borders + subtle inner highlight" guidance for dark themes. Keep.
- `boxShadow.glow`: amber glow used for hero accents. Keep.
- No other shadows surveyed — discipline is good here.

### Existing animations

- `fade-up`: 0.6s `cubic-bezier(0.16, 1, 0.3, 1)` — already on-brief.
- `shimmer`: 2.4s linear infinite — used on `<ShowmoreInteraction>`. **Ambient auto-animation; flag per Phase 3 "no more than one thing animating ambiently."**

---

## 4. Core purpose + primary conversion

**Single core purpose:** make publicly-released US lottery draw history (Powerball, Mega Millions, Pick 3/4 across WI/PA/NJ/TX/NC) interactively explorable — descriptive analytics, **not** predictions.

**Primary conversion action:** get a visitor onto a meaningful per-game analytics view. Concretely:
- New visitor → **`/picker`** (choose a state) → **`/[game]`** (their state's overview)
- Returning visitor → straight to **`/[game]`** via the GameSwitcher in the nav.

**Secondary conversion:** Formula Lab (`/lab`). This is the product's unique narrative payload — the place where a visitor's "I've got a system" intuition meets the math. Currently linked from the hero but does not get hero-level visual treatment.

**Implication for redesign:** the hero's two CTAs ("Open the data", "Try the Formula Lab") map directly to those conversions. They stay. The signature moment (Phase 2) should reinforce **either** the picker journey (a chart that morphs to invite state selection) or the Formula Lab (a chart with a rule visibly being applied) — not the existing decorative lottery-ball video, which doesn't carry product meaning.

---

## 5. Stale content + correctness issues found during audit

These aren't visual, but they block premium quality and need fixes regardless of phase:

1. **`app/about/page.tsx` line 13–15** — opens with *"We turn public Wisconsin Lottery (and multi-state Powerball) draw history…"* — was written when WI + PB were the only games. Now stale; needs to mention PA, NJ, TX, NC, and Mega Millions.
2. **`app/about/page.tsx` lines 36–53** — "Data sources" inline list hardcodes 6 game slugs (wi-pick3, wi-pick4, pa-pick3, pa-pick4, powerball, megamillions). Missing **nj-pick3, nj-pick4, tx-pick3, tx-pick4, nc-pick3, nc-pick4**. Should iterate over `ALL_GAMES` instead.
3. **`/about` "Powerball eras"** section is correct but **no equivalent Mega Millions eras section exists** even though we tag MM era boundaries (April 2025 matrix change).
4. **`tokens.css` font stack uses literal `"Fraunces"` strings** — works only because of the `<link>` to fonts.googleapis.com. The earlier `next/font` attempt failed due to a build-time Google Fonts ECONNRESET; manual self-hosting was deferred and is still open work, relevant to Phase 5 LCP.

---

## 6. Top 10 highest-impact problems (ranked by user-perceived premium delta)

| # | Problem | Why it matters | Fix in phase |
|---|---|---|---|
| 1 | **Hero video is decoration, not data.** A premium data product's signature moment should *show the product working*. The current `<HeroVideoBackground>` is a 5.8 MB mp4 of lottery balls — pretty, but unrelated to what the site does. | The single biggest premium signal. Awwwards-level sites earn their place by having one moment people remember. | **Phase 2** |
| 2 | **No fluid type scale.** Headlines, body, captions use one-off `text-[42px]` arbitrary values per page. Result: every page looks subtly different from every other page. | Type rhythm is the silent backbone of premium feel. | **Phase 1** |
| 3 | **About page is stale and undersells scope.** "Wisconsin Lottery (and multi-state Powerball)" hides 6 of the 12 datasets. New visitors arriving via the about page think the site is a WI hobby project, not a 5-state observatory. | Conversion + credibility hit. | **Phase 4** + §5 above |
| 4 | **Six radii in the wild (4/8/10/14/16/999).** Adjacent surfaces have subtly different curvatures — readers don't consciously notice, but the page looks "made of mismatched parts." | Geometric consistency = premium signal. | **Phase 1** |
| 5 | **No `next/font` self-hosting.** Font CSS is render-blocking, third-party (Google Fonts), and burns two cross-origin handshakes on every first paint. Tied directly to the LCP problem we already documented (13.8s P50 in CF Analytics). | Performance + LCP rich result eligibility. | **Phase 5** (with the manual self-host path that avoids the earlier `next/font` build failure) |
| 6 | **Motion system is half-installed.** Framer is in `motion/primitives.tsx` for staggered entrances, but: no shared easing constant, no nav frosting on scroll, no scroll-triggered count-ups on stats, no animated underline on links, and one auto-shimmer that violates "at most one ambient animation." | The difference between "site that animates" and "site that *moves*." | **Phase 3** |
| 7 | **Cards are static.** All `.panel` cards on `/`, `/picker`, `/[game]` overview, and sub-routes have no hover affordance. Premium sites whisper "you can interact with this" via 2–4px lifts + border-color shifts. | Affordance signal. | **Phase 3** |
| 8 | **Footer is just the disclaimer bar.** No oversized wordmark, no link columns, no newsletter, no final visual beat. The page ends abruptly. | The footer is the last impression. Currently the last impression is fine print. | **Phase 4** |
| 9 | **Eyebrow + headline + body block repeats on every page but isn't a component.** Same pattern is rebuilt by hand in `/`, `/about`, `/contact`, `/picker`, every `/[game]`. Subtle visual drift accumulates. | Component discipline. | **Phase 4** |
| 10 | **Number-rendering — `<NumberBall>` is the only first-class data primitive but stats use raw text.** Hero "draws on file" numbers, stat cards, frequency bar tooltips — none use tabular-nums or animated count-up. Numbers should be the site's heroes. | Data product identity. | **Phase 3** (count-up) + **Phase 1** (mono + tabular-nums utility) |

---

## 7. Open decisions to confirm before Phase 1

The brief is opinionated. In three places, the brief's defaults would change the product's identity, not just polish it. Each needs an explicit choice:

### A. Display typeface — **keep Fraunces or switch to a grotesk?**
The brief recommends "Clash Display / Cabinet Grotesk / Space Grotesk." DrawData currently uses **Fraunces**, a characterful classical serif. Serif headlines are the visual signal that says "data observatory, not tipster" — they distance the site from any official lottery's look (which are all sans-serif/playful). My recommendation: **keep Fraunces**, but tune it (`opsz` set high for headlines, slightly tighter letter-spacing). Switching to grotesk gives a more generic startup feel that fights the editorial positioning.

### B. Accent set — **collapse to one accent, or keep semantic three?**
The brief asks for one accent + one gradient. Currently there are three: amber `--accent` (brand), teal `--cool` (fair/expected stats), coral `--hot` (divergent stats). **These are semantic, not decorative** — they color-encode data meaning across every chart and stat card. Collapsing to one would lose chart legibility and force every "expected vs actual" delta into accent-on-accent. My recommendation: **keep the three as semantic, but rename them in the system to make the role explicit** (`--accent-brand`, `--data-fair`, `--data-divergent`) and apply the brief's "one accent for CTAs/hero emphasis only" rule strictly to amber.

### C. Signature moment (Phase 2) — **which of the three?**
The brief offers three options. Mapping to DrawData:
- **Option A (self-drawing chart)** — natural fit. A digit-frequency bar chart that animates in over 1.4s and gently magnetizes toward the cursor would *show* what the product does. Cheapest to build, highest signal-to-effort ratio. **Strongly recommended.**
- **Option B (interactive canvas)** — the Formula Lab is the candidate, but it's a complex UI that doesn't reduce well to "zero-click try it in the hero." Skip.
- **Option C (scroll-driven story)** — would be excellent but requires multiple hand-crafted chart states + scroll pinning. ~2 days; could be Phase 7 if we love Phase 2 result A.

My recommendation: **Option A.** Specifically: a digit-frequency bar chart over the Powerball current-era pool (1–69), drawing in left-to-right, with a dashed "expected" line that fades in on top — the chart *itself* tells the site's thesis ("here's the noise, here's the math") without a word of copy.

---

## 8. What I'll explicitly **leave untouched** unless told otherwise

- The 9 per-game sub-route view components (FrequencyView, GapsView, etc.) — they are working data instruments, not visual sections to redesign. Phase 4 will only touch their **chrome** (page header, panel borders, eyebrow style), not the charts inside.
- The 742-line **`LabView.tsx`** — same reason. Visual chrome upgrades only; the rule-builder logic stays.
- The **data refresh pipeline** (`scripts/fetch-*.ts`, the workflow, `precompute.ts`). Pure infrastructure.
- The **Cookie Consent**, **Age Gate**, and **Disclaimer Bar** legal components — visual polish allowed, copy is not.

---

## 9. Next step

Phase 1 is gated on three decisions in §7. Please confirm A/B/C above (a one-line answer per item is enough — e.g., "A: keep Fraunces / B: keep semantic three / C: Option A"). Once confirmed I'll execute Phase 1 in a single focused commit, then move to Phase 2.

If you'd rather just say "do all three as you recommended," I'll proceed on the recommendations marked **Strongly recommended / My recommendation** above.
