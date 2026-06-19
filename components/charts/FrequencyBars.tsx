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
import { Chart3D } from "@/components/motion/Chart3D";

type Datum = {
  label: string;
  value: number;
  expected: number;
};

export function FrequencyBars({
  data,
  height = 320,
  highlightMax,
  unit = "draws",
}: {
  data: Datum[];
  height?: number;
  highlightMax?: boolean;
  unit?: string;
}) {
  const maxVal = Math.max(...data.map((d) => d.value));
  const minVal = Math.min(...data.map((d) => d.value));
  const expected = data[0]?.expected ?? 0;
  return (
    <Chart3D>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 12, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" interval={0} tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={48} />
          <Tooltip
            cursor={TOOLTIP_CURSOR}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={(v: number) => [`${v.toLocaleString()} ${unit}`, "Observed"]}
            labelFormatter={(l) => `digit ${l}`}
          />
          <ReferenceLine
            y={expected}
            stroke="var(--cool)"
            strokeDasharray="4 4"
            label={{
              value: `expected ≈ ${Math.round(expected).toLocaleString()}`,
              position: "insideTopRight",
              fill: "var(--cool)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          />
          {/* Slow grow-in so the bars visibly "draw" when the panel
              scroll-reveals into view, instead of popping fully formed. */}
          <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={900} animationEasing="ease-out">
            {data.map((d, i) => {
              let fill = "rgba(236,233,224,0.55)";
              if (highlightMax && d.value === maxVal) fill = "var(--accent)";
              else if (highlightMax && d.value === minVal) fill = "var(--cool)";
              return <Cell key={i} fill={fill} />;
            })}
          </Bar>
        </BarChart>
        </ResponsiveContainer>
      </div>
    </Chart3D>
  );
}
