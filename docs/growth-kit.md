# DrawData — Growth / AI-Citation Kit

Everything needed to get DrawData discovered, indexed, and **cited by AI
assistants** (ChatGPT, Claude, Perplexity, Gemini). Copy-paste ready.

**Why this works:** AI assistants cite what their search engines retrieve.
ChatGPT/Copilot use Bing; Gemini uses Google; Perplexity uses its own +
both. So the game is: (1) be indexed (esp. **Bing**), (2) be answer-shaped,
(3) be *mentioned/linked* elsewhere so models treat "DrawData" as a real
entity. On-site tech is done (llms.txt, AI-crawler robots, Dataset/FAQ
schema, IndexNow, canonicals, sitemap). The rest is external and is YOURS
to submit.

---

## ✅ Already done on-site (no action needed)
- `/llms.txt` — curated map for AI crawlers
- `robots.txt` explicitly welcomes GPTBot, ClaudeBot, PerplexityBot, Google-Extended, OAI-SearchBot, CCBot…
- `Dataset` + `FAQPage` + `Organization` + `BreadcrumbList` structured data
- Answer-shaped `/learn` Q&A pages (best citation bait)
- IndexNow (fast Bing indexing) + full sitemap + correct canonicals

---

## 🔑 The two highest-leverage actions (do these first)
1. **Bing Webmaster Tools** — verify draw-data.com, import from Google Search
   Console, submit sitemap. *ChatGPT can't find you without this.*
2. **Earn one independent mention** (Reddit/HN below) — unlocks Wikidata +
   makes every directory listing credible.

---

## 1. Hacker News — Show HN
**Title:** `Show HN: DrawData – honest lottery analytics that refuses to predict numbers`
**URL:** https://draw-data.com

