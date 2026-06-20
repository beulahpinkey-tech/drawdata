import type { MetadataRoute } from "next";
import { ALL_GAMES } from "@/lib/types";
import { META } from "@/lib/data";
import { yearBuckets, monthSequence } from "@/lib/results";
import { numberSlugs } from "@/lib/numbers";
import { learnSlugs } from "@/lib/learn";

// Sitemap INDEX, split per-section via generateSitemaps(). Next.js emits
// one child sitemap per id (referenced from an auto-generated index at
// /sitemap.xml) so we stay under the 50k-URL-per-file cap and can grow
// new sections (results today, combos/learn later) without reshuffling.
//
// Re-generated on every deploy — and the GitHub Actions bot deploys on
// the twice-daily data refresh, so `lastmod` tracks the latest draws.

const BASE = "https://draw-data.com";

// Sections become child sitemaps: core, results, numbers.
const SECTIONS = ["core", "results", "numbers"] as const;

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

function lastModified(): Date {
  return new Date((META as any).lastCsvUpdated ?? new Date().toISOString());
}

export async function generateSitemaps() {
  return SECTIONS.map((_, id) => ({ id }));
}

function coreSitemap(lastMod: Date): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: lastMod, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/picker`, lastModified: lastMod, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/explore`, lastModified: lastMod, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/draw-machine`, lastModified: lastMod, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/odds`, lastModified: lastMod, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/lab`, lastModified: lastMod, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/patterns`, lastModified: lastMod, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/learn`, lastModified: lastMod, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/about`, lastModified: lastMod, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/contact`, lastModified: lastMod, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: lastMod, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: lastMod, changeFrequency: "yearly", priority: 0.2 },
  ];

  const gamePages: MetadataRoute.Sitemap = [];
  for (const game of ALL_GAMES) {
    const isBall = game === "powerball" || game === "megamillions";
    for (const sub of CORE_SUBROUTES) {
      // pick-only subroutes don't apply to ball games
      if (isBall && ["/pairs", "/carryover", "/streams", "/lookup"].includes(sub)) continue;
      gamePages.push({
        url: `${BASE}/${game}${sub}`,
        lastModified: lastMod,
        changeFrequency: "daily",
        priority: sub === "" ? 0.9 : 0.6,
      });
    }
  }

  const learnPagesUrls: MetadataRoute.Sitemap = learnSlugs().map((slug) => ({
    url: `${BASE}/learn/${slug}`,
    lastModified: lastMod,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticPages, ...gamePages, ...learnPagesUrls];
}

function resultsSitemap(lastMod: Date): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [];
  for (const game of ALL_GAMES) {
    for (const y of yearBuckets(game)) {
      urls.push({
        url: `${BASE}/${game}/results/${y.year}`,
        lastModified: lastMod,
        changeFrequency: "yearly",
        priority: 0.4,
      });
    }
    for (const m of monthSequence(game)) {
      urls.push({
        url: `${BASE}/${game}/results/${m.year}/${m.month}`,
        lastModified: lastMod,
        changeFrequency: "monthly",
        priority: 0.4,
      });
    }
  }
  return urls;
}

function numbersSitemap(lastMod: Date): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [];
  for (const game of ALL_GAMES) {
    for (const slug of numberSlugs(game)) {
      urls.push({
        url: `${BASE}/${game}/number/${slug}`,
        lastModified: lastMod,
        changeFrequency: "daily",
        priority: 0.4,
      });
    }
  }
  return urls;
}

export default function sitemap({ id }: { id: number }): MetadataRoute.Sitemap {
  const lastMod = lastModified();
  if (SECTIONS[id] === "results") return resultsSitemap(lastMod);
  if (SECTIONS[id] === "numbers") return numbersSitemap(lastMod);
  return coreSitemap(lastMod);
}
