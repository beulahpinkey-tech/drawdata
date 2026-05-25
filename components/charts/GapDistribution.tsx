"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE } from "./style";

export function GapDistribution({
  dist,
  geometricP,
  height = 280,
}: {
  dist: Record<number, number>;
  geometricP: number; // baseline single-trial probability
  height?: number;
}) {
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  const maxGap = Math.min(
    60,
    Math.max(...Object.keys(dist).map((k) => parseInt(k, 10))),
  );
  const data = [];
  for (let g = 1; g <= maxGap; g++) {
    const observed = (dist[g] ?? 0) / total;
    const expected = Math.pow(1 - geometricP, g - 1) * geometricP;
    data.push({ gap: g, observed, expected });
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="gap"
            tickLine={false}
            axisLine={false}
            label={{ value: "gap (draws)", position: "insideBottom", offset: -2, fill: "var(--dim)", fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={(v: number, name) => [`${(v * 100).toFixed(2)}%`, name === "observed" ? "Observed" : "If random"]}
            labelFormatter={(l) => `gap = ${l}`}
          />
          <defs>
            <linearGradient id="gapObs" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="observed" stroke="var(--accent)" fill="url(#gapObs)" strokeWidth={2} />
          <Area type="monotone" dataKey="expected" stroke="var(--cool)" fill="none" strokeWidth={1.5} strokeDasharray="3 3" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
