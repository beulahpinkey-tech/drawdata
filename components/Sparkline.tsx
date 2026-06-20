// Tiny server-rendered SVG sparkline — appearances per year. No client
// JS, so it's in the crawled HTML. Purely decorative-supporting: the real
// numbers live in the table beside it.

export function Sparkline({
  data,
  width = 320,
  height = 56,
}: {
  data: { year: string; count: number }[];
  width?: number;
  height?: number;
}) {
  if (data.length === 0) {
    return <div className="text-[12px] text-dim font-mono">No appearances on record.</div>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const n = data.length;
  const x = (i: number) => pad + (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => pad + h - (v / max) * h;
  const points = data.map((d, i) => `${x(i).toFixed(1)},${y(d.count).toFixed(1)}`).join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Appearances per year from ${data[0].year} to ${data[n - 1].year}, peak ${max}`}
      className="overflow-visible"
    >
      <polyline points={points} fill="none" stroke="var(--accent, #e9b84a)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.count)} r={n > 40 ? 0 : 1.6} fill="var(--accent, #e9b84a)" />
      ))}
    </svg>
  );
}
