"use client";

type Stream = "combined" | "midday" | "evening";

export function StreamSelect({
  value,
  onChange,
}: {
  value: Stream;
  onChange: (s: Stream) => void;
}) {
  const opts: { id: Stream; label: string }[] = [
    { id: "combined", label: "Combined" },
    { id: "midday", label: "Midday" },
    { id: "evening", label: "Evening" },
  ];
  return (
    <div className="inline-flex items-center rounded-md border border-edge p-0.5 bg-white/[0.02]">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1 text-[12px] rounded-[5px] transition-colors ${
            value === o.id
              ? "bg-white/[0.08] text-text"
              : "text-dim hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
