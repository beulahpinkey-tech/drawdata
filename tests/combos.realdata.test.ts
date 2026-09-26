/**
 * The same code paths, run against the real shipped datasets.
 *
 * The fixture tests prove the logic; these prove it still holds on
 * 160,000 actual draws — that the index agrees with a brute-force recount,
 * that per-state totals match meta.json, and that a state's projected
 * schedule matches the days it really draws on.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodeDrawFile } from "@/lib/draw-codec";
import { buildComboIndex } from "@/lib/combos/index-build";
import { analyzeWindow, generateExploratorySets } from "@/lib/combos/engine";
import { deriveCadence, nextDrawSlots, weekdayOf } from "@/lib/combos/schedule";
import { COMBO_UNIVERSE, comboLabel } from "@/lib/combos/universe";
import type { Draw, Game } from "@/lib/types";

const ROOT = process.cwd();
const meta = JSON.parse(readFileSync(join(ROOT, "lib/data/meta.json"), "utf8"));

function realDraws(game: Game): Draw[] {
  return decodeDrawFile(JSON.parse(readFileSync(join(ROOT, `lib/data/${game}.json`), "utf8")));
}

const GAMES: Game[] = ["ny-pick4", "ma-pick4", "ga-pick4", "md-pick4"];

for (const game of GAMES) {
  test(`${game}: index totals agree with meta.json`, () => {
    const draws = realDraws(game);
    const index = buildComboIndex([{ game, draws }], { stream: "all" });
    assert.equal(index.totalDraws, meta[game].count);
    assert.equal(index.earliest, meta[game].earliest);
    assert.equal(index.latest, meta[game].latest);

    let summed = 0;
    for (let c = 0; c < COMBO_UNIVERSE; c++) summed += index.counts[c];
    assert.equal(summed, index.totalDraws, "every draw lands in exactly one bucket");
  });

  test(`${game}: bucket counts match a brute-force recount`, () => {
    const draws = realDraws(game);
    const index = buildComboIndex([{ game, draws }], { stream: "all" });
    // Sample across the universe rather than all 10,000 — a brute-force
    // pass per combination would be 10,000 × 25,000 comparisons.
    for (const combo of [0, 1, 42, 999, 1234, 5000, 8999, 9999]) {
      const label = comboLabel(combo);
      const expected = draws.filter((d) => (d.digits ?? []).join("") === label).length;
      assert.equal(index.countOf(combo), expected, `${game} ${label}`);

      const occurrences = index.occurrences(combo);
      assert.equal(occurrences.length, expected);
      if (expected > 0) {
        const stats = index.stats(combo);
        assert.equal(stats.lastSeen, occurrences[0].date);
        assert.equal(stats.firstSeen, occurrences[occurrences.length - 1].date);
        // Occurrences must be newest-first.
        for (let i = 1; i < occurrences.length; i++) {
          assert.ok(occurrences[i].date <= occurrences[i - 1].date);
        }
      }
    }
  });
}

test("stream filtering on real data matches meta's per-stream counts", () => {
  const game: Game = "ga-pick4"; // three streams: midday, evening, night
  const draws = realDraws(game);
  for (const [stream, key] of [
    ["midday", "countMidday"],
    ["evening", "countEvening"],
    ["night", "countNight"],
  ] as const) {
    const index = buildComboIndex([{ game, draws }], { stream });
    assert.equal(index.totalDraws, meta[game][key], `${stream} count`);
  }
});

test("one state's history is never mixed into another's", () => {
  const ny = buildComboIndex([{ game: "ny-pick4" as Game, draws: realDraws("ny-pick4") }], { stream: "all" });
  const md = buildComboIndex([{ game: "md-pick4" as Game, draws: realDraws("md-pick4") }], { stream: "all" });
  assert.notEqual(ny.totalDraws, md.totalDraws);
  // Maryland's record starts in 2026 and New York's in 1981; a combination
  // whose NY count comes from the 1980s cannot appear in MD's totals.
  assert.ok(ny.totalDraws > md.totalDraws * 10);
  for (const combo of [42, 8999]) {
    assert.ok(ny.countOf(combo) >= 0 && md.countOf(combo) >= 0);
    assert.notEqual(
      `${ny.countOf(combo)}@${ny.earliest}`,
      `${md.countOf(combo)}@${md.earliest}`,
    );
  }
});

test("every real draw's digits round-trip through the universe mapping", () => {
  const draws = realDraws("ny-pick4");
  for (const d of draws) {
    const digits = d.digits ?? [];
    assert.equal(digits.length, 4);
    const combo = digits[0] * 1000 + digits[1] * 100 + digits[2] * 10 + digits[3];
    assert.equal(comboLabel(combo), digits.join(""));
  }
});

test("real cadence projects only days the game actually draws", () => {
  const game: Game = "ny-pick4";
  const index = buildComboIndex([{ game, draws: realDraws(game) }], { stream: "all" });
  const cadence = deriveCadence(index.all());
  assert.ok(cadence, "New York draws daily — a cadence must be derivable");

  const observed = new Set<string>();
  for (const d of index.recent(60)) observed.add(`${weekdayOf(d.date)}|${d.stream ?? "other"}`);

  const slots = nextDrawSlots(index.all(), 5, index.latest!);
  assert.ok(slots);
  assert.equal(slots!.length, 5);
  for (const slot of slots!) {
    assert.ok(
      observed.has(`${weekdayOf(slot.date)}|${slot.stream ?? "other"}`),
      `projected ${slot.date} ${slot.stream} is not a slot this game has been drawing`,
    );
    assert.ok(slot.date >= index.latest!);
  }
});

test("generation over a real dataset is deterministic and distinct", () => {
  const game: Game = "ny-pick4";
  const index = buildComboIndex([{ game, draws: realDraws(game) }], { stream: "all" });
  const window = analyzeWindow(index, 50);
  assert.equal(window.analysed, 50);

  const first = generateExploratorySets(index, window);
  const second = generateExploratorySets(index, window);
  assert.deepEqual(first.picks.map((p) => p.combo), second.picks.map((p) => p.combo));
  assert.equal(new Set(first.picks.map((p) => p.combo)).size, 5);
});

test("all-states mode sums the states and nothing else", () => {
  const games: Game[] = ["md-pick4", "fl-pick4"];
  const sources = games.map((game) => ({ game, draws: realDraws(game) }));
  const combined = buildComboIndex(sources, { stream: "all" });
  const separate = sources.map((s) => buildComboIndex([s], { stream: "all" }));

  assert.equal(combined.totalDraws, separate.reduce((sum, i) => sum + i.totalDraws, 0));
  for (const combo of [42, 1234, 8999]) {
    assert.equal(
      combined.countOf(combo),
      separate.reduce((sum, i) => sum + i.countOf(combo), 0),
    );
  }
});
