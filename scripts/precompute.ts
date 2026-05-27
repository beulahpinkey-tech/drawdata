/**
 * DrawData ingest / precompute
 *
 * Reads three CSVs from /data/wi/ (Wisconsin Lottery exports) and writes
 * normalized + aggregated JSON to /lib/data/ for the app to read.
 *
 * Expected CSV schemas (Wisconsin Lottery format):
 *
 *   /data/wi/pick3.csv
 *     Optional title row:  "Wisconsin Lottery - Pick 3 Winning Numbers", ...
 *     Optional header row: "Draw Date", ...
 *     Data rows:           DD-MM-YYYY, <Midday|Evening|""> , d1, d2, d3
 *
 *   /data/wi/pick4.csv
 *     Same as pick3, with d1..d4.
 *
 *   /data/wi/powerball.csv
 *     Optional title row:  "Wisconsin Lottery - Powerball ..."
 *     Optional header row: "Draw Date", , , , , , "PB", "Power Play", "Est. Jackpot"
 *     Data rows:           <DD-MM-YYYY|YYYY-MM-DD>, w1, w2, w3, w4, w5, pb, PowerPlay, Jackpot
 *
 *   /data/megamillions.csv  (national — same numbers everywhere; WI sales started 2010)
 *     Optional title row:  "Wisconsin history only" or any non-date text
 *     Optional header row: "Draw Date", , , , , , "Megaball", "Multiplier"
 *     Data rows:           <DD-MM-YYYY|YYYY-MM-DD>, w1, w2, w3, w4, w5, megaball, [multiplier]
 *
 * Malformed / blank rows are skipped and reported but do not abort the build.
 * To refresh: drop new rows into the CSV files and run `npm run ingest`.
 */

import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parsePick, parsePowerball, parseMegaMillions } from "../lib/ingest/parsers";
import { CURRENT_PB_ERA } from "../lib/ingest/eras";
import { CURRENT_MM_ERA, MEGAMILLIONS_ERAS } from "../lib/ingest/megamillions-eras";
import {
  digitFrequencyAcrossPositions,
  digitFrequencyByPosition,
  shapeCounts,
  sumDistribution,
  whiteFrequency,
  redFrequency,
} from "../lib/analytics/frequency";
import { currentGapsPerValue, gapDistribution } from "../lib/analytics/gaps";
import {
  cumulativeUniqueCoverage,
  perYearCoverage,
} from "../lib/analytics/coverage";
import type { Draw, ParseReport } from "../lib/types";

const ROOT = process.cwd();
const CSV_DIR = join(ROOT, "data", "wi");
const NATIONAL_CSV_DIR = join(ROOT, "data");
const OUT_DIR = join(ROOT, "lib", "data");
mkdirSync(OUT_DIR, { recursive: true });

/**
 * Resolve a CSV by trying multiple filename and location variants.
 * The Wisconsin Lottery / Mega Millions downloads ship with a few naming
 * conventions ("pick-3.csv", "pick-3_history.csv", "pick3.csv", etc.) and
 * users sometimes drop national-game files under data/wi/. We accept all
 * common variants in either directory so the ingest never breaks just
 * because someone renamed a file.
 */
function findCsv(canonical: string, aliases: string[] = []): { path: string; tried: string[] } {
  const filenames = Array.from(new Set([canonical, ...aliases]));
  const dirs = [CSV_DIR, NATIONAL_CSV_DIR, ROOT];
  const tried: string[] = [];
  for (const dir of dirs) {
    for (const name of filenames) {
      const p = join(dir, name);
      tried.push(p);
      if (existsSync(p)) return { path: p, tried };
    }
  }
  return { path: "", tried };
}

function loadCsv(canonical: string, aliases: string[] = []): { raw: string; path: string } {
  const { path, tried } = findCsv(canonical, aliases);
  if (!path) {
    console.error(
      `\n  Could not find ${canonical}. Tried:\n    ${tried.join("\n    ")}\n`,
    );
    process.exit(1);
  }
  return { raw: readFileSync(path, "utf8"), path };
}

function writeJson(name: string, obj: unknown) {
  const json = JSON.stringify(obj);
  writeFileSync(join(OUT_DIR, name), json);
  console.log(`  wrote ${name.padEnd(28)} (${(json.length / 1024).toFixed(1)} KB)`);
}

