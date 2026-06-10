# DrawData — [draw-data.com](https://draw-data.com)

Free, interactive analytics on every public US lottery draw worth tracking.
Powerball and Mega Millions back to the games' first matrices. Pick 3 and
Pick 4 results from **Wisconsin, Pennsylvania, New Jersey, Texas, and
North Carolina** — over a quarter-million draws, refreshed twice daily.

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

## License + use

Lottery draw data is public-domain by nature. The site code is private
to the repo owner; the rendered analytics are free to use. **Not
affiliated with any lottery organization.** Must be 18 or older.

If you're researching lottery randomness, working on probability
education, or just curious whether your "system" works (it doesn't),
**[visit the live site →](https://draw-data.com)**
