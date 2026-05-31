import type { Draw, ParseReport, Stream, Game } from "../types";
import { eraFor } from "./eras";
import { mmEraFor } from "./megamillions-eras";

function parseCsv(raw: string): string[][] {
  // Minimal CSV parser handling quoted fields, commas inside quotes, CRLF.
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inQuotes) {
      if (c === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else if (c === "\r") {
        // ignore, handled by \n
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}

function ddmmyyyyToIso(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function yyyymmddToIso(s: string): string | null {
  const m = s.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/**
 * Accepts either DD-MM-YYYY or YYYY-MM-DD. The Wisconsin Lottery exports use
 * DD-MM-YYYY for newer Pick/Powerball files and YYYY-MM-DD for older ones.
 */
function anyDateToIso(s: string): string | null {
  return ddmmyyyyToIso(s) ?? yyyymmddToIso(s);
}

function normStream(s: string | undefined): Stream {
  const v = (s ?? "").trim().toLowerCase();
  if (v === "midday") return "midday";
  if (v === "evening") return "evening";
  return "other";
}

function parseDigit(s: string | undefined): number | null {
  const v = (s ?? "").trim();
  if (v === "") return null;
  if (!/^\d+$/.test(v)) return null;
  const n = parseInt(v, 10);
  if (n < 0 || n > 9) return null;
  return n;
}

function parseInt1to99(s: string | undefined): number | null {
  const v = (s ?? "").trim();
  if (v === "" || !/^\d+$/.test(v)) return null;
  const n = parseInt(v, 10);
  if (n < 1 || n > 99) return null;
  return n;
}

function bump(rec: Record<string, number>, key: string) {
  rec[key] = (rec[key] ?? 0) + 1;
}

export function parsePick(
  raw: string,
  game: "pick3" | "pick4",
): { draws: Draw[]; report: ParseReport } {
  const positions = game === "pick3" ? 3 : 4;
  const rows = parseCsv(raw);
  const draws: Draw[] = [];
  const skippedReasons: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    if (!row || row.length === 0) continue;
    // Skip title/header rows that don't lead with a date.
    if (row.length === 1 && row[0].trim() === "") continue;
    const first = (row[0] ?? "").trim();
    if (first === "" || first.toLowerCase().startsWith("draw date")) continue;
    if (/^[a-z]/i.test(first) && !/\d{1,2}-\d{1,2}-\d{4}/.test(first)) continue;

    total++;
    const iso = ddmmyyyyToIso(first);
    if (!iso) {
      bump(skippedReasons, "bad-date");
      continue;
    }
    const stream = normStream(row[1]);
    const rawDigits = row.slice(2, 2 + positions);
    if (rawDigits.length !== positions) {
      bump(skippedReasons, "missing-cols");
      continue;
    }
    const digits = rawDigits.map(parseDigit);
    if (digits.some((d) => d === null)) {
      bump(skippedReasons, "missing-digit");
      continue;
    }
    draws.push({
      game,
      date: iso,
      stream,
      digits: digits as number[],
      index: 0, // assigned after sort
    });
  }
  // chronological: oldest first
  draws.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    // midday before evening for same date
    const so = (s?: Stream) => (s === "midday" ? 0 : s === "evening" ? 1 : 2);
    return so(a.stream) - so(b.stream);
  });
  draws.forEach((d, i) => (d.index = i));
  const dateRange: [string, string] =
    draws.length > 0
      ? [draws[0].date, draws[draws.length - 1].date]
      : ["", ""];
  return {
    draws,
    report: {
      game,
      totalRows: total,
      parsed: draws.length,
      skipped: total - draws.length,
      skippedReasons,
      dateRange,
    },
  };
}

export function parseMegaMillions(raw: string): {
  draws: Draw[];
  report: ParseReport;
} {
  // Format sanity check. The "Numerical Order" export from the WI Lottery
  // strips the Mega Ball column entirely — every row ends up with just
  // 5 white numbers, and the parser would silently skip every row as
  // "missing-num". Fail loudly instead so the operator immediately knows
  // they downloaded the wrong export.
  if (/numerical\s*order/i.test(raw.slice(0, 200))) {
    throw new Error(
      "megamillions.csv looks like the WI Lottery's 'Numerical Order' " +
        "export — that variant omits the Mega Ball column. Re-download " +
        "the 'Order Drawn' export (or pull from megamillions.com directly), " +
        "rename to megamillions.csv, and re-run.",
    );
  }
  const rows = parseCsv(raw);
  const draws: Draw[] = [];
  const skippedReasons: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    if (!row || row.length === 0) continue;
    const first = (row[0] ?? "").trim();
    if (first === "") continue;
    if (/^[a-z]/i.test(first) && !/\d{1,2}-\d{1,2}-\d{4}|\d{4}-\d{1,2}-\d{1,2}/.test(first)) continue;

    total++;
    const iso = anyDateToIso(first);
    if (!iso) {
      bump(skippedReasons, "bad-date");
      continue;
    }
    const whites = [1, 2, 3, 4, 5].map((i) => parseInt1to99(row[i]));
    const special = parseInt1to99(row[6]);
    if (whites.some((w) => w === null) || special === null) {
      bump(skippedReasons, "missing-num");
      continue;
    }
    const sortedWhites = (whites as number[]).slice().sort((a, b) => a - b);
    const era = mmEraFor(iso);
    draws.push({
      game: "megamillions",
      date: iso,
      whites: sortedWhites,
      special,
      era: era.id,
      index: 0,
    });
  }
  draws.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  draws.forEach((d, i) => (d.index = i));
  const dateRange: [string, string] =
    draws.length > 0 ? [draws[0].date, draws[draws.length - 1].date] : ["", ""];
  return {
    draws,
    report: {
      game: "megamillions",
      totalRows: total,
      parsed: draws.length,
      skipped: total - draws.length,
      skippedReasons,
      dateRange,
    },
  };
}

export function parsePowerball(raw: string): {
  draws: Draw[];
  report: ParseReport;
} {
  const rows = parseCsv(raw);
  const draws: Draw[] = [];
  const skippedReasons: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    if (!row || row.length === 0) continue;
    const first = (row[0] ?? "").trim();
    if (first === "") continue;
    // header / title detection
    if (first.toLowerCase().startsWith("wisconsin")) continue;
    if (first.toLowerCase().startsWith("draw date")) continue;

    total++;
    const iso = anyDateToIso(first);
    if (!iso) {
      bump(skippedReasons, "bad-date");
      continue;
    }
    const whites = [1, 2, 3, 4, 5].map((i) => parseInt1to99(row[i]));
    const special = parseInt1to99(row[6]);
    if (whites.some((w) => w === null) || special === null) {
      bump(skippedReasons, "missing-num");
      continue;
    }
    const sortedWhites = (whites as number[]).slice().sort((a, b) => a - b);
    const era = eraFor(iso);
    draws.push({
      game: "powerball",
      date: iso,
      whites: sortedWhites,
      special,
      era: era.id,
      index: 0,
    });
  }
  draws.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  draws.forEach((d, i) => (d.index = i));
  const dateRange: [string, string] =
    draws.length > 0
      ? [draws[0].date, draws[draws.length - 1].date]
      : ["", ""];
  return {
    draws,
    report: {
      game: "powerball",
      totalRows: total,
      parsed: draws.length,
      skipped: total - draws.length,
      skippedReasons,
      dateRange,
    },
  };
}
