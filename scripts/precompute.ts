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
const NATIONAL_CSV_DIR = join(ROOT, "data");
const OUT_DIR = join(ROOT, "lib", "data");
mkdirSync(OUT_DIR, { recursive: true });

/**
 * Resolve a CSV by trying multiple filename variants within a list of
 * candidate directories (state dir → national dir → project root).
 * Tolerant of variants like "pick-3.csv" vs "pick3.csv" because Lottery
 * downloads ship with several conventions.
 */
function findCsv(
  canonical: string,
  aliases: string[],
  dirs: string[],
): { path: string; tried: string[] } {
  const filenames = Array.from(new Set([canonical, ...aliases]));
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

function loadCsv(
  canonical: string,
  aliases: string[],
  dirs: string[],
  required: boolean,
): { raw: string; path: string } | null {
  const { path, tried } = findCsv(canonical, aliases, dirs);
  if (!path) {
    if (required) {
      console.error(
        `\n  Could not find ${canonical}. Tried:\n    ${tried.join("\n    ")}\n`,
      );
      process.exit(1);
    }
    return null;
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

// ─── State-scoped pick games ────────────────────────────────────────────
type StateCfg = { code: "wi" | "pa" | "nj" | "tx" | "nc" | "fl"; label: string };
const STATES: StateCfg[] = [
  { code: "wi", label: "Wisconsin" },
  { code: "pa", label: "Pennsylvania" },
  { code: "nj", label: "New Jersey" },
  { code: "tx", label: "Texas" },
  { code: "nc", label: "North Carolina" },
  { code: "fl", label: "Florida" },
];

const PICK3_ALIASES = ["pick-3.csv", "pick-3_history.csv", "pick_3.csv"];
const PICK4_ALIASES = ["pick-4.csv", "pick-4_history.csv", "pick_4.csv"];

type LoadedPick = {
  state: StateCfg;
  game: "pick3" | "pick4";
  csv: { path: string; raw: string };
};

console.log("\nReading state CSVs …");
const stateLoaded: LoadedPick[] = [];
for (const s of STATES) {
  const stateDir = join(ROOT, "data", s.code);
  const p3 = loadCsv("pick3.csv", PICK3_ALIASES, [stateDir], false);
  const p4 = loadCsv("pick4.csv", PICK4_ALIASES, [stateDir], false);
  if (!p3 || !p4) {
    console.log(`  ${s.code.toUpperCase()} skipped (missing pick3 or pick4 in ${stateDir})`);
    continue;
  }
  stateLoaded.push({ state: s, game: "pick3", csv: p3 });
  stateLoaded.push({ state: s, game: "pick4", csv: p4 });
  console.log(`  ${s.code.toUpperCase()} pick3 ← ${p3.path}`);
  console.log(`  ${s.code.toUpperCase()} pick4 ← ${p4.path}`);
}

console.log("\nReading national CSVs …");
const pbcsv = loadCsv(
  "powerball.csv",
  ["powerball_history.csv", "powerball-history.csv"],
  [join(ROOT, "data", "wi"), NATIONAL_CSV_DIR, ROOT],
  true,
)!;
const mmcsv = loadCsv(
  "megamillions.csv",
  ["mega-millions.csv", "mega_millions.csv", "megamillions_history.csv", "mega-millions_history.csv"],
  [join(ROOT, "data", "wi"), NATIONAL_CSV_DIR, ROOT],
  true,
)!;
console.log(`  powerball    ← ${pbcsv.path}`);
console.log(`  megamillions ← ${mmcsv.path}`);

const latestCsvMtime = new Date(
  Math.max(
    ...stateLoaded.map((l) => statSync(l.csv.path).mtimeMs),
    statSync(pbcsv.path).mtimeMs,
    statSync(mmcsv.path).mtimeMs,
  ),
).toISOString();

console.log("\nParsing …");
type ParsedPick = {
  state: StateCfg;
  game: "pick3" | "pick4";
  draws: Draw[];
  report: ParseReport;
};
const parsedPicks: ParsedPick[] = stateLoaded.map((l) => {
  const { draws, report } = parsePick(l.csv.raw, l.game);
  return { state: l.state, game: l.game, draws, report };
});
const { draws: pb, report: rPb } = parsePowerball(pbcsv.raw);
const { draws: mm, report: rMm } = parseMegaMillions(mmcsv.raw);

console.log("\nValidation report:");
for (const p of parsedPicks) reportFor(`${p.state.code}-${p.game}`, p.report);
reportFor("powerball", rPb);
reportFor("megamillions", rMm);

const errors: string[] = [];
for (const p of parsedPicks) {
  if (p.draws.length === 0) errors.push(`${p.state.code}-${p.game}: zero draws`);
  for (let i = 1; i < p.draws.length; i++) {
    if (p.draws[i].date < p.draws[i - 1].date) {
      errors.push(`${p.state.code}-${p.game}: dates out of order at index ${i}`);
      break;
    }
  }
}
if (pb.length === 0) errors.push("powerball: zero draws");
if (mm.length === 0) errors.push("megamillions: zero draws");
if (errors.length) {
  console.error("\nValidation failures:\n  " + errors.join("\n  "));
  process.exit(1);
}

console.log("\nWriting JSON aggregates to lib/data/ …");
for (const p of parsedPicks) {
  const slug = `${p.state.code}-${p.game}`;
  writeJson(`${slug}.json`, { game: slug, draws: p.draws, report: p.report });
  writeJson(
    `${slug}.agg.json`,
    aggregatePick(p.draws, p.game === "pick3" ? 3 : 4, slug),
  );
}
writeJson("powerball.json", { game: "powerball", draws: pb, report: rPb });
writeJson("megamillions.json", { game: "megamillions", draws: mm, report: rMm });
writeJson("powerball.agg.json", aggregateBallGame(pb, CURRENT_PB_ERA, "powerball"));
writeJson("megamillions.agg.json", aggregateBallGame(mm, CURRENT_MM_ERA, "megamillions"));

// ─── Freshness computation (drives the stale flags embedded in meta) ──
// We FLAG stale datasets rather than aborting the whole build: a single
// broken upstream (e.g. PA's endpoint started returning HTTP 500 in 2026)
// must not freeze the healthy sources from shipping. Stale datasets keep
// serving last-known-good, are marked `stale: true` in meta, and are
// logged loudly below — visible, not silent — but the build still
// succeeds so the bot commits the fresh data for everything else.
const STALE_DAYS = 7;
const today = new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.floor((Date.parse(b) - Date.parse(a)) / 86_400_000);

type FreshCheck = { slug: string; latest: string; ageDays: number; stale: boolean };
const freshnessChecks: FreshCheck[] = [];
const staleSlugs = new Set<string>();
function recordFreshness(slug: string, latest: string, cap: number): number {
  const ageDays = daysBetween(latest, today);
  if (ageDays > cap) staleSlugs.add(slug);
  freshnessChecks.push({ slug, latest, ageDays, stale: ageDays > cap });
  return ageDays;
}
const ageBySlug: Record<string, number> = {};
for (const p of parsedPicks) {
  const slug = `${p.state.code}-${p.game}`;
  ageBySlug[slug] = recordFreshness(slug, p.report.dateRange[1], STALE_DAYS);
}
// Powerball Mon/Wed/Sat, Mega Millions Tue/Fri — up to 4 days between
// draws, so give the ball games one extra day of slack.
ageBySlug["powerball"] = recordFreshness("powerball", rPb.dateRange[1], STALE_DAYS + 1);
ageBySlug["megamillions"] = recordFreshness("megamillions", rMm.dateRange[1], STALE_DAYS + 1);

const meta: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  lastCsvUpdated: latestCsvMtime,
  source: "Wisconsin Lottery + Pennsylvania Lottery + multi-state. Not affiliated.",
  // Slugs whose latest draw is older than the staleness cap. Empty in
  // the healthy case. The site can read this to badge a paused dataset.
  stale: Array.from(staleSlugs),
  states: STATES.reduce<Record<string, unknown>>((acc, s) => {
    acc[s.code] = { code: s.code, label: s.label, available: parsedPicks.some((p) => p.state.code === s.code) };
    return acc;
  }, {}),
};
for (const p of parsedPicks) {
  const slug = `${p.state.code}-${p.game}`;
  (meta as any)[slug] = {
    state: p.state.code,
    stateLabel: p.state.label,
    game: p.game,
    count: p.draws.length,
    countMidday: p.draws.filter((d) => d.stream === "midday").length,
    countEvening: p.draws.filter((d) => d.stream === "evening").length,
    countOther: p.draws.filter((d) => d.stream === "other").length,
    earliest: p.report.dateRange[0],
    latest: p.report.dateRange[1],
    latestDraw: p.draws[p.draws.length - 1] ?? null,
    skipped: p.report.skipped,
    stale: staleSlugs.has(slug),
    ageDays: ageBySlug[slug] ?? null,
  };
}
(meta as any).powerball = {
  count: pb.length,
  earliest: rPb.dateRange[0],
  latest: rPb.dateRange[1],
  latestDraw: pb[pb.length - 1] ?? null,
  currentEra: CURRENT_PB_ERA,
  skipped: rPb.skipped,
  stale: staleSlugs.has("powerball"),
  ageDays: ageBySlug["powerball"] ?? null,
};
(meta as any).megamillions = {
  count: mm.length,
  earliest: rMm.dateRange[0],
  latest: rMm.dateRange[1],
  latestDraw: mm[mm.length - 1] ?? null,
  currentEra: CURRENT_MM_ERA,
  eras: MEGAMILLIONS_ERAS,
  skipped: rMm.skipped,
  stale: staleSlugs.has("megamillions"),
  ageDays: ageBySlug["megamillions"] ?? null,
};
writeJson("meta.json", meta);

// ─── Freshness report ─────────────────────────────────────────────
// Computed above (staleSlugs / freshnessChecks) and already embedded in
// meta.json. Here we just PRINT it. Stale datasets are flagged loudly
// but do NOT fail the build: shipping the 5 healthy sources beats
// freezing everything because one upstream (e.g. PA in 2026) went down.
// The stale dataset keeps serving last-known-good and is badged via
// meta.stale so the site/operator can see it's paused.
console.log("\nFreshness check (cap: 7-8 days):");
for (const c of freshnessChecks) {
  console.log(`  ${c.stale ? "✗" : "✓"} ${c.slug.padEnd(14)} latest=${c.latest}  ${c.ageDays} days old`);
}
if (staleSlugs.size > 0) {
  console.warn(
    `\n⚠️  STALE DATASETS (${staleSlugs.size}) — serving last-known-good, flagged in meta.stale:\n  ` +
      freshnessChecks
        .filter((c) => c.stale)
        .map((c) => `${c.slug}: latest=${c.latest}, ${c.ageDays} days old — upstream fetcher likely down.`)
        .join("\n  ") +
      `\n  Healthy datasets still shipped. Fix the fetcher to clear this.`,
  );
}

// File-size budget. The current shape uses ~25 MB total; alert at 100
// MB so we have time to compress / archive before hitting GitHub's
// hard limits (5 GB repo soft cap, 100 MB single-file soft cap).
const SIZE_WARNINGS: string[] = [];
const FILE_WARN_BYTES = 50 * 1024 * 1024;    // 50 MB single file
const TOTAL_WARN_BYTES = 100 * 1024 * 1024;  // 100 MB across lib/data/
let dataTotal = 0;
import { readdirSync as _readdir, statSync as _stat } from "node:fs";
for (const f of _readdir(OUT_DIR)) {
  const s = _stat(join(OUT_DIR, f));
  if (!s.isFile()) continue;
  dataTotal += s.size;
  if (s.size > FILE_WARN_BYTES) {
    SIZE_WARNINGS.push(
      `${f}: ${(s.size / 1024 / 1024).toFixed(1)} MB > ${FILE_WARN_BYTES / 1024 / 1024} MB cap`,
    );
  }
}
if (dataTotal > TOTAL_WARN_BYTES) {
  SIZE_WARNINGS.push(
    `lib/data/ total: ${(dataTotal / 1024 / 1024).toFixed(1)} MB > ` +
      `${TOTAL_WARN_BYTES / 1024 / 1024} MB cap`,
  );
}
if (SIZE_WARNINGS.length > 0) {
  console.warn("\nSIZE BUDGET WARNINGS (still writing, but investigate):");
  for (const w of SIZE_WARNINGS) console.warn(`  ⚠ ${w}`);
}

console.log(`\n${rule()}`);
console.log("Done.");
console.log(`  data freshness (latest CSV mtime): ${latestCsvMtime}`);
console.log(`  lib/data/ total: ${(dataTotal / 1024 / 1024).toFixed(2)} MB`);
const pickSummary = parsedPicks
  .map((p) => `${p.state.code}-${p.game}=${p.draws.length}`)
  .join("  ");
console.log(`  total draws: ${pickSummary}  powerball=${pb.length}  megamillions=${mm.length}`);
console.log(rule());
