type Props = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
};

export function StatCard({ label, value, sub, accent }: Props) {
  return (
    <div className="panel p-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
        {label}
      </div>
      <div
        className={`mt-2 font-display text-[28px] leading-none tabular-nums ${
          accent ? "text-accent" : "text-text"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-2 text-[12px] text-dim">{sub}</div>}
    </div>
  );
}
