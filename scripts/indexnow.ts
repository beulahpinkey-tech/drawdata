/**
 * IndexNow submission — pings participating search engines (Bing, Yandex,
 * Seznam, Naver, and Google's IndexNow pilot) that pages changed, so fresh
 * draws get crawled in minutes instead of waiting for an organic recrawl.
 *
 * How IndexNow verifies us: a key file is hosted at the site root
 *   https://draw-data.com/<KEY>.txt   (public/<KEY>.txt in this repo)
 * whose contents equal <KEY>. We POST the key + the list of changed URLs
 * to the IndexNow API; the engine fetches the key file to confirm we own
 * the host, then queues those URLs.
 *
 * We submit only the pages that actually change on a refresh — the
 * homepage and each game's daily-updating spokes (hub, results, frequency,
 * gaps) — not the whole sitemap, since IndexNow is for *changed* URLs.
 *
 * Wired into the twice-daily refresh workflow, run only after a real data
 * push. Never fails the build: a bad IndexNow response must not block the
 * data refresh.
 *
 * Run manually:  npm run indexnow
 */

import { ALL_GAMES } from "../lib/types";

const KEY = "d8e1f4a92c7b6035e8a1d4f70b9c2e56";
const HOST = "draw-data.com";
const BASE = `https://${HOST}`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

/** The URLs whose content changes when new draws land. */
function changedUrls(): string[] {
  const urls = [`${BASE}/`];
  for (const game of ALL_GAMES) {
    urls.push(
      `${BASE}/${game}`,
      `${BASE}/${game}/results`,
      `${BASE}/${game}/frequency`,
      `${BASE}/${game}/gaps`,
    );
  }
  return urls;
}

async function main() {
  const urlList = changedUrls();
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: `${BASE}/${KEY}.txt`,
    urlList,
  };

  // --dry validates the payload without submitting (use before the key
  // file is live on the deployed site).
  if (process.argv.includes("--dry")) {
    console.log(`IndexNow [dry-run]: would submit ${urlList.length} URLs`);
    console.log(`  keyLocation: ${body.keyLocation}`);
    console.log(`  first: ${urlList[0]}\n  last:  ${urlList[urlList.length - 1]}`);
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  // 200 = accepted, 202 = accepted (validation pending). Anything else is
  // logged loudly but non-fatal.
  console.log(`IndexNow: submitted ${urlList.length} URLs → HTTP ${res.status} ${res.statusText}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`IndexNow non-OK response: ${text.slice(0, 300)}`);
  }
}

main().catch((err) => {
  // Never fail the refresh because of IndexNow.
  console.error("IndexNow submission errored (ignored):", err?.message ?? err);
});
