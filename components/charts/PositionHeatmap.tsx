"use client";

import { Chart3D } from "@/components/motion/Chart3D";

export function PositionHeatmap({
  freqByPosition,
}: {
  freqByPosition: { position: number; counts: number[] }[];
}) {
  const positions = freqByPosition.length;
  // global min/max for normalisation
  let min = Infinity,
    max = 0;
  for (const row of freqByPosition) {
    for (const v of row.counts) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  const range = max - min || 1;

  return (
    <Chart3D>
      <div className="overflow-x-auto">
      <table className="w-full text-[12px] font-mono tabular-nums">
        <thead>
          <tr className="text-dim">
            <th className="text-left py-2 pr-2 font-normal">pos \ digit</th>
            {Array.from({ length: 10 }).map((_, d) => (
              <th key={d} className="py-2 px-1 text-center font-normal">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {freqByPosition.map((row) => {
            const total = row.counts.reduce((a, b) => a + b, 0);
            return (
              <tr key={row.position} className="border-t border-edge">
                <td className="py-1.5 pr-2 text-dim">P{row.position + 1}</td>
                {row.counts.map((v, i) => {
                  const t = (v - min) / range;
                  const intensity = 0.06 + t * 0.55;
                  const pct = ((v / total) * 100).toFixed(1);
                  return (
                    <td key={i} className="py-1 px-1 text-center">
                      <div
                        className="rounded-md py-1.5 border border-edge"
                        style={{
                          background: `rgba(233,184,74,${intensity})`,
                        }}
                        title={`${v} occurrences (${pct}%)`}
                      >
                        <div className="text-[11px] text-text">{v}</div>
                        <div className="text-[9px] text-dim">{pct}%</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
        <div className="mt-3 text-[11px] text-dim flex items-center gap-3">
          <span>cooler</span>
          <span className="inline-block h-2 w-32 rounded-full bg-gradient-to-r from-white/[0.06] to-accent/60" />
          <span>warmer</span>
        </div>
      </div>
    </Chart3D>
  );
}
