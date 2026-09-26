/**
 * The mapping tests. Leading zeroes are the failure mode this feature is
 * most likely to regress on — every one of these asserts a four-character
 * string, never a number that merely prints right today.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMBO_UNIVERSE,
  comboDigits,
  comboFromDigits,
  comboLabel,
  comboOfDraw,
  parseCombo,
} from "@/lib/combos/universe";

test("the universe is exactly 10,000 ordered outcomes", () => {
  assert.equal(COMBO_UNIVERSE, 10_000);
});

test("index → label preserves leading zeroes", () => {
  assert.equal(comboLabel(0), "0000");
  assert.equal(comboLabel(1), "0001");
  assert.equal(comboLabel(2), "0002");
  assert.equal(comboLabel(42), "0042");
  assert.equal(comboLabel(47), "0047");
  assert.equal(comboLabel(99), "0099");
  assert.equal(comboLabel(382), "0382");
  assert.equal(comboLabel(999), "0999");
  assert.equal(comboLabel(8999), "8999");
  assert.equal(comboLabel(9998), "9998");
  assert.equal(comboLabel(9999), "9999");
});

test("every label in the universe is four characters", () => {
  for (let i = 0; i < COMBO_UNIVERSE; i++) {
    assert.equal(comboLabel(i).length, 4, `index ${i} did not render as four characters`);
  }
});

test("label → index round-trips across the whole universe", () => {
  for (let i = 0; i < COMBO_UNIVERSE; i++) {
    assert.equal(parseCombo(comboLabel(i)), i);
  }
});

test("index → digits → index round-trips (reel ↔ digit-reel sync)", () => {
  for (let i = 0; i < COMBO_UNIVERSE; i++) {
    assert.equal(comboFromDigits(comboDigits(i)), i);
  }
});

test("digits are most-significant first", () => {
  assert.deepEqual(comboDigits(8999), [8, 9, 9, 9]);
  assert.deepEqual(comboDigits(2458), [2, 4, 5, 8]);
  assert.deepEqual(comboDigits(42), [0, 0, 4, 2]);
  assert.deepEqual(comboDigits(0), [0, 0, 0, 0]);
});

test("digit reels build the combination the big reel shows", () => {
  assert.equal(comboFromDigits([8, 9, 9, 9]), 8999);
  assert.equal(comboFromDigits([0, 0, 4, 2]), 42);
  assert.equal(comboLabel(comboFromDigits([0, 0, 4, 2])!), "0042");
});

test("parseCombo requires exactly four digits and keeps 0042 as 0042", () => {
  assert.equal(parseCombo("0042"), 42);
  assert.equal(comboLabel(parseCombo("0042")!), "0042");
  assert.equal(parseCombo("42"), null, "short input must not be read as 0042");
  assert.equal(parseCombo("00042"), null);
  assert.equal(parseCombo("12a4"), null);
  assert.equal(parseCombo(""), null);
  assert.equal(parseCombo("-123"), null);
  assert.equal(parseCombo(" 0042 "), 42, "surrounding whitespace is trimmed");
});

test("comboFromDigits rejects malformed input", () => {
  assert.equal(comboFromDigits([1, 2, 3]), null);
  assert.equal(comboFromDigits([1, 2, 3, 4, 5]), null);
  assert.equal(comboFromDigits([1, 2, 3, 10]), null);
  assert.equal(comboFromDigits([1, 2, 3, -1]), null);
  assert.equal(comboFromDigits([1, 2, 3, 4.5]), null);
});

test("comboOfDraw maps a draw's digits into its bucket", () => {
  assert.equal(comboOfDraw([8, 9, 9, 9]), 8999);
  assert.equal(comboOfDraw([0, 0, 0, 1]), 1);
  assert.equal(comboOfDraw([1, 2, 3]), null, "three-digit rows have no bucket here");
  assert.equal(comboOfDraw(undefined), null);
});
