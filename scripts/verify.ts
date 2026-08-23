import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STATE_GAMES } from "../lib/states";

const DATA = join(process.cwd(), "lib", "data");
const j = <T,>(name: string): T => JSON.parse(readFileSync(join(DATA, name), "utf8"));

type PickSlice = {
  count: number;
  freqByPosition: { position: number; counts: number[] }[];
  allPositions: number[];
  shapes: { all_diff: number; double: number; triple: number; quad: number };
  sums: Record<string, number>;
};

/**
 * `combined` plus one key per stream the game actually has draws for.
 * precompute drops empty streams, so a single-draw game (Washington's Daily
 * Game, California's Daily 4) has no `midday` key at all — hence the index
 * signature rather than named midday/evening fields.
 */
type PickAgg = { combined: PickSlice } & Record<string, PickSlice>;

const STREAM_KEYS = ["morning", "midday", "evening", "night"] as const;

type PbAgg = {
  fullCount: number;
  currentCount: number;
  whiteCounts: number[];
  redCounts: number[];
  sums: Record<string, number>;
};

const meta = j<any>("meta.json");

let failures = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};

/**
 * A non-fatal observation. Used for the digit-uniformity test, which is
 * inherently probabilistic: across 27 datasets x 10 digits this script runs
 * ~270 such comparisons per invocation, so at any fixed sigma a handful of
 * real, correct datasets will eventually sit outside the band by chance —
 * and because the data is cumulative, one that drifts out STAYS out. Failing
 * the build on that would wedge the twice-daily refresh over pure noise.
 * The structural invariants are hard failures; this one only reports.
 */
let warnings = 0;
const warn = (name: string, ok: boolean, detail?: string) => {
  console.log(`${ok ? "✓" : "!"} ${name}${detail ? "  " + detail : ""}`);
  if (!ok) warnings++;
};

// Every state-scoped pick dataset, discovered from meta rather than hardcoded
// — the previous list was the pre-migration ["pick3","pick4"] and silently
// stopped matching any file once slugs became "<state>-<game>".
const PICK_SLUGS = Object.keys(meta)
  .filter((k) => meta[k] && typeof meta[k] === "object" && (meta[k].game === "pick3" || meta[k].game === "pick4"))
  .sort();

if (PICK_SLUGS.length === 0) {
  console.error("No pick datasets found in meta.json — precompute did not run?");
  process.exit(1);
}
console.log(`Verifying ${PICK_SLUGS.length} pick datasets + powerball\n`);

for (const game of PICK_SLUGS) {
  const agg = j<PickAgg>(`${game}.agg.json`);
  const positions = game.endsWith("pick3") ? 3 : 4;
  const m = meta[game];

  const combinedTotal = agg.combined.count;
  // Sum whichever streams are present, not a fixed midday+evening pair.
  const presentStreams = STREAM_KEYS.filter((s) => agg[s]);
  const splitTotal =
    presentStreams.reduce((a, s) => a + agg[s].count, 0) + (m.countOther ?? 0);

  check(`[${game}] combined.count matches meta.count`, combinedTotal === m.count, `${combinedTotal} vs ${m.count}`);
  check(
    `[${game}] ${presentStreams.join("+") || "no streams"}+other equals combined`,
    splitTotal === combinedTotal,
    `${splitTotal} vs ${combinedTotal}`,
  );
  check(`[${game}] has at least one stream`, presentStreams.length > 0, presentStreams.join(",") || "none");

  const totalDigits = agg.combined.allPositions.reduce((a, b) => a + b, 0);
  const expectedDigits = combinedTotal * positions;
  check(`[${game}] sum of allPositions = count*positions`, totalDigits === expectedDigits, `${totalDigits} vs ${expectedDigits}`);

  // Each position's count totals should equal combined draw count
  for (const row of agg.combined.freqByPosition) {
    const t = row.counts.reduce((a, b) => a + b, 0);
    check(`[${game}] position ${row.position + 1} totals = count`, t === combinedTotal, `${t} vs ${combinedTotal}`);
  }

  // Sum-position counts add to allPositions
  const positional = agg.combined.freqByPosition.reduce((acc, row) => {
    row.counts.forEach((v, i) => (acc[i] = (acc[i] ?? 0) + v));
    return acc;
  }, new Array(10).fill(0));
  const eq = positional.every((v, i) => v === agg.combined.allPositions[i]);
  check(`[${game}] sum(freqByPosition) == allPositions`, eq);

  // Shapes totals equal count
  const shapesSum = agg.combined.shapes.all_diff + agg.combined.shapes.double + agg.combined.shapes.triple + agg.combined.shapes.quad;
  check(`[${game}] shape counts add to total`, shapesSum === combinedTotal, `${shapesSum} vs ${combinedTotal}`);

  // Sum distribution adds to count and respects bounds
  const sumDistVals = Object.values(agg.combined.sums).reduce((a, b) => a + b, 0);
  check(`[${game}] sum distribution totals draws`, sumDistVals === combinedTotal, `${sumDistVals} vs ${combinedTotal}`);
  const maxSum = positions * 9;
  const sumKeys = Object.keys(agg.combined.sums).map((k) => parseInt(k, 10));
  check(`[${game}] sums within [0, ${maxSum}]`, sumKeys.every((k) => k >= 0 && k <= maxSum));

  // Digit distribution should look uniform. This used to be a flat ±20%,
  // which only works for large datasets: a 182-draw game (California Daily 4)
  // has ~73 hits per digit, where ±20% is under 2 standard errors and pure
  // chance trips it routinely. Use a binomial sigma band instead, so the
  // tolerance scales with sample size — far tighter than 20% for PA's 26k
  // draws, correctly looser for a few hundred. A real corruption (shifted
  // digits, truncated parse) blows past it; sampling noise does not.
  const meanExp = expectedDigits / 10;
  const sd = Math.sqrt(expectedDigits * 0.1 * 0.9);
  const tolerance = 5 * sd; // ~1-in-1.7M per digit: noise never reaches this, corruption always does
  const worst = agg.combined.allPositions.reduce(
    (acc, v, i) => (Math.abs(v - meanExp) > Math.abs(acc.v - meanExp) ? { v, i } : acc),
    { v: agg.combined.allPositions[0], i: 0 },
  );
  const worstDev = Math.abs(worst.v - meanExp);
  warn(
    `[${game}] digit frequency within 5σ of uniform`,
    worstDev <= tolerance,
    `digit ${worst.i}: ${worst.v} vs expected ${meanExp.toFixed(1)} ` +
      `(off by ${worstDev.toFixed(1)}, limit ${tolerance.toFixed(1)})`,
  );
}

