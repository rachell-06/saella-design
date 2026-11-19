"use client";

import { Line, LineChart, YAxis } from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";

// Tiny trend line for a KPI card (Studio Admin KPI cards with a chart, user request 2026-10-29). No axes, no
// tooltip: it shows the shape of the period; the number above it is the reading. Gaps (null) are bridged.
export function Sparkline({
  values,
  color,
  label,
}: {
  values: (number | null)[];
  /** A chart token, e.g. "var(--chart-2)", so the card matches its line on the main chart. */
  color: string;
  /** Read out instead of the drawing, e.g. "Open rate per day, last 30 days". */
  label: string;
}) {
  const config = { v: { label, color } } satisfies ChartConfig;
  const data = values.map((v) => ({ v }));
  return (
    <div role="img" aria-label={label}>
      <ChartContainer config={config} className="aspect-auto h-10 w-full">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            dataKey="v"
            type="linear"
            stroke="var(--color-v)"
            strokeWidth={1.75}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
