# DrawData — Growth & Monetization Roadmap

> Working plan, written 2026-06. The honest north star: DrawData is a
> *descriptive* lottery-data instrument. Every growth and revenue move
> has to survive the test "does this still tell the truth and refuse to
> sell an edge?" Anything that fails it is off the table, however
> lucrative.

---

## The one thing that matters first: traffic

DrawData is a brand-new domain with ~no organic traffic yet. **No
monetization works on zero traffic.** So Phase 1 is not about money — it
is about being found. Everything below is sequenced around that.

The honest content *is* the growth engine: free, indexable pages that
answer real searches ("do mirror numbers work", "pick 3 frequency
<state>", "powerball most common numbers", "does lottery law of
attraction work"). We win by being the truthful answer to questions the
tipster sites answer dishonestly.

---

## Phase 1 — Grow (now → a few months)

**Goal: get indexed and earn the first few thousand monthly visits.**

- [ ] **Search Console + Bing Webmaster** — verify the domain, submit
      `/sitemap.xml`. (Code side is ready; this is a manual step.)
- [ ] **First backlinks** — r/lottery, r/dataisbeautiful, a Show HN,
      lottery forums. New domains need external signal before Google
      ranks them.
- [x] **Indexable content surface** — per-game pages, Explorer, Pattern
      Research, Draw Machine, Coverage Planner, the composition/“systems”
      debunks. All free, all crawlable, each its own canonical + JSON-LD.
- [ ] **Keep shipping honest content** that targets real queries. Each
      "does <system> work" debunk is a traffic magnet *because* it's free.

**Monetization in Phase 1: none.** Gating anything now would `noindex`
your best SEO assets and convert ~zero visitors. Don't.

---

## Phase 2 — First revenue: display ads (at ~5–20k visits/mo)

The realistic first dollars for a data/content site.

- [ ] **Ezoic or Google AdSense.** Expect ~$5–20 RPM (per 1,000 views).
      At 20k/mo that's ~$100–300/mo. Modest but it scales with traffic
      and costs nothing to run.
- [ ] **Stay on the right side of the policy line.** Ad networks allow
      lottery *information/stats* sites but flag anything that
      *facilitates* play. Keep the framing strictly "stats & education,"
      never "play here" — which is already our brand, so this is free.
- [ ] Keep ads off the cleanest pages if they hurt the premium feel;
      A/B which placements don't tank Core Web Vitals.

---

## Phase 3 — Sell tooling, not data (engaged audience)

The data is public-domain — we can't sell *it*. We sell **convenience,
tooling, and access**. Two parallel tracks:

### A. Pro tier (one-time unlock or small subscription)
Sold as serious analytics tooling — never as an edge.
- [ ] **Ad-free** browsing
- [ ] **PDF export / "Data Sheet"** of any game or filtered Explore view
- [ ] **Saved / named Explorer views** and chosen-number watchlists
- [ ] **Alerts** — "notify me when my numbers are drawn" (email/push)
- [ ] **Coverage Planner+** — abbreviated wheels with stated guarantees
- [ ] Multi-state compare, deeper exports

### B. Data API (the sleeper asset)
We've cleaned and unified **5 states + Powerball + Mega Millions** into
tidy JSON. *Developers and researchers* — not players — would pay for a
clean, current lottery-history API. No honesty conflict (it's data
access), and that audience actually pays.
- [ ] Versioned REST endpoints over the existing aggregates
- [ ] API keys + usage tiers (free tier + paid)

**Both A and B need a backend** — see architecture below.

---

## Architecture: what goes where (don't DB the draw data)

The single most important call: **keep the draw data static.**

- **Draw data** (the 250k+ rows) is append-only, read-only, public. The
  current pipeline — committed JSON, built static, served from
  Cloudflare's CDN, refreshed nightly by the GitHub Actions bot — is
  *ideal*: free, globally fast, infinitely scalable for reads, zero DB
  cost. "We keep adding draws" is already handled. **Do not move this
  into Firebase/Firestore** — it would add cost (per-read billing),
  latency (DB round-trip vs edge cache), and complexity for no benefit.

- **User data** (only exists once there are paying users) is what needs
  a backend: auth, entitlements (who paid), saved views, watchlists,
  alert subscriptions. Options:
  - **Cloudflare stack** (Workers + D1/KV + Access) — integrates
    cleanest since we're already on CF Pages; also hosts the
    Gumroad/Stripe license-check endpoint and the Data API.
  - **Firebase** (Auth + Firestore + FCM) — fine and fast to build with
    if preferred; ties us to Google and adds a second platform.
  - Recommendation: lean Cloudflare to stay on one platform, but either
    works. Decide when Phase 3 actually starts.

**Rule of thumb:** draw data → static CDN. User data → a DB, and only
when users exist.

---

## What we will never monetize

- "Winning systems," predictions, lucky numbers, or anything implying an
  edge over a fair draw.
- Lottery-ticket affiliate / courier referrals (routing people to play).
- Repackaging copyrighted books' text/tables. (Concepts and math are
  free; their wording and trademarks are not.)

Restraint here is not just ethics — it's what keeps us out of app-store
and ad-network bans, and it's the entire reason a data-curious audience
would trust us over the tipster sites.

---

## Honest expectation

This is a "compounding side income that grows with traffic and authority"
— not a get-rich product. That ceiling is partly *because* we're honest,
which is the right trade for longevity. Traffic first; everything else
follows from it.
