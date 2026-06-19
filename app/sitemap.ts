import type { MetadataRoute } from "next";
import { ALL_GAMES } from "@/lib/types";
import { META } from "@/lib/data";

// Next.js sitemap. Re-generated on every deploy.
// Surfaces every public route so Google indexes the whole site.

const BASE = "https://draw-data.com";

const SUBROUTES = [
  "", // overview
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

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(
    (META as any).lastCsvUpdated ?? new Date().toISOString(),
  );

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/picker`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/explore`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/draw-machine`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/odds`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/lab`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/patterns`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/about`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/contact`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];

  const gamePages: MetadataRoute.Sitemap = [];
  for (const game of ALL_GAMES) {
    const isPick = /^(wi|pa|nj|tx)-pick[34]$/.test(game);
    const isBall = game === "powerball" || game === "megamillions";
    for (const sub of SUBROUTES) {
      // pick-only subroutes don't apply to ball games
      if (isBall && ["/pairs", "/carryover", "/streams", "/lookup"].includes(sub)) continue;
      // ball-only consideration: positional makes less sense for ball games but still exists
      gamePages.push({
        url: `${BASE}/${game}${sub}`,
        lastModified,
        changeFrequency: "daily",
        priority: sub === "" ? 0.9 : 0.6,
      });
    }
  }

  return [...staticPages, ...gamePages];
}
