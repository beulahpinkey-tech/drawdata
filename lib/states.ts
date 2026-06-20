// US state daily-digit-game catalog.
// Game names are sourced from each state lottery's public website. Some may
// drift over time — the owner should verify before marking a state `available`.
//
// Only Wisconsin is currently `available` (we have its full draw CSV in data/wi/).
// Every other state is `waitlist`; selecting it opens the waitlist modal.

export type StateGame = {
  state: string;
  abbr: string;
  pick3Name: string;
  pick4Name?: string;
  status: "available" | "waitlist";
};

export const STATE_GAMES: StateGame[] = [
  { state: "Wisconsin", abbr: "WI", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "available" },
  { state: "Pennsylvania", abbr: "PA", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "available" },
  { state: "New Jersey", abbr: "NJ", pick3Name: "Pick-3", pick4Name: "Pick-4", status: "available" },

  { state: "California", abbr: "CA", pick3Name: "Daily 3", pick4Name: "Daily 4", status: "waitlist" },
  { state: "Texas", abbr: "TX", pick3Name: "Pick 3", pick4Name: "Daily 4", status: "available" },
  // New York hidden — Numbers / Win 4 not offered yet
  // { state: "New York", abbr: "NY", pick3Name: "Numbers", pick4Name: "Win 4", status: "waitlist" },
  { state: "Florida", abbr: "FL", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "available" },
  { state: "Georgia", abbr: "GA", pick3Name: "Cash 3", pick4Name: "Cash 4", status: "waitlist" },
  { state: "Illinois", abbr: "IL", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "waitlist" },
  { state: "Michigan", abbr: "MI", pick3Name: "Daily 3", pick4Name: "Daily 4", status: "waitlist" },
  { state: "Ohio", abbr: "OH", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "waitlist" },
  { state: "New Jersey", abbr: "NJ", pick3Name: "Pick-3", pick4Name: "Pick-4", status: "waitlist" },
  { state: "Maryland", abbr: "MD", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "waitlist" },
  { state: "Virginia", abbr: "VA", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "waitlist" },
  { state: "North Carolina", abbr: "NC", pick3Name: "Carolina Pick 3", pick4Name: "Carolina Pick 4", status: "available" },
  { state: "South Carolina", abbr: "SC", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "waitlist" },
  { state: "Tennessee", abbr: "TN", pick3Name: "Cash 3", pick4Name: "Cash 4", status: "waitlist" },
  { state: "Connecticut", abbr: "CT", pick3Name: "Play 3", pick4Name: "Play 4", status: "waitlist" },
  { state: "Indiana", abbr: "IN", pick3Name: "Daily 3", pick4Name: "Daily 4", status: "waitlist" },
  { state: "Missouri", abbr: "MO", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "waitlist" },
  { state: "Kentucky", abbr: "KY", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "waitlist" },
  { state: "Louisiana", abbr: "LA", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "waitlist" },
  { state: "Iowa", abbr: "IA", pick3Name: "Pick 3", pick4Name: "Pick 4", status: "waitlist" },
  { state: "Delaware", abbr: "DE", pick3Name: "Play 3", pick4Name: "Play 4", status: "waitlist" },
  { state: "District of Columbia", abbr: "DC", pick3Name: "DC-3", pick4Name: "DC-4", status: "waitlist" },
  { state: "West Virginia", abbr: "WV", pick3Name: "Daily 3", pick4Name: "Daily 4", status: "waitlist" },
  { state: "Arkansas", abbr: "AR", pick3Name: "Cash 3", pick4Name: "Cash 4", status: "waitlist" },
  // Tri-State (Maine, New Hampshire, Vermont) — shared lottery
  { state: "Maine", abbr: "ME", pick3Name: "Tri-State Pick 3", pick4Name: "Tri-State Pick 4", status: "waitlist" },
  { state: "New Hampshire", abbr: "NH", pick3Name: "Tri-State Pick 3", pick4Name: "Tri-State Pick 4", status: "waitlist" },
  { state: "Vermont", abbr: "VT", pick3Name: "Tri-State Pick 3", pick4Name: "Tri-State Pick 4", status: "waitlist" },
  { state: "Massachusetts", abbr: "MA", pick3Name: "Numbers 3", pick4Name: "Numbers 4", status: "waitlist" },
  { state: "Rhode Island", abbr: "RI", pick3Name: "Numbers", status: "waitlist" },
  { state: "New Mexico", abbr: "NM", pick3Name: "Pick 3", status: "waitlist" },
  { state: "Oklahoma", abbr: "OK", pick3Name: "Pick 3", status: "waitlist" },
  { state: "Kansas", abbr: "KS", pick3Name: "Pick 3", status: "waitlist" },
  { state: "Colorado", abbr: "CO", pick3Name: "Pick 3", status: "waitlist" },
  { state: "Arizona", abbr: "AZ", pick3Name: "Pick 3", status: "waitlist" },
  { state: "Minnesota", abbr: "MN", pick3Name: "Daily 3", status: "waitlist" },
  { state: "Nebraska", abbr: "NE", pick3Name: "Pick 3", status: "waitlist" },
  { state: "Idaho", abbr: "ID", pick3Name: "Pick 3", status: "waitlist" },
  { state: "Montana", abbr: "MT", pick3Name: "Montana Cash", status: "waitlist" },
  { state: "Oregon", abbr: "OR", pick3Name: "Pick 4", status: "waitlist" },
  { state: "Washington", abbr: "WA", pick3Name: "Daily Game", status: "available" },
  { state: "Mississippi", abbr: "MS", pick3Name: "Cash 3", pick4Name: "Cash 4", status: "waitlist" },
];

export const stateByAbbr = (abbr: string) =>
  STATE_GAMES.find((s) => s.abbr.toLowerCase() === abbr.toLowerCase()) ?? null;
