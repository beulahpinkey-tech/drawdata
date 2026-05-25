"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_CURSOR } from "./style";

export function YearBars({
  data,
  keyName,
  unit,
  height = 240,
}: {
  data: { year: number; [k: string]: number }[];
  keyName: string;
  unit: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="year" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={48} />
          <Tooltip
            cursor={TOOLTIP_CURSOR}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={(v: number) => [`${v.toLocaleString()} ${unit}`, keyName]}
          />
          <Bar dataKey={keyName} radius={[3, 3, 0, 0]} fill="var(--accent)" opacity={0.75} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
