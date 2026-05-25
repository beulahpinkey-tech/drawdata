"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE } from "./style";

export function CoverageChart({
  coverageCum,
  pool,
  height = 280,
}: {
  coverageCum: number[];
  pool: number;
  height?: number;
}) {
  // Downsample to ~400 points to keep render light
  const N = coverageCum.length;
  const target = 400;
  const step = Math.max(1, Math.floor(N / target));
  const data: { i: number; unique: number; pct: number }[] = [];
  for (let i = 0; i < N; i += step) {
    data.push({ i, unique: coverageCum[i], pct: coverageCum[i] / pool });
  }
  if (data[data.length - 1]?.i !== N - 1) {
    data.push({ i: N - 1, unique: coverageCum[N - 1], pct: coverageCum[N - 1] / pool });
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="i" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            domain={[0, pool]}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={(v: number) => [`${v} of ${pool}`, "unique covered"]}
            labelFormatter={(l) => `draw #${(l as number).toLocaleString()}`}
          />
          <Line type="monotone" dataKey="unique" stroke="var(--accent)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