// Powerball
const pb = j<PbAgg>("powerball.agg.json");
const m = meta.powerball;

check("[powerball] fullCount matches meta.count", pb.fullCount === m.count, `${pb.fullCount} vs ${m.count}`);
check("[powerball] currentCount > 0", pb.currentCount > 0, `${pb.currentCount}`);

const whiteTotal = pb.whiteCounts.reduce((a, b) => a + b, 0);
const expectedWhite = pb.currentCount * 5;
check("[powerball] sum(whiteCounts) = currentCount * 5", whiteTotal === expectedWhite, `${whiteTotal} vs ${expectedWhite}`);

const redTotal = pb.redCounts.reduce((a, b) => a + b, 0);
check("[powerball] sum(redCounts) = currentCount", redTotal === pb.currentCount, `${redTotal} vs ${pb.currentCount}`);

const pbWhitesNonZero = pb.whiteCounts.slice(1, 70).filter((v) => v > 0).length;
check("[powerball] all 69 white balls have at least one draw", pbWhitesNonZero === 69, `${pbWhitesNonZero}/69`);

const pbRedsNonZero = pb.redCounts.slice(1, 27).filter((v) => v > 0).length;
check("[powerball] all 26 red balls have at least one draw", pbRedsNonZero === 26, `${pbRedsNonZero}/26`);

// ─── State catalog ↔ shipped data consistency ───────────────────────────
// The picker (app/picker) renders STATE_GAMES directly: a state marked
// `available` there but with no ingested dataset would link visitors to a
// game that doesn't exist, and one marked `waitlist` despite having data
// would hide a shipped state behind the waitlist modal. Neither shows up in
// a typecheck, so assert both against meta.json.
const abbrSeen = new Map<string, number>();
for (const s of STATE_GAMES) {
  const key = s.abbr.toUpperCase();
  abbrSeen.set(key, (abbrSeen.get(key) ?? 0) + 1);
}
const dupAbbrs = [...abbrSeen.entries()].filter(([, n]) => n > 1).map(([a]) => a);
check("[states] no duplicate state entries", dupAbbrs.length === 0, dupAbbrs.join(",") || "none");

const metaStates: Record<string, { available?: boolean }> = meta.states ?? {};
const ingested = new Set(
  Object.entries(metaStates)
    .filter(([, v]) => v?.available)
    .map(([code]) => code.toUpperCase()),
);

const claimedAvailable = STATE_GAMES.filter((s) => s.status === "available").map((s) => s.abbr.toUpperCase());
const availableWithoutData = [...new Set(claimedAvailable)].filter((a) => !ingested.has(a));
check(
  "[states] every `available` state has ingested data",
  availableWithoutData.length === 0,
  availableWithoutData.join(",") || `${claimedAvailable.length} available`,
);

const dataWithoutAvailable = [...ingested].filter(
  (a) => !STATE_GAMES.some((s) => s.abbr.toUpperCase() === a && s.status === "available"),
);
check(
  "[states] every ingested state is marked `available`",
  dataWithoutAvailable.length === 0,
  dataWithoutAvailable.join(",") || "none",
);

console.log(
  `
${failures === 0 ? "ALL CHECKS PASSED" : `FAILURES: ${failures}`}` +
    (warnings > 0 ? `  (${warnings} non-fatal uniformity warning${warnings === 1 ? "" : "s"})` : ""),
);
process.exit(failures === 0 ? 0 : 1);