function aggregatePick(draws: Draw[], positions: number, label: string) {
  const splits: Record<string, Draw[]> = {
    combined: draws,
    midday: draws.filter((d) => d.stream === "midday"),
    evening: draws.filter((d) => d.stream === "evening"),
  };
  const out: Record<string, unknown> = {};
  for (const [streamKey, sub] of Object.entries(splits)) {
    if (sub.length === 0) continue;
    const freq = digitFrequencyByPosition(sub, positions);
    const allPos = digitFrequencyAcrossPositions(sub);
    const shapes = shapeCounts(sub);
    const sums = sumDistribution(sub, true);
    const gaps = currentGapsPerValue(sub, 10, (d) => d.digits ?? []);
    const gapDist = gapDistribution(sub, 10, (d) => d.digits ?? []);
    const coverageCum = cumulativeUniqueCoverage(sub, 10, (d) => d.digits ?? []);
    const coverageYear = perYearCoverage(sub, 10, (d) => d.digits ?? []);
    out[streamKey] = {
      count: sub.length,
      earliest: sub[0].date,
      latest: sub[sub.length - 1].date,
      freqByPosition: freq,
      allPositions: allPos,
      shapes,
      sums,
      gaps,
      gapDist,
      coverageCum,
      coverageYear,
    };
  }
  console.log(`[${label}] aggregating ${draws.length} draws`);
  return out;
}

function aggregateBallGame(
  draws: Draw[],
  current: { id: string; whitePool: number; redPool: number; label: string },
  label: string,
) {
  const currentEraDraws = draws.filter((d) => d.era === current.id);
  console.log(`[${label}] full=${draws.length} current-era=${currentEraDraws.length}`);

  const whitePool = current.whitePool;
  const redPool = current.redPool;

  const whiteCounts = whiteFrequency(currentEraDraws, whitePool);
  const redCounts = redFrequency(currentEraDraws, redPool);
  const sums = sumDistribution(currentEraDraws, false);
  const whiteGaps = currentGapsPerValue(currentEraDraws, whitePool + 1, (d) => d.whites ?? []);
  const redGaps = currentGapsPerValue(currentEraDraws, redPool + 1, (d) => (d.special != null ? [d.special] : []));
  const whiteGapDist = gapDistribution(currentEraDraws, whitePool + 1, (d) => d.whites ?? []);
  const redGapDist = gapDistribution(currentEraDraws, redPool + 1, (d) => (d.special != null ? [d.special] : []));
  const coverageCum = cumulativeUniqueCoverage(currentEraDraws, whitePool + 1, (d) => d.whites ?? []);
  const coverageYear = perYearCoverage(currentEraDraws, whitePool + 1, (d) => d.whites ?? []);

  return {
    fullCount: draws.length,
    currentCount: currentEraDraws.length,
    earliestFull: draws[0]?.date,
    latestFull: draws[draws.length - 1]?.date,
    earliestCurrent: currentEraDraws[0]?.date,
    latestCurrent: currentEraDraws[currentEraDraws.length - 1]?.date,
    eraLabel: current.label,
    whitePool,
    redPool,
    whiteCounts,
    redCounts,
    sums,
    whiteGaps,
    redGaps,
    whiteGapDist,
    redGapDist,
    coverageCum,
    coverageYear,
  };
}

function rule(width = 64) {
  return "─".repeat(width);
}
function reportFor(name: string, r: ParseReport) {
  const reasonsStr = Object.keys(r.skippedReasons).length
    ? Object.entries(r.skippedReasons).map(([k, v]) => `${k}: ${v}`).join(", ")
    : "—";
  console.log(
    `  ${name.padEnd(10)}  parsed=${String(r.parsed).padStart(5)}  ` +
      `skipped=${String(r.skipped).padStart(3)}  reasons={${reasonsStr}}  ` +
      `range=${r.dateRange[0] || "—"} → ${r.dateRange[1] || "—"}`,
  );
}

console.log(rule());
console.log("DrawData ingest — Wisconsin Lottery CSVs → JSON aggregates");
console.log(rule());

console.log("\nReading CSVs (data/wi/, data/, project root all checked) …");
const p3csv = loadCsv("pick3.csv", ["pick-3.csv", "pick-3_history.csv", "pick_3.csv"]);
const p4csv = loadCsv("pick4.csv", ["pick-4.csv", "pick-4_history.csv", "pick_4.csv"]);
const pbcsv = loadCsv("powerball.csv", ["powerball_history.csv", "powerball-history.csv"]);
const mmcsv = loadCsv("megamillions.csv", [
  "mega-millions.csv",
  "mega_millions.csv",
  "megamillions_history.csv",
  "mega-millions_history.csv",
]);
console.log(`  pick3        ← ${p3csv.path}`);
console.log(`  pick4        ← ${p4csv.path}`);
console.log(`  powerball    ← ${pbcsv.path}`);
console.log(`  megamillions ← ${mmcsv.path}`);

