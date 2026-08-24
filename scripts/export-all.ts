/**
 * Export every game's draws into one Excel-friendly CSV plus per-game
 * copies. The combined file uses a common schema with a `game` column
 * so you can filter / pivot in Excel:
 *
 *   game,state,date,stream,n1,n2,n3,n4,n5,special
 *   wi-pick3,WI,2026-06-02,Midday,5,4,1,,,
 *   wi-pick4,WI,2026-06-02,Midday,5,4,1,2,,
 *   powerball,US,2026-06-01,,47,42,57,2,58,14
 *
 * Run:  npm run export
 *
 * Writes:
 *   exports/all-draws.csv          (single combined sheet)
 *   exports/by-game/<slug>.csv     (one per game, native schema)
 *   exports/README.md              (notes on schema + counts)
 *
 * Hard budget caps (loud failures rather than silent disk-fill):
 *   - Any single file > 25 MB → error
 *   - Total exports/ > 100 MB  → error
 *   - More than 1.04M rows in the combined CSV → error
 *     (Excel's hard sheet limit is 1,048,576 rows; we cap at 1M for safety)
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { decodeDrawFile } from "../lib/draw-codec";

const ROOT = process.cwd();
const DATA = join(ROOT, "lib", "data");
const OUT = join(ROOT, "exports");
const PER_GAME = join(OUT, "by-game");

mkdirSync(PER_GAME, { recursive: true });

const PICKS = ["wi-pick3", "wi-pick4", "pa-pick3", "pa-pick4", "nj-pick3", "nj-pick4", "tx-pick3", "tx-pick4", "nc-pick3", "nc-pick4"];
const BALLS = ["powerball", "megamillions"];

const STATE_FROM_SLUG: Record<string, string> = {
  "wi-pick3": "WI",
  "wi-pick4": "WI",
  "pa-pick3": "PA",
  "pa-pick4": "PA",
  "nj-pick3": "NJ",
  "nj-pick4": "NJ",
  "tx-pick3": "TX",
  "tx-pick4": "TX",
  "nc-pick3": "NC",
  "nc-pick4": "NC",
  powerball: "US",
  megamillions: "US",
};

type Draw = {
  game?: string;
  date: string;
  stream?: string;
  digits?: number[];
  whites?: number[];
  special?: number;
  era?: string;
};

// Budgets
const MAX_FILE_BYTES = 25 * 1024 * 1024;   // 25 MB per file
const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB across exports/
const MAX_COMBINED_ROWS = 1_000_000;       // safe margin below Excel's 1,048,576

function loadDraws(slug: string): Draw[] {
  const file = JSON.parse(readFileSync(join(DATA, `${slug}.json`), "utf8"));
  return decodeDrawFile(file);
}

function escapeCsv(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowFor(slug: string, d: Draw): string[] {
  const state = STATE_FROM_SLUG[slug];
  const positions = slug.endsWith("pick3") ? 3 : slug.endsWith("pick4") ? 4 : 0;
  // Common 6 number slots: n1..n5 + special. Pad with blanks for shape mismatch.
  let n1 = "", n2 = "", n3 = "", n4 = "", n5 = "", special = "";
  if (positions === 3 && d.digits) {
    [n1, n2, n3] = d.digits.map(String);
  } else if (positions === 4 && d.digits) {
    [n1, n2, n3, n4] = d.digits.map(String);
  } else if (d.whites) {
    [n1, n2, n3, n4, n5] = d.whites.map(String);
    if (d.special != null) special = String(d.special);
  }
  return [
    slug,
    state,
    d.date,
    d.stream ?? "",
    n1,
    n2,
    n3,
    n4,
    n5,
    special,
  ];
}

function writeCombined(rows: string[][]) {
  if (rows.length > MAX_COMBINED_ROWS) {
    throw new Error(
      `Combined export has ${rows.length.toLocaleString()} rows, over the ` +
        `${MAX_COMBINED_ROWS.toLocaleString()} cap (Excel sheet limit + safety margin). ` +
        `Open exports/by-game/ for per-game files instead, or raise the cap deliberately.`,
    );
  }
  const header = ["game", "state", "date", "stream", "n1", "n2", "n3", "n4", "n5", "special"];
  const lines = [header.join(",")];
  for (const r of rows) lines.push(r.map(escapeCsv).join(","));
  const text = lines.join("\n") + "\n";
  const path = join(OUT, "all-draws.csv");
  writeFileSync(path, text);
  const size = statSync(path).size;
  if (size > MAX_FILE_BYTES) {
    throw new Error(
      `exports/all-draws.csv is ${(size / 1024 / 1024).toFixed(1)} MB — ` +
        `over the ${MAX_FILE_BYTES / 1024 / 1024} MB cap. Rotate older draws into archive ` +
        `or raise the cap deliberately.`,
    );
  }
  return { path, size, rows: rows.length };
}

function writePerGame(slug: string, draws: Draw[]) {
  const positions = slug.endsWith("pick3") ? 3 : slug.endsWith("pick4") ? 4 : 0;
  const isBall = positions === 0;
  const header = isBall
    ? ["date", "w1", "w2", "w3", "w4", "w5", "special", "era"].join(",")
    : ["date", "stream", ...Array.from({ length: positions }, (_, i) => `d${i + 1}`)].join(",");
  const lines = [header];
  for (const d of draws) {
    if (isBall && d.whites && d.special != null) {
      lines.push(`${d.date},${d.whites.join(",")},${d.special},${d.era ?? ""}`);
    } else if (!isBall && d.digits) {
      lines.push(`${d.date},${d.stream ?? ""},${d.digits.join(",")}`);
    }
  }
  const path = join(PER_GAME, `${slug}.csv`);
  writeFileSync(path, lines.join("\n") + "\n");
  const size = statSync(path).size;
  if (size > MAX_FILE_BYTES) {
    throw new Error(`exports/by-game/${slug}.csv is ${(size / 1024 / 1024).toFixed(1)} MB — over cap`);
  }
  return { path, size, rows: draws.length };
}

function totalSize(dir: string): number {
  let n = 0;
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) n += totalSize(p);
    else n += statSync(p).size;
  }
  return n;
}

function main() {
  // Clean exports/ from any previous run so we don't accidentally
  // accumulate dated files that would silently fill the disk.
  try {
    rmSync(OUT, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  mkdirSync(PER_GAME, { recursive: true });

  console.log("Building per-game CSVs …");
  const perGameStats: { slug: string; rows: number; size: number }[] = [];
  const combinedRows: string[][] = [];

  for (const slug of [...PICKS, ...BALLS]) {
    const draws = loadDraws(slug);
    const r = writePerGame(slug, draws);
    perGameStats.push({ slug, rows: r.rows, size: r.size });
    console.log(`  ${slug.padEnd(14)} ${r.rows.toLocaleString().padStart(7)} rows  ${(r.size / 1024).toFixed(1)} KB`);
    for (const d of draws) combinedRows.push(rowFor(slug, d));
  }

  console.log("\nBuilding combined all-draws.csv …");
  const combined = writeCombined(combinedRows);
  console.log(`  all-draws.csv  ${combined.rows.toLocaleString().padStart(7)} rows  ${(combined.size / 1024 / 1024).toFixed(2)} MB`);

  // README so opening the folder by itself isn't mysterious.
  const readme =
    `# DrawData exports\n\n` +
    `Generated ${new Date().toISOString()}\n\n` +
    `## Files\n\n` +
    `- \`all-draws.csv\` — single combined sheet, ${combined.rows.toLocaleString()} rows. ` +
    `Common schema: \`game,state,date,stream,n1..n5,special\`. Opens directly in Excel.\n` +
    `- \`by-game/<slug>.csv\` — per-game files with native schema (3 digits for pick3, ` +
    `5 whites + special for ball games).\n\n` +
    `## Counts\n\n` +
    perGameStats.map((s) => `- **${s.slug}** — ${s.rows.toLocaleString()} draws`).join("\n") +
    `\n\n## Notes\n\n` +
    `- Ball-game rows in the combined file use \`stream = ""\` since they don't have midday/evening splits.\n` +
    `- Pick-game rows leave \`n4\` (and \`n5\`, \`special\`) blank when not applicable.\n` +
    `- Numbers stay as strings in the CSV — Excel auto-converts on open.\n`;
  writeFileSync(join(OUT, "README.md"), readme);

  const total = totalSize(OUT);
  if (total > MAX_TOTAL_BYTES) {
    throw new Error(
      `exports/ is ${(total / 1024 / 1024).toFixed(1)} MB — over the ` +
        `${MAX_TOTAL_BYTES / 1024 / 1024} MB cap. Something blew up — investigate before committing.`,
    );
  }
  console.log(`\nTotal exports/: ${(total / 1024 / 1024).toFixed(2)} MB`);
  console.log(`OK. Files in: ${OUT}`);
}

main();
