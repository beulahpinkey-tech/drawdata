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

import type { Draw, Game } from "./types";

export async function getDraws(game: Game): Promise<Draw[]> {
  switch (game) {
    case "wi-pick3": return ((await import("./data/wi-pick3.json")).default as { draws: Draw[] }).draws;
    case "wi-pick4": return ((await import("./data/wi-pick4.json")).default as { draws: Draw[] }).draws;
    case "pa-pick3": return ((await import("./data/pa-pick3.json")).default as { draws: Draw[] }).draws;
    case "pa-pick4": return ((await import("./data/pa-pick4.json")).default as { draws: Draw[] }).draws;
    case "nj-pick3": return ((await import("./data/nj-pick3.json")).default as { draws: Draw[] }).draws;
    case "nj-pick4": return ((await import("./data/nj-pick4.json")).default as { draws: Draw[] }).draws;
    case "tx-pick3": return ((await import("./data/tx-pick3.json")).default as { draws: Draw[] }).draws;
    case "tx-pick4": return ((await import("./data/tx-pick4.json")).default as { draws: Draw[] }).draws;
    case "nc-pick3": return ((await import("./data/nc-pick3.json")).default as { draws: Draw[] }).draws;
    case "nc-pick4": return ((await import("./data/nc-pick4.json")).default as { draws: Draw[] }).draws;
    case "fl-pick3": return ((await import("./data/fl-pick3.json")).default as { draws: Draw[] }).draws;
    case "fl-pick4": return ((await import("./data/fl-pick4.json")).default as { draws: Draw[] }).draws;
    case "wa-pick3": return ((await import("./data/wa-pick3.json")).default as { draws: Draw[] }).draws;
    case "ga-pick3": return ((await import("./data/ga-pick3.json")).default as { draws: Draw[] }).draws;
    case "ga-pick4": return ((await import("./data/ga-pick4.json")).default as { draws: Draw[] }).draws;
    case "mi-pick3": return ((await import("./data/mi-pick3.json")).default as { draws: Draw[] }).draws;
    case "mi-pick4": return ((await import("./data/mi-pick4.json")).default as { draws: Draw[] }).draws;
    case "powerball": return ((await import("./data/powerball.json")).default as { draws: Draw[] }).draws;
    case "megamillions": return ((await import("./data/megamillions.json")).default as { draws: Draw[] }).draws;
  }
}
