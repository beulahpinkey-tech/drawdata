/**
 * Scoring engine, schedule projection and saved-analysis comparison.
 *
 * The contract the UI depends on: identical inputs produce identical
 * picks, the five picks are distinct, and a projected draw date is never a
 * day the game doesn't draw.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildComboIndex, type ComboDraw } from "@/lib/combos/index-build";
import {
  ALGORITHM_VERSION,
  analyzeWindow,
  compareCombos,
  DEFAULT_WEIGHTS,
  generateExploratorySets,
} from "@/lib/combos/engine";
import { deriveCadence, drawAtSlot, nextDrawSlots, weekdayOf } from "@/lib/combos/schedule";
import { statusOf } from "@/lib/combos/storage";
import { comboLabel } from "@/lib/combos/universe";
import type { Draw, Game, Stream } from "@/lib/types";

const ALL = { stream: "all" } as const;
const GAME = "ny-pick4" as Game;

function draw(date: string, digits: string, stream: Stream = "evening"): Draw {
  return { game: "pick4", date, stream, digits: digits.split("").map(Number), index: 0 };
}

/** A deterministic pseudo-history: 300 draws, two streams a day. */
function history(): Draw[] {
  const out: Draw[] = [];
  let day = Date.UTC(2025, 0, 1);
  for (let i = 0; i < 150; i++) {
    const iso = new Date(day).toISOString().slice(0, 10);
    // Values chosen by a fixed arithmetic walk so the fixture is stable.
    out.push(draw(iso, String((i * 137) % 10_000).padStart(4, "0"), "midday"));
    out.push(draw(iso, String((i * 911) % 10_000).padStart(4, "0"), "evening"));
    day += 86_400_000;
  }
  return out;
}

const indexOf = (draws: Draw[]) => buildComboIndex([{ game: GAME, draws }], ALL);

test("generation is deterministic for the same inputs", () => {
  const index = indexOf(history());
  const window = analyzeWindow(index, 50);
  const a = generateExploratorySets(index, window);
  const b = generateExploratorySets(index, window);

  assert.deepEqual(
    a.picks.map((p) => p.combo),
    b.picks.map((p) => p.combo),
  );
  assert.deepEqual(a.picks.map((p) => p.score), b.picks.map((p) => p.score));
  assert.equal(a.algorithm, ALGORITHM_VERSION);
  assert.deepEqual(a.weights, DEFAULT_WEIGHTS);
});

test("generation produces exactly five distinct combinations", () => {
  const index = indexOf(history());
  const result = generateExploratorySets(index, analyzeWindow(index, 50));
  assert.equal(result.picks.length, 5);
  assert.equal(new Set(result.picks.map((p) => p.combo)).size, 5, "no duplicates among the five");
  for (const p of result.picks) {
    assert.ok(p.combo >= 0 && p.combo < 10_000);
    assert.equal(comboLabel(p.combo).length, 4);
  }
});

