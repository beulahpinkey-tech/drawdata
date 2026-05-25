import type { PowerballEra } from "../types";

// Historical Powerball matrix changes (US Powerball / Lotto America lineage).
// Sources of truth for the eras commonly cited: pool sizes shifted on these dates.
// We tag each draw with its era so cross-number stats can be filtered to the
// current 5/69 + 1/26 format (the meaningful comparison for today's player).
export const POWERBALL_ERAS: PowerballEra[] = [
  {
    id: "1992-04-22",
    start: "1992-04-22",
    end: "1997-11-05",
    whitePool: 45,
    redPool: 45,
    label: "5/45 + 1/45 (1992–1997)",
  },
  {
    id: "1997-11-05",
    start: "1997-11-05",
    end: "2002-10-09",
    whitePool: 49,
    redPool: 42,
    label: "5/49 + 1/42 (1997–2002)",
  },
  {
    id: "2002-10-09",
    start: "2002-10-09",
    end: "2005-08-31",
    whitePool: 53,
    redPool: 42,
    label: "5/53 + 1/42 (2002–2005)",
  },
  {
    id: "2005-08-31",
    start: "2005-08-31",
    end: "2009-01-07",
    whitePool: 55,
    redPool: 42,
    label: "5/55 + 1/42 (2005–2009)",
  },
  {
    id: "2009-01-07",
    start: "2009-01-07",
    end: "2012-01-15",
    whitePool: 59,
    redPool: 39,
    label: "5/59 + 1/39 (2009–2012)",
  },
  {
    id: "2012-01-15",
    start: "2012-01-15",
    end: "2015-10-07",
    whitePool: 59,
    redPool: 35,
    label: "5/59 + 1/35 (2012–2015)",
  },
  {
    id: "2015-10-07",
    start: "2015-10-07",
    end: null,
    whitePool: 69,
    redPool: 26,
    label: "5/69 + 1/26 (2015–present)",
  },
];

export const CURRENT_PB_ERA = POWERBALL_ERAS[POWERBALL_ERAS.length - 1];

export function eraFor(dateIso: string): PowerballEra {
  for (const e of POWERBALL_ERAS) {
    if (dateIso >= e.start && (e.end === null || dateIso < e.end)) return e;
  }
  return POWERBALL_ERAS[0];
}
