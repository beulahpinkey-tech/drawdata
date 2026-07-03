import type { MetadataRoute } from "next";
import { ALL_GAMES } from "@/lib/types";
import { META, hasStreams } from "@/lib/data";
import { yearBuckets, monthSequence } from "@/lib/results";
import { numberSlugs } from "@/lib/numbers";
import { learnSlugs } from "@/lib/learn";

// Single static sitemap. Regenerated on every deploy — and the GitHub
// Actions bot deploys on the twice-daily data refresh, so `lastmod`
// tracks the latest draws.
//
// This is a single flat sitemap (not a generateSitemaps() index) on
// purpose: the total URL count (~5-6k) is far under the 50k-per-file cap,
// and a split index creates a dynamic /sitemap/[__metadata_id__] route
// that Cloudflare's next-on-pages requires to be edge-runtime — which
// broke the Pages build. A static sitemap sidesteps that entirely.

const BASE = "https://draw-data.com";

const CORE_SUBROUTES = [
  "", // overview
  "/results",
  "/frequency",
  "/positional",
  "/pairs",
  "/gaps",
  "/coverage",
  "/check",
  "/lookup",
  "/carryover",
  "/streams",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastMod = new Date((META as any).lastCsvUpdated ?? new Date().toISOString());
  const urls: MetadataRoute.Sitemap = [];

  // ── Static site pages ──
  const staticPages: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
    ["", "daily", 1.0],
    ["/picker", "weekly", 0.8],
    ["/explore", "daily", 0.8],
    ["/draw-machine", "monthly", 0.5],
    ["/odds", "monthly", 0.7],
    ["/lab", "weekly", 0.7],
    ["/patterns", "weekly", 0.7],
    ["/learn", "weekly", 0.6],
    ["/about", "monthly", 0.4],
    ["/contact", "monthly", 0.3],
    ["/privacy", "yearly", 0.2],
    ["/terms", "yearly", 0.2],
  ];
  for (const [path, changeFrequency, priority] of staticPages) {
    urls.push({ url: `${BASE}${path || "/"}`, lastModified: lastMod, changeFrequency, priority });
  }

  // ── Per-game: hubs, analytic spokes, results archives, per-number ──
  for (const game of ALL_GAMES) {
    const isBall = game === "powerball" || game === "megamillions";

    for (const sub of CORE_SUBROUTES) {
      if (isBall && ["/pairs", "/carryover", "/streams", "/lookup"].includes(sub)) continue;
      if (sub === "/streams" && !hasStreams(game)) continue;
      urls.push({
        url: `${BASE}/${game}${sub}`,
        lastModified: lastMod,
        changeFrequency: "daily",
        priority: sub === "" ? 0.9 : 0.6,
      });
    }

    for (const y of await yearBuckets(game)) {
      urls.push({ url: `${BASE}/${game}/results/${y.year}`, lastModified: lastMod, changeFrequency: "yearly", priority: 0.4 });
    }
    for (const m of await monthSequence(game)) {
      urls.push({ url: `${BASE}/${game}/results/${m.year}/${m.month}`, lastModified: lastMod, changeFrequency: "monthly", priority: 0.4 });
    }
    for (const slug of await numberSlugs(game)) {
      urls.push({ url: `${BASE}/${game}/number/${slug}`, lastModified: lastMod, changeFrequency: "daily", priority: 0.4 });
    }
  }

  // ── Learn / Q&A pages ──
  for (const slug of await learnSlugs()) {
    urls.push({ url: `${BASE}/learn/${slug}`, lastModified: lastMod, changeFrequency: "weekly", priority: 0.5 });
  }

  return urls;
}
