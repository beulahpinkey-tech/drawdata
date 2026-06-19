type Props = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
};

/**
 * StatCard — the four-up metric cards on every game tab.
 *
 * Floating vibes update: each card gets the .float-soft ambient bob,
 * desynced per card by hashing the label into an animation-delay so
 * the row never bobs in lockstep. .card-hover lifts it on hover
 * (which also pauses the bob). The site-wide .panel scroll reveal
 * handles the entrance. Sizes bumped one notch across the board
 * (p-5 → p-6, value 28 → 34px) per user direction "make them a
 * little big."
 */
export function StatCard({ label, value, sub, accent }: Props) {
  // Deterministic desync: same label always gets the same phase, so
  // server and client render identically (no hydration mismatch).
  const delay = (label.length % 5) * 0.55;
  return (
    <div
      className="panel card-hover float-soft p-6"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
        {label}
      </div>
      <div
        className={`mt-2.5 font-display text-[34px] leading-none tabular-nums ${
          accent ? "text-accent" : "text-text"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-2.5 text-[13px] text-dim">{sub}</div>}
    </div>
  );
}
