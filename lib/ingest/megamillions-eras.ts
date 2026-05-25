import type { PowerballEra } from "../types";

// Mega Millions matrix history (1996 The Big Game → present).
// Only the eras that fall within our dataset's date range (2010 onward)
// will actually be observed, but we keep the full table for completeness.
// Reuses the PowerballEra shape since structure is identical (5 whites + 1 special).
export const MEGAMILLIONS_ERAS: PowerballEra[] = [
  {
    id: "1996-09-06",
    start: "1996-09-06",
    end: "2002-05-17",
    whitePool: 50,
    redPool: 25,
    label: "5/50 + 1/25 (1996–2002, “The Big Game”)",
  },
  {
    id: "2002-05-17",
    start: "2002-05-17",
    end: "2005-06-22",
    whitePool: 52,
    redPool: 52,
    label: "5/52 + 1/52 (2002–2005)",
  },
  {
    id: "2005-06-22",
    start: "2005-06-22",
    end: "2013-10-22",
    whitePool: 56,
    redPool: 46,
    label: "5/56 + 1/46 (2005–2013)",
  },
  {
    id: "2013-10-22",
    start: "2013-10-22",
    end: "2017-10-31",
    whitePool: 75,
    redPool: 15,
    label: "5/75 + 1/15 (2013–2017)",
  },
  {
    id: "2017-10-31",
    start: "2017-10-31",
    end: "2025-04-08",
    whitePool: 70,
    redPool: 25,
    label: "5/70 + 1/25 (2017–April 2025)",
  },
  {
    id: "2025-04-08",
    start: "2025-04-08",
    end: null,
    whitePool: 70,
    redPool: 24,
    label: "5/70 + 1/24 (April 2025–present)",
  },
];

export const CURRENT_MM_ERA = MEGAMILLIONS_ERAS[MEGAMILLIONS_ERAS.length - 1];

export function mmEraFor(dateIso: string): PowerballEra {
  for (const e of MEGAMILLIONS_ERAS) {
    if (dateIso >= e.start && (e.end === null || dateIso < e.end)) return e;
  }
  return MEGAMILLIONS_ERAS[0];
}
