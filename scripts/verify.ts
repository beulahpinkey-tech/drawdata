import { readFileSync } from "node:fs";
import { join } from "node:path";

const DATA = join(process.cwd(), "lib", "data");
const j = <T,>(name: string): T => JSON.parse(readFileSync(join(DATA, name), "utf8"));

type Pick3Slice = {
  count: number;
  freqByPosition: { position: number; counts: number[] }[];
  allPositions: number[];
  shapes: { all_diff: number; double: number; triple: number; quad: number };
  sums: Record<string, number>;
};

type PickAgg = {
  combined: Pick3Slice;
  midday: Pick3Slice;
  evening: Pick3Slice;
};

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

for (const game of ["pick3", "pick4"] as const) {
  const agg = j<PickAgg>(`${game}.agg.json`);
  const positions = game === "pick3" ? 3 : 4;
  const m = meta[game];

  const combinedTotal = agg.combined.count;
  const splitTotal = agg.midday.count + agg.evening.count + (m.countOther ?? 0);

  check(`[${game}] combined.count matches meta.count`, combinedTotal === m.count, `${combinedTotal} vs ${m.count}`);
  check(`[${game}] midday+evening+other equals combined`, splitTotal === combinedTotal, `${splitTotal} vs ${combinedTotal}`);

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

  // Distribution should be roughly uniform (within ±20% per digit slot).
  const meanExp = expectedDigits / 10;
  const dev = agg.combined.allPositions.map((v) => Math.abs(v - meanExp) / meanExp);
  const maxDev = Math.max(...dev);
  check(`[${game}] digit frequency within ±20% of expected`, maxDev < 0.2, `max dev ${(maxDev * 100).toFixed(1)}%`);
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

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `FAILURES: ${failures}`}`);
process.exit(failures === 0 ? 0 : 1);
