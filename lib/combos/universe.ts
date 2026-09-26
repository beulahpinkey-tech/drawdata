/**
 * The fixed 10,000-combination universe for four-digit games.
 *
 * Every ordered outcome 0000…9999 maps to exactly one integer index, and
 * the index IS the number: "0042" → 42 → "0042". That identity is what
 * lets the whole feature run on typed arrays (counts[8999]) instead of
 * string-keyed maps, and it is why the padding only ever happens at the
 * UI boundary — internally a combination is a number, never a string.
 *
 * Leading zeroes are the one thing that can silently break here, so
 * comboLabel() is the ONLY approved way to render a combination and
 * parseCombo() the only approved way to read one in.
 */

export const COMBO_POSITIONS = 4;
export const COMBO_UNIVERSE = 10_000;

/** 42 → "0042". The only place a combination becomes display text. */
export function comboLabel(index: number): string {
  return String(index).padStart(COMBO_POSITIONS, "0");
}

/** 42 → [0, 0, 4, 2]. Most-significant digit first. */
export function comboDigits(index: number): number[] {
  return [
    Math.floor(index / 1000) % 10,
    Math.floor(index / 100) % 10,
    Math.floor(index / 10) % 10,
    index % 10,
  ];
}

/** [0, 0, 4, 2] → 42. Returns null if the digits aren't four values 0–9. */
export function comboFromDigits(digits: readonly number[]): number | null {
  if (digits.length !== COMBO_POSITIONS) return null;
  let n = 0;
  for (const d of digits) {
    if (!Number.isInteger(d) || d < 0 || d > 9) return null;
    n = n * 10 + d;
  }
  return n;
}

/**
 * "0042" → 42. Accepts exactly four digit characters — no shorter input,
 * no sign, no whitespace beyond the edges — so "42" is rejected rather
 * than silently read as 0042. Callers that want to be lenient should pad
 * before calling.
 */
export function parseCombo(input: string): number | null {
  const s = input.trim();
  if (!/^\d{4}$/.test(s)) return null;
  return parseInt(s, 10);
}

/** A draw's digits → its bucket index, or null if it isn't a 4-digit row. */
export function comboOfDraw(digits: readonly number[] | undefined): number | null {
  if (!digits) return null;
  return comboFromDigits(digits);
}
