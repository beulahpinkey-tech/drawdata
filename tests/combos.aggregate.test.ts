/**
 * Aggregation, filtering and window extraction.
 *
 * The fixtures below are TEST INPUTS, not history: small hand-built draw
 * lists whose expected answers can be checked by eye. Real-data assertions
 * live in tests/combos.realdata.test.ts, which reads the shipped datasets.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildComboIndex, filterComboDraws, tierOf } from "@/lib/combos/index-build";
import { analyzeWindow } from "@/lib/combos/engine";
import type { Draw, Game, Stream } from "@/lib/types";

const ALL = { stream: "all" } as const;

/** Build a draw row. Dates ascend so the list stays chronological. */
function draw(date: string, digits: string, stream: Stream = "evening"): Draw {
  return {
    game: "pick4",
    date,
    stream,
    digits: digits.split("").map(Number),
    index: 0,
  };
}

function src(game: Game, draws: Draw[]) {
  return [{ game, draws }];
}

test("8999 drawn four times counts as exactly four", () => {
  const draws = [
    draw("2017-06-12", "8999", "midday"),
    draw("2018-01-02", "1234"),
    draw("2019-11-09", "8999"),
    draw("2020-05-05", "0042"),
    draw("2022-08-17", "8999", "midday"),
    draw("2025-03-04", "8999"),
  ];
  const index = buildComboIndex(src("ny-pick4", draws), ALL);
  const stats = index.stats(8999);

  assert.equal(stats.count, 4);
  assert.equal(index.countOf(8999), 4);
  assert.equal(stats.firstSeen, "2017-06-12");
  assert.equal(stats.lastSeen, "2025-03-04");
  assert.equal(stats.drawsSince, 0, "the last draw in the set is the 8999 hit itself");
  assert.equal(stats.share, 4 / 6);
});

test("occurrences come back newest first, with their stream and state", () => {
  const draws = [
    draw("2017-06-12", "8999", "midday"),
    draw("2019-11-09", "8999", "evening"),
    draw("2022-08-17", "8999", "midday"),
  ];
  const occ = buildComboIndex(src("ny-pick4", draws), ALL).occurrences(8999);
  assert.deepEqual(
    occ.map((o) => `${o.date}/${o.stream}/${o.game}`),
    ["2022-08-17/midday/ny-pick4", "2019-11-09/evening/ny-pick4", "2017-06-12/midday/ny-pick4"],
  );
});

test("a combination that never came up reports zero, not a fabricated hit", () => {
  const index = buildComboIndex(src("ny-pick4", [draw("2020-01-01", "1234")]), ALL);
  const stats = index.stats(8999);
  assert.equal(stats.count, 0);
  assert.equal(stats.firstSeen, null);
  assert.equal(stats.lastSeen, null);
  assert.equal(stats.drawsSince, null);
  assert.equal(index.occurrences(8999).length, 0);
});

test("draws since last hit counts draws, not days", () => {
  const draws = [
    draw("2020-01-01", "8999"),
    draw("2020-01-02", "1111"),
    draw("2020-01-03", "2222"),
    draw("2020-01-04", "3333"),
  ];
  assert.equal(buildComboIndex(src("ny-pick4", draws), ALL).stats(8999).drawsSince, 3);
});

test("stream filtering (draw type) narrows the dataset", () => {
  const draws = [
    draw("2020-01-01", "8999", "midday"),
    draw("2020-01-01", "8999", "evening"),
    draw("2020-01-02", "8999", "evening"),
  ];
  assert.equal(buildComboIndex(src("ny-pick4", draws), { stream: "all" }).countOf(8999), 3);
  assert.equal(buildComboIndex(src("ny-pick4", draws), { stream: "midday" }).countOf(8999), 1);
  assert.equal(buildComboIndex(src("ny-pick4", draws), { stream: "evening" }).countOf(8999), 2);
  assert.equal(buildComboIndex(src("ny-pick4", draws), { stream: "night" }).countOf(8999), 0);
});

test("date range filtering is inclusive on both ends", () => {
  const draws = [
    draw("2019-12-31", "8999"),
    draw("2020-01-01", "8999"),
    draw("2020-06-30", "8999"),
    draw("2021-01-01", "8999"),
  ];
  const index = buildComboIndex(src("ny-pick4", draws), {
    stream: "all",
    from: "2020-01-01",
    to: "2020-12-31",
  });
  assert.equal(index.countOf(8999), 2);
  assert.equal(index.earliest, "2020-01-01");
  assert.equal(index.latest, "2020-06-30");
});

