type Tone = "info" | "myth";

export function HonestyNote({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  const palette =
    tone === "myth"
      ? "border-hot/30 bg-hot/[0.05] text-text"
      : "border-cool/30 bg-cool/[0.05] text-text";
  const label = tone === "myth" ? "Myth check" : "Reading this honestly";
  const accent = tone === "myth" ? "text-hot" : "text-cool";
  return (
    <div className={`rounded-lg border ${palette} p-4 text-[13px] leading-relaxed`}>
      <div className={`text-[10px] uppercase tracking-[0.18em] mb-1 font-mono ${accent}`}>
        {label}
      </div>
      <div className="text-dim [&_strong]:text-text">{children}</div>
    </div>
  );
}
