# DrawData — [draw-data.com](https://draw-data.com)

Free, interactive analytics on every public US lottery draw worth tracking.
Powerball and Mega Millions back to the games' first matrices. Daily digit
games from **California, Colorado, Florida, Georgia, Maryland,
Massachusetts, Michigan, New Jersey, New York, North Carolina,
Pennsylvania, Texas, Washington, and Wisconsin** — over 330,000 draws
going back to 1976, refreshed twice daily.

**[Open the live site →](https://draw-data.com)**

---

## What's in here

| Game | Coverage | Source |
|---|---|---|
| [Powerball](https://draw-data.com/powerball) | 1992-04-22 → today | PA Lottery JSON (g=12) |
| [Mega Millions](https://draw-data.com/megamillions) | 2002-05-17 → today | data.ny.gov Open Data |
| [Wisconsin Pick 3](https://draw-data.com/wi-pick3) / [Pick 4](https://draw-data.com/wi-pick4) | 1992 / 1997 → today | wilottery.com (scraped) |
| [Pennsylvania Pick 3](https://draw-data.com/pa-pick3) / [Pick 4](https://draw-data.com/pa-pick4) | 1977 / 1980 → today | palottery.pa.gov JSON |
| [New Jersey Pick 3](https://draw-data.com/nj-pick3) / [Pick 4](https://draw-data.com/nj-pick4) | 2015 → today | njlottery.com JSON |
| [Texas Pick 3](https://draw-data.com/tx-pick3) / [Daily 4](https://draw-data.com/tx-pick4) | 1993 / 2007 → today | texaslottery.com CSV |
| [North Carolina Pick 3](https://draw-data.com/nc-pick3) / [Pick 4](https://draw-data.com/nc-pick4) | 2006 / 2009 → today | nclottery.com CSV |
| [Florida Pick 3](https://draw-data.com/fl-pick3) / [Pick 4](https://draw-data.com/fl-pick4) | 2024 → today | floridalottery.com app API |
| [Georgia Cash 3](https://draw-data.com/ga-pick3) / [Cash 4](https://draw-data.com/ga-pick4) | 1993 / 1997 → today | galottery.com JSON |
| [Michigan Daily 3](https://draw-data.com/mi-pick3) / [Daily 4](https://draw-data.com/mi-pick4) | 1998 → today | michiganlottery.com GraphQL |
| [Washington Daily Game](https://draw-data.com/wa-pick3) | 2025 → today | walottery.com (scraped) |
| [New York Numbers](https://draw-data.com/ny-pick3) / [Win 4](https://draw-data.com/ny-pick4) | 1980 / 1981 → today | data.ny.gov Open Data |
| [California Daily 3](https://draw-data.com/ca-pick3) / [Daily 4](https://draw-data.com/ca-pick4) | 2026 → today (rolling window) | calottery.com JSON |
| [Massachusetts The Numbers Game](https://draw-data.com/ma-pick4) | 1976 → today | masslottery.com JSON |
| [Colorado Pick 3](https://draw-data.com/co-pick3) | 2013 → today | coloradolottery.com (scraped) |
| [Maryland Pick 3](https://draw-data.com/md-pick3) / [Pick 4](https://draw-data.com/md-pick4) | 2026 → today (rolling window) | mdlottery.com (scraped) |

Every dataset feeds the same set of analytics: digit frequency, pair
co-occurrence, gap distributions, sums, positional bias, stream
comparisons, and a draw-by-draw backtester in the **[Formula Lab](https://draw-data.com/lab)**.

## What it isn't

DrawData is **descriptive, not predictive.** No chart, ranking, or tool
on the site is designed to tell you what *will* be drawn. Lottery draws
are independent and random — the past does not pull on the future. The
Formula Lab exists specifically to let you test your favorite "system"
and watch its hit rate match the chance baseline.

## How the data stays fresh

A single GitHub Actions workflow fires twice a day, fetches the latest
draws from each upstream source, regenerates the aggregates, and pushes
to `main`. Cloudflare Pages picks up the new commit and rebuilds. End
to end: ~10 minutes from a new draw being posted to it showing up on
the live site.

The Wisconsin fetcher uses a **merge-only writer** — it refuses to
shrink the output CSV under any circumstance — because the wilottery.com
pagination once silently capped at 100 rows and the previous overwrite
behavior destroyed 14k+ rows of history before anyone noticed.

## Tech

- **Next.js 14** (App Router, fully static)
- **Cloudflare Pages** + edge middleware for canonical-host enforcement
- **Cloudflare Web Analytics** (no cookies, no tracking)
- **GitHub Actions** for the daily refresh
- **TypeScript** end to end; aggregates are precomputed at build time
- **recharts** for visualizations, **framer-motion** for transitions

## Programmatic page engine

Most of the site's URLs aren't hand-authored — they're generated, one
per winnable query permutation, across all 27 datasets. The wiring:

**Templates ↔ data.** Pages live under `app/[game]/…` and are pure
functions of the statically-imported aggregates. `lib/data/index.ts`
exposes `getDraws(game)` (full draw history) and `getAgg(game)`
(precomputed stats); a template reads one of those and renders. Because
`app/[game]/layout.tsx` sets `dynamicParams = false` + `generateStaticParams()`,
**every page is server-rendered (SSG) into crawlable HTML** — the data
is in the initial response, not fetched client-side.

**Archetypes generated per game** (all SSG, all off the shared `ALL_GAMES`
list — adding a game generates its full set automatically):
- **Results archives** — `/{game}/results`, `/results/{year}`,
  `/results/{year}/{month}` (`lib/results.ts`).
- **Per-number / per-digit** — `/{game}/number/{n}` (`lib/numbers.ts`):
  each white ball + special ball for ball games, each digit 0–9 for pick
  games, with total draws, last-seen, current gap, rank, and a sparkline.
- **Q&A hub** — `/learn` + `/learn/{slug}` (`lib/learn.ts`): per-game
  most-common/overdue pages with real embedded numbers + evergreen concept
  explainers, all `FAQPage`-marked and funneling to the backing tool.

**Results archives** (`app/[game]/results`, `/results/[year]`,
`/results/[year]/[month]`) slice that history with `lib/results.ts`.
Their `generateStaticParams()` enumerate **only year/month buckets that
actually contain draws**, so there are never empty/thin pages — the
anti-thin-content guard (`lib/seo/thresholds.ts`) is enforced at the
param level, not just at render.

**SEO plumbing** (shared, honest-by-construction):
- `lib/seo/breadcrumbs.ts` + `components/Breadcrumbs.tsx` — one `Crumb[]`
  drives both the visible trail and the `BreadcrumbList` JSON-LD (they
  can't drift). `GameHeader` renders breadcrumbs for every game page
  automatically; deeper pages pass explicit `crumbs`.
- `lib/seo/dataset.ts` — per-page `Dataset` JSON-LD with `temporalCoverage`
  for the slice and `dateModified` pulled from the twice-daily refresh
  (`meta.lastCsvUpdated`), so Google Dataset Search sees fresh data.
- Per-page unique `<title>` / description / canonical via each route's
  `generateMetadata`, templated from real counts and dates.

**Sitemaps.** `app/sitemap.ts` uses `generateSitemaps()` to emit a
sitemap **index** with per-section children (`core`, `results`), each
under the 50k-URL cap, with `lastmod` from the refresh. `robots.txt`
points at `/sitemap.xml` (the index). Regenerated on every deploy →
regenerated on every twice-daily refresh.

**Slug aliases.** The spec's long-tail slugs `/sums` and
`/midday-vs-evening` 301 to the canonical pages that already carry that
data (`/positional`, `/streams`) via `middleware.ts` — one canonical URL
per concept, no duplicate content.

**Orphan guard.** `npm run verify` runs `scripts/verify-links.ts`, which
checks the hub→results link, that every game yields non-empty results
buckets, and that each month prev/next chain is contiguous.

### Adding a new game dataset

The page engine scales automatically off the game list — no per-game
template work:

1. Add the slug to `ALL_GAMES` in `lib/types.ts` and the labels/blurbs
   in `lib/data/index.ts` (`GAME_LABELS`, `GAME_SHORT`, `GAME_BLURB`,
   and the `PICK_GAMES`/`BALL_GAMES` membership).
2. Add a fetcher (`scripts/fetch-<x>.ts`) and wire it into `fetch:all`
   and the GitHub Actions workflow; commit the source CSV under `data/`.
3. Run `npm run ingest` to generate `lib/data/<slug>.json`,
   `<slug>.agg.json`, and the `meta.json` entry, then import them in
   `lib/data/index.ts`'s `getDraws`/`getAgg` switches.
4. Run `npm run verify`. That's it — the new game's hub, every analytic
   spoke, its full results archive (every year + month it has data for),
   sitemap entries, and JSON-LD all generate from the shared templates.

### Illinois (manual — WAF-gated source)

Illinois Lottery's results pages sit behind an anti-bot WAF that
captcha-challenges sustained automated access, so IL is **not** in the
twice-daily CI refresh (it would fail there). The scraper
[`scripts/fetch-il.ts`](scripts/fetch-il.ts) works from a normal
(residential) machine and is **run manually**:

```
npm run fetch:il            # backfills ~2 years, Pick 3 + Pick 4
npm run fetch:il -- --months 6   # smaller window
```

It caches each completed month under `.cache/il/`, so if the WAF blocks a
month mid-run, just re-run — successful months are skipped and only the
gaps are retried. The writer is merge-only, so history accumulates across
runs. After fetching, commit `data/il/pick3.csv` + `pick4.csv`, then run
`npm run ingest` and add the `il-pick3` / `il-pick4` imports + labels (per
the "Adding a new game dataset" steps above) to light up the pages. IL is
a normal dual-stream, dual-game state — no special-casing needed.

## License + use

Lottery draw data is public-domain by nature. The site code is private
to the repo owner; the rendered analytics are free to use. **Not
affiliated with any lottery organization.** Must be 18 or older.

If you're researching lottery randomness, working on probability
education, or just curious whether your "system" works (it doesn't),
**[visit the live site →](https://draw-data.com)**
