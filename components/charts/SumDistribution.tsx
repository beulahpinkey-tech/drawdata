"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_CURSOR } from "./style";

export function SumDistribution({
  dist,
  maxSum,
  highlight,
  height = 220,
}: {
  dist: Record<number, number>;
  maxSum: number;
  highlight?: number;
  height?: number;
}) {
  const data: { sum: number; count: number }[] = [];
  for (let s = 0; s <= maxSum; s++) {
    data.push({ sum: s, count: dist[s] ?? 0 });
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 12, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="sum" tickLine={false} axisLine={false} interval={Math.floor(maxSum / 20) || 1} />
          <YAxis tickLine={false} axisLine={false} width={48} />
          <Tooltip
            cursor={TOOLTIP_CURSOR}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={(v: number, _n, p) => [`${v.toLocaleString()} draws`, `sum = ${p.payload.sum}`]}
            labelFormatter={() => ""}
          />
          {highlight != null && (
            <ReferenceLine
              x={highlight}
              stroke="var(--hot)"
              strokeDasharray="3 3"
              label={{ value: `your sum = ${highlight}`, position: "top", fill: "var(--hot)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            />
          )}
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={highlight === d.sum ? "var(--hot)" : "rgba(236,233,224,0.5)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
