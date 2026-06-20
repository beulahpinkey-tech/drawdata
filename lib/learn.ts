// Q&A / knowledge pages (/learn/{slug}). Each page answers a real search
// query honestly, backed by our own data, and funnels to the analytic
// page that substantiates the answer. Two kinds:
//
//   • Data-driven, per-game ("most-common-powerball-numbers",
//     "overdue-pa-pick3-numbers") — the intro and FAQ answers embed
//     actual current numbers pulled from numberStats(), so every page is
//     genuinely unique, not a template with one variable swapped.
//   • Evergreen concept pages ("are-lottery-numbers-random", …) — honest
//     explainers that link to the tool demonstrating the point.
//
// Voice rule (enforced by reading, not code): descriptive, never
// predictive. No "due", no "lucky", no "hot streak will continue".

import { ALL_GAMES } from "@/lib/types";
import type { Game } from "@/lib/types";
import { GAME_LABELS, isBallGame } from "@/lib/data";
import { numberStats } from "@/lib/numbers";

export type Faq = { q: string; a: string };

export type LearnPage = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  game?: Game;
  /** Unique, data-driven lead paragraph. */
  intro: string;
  /** Honest explanatory paragraphs. */
  body: string[];
  /** Drives FAQPage JSON-LD and an on-page Q&A list. */
  faqs: Faq[];
  backing: { href: string; label: string };
  related?: string[];
};

const fmt = (n: number) => n.toLocaleString();