const p3raw = p3csv.raw;
const p4raw = p4csv.raw;
const pbraw = pbcsv.raw;
const mmraw = mmcsv.raw;

const latestCsvMtime = new Date(
  Math.max(
    statSync(p3csv.path).mtimeMs,
    statSync(p4csv.path).mtimeMs,
    statSync(pbcsv.path).mtimeMs,
    statSync(mmcsv.path).mtimeMs,
  ),
).toISOString();

console.log("\nParsing …");
const { draws: p3, report: r3 } = parsePick(p3raw, "pick3");
const { draws: p4, report: r4 } = parsePick(p4raw, "pick4");
const { draws: pb, report: rPb } = parsePowerball(pbraw);
const { draws: mm, report: rMm } = parseMegaMillions(mmraw);

console.log("\nValidation report:");
reportFor("pick3", r3);
reportFor("pick4", r4);
reportFor("powerball", rPb);
reportFor("megamillions", rMm);

const errors: string[] = [];
if (p3.length === 0) errors.push("Pick 3 produced zero draws");
if (p4.length === 0) errors.push("Pick 4 produced zero draws");
if (pb.length === 0) errors.push("Powerball produced zero draws");
if (mm.length === 0) errors.push("Mega Millions produced zero draws");
// chronological monotonic check
for (const [game, set] of [
  ["pick3", p3],
  ["pick4", p4],
  ["powerball", pb],
  ["megamillions", mm],
] as const) {
  for (let i = 1; i < set.length; i++) {
    if (set[i].date < set[i - 1].date) {
      errors.push(`${game}: dates out of order at index ${i} (${set[i - 1].date} → ${set[i].date})`);
      break;
    }
  }
}
if (errors.length) {
  console.error("\nValidation failures:\n  " + errors.join("\n  "));
  process.exit(1);
}

console.log("\nWriting JSON aggregates to lib/data/ …");
writeJson("pick3.json", { game: "pick3", draws: p3, report: r3 });
writeJson("pick4.json", { game: "pick4", draws: p4, report: r4 });
writeJson("powerball.json", { game: "powerball", draws: pb, report: rPb });
writeJson("megamillions.json", { game: "megamillions", draws: mm, report: rMm });

writeJson("pick3.agg.json", aggregatePick(p3, 3, "pick3"));
writeJson("pick4.agg.json", aggregatePick(p4, 4, "pick4"));
writeJson("powerball.agg.json", aggregateBallGame(pb, CURRENT_PB_ERA, "powerball"));
writeJson("megamillions.agg.json", aggregateBallGame(mm, CURRENT_MM_ERA, "megamillions"));

const meta = {
  generatedAt: new Date().toISOString(),
  lastCsvUpdated: latestCsvMtime,
  source: "Wisconsin Lottery (public draw history). Not affiliated.",
  pick3: {
    count: p3.length,
    countMidday: p3.filter((d) => d.stream === "midday").length,
    countEvening: p3.filter((d) => d.stream === "evening").length,
    countOther: p3.filter((d) => d.stream === "other").length,
    earliest: r3.dateRange[0],
    latest: r3.dateRange[1],
    latestDraw: p3[p3.length - 1] ?? null,
    skipped: r3.skipped,
  },
  pick4: {
    count: p4.length,
    countMidday: p4.filter((d) => d.stream === "midday").length,
    countEvening: p4.filter((d) => d.stream === "evening").length,
    countOther: p4.filter((d) => d.stream === "other").length,
    earliest: r4.dateRange[0],
    latest: r4.dateRange[1],
    latestDraw: p4[p4.length - 1] ?? null,
    skipped: r4.skipped,
  },
  powerball: {
    count: pb.length,
    earliest: rPb.dateRange[0],
    latest: rPb.dateRange[1],
    latestDraw: pb[pb.length - 1] ?? null,
    currentEra: CURRENT_PB_ERA,
    skipped: rPb.skipped,
  },
  megamillions: {
    count: mm.length,
    earliest: rMm.dateRange[0],
    latest: rMm.dateRange[1],
    latestDraw: mm[mm.length - 1] ?? null,
    currentEra: CURRENT_MM_ERA,
    eras: MEGAMILLIONS_ERAS,
    skipped: rMm.skipped,
  },
};
writeJson("meta.json", meta);

console.log(`\n${rule()}`);
console.log("Done.");
console.log(`  data freshness (latest CSV mtime): ${latestCsvMtime}`);
console.log(`  total draws: pick3=${p3.length}  pick4=${p4.length}  powerball=${pb.length}  megamillions=${mm.length}`);
console.log(rule());