test("picks are ranked, and every pick carries its feature breakdown", () => {
  const index = indexOf(history());
  const result = generateExploratorySets(index, analyzeWindow(index, 50));
  const scores = result.picks.map((p) => p.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  for (const p of result.picks) {
    for (const key of Object.keys(DEFAULT_WEIGHTS)) {
      assert.equal(typeof p.features[key as keyof typeof DEFAULT_WEIGHTS], "number");
    }
  }
});

test("different weights change the ranking (the model is actually wired up)", () => {
  const index = indexOf(history());
  const window = analyzeWindow(index, 50);
  const base = generateExploratorySets(index, window);
  const dormancyOnly = generateExploratorySets(index, window, {
    weights: { ...DEFAULT_WEIGHTS, historical: 0, recentWindow: 0, positional: 0, recentPositional: 0, dormancy: 1 },
  });
  assert.notDeepEqual(
    base.picks.map((p) => p.combo),
    dormancyOnly.picks.map((p) => p.combo),
  );
});

test("provenance records everything needed to reproduce a run", () => {
  const index = indexOf(history());
  const window = analyzeWindow(index, 50);
  const { provenance } = generateExploratorySets(index, window);
  assert.equal(provenance.windowSize, 50);
  assert.equal(provenance.windowAnalysed, 50);
  assert.equal(provenance.windowDraws.length, 50);
  assert.match(provenance.windowDraws[0], /^\d{4}-\d{2}-\d{2}\|\w+\|\d+$/);
  assert.equal(provenance.totalDraws, 300);
  assert.deepEqual(provenance.games, [GAME]);
});

test("a thin dataset still generates five sets, from what exists", () => {
  const draws = [draw("2026-01-01", "0001"), draw("2026-01-02", "0002")];
  const index = indexOf(draws);
  const window = analyzeWindow(index, 50);
  const result = generateExploratorySets(index, window);
  assert.equal(window.analysed, 2);
  assert.equal(result.picks.length, 5);
  assert.equal(new Set(result.picks.map((p) => p.combo)).size, 5);
});

test("cadence is read off the history, not assumed", () => {
  const rows = history();
  const index = indexOf(rows);
  const cadence = deriveCadence(index.all());
  assert.ok(cadence);
  assert.deepEqual(cadence!.streams, ["midday", "evening"]);
  assert.equal(cadence!.slots.size, 14, "seven weekdays × two streams");
});

test("a game that only draws on certain weekdays never gets other days", () => {
  // Monday + Thursday evenings only, for 20 weeks.
  const rows: Draw[] = [];
  let day = Date.UTC(2026, 0, 5); // a Monday
  for (let week = 0; week < 20; week++) {
    rows.push(draw(new Date(day).toISOString().slice(0, 10), "1234"));
    rows.push(draw(new Date(day + 3 * 86_400_000).toISOString().slice(0, 10), "5678"));
    day += 7 * 86_400_000;
  }
  const index = indexOf(rows);
  const slots = nextDrawSlots(index.all(), 5, "2026-05-20");
  assert.ok(slots);
  for (const slot of slots!) {
    assert.ok([1, 4].includes(weekdayOf(slot.date)), `${slot.date} is not a Monday or Thursday`);
  }
  assert.equal(slots!.length, 5);
});

test("projected slots are strictly in the future and in order", () => {
  const index = indexOf(history());
  const last = index.latest!;
  const slots = nextDrawSlots(index.all(), 5, last);
  assert.ok(slots);
  assert.equal(slots!.length, 5);
  for (const slot of slots!) assert.ok(slot.date >= last);
  const keys = slots!.map((s) => `${s.date}|${s.stream}`);
  assert.equal(new Set(keys).size, 5, "no slot is offered twice");
  assert.deepEqual([...slots!].map((s) => s.date), [...slots!].map((s) => s.date).sort());
  // The last recorded draw was that day's evening, so the next slot is the
  // following midday — not "today + 1" with an arbitrary stream.
  assert.equal(slots![0].stream, "midday");
  assert.ok(slots![0].date > last);
});

test("no cadence can be established from almost no history", () => {
  const index = indexOf([draw("2026-01-01", "1234"), draw("2026-02-01", "5678")]);
  assert.equal(deriveCadence(index.all()), null);
  assert.equal(nextDrawSlots(index.all(), 5, "2026-02-02"), null);
});

test("positional comparison against a real result", () => {
  const exact = compareCombos(8999, 8999);
  assert.equal(exact.exact, true);
  assert.equal(exact.positionMatches, 4);

  const partial = compareCombos(8999, 8949);
  assert.equal(partial.exact, false);
  assert.deepEqual(partial.positions, [true, true, false, true]);
  assert.equal(partial.positionMatches, 3);

  const none = compareCombos(8999, 1234);
  assert.equal(none.positionMatches, 0);
});

test("a saved pick reports upcoming until the real draw exists", () => {
  const rows: ComboDraw[] = indexOf([draw("2026-09-20", "1234", "evening")]).all() as ComboDraw[];
  const pick = { combo: 8999, score: 1, slot: { date: "2026-09-21", stream: "midday" as Stream } };
  const status = statusOf(pick, rows);
  assert.equal(status.state, "upcoming");
});

test("a saved pick is graded once the real draw lands, without touching history", () => {
  const draws = [draw("2026-09-20", "1234", "evening"), draw("2026-09-21", "8999", "midday")];
  const rows = indexOf(draws).all() as ComboDraw[];
  const before = rows.map((r) => `${r.date}|${r.combo}`);

  const hit = statusOf({ combo: 8999, score: 1, slot: { date: "2026-09-21", stream: "midday" } }, rows);
  assert.equal(hit.state, "result");
  if (hit.state === "result") {
    assert.equal(hit.actual, 8999);
    assert.equal(hit.exact, true);
    assert.equal(hit.positionMatches, 4);
  }

  const miss = statusOf({ combo: 8949, score: 1, slot: { date: "2026-09-21", stream: "midday" } }, rows);
  assert.equal(miss.state, "result");
  if (miss.state === "result") {
    assert.equal(miss.exact, false);
    assert.deepEqual(miss.positions, [true, true, false, true]);
  }

  assert.deepEqual(rows.map((r) => `${r.date}|${r.combo}`), before, "comparison must not mutate draws");
});

test("a pick saved without a schedule says so instead of inventing a date", () => {
  const rows = indexOf([draw("2026-09-20", "1234")]).all() as ComboDraw[];
  assert.equal(statusOf({ combo: 1, score: 0, slot: null }, rows).state, "no-schedule");
});

test("drawAtSlot matches on date and stream together", () => {
  const rows = indexOf([
    draw("2026-09-21", "1111", "midday"),
    draw("2026-09-21", "2222", "evening"),
  ]).all() as ComboDraw[];
  assert.equal(drawAtSlot(rows, { date: "2026-09-21", stream: "midday" })?.combo, 1111);
  assert.equal(drawAtSlot(rows, { date: "2026-09-21", stream: "evening" })?.combo, 2222);
  assert.equal(drawAtSlot(rows, { date: "2026-09-21", stream: "night" }), null);
  assert.equal(drawAtSlot(rows, { date: "2026-09-22", stream: "midday" }), null);
});