function ordinalList(values: (string | number)[]): string {
  if (values.length <= 1) return String(values[0] ?? "");
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

/** "most-common-{game}-numbers" — top of the frequency table, honestly framed. */
function mostCommonPage(game: Game): LearnPage {
  const label = GAME_LABELS[game];
  const ball = isBallGame(game);
  const stats = numberStats(game);
  const main = stats.filter((s) => (ball ? s.kind === "white" : s.kind === "digit"));
  const top = [...main].sort((a, b) => b.count - a.count).slice(0, 5);
  const topVals = top.map((s) => s.value);
  const bottom = [...main].sort((a, b) => a.count - b.count)[0];
  const spreadPct = top.length
    ? (((top[0].count - bottom.count) / bottom.count) * 100).toFixed(1)
    : "0";

  const specialNote = (() => {
    if (!ball) return "";
    const specials = stats.filter((s) => s.kind === "special");
    const ts = [...specials].sort((a, b) => b.count - a.count)[0];
    const sName = game === "megamillions" ? "Mega Ball" : "Powerball";
    return ` The most-drawn ${sName} so far is ${ts.value} (${fmt(ts.count)} times).`;
  })();

  const noun = ball ? "white balls" : "digits";
  return {
    slug: `most-common-${game}-numbers`,
    game,
    title: `Most Common ${label} Numbers`,
    h1: `What are the most common ${label} numbers?`,
    description: `The ${noun} drawn most often in ${label} so far — ${ordinalList(
      topVals,
    )} lead the count. With the honest caveat: frequency is history, not an edge.`,
    intro: `Across the current ${label} history, the ${noun} drawn most often are ${ordinalList(
      topVals,
    )}.${specialNote} But the gap between the most- and least-drawn ${ball ? "ball" : "digit"} is only about ${spreadPct}% — ordinary noise for a fair draw, not a signal.`,
    body: [
      `"Most common" is a fact about the past. It is not a prediction. Every ${label} draw is independent: the machine has no memory of which ${ball ? "balls" : "digits"} came up before, so the count so far tells you nothing about the next result.`,
      `Finite samples always wobble. Some ${noun} will sit above the average and some below purely by chance — that's what the ${spreadPct}% spread above is. Run the draw long enough and the counts converge; they never "owe" a correction on any particular night.`,
      `We publish the frequency table because it's interesting and people search for it, not because it reveals a better number to play. There isn't one.`,
    ],
    faqs: [
      {
        q: `What are the most common numbers in ${label}?`,
        a: `So far, the most frequently drawn ${noun} are ${ordinalList(topVals)}. This reflects past draws only — it does not make them more likely to come up next.`,
      },
      {
        q: `Does playing the most common ${label} numbers improve my odds?`,
        a: `No. Draws are independent and every combination has the same probability. Past frequency carries no predictive information.`,
      },
      {
        q: `Why are some ${label} numbers drawn more than others?`,
        a: `Random sampling. Over a finite number of draws, counts naturally vary above and below the expected average; the differences here are within normal noise.`,
      },
    ],
    backing: { href: `/${game}/frequency`, label: `${label} frequency table` },
    related: [`overdue-${game}-numbers`, "are-lottery-numbers-random"],
  };
}

/** "overdue-{game}-numbers" — biggest current gaps, with the "not due" caveat. */
function overduePage(game: Game): LearnPage {
  const label = GAME_LABELS[game];
  const ball = isBallGame(game);
  const stats = numberStats(game);
  const main = stats.filter((s) => (ball ? s.kind === "white" : s.kind === "digit"));
  const longest = [...main].sort((a, b) => b.currentGap - a.currentGap).slice(0, 5);
  const vals = longest.map((s) => s.value);
  const top = longest[0];

  const noun = ball ? "balls" : "digits";
  return {
    slug: `overdue-${game}-numbers`,
    game,
    title: `Overdue ${label} Numbers`,
    h1: `What are the "overdue" ${label} numbers?`,
    description: `The ${label} ${noun} not drawn for the longest — currently ${ordinalList(
      vals,
    )}. And the honest part most sites skip: "overdue" numbers are not more likely to hit.`,
    intro: `Right now the longest-waiting ${label} ${noun} are ${ordinalList(
      vals,
    )} — ${top.value} hasn't appeared in ${top.currentGap} draw${top.currentGap === 1 ? "" : "s"}. That makes them "overdue" in the headline sense, and in no other sense at all.`,
    body: [
      `The belief that an absent number is "due" is the gambler's fallacy. The gap distribution for a fair draw is geometric — memoryless. After ${top.currentGap} draws without ${top.value}, its chance on the next draw is exactly what it always was.`,
      `Long gaps are expected, not anomalous. With ${ball ? "dozens of balls" : "ten digits"} in play, some will routinely go many draws between appearances. Seeing a long dry spell is normal sampling, not a coiled spring.`,
      `We show recency because it's a fair question to ask of historical data — just not a route to a better bet. Nothing about a draw's past changes its next outcome.`,
    ],
    faqs: [
      {
        q: `Which ${label} numbers are most overdue?`,
        a: `The ${noun} with the longest current gaps are ${ordinalList(vals)}. "Overdue" describes how long it's been — it does not raise their probability of being drawn next.`,
      },
      {
        q: `Are overdue ${label} numbers more likely to be drawn?`,
        a: `No. Each draw is independent, so a long absence does not increase a number's chance. This is the gambler's fallacy.`,
      },
      {
        q: `Should I play ${label} numbers that haven't come up in a while?`,
        a: `It won't help or hurt your odds — every combination is equally likely regardless of recent history. Play numbers you like for any reason except "due."`,
      },
    ],
    backing: { href: `/${game}/gaps`, label: `${label} gaps & recency` },
    related: [`most-common-${game}-numbers`, "do-overdue-numbers-hit"],
  };
}

/** Evergreen concept pages — honest explainers, each pointing at a tool. */
function evergreenPages(): LearnPage[] {
  return [
    {
      slug: "are-lottery-numbers-random",
      title: "Are Lottery Numbers Random?",
      h1: "Are lottery numbers random?",
      description:
        "Yes — drawn by certified equipment so every combination is equally likely. Here's how to see it in the data, and why patterns you spot are noise.",
      intro:
        "Lottery draws are designed to be random: gravity-pick machines or audited RNGs are tested so each number has an equal, independent chance every draw. The frequency and gap charts on this site track that — observed counts hug the uniform expectation, and the small deviations are exactly the size you'd predict from finite sampling.",
      body: [
        "Randomness doesn't mean every number appears equally often in any given stretch — that would actually be non-random. It means the differences are unstructured: they don't persist, they don't predict, and they shrink (relative to the total) as draws accumulate.",
        "The human brain is a pattern-finder, so streaks and 'hot' numbers feel meaningful. They aren't. You can verify this yourself in the Formula Lab: backtest any rule for picking numbers and watch its hit rate settle to the same baseline as random selection.",
      ],
      faqs: [
        { q: "Are lottery draws truly random?", a: "Yes. Reputable lotteries use certified gravity-pick machines or audited random number generators, tested so each outcome is independent and equally likely." },
        { q: "If it's random, why do some numbers come up more?", a: "Finite-sample variation. Over a limited number of draws, counts naturally differ; the spread matches what randomness predicts and carries no forecasting value." },
        { q: "Can I detect a pattern that beats the lottery?", a: "No. Independent draws have no exploitable pattern. Any rule, backtested honestly, converges to the chance baseline." },
      ],
      backing: { href: "/lab", label: "Formula Lab (backtest a rule)" },
      related: ["do-overdue-numbers-hit", "does-quick-pick-or-choosing-matter"],
    },
    {
      slug: "do-overdue-numbers-hit",
      title: "Do Overdue Lottery Numbers Hit?",
      h1: "Do 'overdue' lottery numbers eventually hit more often?",
      description:
        "No. A number being absent for many draws doesn't raise its chance. This is the gambler's fallacy — see the memoryless gap data.",
      intro:
        "An 'overdue' number is just one that hasn't appeared recently. Because draws are independent, its probability on the next draw is unchanged by the drought. The gap distributions on DrawData are geometric — the defining property of a memoryless process.",
      body: [
        "The intuition that a long-absent number must 'catch up' assumes the lottery balances itself over time. It doesn't. There is no force pulling results toward an even spread on any human timescale; convergence happens only in the limit and never targets a specific number.",
        "Concretely: if a digit has a 1-in-10 chance per position, it has that chance whether it last hit yesterday or 50 draws ago. The gaps page shows observed gap lengths tracking the geometric prediction closely.",
      ],
      faqs: [
        { q: "Do overdue numbers become more likely?", a: "No. Each draw is independent, so a long gap does not increase a number's probability. Believing otherwise is the gambler's fallacy." },
        { q: "Why do people track overdue numbers?", a: "Recency is an intuitive thing to look at, and many sites present it as a tip. The data shows it has no predictive power." },
      ],
      backing: { href: "/powerball/gaps", label: "See gap distributions" },
      related: ["are-lottery-numbers-random"],
    },
    {
      slug: "does-quick-pick-or-choosing-matter",
      title: "Quick Pick vs. Choosing Your Own Numbers",
      h1: "Is Quick Pick better than choosing my own numbers?",
      description:
        "Neither is more likely to win — odds are identical. The only real difference is how a shared combination splits a jackpot.",
      intro:
        "Every combination is equally likely, so Quick Pick and self-picked tickets have exactly the same chance of winning. The choice is about preference and, marginally, about how many other players share your combination.",
      body: [
        "There's one non-odds consideration: if you win a jackpot with a combination many others also chose (birthdays, 1-2-3-4-5, patterns on the slip), you split the prize more ways. Picking less-popular combinations doesn't change your probability of winning — only the expected size of a shared prize.",
        "That's the honest edge available in the lottery: not a better chance of winning, just a slightly better payout-if-you-win by avoiding crowded combinations. It is small and it is the only one.",
      ],
      faqs: [
        { q: "Does Quick Pick win more often?", a: "No. Randomly generated and self-chosen tickets have identical odds; more Quick Pick winners simply reflect more Quick Pick tickets sold." },
        { q: "Can choosing my own numbers improve anything?", a: "Only payout-sharing: avoiding popular combinations means fewer co-winners if you hit. It does not change your chance of winning." },
      ],
      backing: { href: "/odds", label: "Honest odds explainer" },
      related: ["are-lottery-numbers-random"],
    },
  ];
}

let _cache: LearnPage[] | null = null;

/** All learn pages — per-game data-driven + evergreen. */
export function learnPages(): LearnPage[] {
  if (_cache) return _cache;
  const pages: LearnPage[] = [];
  for (const game of ALL_GAMES) {
    pages.push(mostCommonPage(game));
    pages.push(overduePage(game));
  }
  pages.push(...evergreenPages());
  _cache = pages;
  return pages;
}

export function learnPage(slug: string): LearnPage | null {
  return learnPages().find((p) => p.slug === slug) ?? null;
}

export function learnSlugs(): string[] {
  return learnPages().map((p) => p.slug);
}