**First comment (post right after submitting):**
> I got annoyed that every "lottery numbers" site sells the same lie — "hot numbers," "overdue" picks, "systems" that beat the odds — so I built the opposite: a descriptive analytics tool that shows the real draw history and is honest about what it means (nothing, for predicting the next draw).
>
> It covers ~330,000 real draws — Powerball, Mega Millions, and Pick 3/4 across 14 states (Massachusetts' history goes back to 1976) — refreshed twice a day: frequency, gaps, sums, pairs, per-number history, monthly results archives.
>
> The part I had the most fun with is the Formula Lab: give it any "system" and it backtests the rule across every draw on file and shows the hit rate converging to pure chance. A debunking machine.
>
> Tech is deliberately boring: data is committed JSON, built static, served from Cloudflare's edge, refreshed by a GitHub Actions bot. No database. It makes no money and sells nothing — the honesty is the point. Feedback welcome.

*Post Tue–Thu ~8–10am ET. Never ask for upvotes. Reply to every comment.*

---

## 2. Reddit — r/lottery (primary)
**Title:** `I built a free, honest lottery-stats site — no predictions, no "lucky numbers," just the real draw history`
> Full disclosure: I made this, so this is a self-promo post — but it's free, has no ads pushing you to play, and refuses to sell you an edge.
>
> It's DrawData (draw-data.com): actual draw history for Powerball, Mega Millions, and Pick 3/4 in 14 states (MA back to 1976), refreshed twice daily — frequency, "overdue" gaps, sums, pairs, per-number history.
>
> The catch: it's descriptive, not predictive. It'll show you the most-drawn Georgia Cash 3 numbers — then tell you that means nothing for the next draw, because draws are independent. There's a "Formula Lab" to backtest any system and watch its hit rate match random chance.
>
> Feedback wanted on: (1) which states/games to add next, and (2) whether the "here's the data, but it won't help you win" framing lands or feels preachy.

*The "I made this" disclosure is required. Don't cross-post the same text everywhere same-day.*

---

## 3. Reddit — r/dataisbeautiful [OC] (higher reach; needs a chart image)
**Title:** `[OC] 330,000 lottery draws, and the "hot" and "cold" numbers are just noise`
**Required top comment:**
> Source: official state-lottery draw publications (WI, PA, NJ, TX, NC, FL, GA, MI, WA, CA, MA, CO, MD) + data.ny.gov. Tools: Next.js + Recharts. Interactive version: https://draw-data.com — a free, no-predictions lottery-analytics tool I built.

*Image: screenshot a `/frequency` bar chart with the "expected if random" line — the wiggle around it IS the "hot/cold" everyone chases.*

---

## 4. Product Hunt launch (highest-authority single backlink)
- **Name:** DrawData
- **Tagline (≤60):** `Honest lottery analytics — the data, never predictions`
- **Description:**
  > DrawData turns 330,000+ real US lottery draws into clean, honest analytics — frequency, gaps, sums, and per-number history for Powerball, Mega Millions, and Pick 3/4 across 14 states, refreshed twice daily. It shows you exactly what happened, and is honest that it can't tell you what's next. No predictions, no "lucky numbers," no ads pushing you to play. There's even a Formula Lab that backtests any "system" and watches its hit rate collapse to pure chance.
- **Topics:** Data & Analytics · Statistics · Web App · Open Data
- **Maker's first comment:**
  > Hi PH 👋 I built DrawData because every lottery-stats site sells the same fantasy — "due" numbers, "hot" picks, systems that beat the odds. I wanted the honest version: show the real draw history, make it beautiful and fast, and be upfront that past draws don't predict future ones. The Formula Lab is my favorite bit — feed it any superstition and watch the math flatten it. It's free, sells nothing, and updates twice a day. Would love your feedback on what to add next.

*Launch 12:01am PT, ideally Tue–Thu. Line up a few people to check it out day-of.*

---

## 5. Data-journalist / newsletter outreach email
**Subject:** `Open dataset: 330k US lottery draws (public domain, updated daily)`
> Hi [name],
>
> I maintain DrawData (draw-data.com), a free, continuously-updated archive of US lottery draw history — ~330,000 draws across Powerball, Mega Millions, and Pick 3/4 in fourteen states, with Massachusetts going back to 1976. It's cleaned into tidy JSON and refreshed twice daily.
>
> It might be useful for a data story on randomness, the "gambler's fallacy," or how lottery-tip sites mislead. The site is strictly descriptive — it publishes the record and explicitly refuses to predict — so it's a clean primary source. Happy to pull any specific cut for you.
>
> Public domain, no strings. — [you]

*Targets: data-viz newsletters, r/dataisbeautiful mods, local-news data desks, stats educators.*

---

## 6. Quora answer template (Quora ranks well and is read by LLMs)
Find questions like "What are the most common Powerball numbers?" / "Do
overdue lottery numbers hit more?" and answer honestly, linking your matching
`/learn` page:
> Short answer: they exist as historical facts, but they don't help you win — draws are independent, so past frequency has zero predictive power. If you want to see the actual counts (and why the differences are just sampling noise), I keep a free tracker here: [link to the exact /learn or /frequency page]. The gap between most- and least-drawn is well within what pure randomness produces.

---

## 7. Wikidata item (do AFTER you have one external mention)
- **Label:** `DrawData` · **Description:** `website providing descriptive analytics on United States lottery draw history`
- **Aliases:** `draw-data.com`, `Draw Data`
- **Statements:** instance of (P31)=website (Q35127); official website (P856)=https://draw-data.com; country (P17)=United States (Q30); language (P407)=English (Q1860)
- Add your HN/Reddit/PH URL as a reference so it survives notability review.

---

## 8. "Awesome" GitHub lists + directories (permanent, AI-readable)
**One-liner (awesome-list PR format):**
```
- [DrawData](https://draw-data.com) — Free, descriptive analytics on ~330k US lottery draws (Powerball, Mega Millions, Pick 3/4 across 14 states, history to 1976), refreshed twice daily. Descriptive only, never predictive.
```
**Directory tagline/short:**
- Tagline: `Honest lottery analytics — the data, never predictions`
- Short: `Free, descriptive analytics on 330k+ US lottery draws across 14 states. Frequency, gaps, per-number history — refreshed twice daily. No "lucky numbers," ever.`

**Submit to:** awesome-public-datasets (GitHub PR), data.world, AlternativeTo,
SaaSHub, Product Hunt. (Google Dataset Search picks you up automatically via
the Dataset schema — nothing to submit.)

---

## Suggested sequence
1. Bing Webmaster Tools (10 min) — unblocks ChatGPT.
2. r/lottery post — low-risk, learn what resonates.
3. Show HN (a few days later) — biggest spike + permanent backlink.
4. Grab 1–2 citation URLs → add Wikidata item + awesome-list PR.
5. Product Hunt launch with screenshots.
6. r/dataisbeautiful with the frequency chart.
7. Outreach email to 5–10 data newsletters/desks.

**Re-test monthly:** ask Perplexity + ChatGPT (search) "most common Georgia
Cash 3 numbers" / "honest lottery frequency data" and watch for a draw-data.com
citation. Perplexity surfaces you first; ChatGPT follows once Bing indexes you.
