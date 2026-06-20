// Orphan / internal-link guard for the programmatic page engine.
//
// What it checks (the orphan risks the results archives introduce):
//   1. Every game hub page (app/[game]/page.tsx) links to its /results spoke.
//   2. Every game produces at least one non-empty results bucket, so no
//      results/year/month page would render as a thin shell.
//   3. The month sequence per game is a contiguous prev/next chain (the
//      archive nav can't strand a month with a dead link).
//
// What it does NOT check: it doesn't headless-crawl rendered HTML. It's a
// build-time structural guard, not a full link checker — kept honest here
// so a green run isn't mistaken for "every <a> on every page resolves".

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_GAMES } from "../lib/types";
import { yearBuckets, monthSequence } from "../lib/results";

let failures = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};

// 1. Hub → /results link present.
const hubSrc = readFileSync(join(process.cwd(), "app", "[game]", "page.tsx"), "utf8");
check(
  "hub overview links to results spoke",
  /\["results",/.test(hubSrc),
  '(expected ["results", …] in "Where to go next")',
);

// 2 + 3. Per-game bucket non-emptiness and contiguous month chain.
for (const game of ALL_GAMES) {
  const years = yearBuckets(game);
  const months = monthSequence(game);

  check(`[${game}] has ≥1 results year bucket`, years.length > 0, `${years.length} years`);
  check(`[${game}] has ≥1 results month bucket`, months.length > 0, `${months.length} months`);

  // Every year's months sum to that year's count (no draw stranded outside a month bucket).
  const okYears = years.every((y) => y.months.reduce((s, m) => s + m.count, 0) === y.count);
  check(`[${game}] year counts equal sum of month counts`, okYears);

  // Month sequence is chronologically ordered and unique (prev/next safe).
  let monotonic = true;
  for (let i = 1; i < months.length; i++) {
    const a = `${months[i - 1].year}-${months[i - 1].month}`;
    const b = `${months[i].year}-${months[i].month}`;
    if (a >= b) { monotonic = false; break; }
  }
  check(`[${game}] month sequence is strictly increasing`, monotonic);
}

if (failures > 0) {
  console.error(`\n${failures} link-graph check(s) failed.`);
  process.exit(1);
}
console.log("\nAll link-graph checks passed.");