test("state filtering keeps each state's dataset separate", () => {
  const ny = [draw("2020-01-01", "8999"), draw("2020-01-02", "8999")];
  const pa = [draw("2020-01-01", "8999")];
  const ma = [draw("2020-01-01", "1234")];

  assert.equal(buildComboIndex(src("ny-pick4", ny), ALL).countOf(8999), 2);
  assert.equal(buildComboIndex(src("pa-pick4", pa), ALL).countOf(8999), 1);
  assert.equal(buildComboIndex(src("ma-pick4", ma), ALL).countOf(8999), 0);
});

test("states combine only when explicitly asked for together", () => {
  const combined = buildComboIndex(
    [
      { game: "ny-pick4" as Game, draws: [draw("2020-01-02", "8999")] },
      { game: "pa-pick4" as Game, draws: [draw("2020-01-01", "8999")] },
    ],
    ALL,
  );
  assert.equal(combined.countOf(8999), 3 - 1);
  assert.equal(combined.totalDraws, 2);
  // Multi-state input is re-sorted into one chronological series.
  assert.equal(combined.earliest, "2020-01-01");
  assert.deepEqual(
    combined.occurrences(8999).map((o) => o.game),
    ["ny-pick4", "pa-pick4"],
  );
});

test("three-digit rows are never mapped into the four-digit universe", () => {
  const rows = filterComboDraws(src("ny-pick4", [draw("2020-01-01", "123"), draw("2020-01-02", "1234")]), ALL);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].combo, 1234);
});

test("last-50 extraction takes the 50 most recent draws, newest first", () => {
  const draws = Array.from({ length: 120 }, (_, i) =>
    draw(`2020-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      String(i).padStart(4, "0")),
  );
  const index = buildComboIndex(src("ny-pick4", draws), ALL);
  const window = analyzeWindow(index, 50);

  assert.equal(window.analysed, 50);
  assert.equal(window.requested, 50);
  assert.equal(window.draws[0].combo, 119, "newest draw first");
  assert.equal(window.draws[49].combo, 70);
  assert.equal(window.uniqueCombos, 50);
  assert.equal(window.repeatedCombos.length, 0);
});

test("fewer than 50 draws analyses what exists and says how many", () => {
  const draws = Array.from({ length: 32 }, (_, i) =>
    draw(`2020-01-${String(i + 1).padStart(2, "0")}`, String(i).padStart(4, "0")),
  );
  const window = analyzeWindow(buildComboIndex(src("md-pick4", draws), ALL), 50);
  assert.equal(window.requested, 50);
  assert.equal(window.analysed, 32, "never pads the window with invented draws");
  assert.equal(window.draws.length, 32);
});

test("an empty selection yields an empty index rather than an error", () => {
  const index = buildComboIndex(src("ny-pick4", []), ALL);
  assert.equal(index.totalDraws, 0);
  assert.equal(index.earliest, null);
  assert.equal(index.countOf(0), 0);
  assert.equal(analyzeWindow(index, 50).analysed, 0);
  assert.equal(index.distribution().neverSeen, 10_000);
});

test("window statistics describe repeats and digit positions", () => {
  const draws = [
    draw("2020-01-01", "1111"),
    draw("2020-01-02", "2222"),
    draw("2020-01-03", "1111"),
    draw("2020-01-04", "3456"),
  ];
  const window = analyzeWindow(buildComboIndex(src("ny-pick4", draws), ALL), 50);
  assert.equal(window.analysed, 4);
  assert.equal(window.uniqueCombos, 3);
  assert.deepEqual(window.repeatedCombos, [{ combo: 1111, count: 2 }]);
  assert.deepEqual(window.repeatIntervals, [2]);
  assert.equal(window.digitTotals[1], 8);
  assert.equal(window.positionDigits[0][1], 2);
  assert.equal(window.positionDigits[3][6], 1);
});

test("distribution reports seen / never-seen over the fixed 10,000", () => {
  const draws = [draw("2020-01-01", "0000"), draw("2020-01-02", "0000"), draw("2020-01-03", "9999")];
  const dist = buildComboIndex(src("ny-pick4", draws), ALL).distribution();
  assert.equal(dist.seen, 2);
  assert.equal(dist.neverSeen, 9_998);
  assert.equal(dist.maxCount, 2);
  assert.equal(dist.histogram[0], 9_998);
  assert.equal(dist.histogram[1], 1);
  assert.equal(dist.histogram[2], 1);
  assert.equal(dist.modeCount, 1, "mode ignores the never-drawn bucket");
});

test("tiers bucket hit counts 0 / 1 / 2 / 3 / 4+", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 17].map(tierOf), [0, 1, 2, 3, 4, 4]);
});
