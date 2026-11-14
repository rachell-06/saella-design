"use client";

// Send volume (live app EmailMetricsDashboard "Send volume — {window}"): counts per bucket as lines, with a series
// picker in the card header. Five series in past tense (Sent, Delivered, Opened, Clicked, Replied); Opened ·
// Clicked · Replied on load, Sent and Delivered one click away. Buckets come from metrics.trend (live app sizes).
// A bucket with no sends plots 0, so the lines stay continuous (PATTERNS 9.7, user decision 2026-11-12).
// Series picker: a legend of checkboxes, each filled in its series colour (user feedback 2026-11-12).

import type { CSSProperties } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Hint } from "@/components/saella/hint";
import type { TrendPoint } from "./metrics";

// Five distinct hues. Delivered (blue) also draws dashed: it runs almost on top of Sent, so Sent shows through.
// Teal and blue are the closest pair; the dash keeps them apart. Gold (2.16:1 on white) only with the legend.
export const SERIES = {
  sends: { label: "Sent", color: "var(--chart-1)" },
  delivered: { label: "Delivered", color: "var(--chart-3)" },
  opens: { label: "Opened", color: "var(--chart-2)" },
  clicks: { label: "Clicked", color: "var(--chart-5)" },
  replies: { label: "Replied", color: "var(--chart-4)" },
} satisfies ChartConfig;
const DASHED: SeriesKey[] = ["delivered"];

export type SeriesKey = keyof typeof SERIES;
export const DEFAULT_SERIES: SeriesKey[] = ["opens", "clicks", "replies"];

/** Series legend for the card header: one checkbox per series, at least one stays on. */
export function SeriesPicker({
  value,
  onChange,
}: {
  value: SeriesKey[];
  onChange: (v: SeriesKey[]) => void;
}) {
  return (
    <div role="group" aria-label="Series to show" className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {(Object.keys(SERIES) as SeriesKey[]).map((key) => {
        const on = value.includes(key);
        const last = on && value.length === 1;
        const id = `series-${key}`;
        return (
          <Hint key={key} label={last ? "Keep at least one series on" : undefined}>
            <div className="flex items-center gap-2" tabIndex={last ? 0 : undefined}>
              <Checkbox
                id={id}
                checked={on}
                disabled={last}
                onCheckedChange={(c) => onChange(c ? [...value, key] : value.filter((k) => k !== key))}
                style={{ "--series": SERIES[key].color } as CSSProperties}
                className="border-(--series) data-checked:border-(--series) data-checked:bg-(--series) data-checked:text-background disabled:opacity-100"
              />
              <Label htmlFor={id} className="font-normal">
                {SERIES[key].label}
              </Label>
            </div>
          </Hint>
        );
      })}
    </div>
  );
}

export function SendTrend({
  points,
  series,
}: {
  points: TrendPoint[];
  series: SeriesKey[];
}) {
  return (
    <ChartContainer config={SERIES} className="aspect-auto h-72 w-full">
      <LineChart data={points} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        {series.map((k) => (
          <Line
            key={k}
            dataKey={k}
            type="monotone"
            stroke={`var(--color-${k})`}
            strokeWidth={2}
            strokeDasharray={DASHED.includes(k) ? "5 4" : undefined}
            dot={{ r: 3 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
