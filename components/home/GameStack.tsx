"use client";

/**
 * GameStack — sticky stacking cards for the homepage game grid.
 *
 * Portfolio-style card stacking: the 12 games are grouped into 6
 * cards (National + one per state). Each card pins below the header
 * while the next one scrolls up over it; pinned cards scale down
 * slightly (targetScale = 1 − (total − 1 − index) × 0.03) and offset
 * 24px per index, so by the end you see the whole deck edge-stacked.
 *
 * All copy (labels, tags, blurbs, counts, date ranges) is passed in
 * from the server component — nothing reworded, no META import in the
 * client bundle.
 *
 * prefers-reduced-motion: plain stacked sections, no sticky pinning,
 * no scaling.
 */

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

export type GameCard = {
  id: string;
  label: string;
  tag: string;
  blurb: string;
  count: number;
  earliest: string;
  latest: string;
};

export type GameGroup = {
  key: string;
  title: string;
  games: GameCard[];
};

export function GameStack({ groups }: { groups: GameGroup[] }) {
  const container = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  if (reduce) {
    return (
      <div className="space-y-4">
        {groups.map((g) => (
          <GroupPanel key={g.key} group={g} />
        ))}
      </div>
    );
  }

  return (
    <div ref={container}>
      {groups.map((g, i) => (
        <StackSlot
          key={g.key}
          group={g}
          index={i}
          total={groups.length}
          progress={scrollYProgress}
        />
      ))}
    </div>
  );
}

function StackSlot({
  group,
  index,
  total,
  progress,
}: {
  group: GameGroup;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const targetScale = 1 - (total - 1 - index) * 0.03;
  const scale = useTransform(progress, [index / total, 1], [1, targetScale]);
  return (
    // Each slot gives the card scroll room; the card pins inside it.
    <div className="h-[62vh] min-h-[420px]">
      <motion.div
        className="sticky"
        style={{
          top: `calc(7rem + ${index * 24}px)`,
          scale,
          transformOrigin: "top center",
        }}
      >
        <GroupPanel group={group} />
      </motion.div>
    </div>
  );
}

function GroupPanel({ group }: { group: GameGroup }) {
  return (
    <div className="panel rounded-lg p-6 sm:p-8 bg-bg-elevated">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <div className="t-data-label">{group.title}</div>
          <h3 className="t-h3 mt-1 text-fg-primary">
            {group.games.length === 2
              ? `${group.games[0].label.split(" ").slice(-2).join(" ")} · ${group.games[1].label.split(" ").slice(-2).join(" ")}`
              : group.title}
          </h3>
        </div>
        <div className="t-caption text-fg-tertiary hidden sm:block">
          {group.games
            .reduce((a, g) => a + g.count, 0)
            .toLocaleString()}{" "}
          draws on file
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {group.games.map((g) => (
          <Link
            key={g.id}
            href={`/${g.id}`}
            className="panel-inner card-hover p-5 group block transition-transform duration-standard ease-premium"
          >
            <div className="t-data-label">{g.tag}</div>
            <div className="mt-1 font-display text-h4 leading-tight text-fg-primary">
              {g.label}
            </div>
            <p className="mt-2 text-small text-fg-secondary leading-relaxed">
              {g.blurb}
            </p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="t-data-label">draws on file</div>
                <div className="font-display text-[24px] tabular-nums leading-none text-fg-primary mt-1">
                  {g.count.toLocaleString()}
                </div>
              </div>
              <div className="t-caption text-fg-tertiary text-right">
                {g.earliest}
                <br />→ {g.latest}
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-small text-brand-500">
              Explore{" "}
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
