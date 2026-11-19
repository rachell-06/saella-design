"use client";

// Send volume (live app EmailMetricsDashboard "Send volume — {window}"): counts per bucket as lines, with a series
// picker in the card header. Five series in past tense (Sent, Delivered, Opened, Clicked, Replied); Opened ·
// Clicked · Replied on load, Sent and Delivered one click away. Buckets come from metrics.trend (day, week or month
// by the period's length, PATTERNS 9.7).
// A bucket with no sends plots 0, so the lines stay continuous (PATTERNS 9.7).
// Series picker: a legend of checkboxes, each filled in its series colour when on. A short line in the series colour
// (dashed for Delivered) names the line either way, so the gold series never relies on its 2.16:1 fill alone
// (DESIGN.md §4.5). Colours: METRIC_COLOR, one map for every chart.

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
import { METRIC_COLOR } from "@/lib/metric-colors";
import { cn } from "@/lib/utils";
import type { TrendPoint } from "./metrics";

// Five distinct hues. Delivered (blue) also draws dashed: it runs almost on top of Sent, so Sent shows through.
// Teal and blue are the closest pair; the dash keeps them apart. Gold (2.16:1 on white) only with the legend.
export const SERIES = {
  sends: { label: "Sent", color: METRIC_COLOR.sends },
  delivered: { label: "Delivered", color: METRIC_COLOR.delivered },
  opens: { label: "Opened", color: METRIC_COLOR.opens },
  clicks: { label: "Clicked", color: METRIC_COLOR.clicks },
  replies: { label: "Replied", color: METRIC_COLOR.replies },
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
                className={cn(
                  "data-checked:border-(--series) data-checked:bg-(--series) data-checked:text-background disabled:opacity-100",
                  // Gold is light in both themes: a dark tick on it.
                  key === "clicks" && "data-checked:text-deep"
                )}
              />
              <Label htmlFor={id} className="gap-1.5 font-normal">
                <span
                  aria-hidden
                  style={{ "--series": SERIES[key].color } as CSSProperties}
                  className={cn("w-3 border-t-2 border-(--series)", DASHED.includes(key) && "border-dashed")}
                />
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
          // One label per bucket (PATTERNS 9.7): at most 31 buckets, and day ticks are a number only.
          interval={0}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
          tickFormatter={(v: number) => v.toLocaleString("en-US")}
        />
        {/* The axis shows short ticks ("6"); the tooltip names the whole bucket ("Tue, Oct 6", "Sep 29 – Oct 5"). */}
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => (payload?.[0]?.payload as TrendPoint | undefined)?.tip}
            />
          }
        />
        {series.map((k) => (
          <Line
            key={k}
            dataKey={k}
            type="monotone"
            stroke={`var(--color-${k})`}
            strokeWidth={2}
            strokeDasharray={DASHED.includes(k) ? "5 4" : undefined}
            // Dots only under the pointer: up to 31 per line otherwise crowd the chart.
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
