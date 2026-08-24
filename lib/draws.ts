// Lazy per-game draw-history loader.
//
// The full draw history is ~20 MB across 19 games. If it's statically
// imported (as it used to be in lib/data), every edge route bundles and
// parses all of it on cold start — slow, and a cold-start timeout risk.
// Only the results archives and per-number pages actually need per-draw
// rows; everything else uses the small precomputed aggregates (getAgg).
//
// So getDraws() dynamic-imports ONLY the requested game's JSON. A route
// that needs one game's history parses ~1-2 MB, not 20 MB, and pages that
// never call getDraws don't pull any of it into their bundle.
//
// CAVEAT — this only holds on Node/Vercel. On Cloudflare Pages, next-on-pages
// inlines the entire module graph (dynamic imports included, since Workers
// cannot load modules at runtime) into a single edge worker, which is capped
// at 25 MiB. Storing these as plain objects blew that cap and broke deploys
// outright, so the pick histories are now stored in a compact row encoding
// and expanded here. See lib/draw-codec.ts.

import type { Draw, Game } from "./types";
import { decodeDrawFile } from "./draw-codec";

export async function getDraws(game: Game): Promise<Draw[]> {
  switch (game) {
    case "wi-pick3": return decodeDrawFile((await import("./data/wi-pick3.json")).default);
    case "wi-pick4": return decodeDrawFile((await import("./data/wi-pick4.json")).default);
    case "pa-pick3": return decodeDrawFile((await import("./data/pa-pick3.json")).default);
    case "pa-pick4": return decodeDrawFile((await import("./data/pa-pick4.json")).default);
    case "nj-pick3": return decodeDrawFile((await import("./data/nj-pick3.json")).default);
    case "nj-pick4": return decodeDrawFile((await import("./data/nj-pick4.json")).default);
    case "tx-pick3": return decodeDrawFile((await import("./data/tx-pick3.json")).default);
    case "tx-pick4": return decodeDrawFile((await import("./data/tx-pick4.json")).default);
    case "nc-pick3": return decodeDrawFile((await import("./data/nc-pick3.json")).default);
    case "nc-pick4": return decodeDrawFile((await import("./data/nc-pick4.json")).default);
    case "fl-pick3": return decodeDrawFile((await import("./data/fl-pick3.json")).default);
    case "fl-pick4": return decodeDrawFile((await import("./data/fl-pick4.json")).default);
    case "wa-pick3": return decodeDrawFile((await import("./data/wa-pick3.json")).default);
    case "ga-pick3": return decodeDrawFile((await import("./data/ga-pick3.json")).default);
    case "ga-pick4": return decodeDrawFile((await import("./data/ga-pick4.json")).default);
    case "mi-pick3": return decodeDrawFile((await import("./data/mi-pick3.json")).default);
    case "mi-pick4": return decodeDrawFile((await import("./data/mi-pick4.json")).default);
    case "ny-pick3": return decodeDrawFile((await import("./data/ny-pick3.json")).default);
    case "ny-pick4": return decodeDrawFile((await import("./data/ny-pick4.json")).default);
    case "ca-pick3": return decodeDrawFile((await import("./data/ca-pick3.json")).default);
    case "ca-pick4": return decodeDrawFile((await import("./data/ca-pick4.json")).default);
    case "ma-pick4": return decodeDrawFile((await import("./data/ma-pick4.json")).default);
    case "co-pick3": return decodeDrawFile((await import("./data/co-pick3.json")).default);
    case "md-pick3": return decodeDrawFile((await import("./data/md-pick3.json")).default);
    case "md-pick4": return decodeDrawFile((await import("./data/md-pick4.json")).default);
    case "powerball": return decodeDrawFile((await import("./data/powerball.json")).default);
    case "megamillions": return decodeDrawFile((await import("./data/megamillions.json")).default);
  }
}
