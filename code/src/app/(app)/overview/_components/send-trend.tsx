"use client";

// Trend chart (user request 2026-10-29): every email rate over time, not only delivered/opened/clicked counts.
// Learned from the live app's Send volume (line chart + series picker, default Opened · Clicked · Replied) and
// Studio Admin's chart cards (switch in the card header, shadcn Tabs). Two views:
// - Rates (default): lines on a % axis, one point per day that sent; days with no sends are skipped, not drawn as
//   0, so the line no longer zigzags to the floor between batches as in the live app.
// - Counts: grouped bars, since sends happen in batches on separate days.
// Chips pick the series; each metric keeps one color in both views. The axis rescales to what is picked, so
// unticking Open rate zooms in on the small rates.
// Line style from Studio Admin analytics "Traffic Quality" (user request 2026-10-29): no dots, linear lines. Its
// dashed previous-period line was tried and removed the same day (user request).

import { useState } from "react";
import {
  Bar,
  BarChart,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { trend } from "./metrics";

type Point = ReturnType<typeof trend>["points"][number];
type View = "rates" | "counts";

const RATES = {
  openRate: { label: "Open rate", color: "var(--chart-2)" },
  clickRate: { label: "Click rate", color: "var(--chart-3)" },
  replyRate: { label: "Reply rate", color: "var(--chart-4)" },
  unsubRate: { label: "Unsubscribe rate", color: "var(--chart-5)" },
  bounceRate: { label: "Bounce rate", color: "var(--chart-6)" },
} satisfies ChartConfig;

const COUNTS = {
  delivered: { label: "Delivered", color: "var(--chart-1)" },
  opened: { label: "Opened", color: "var(--chart-2)" },
  clicked: { label: "Clicked", color: "var(--chart-3)" },
  replied: { label: "Replied", color: "var(--chart-4)" },
  unsubscribed: { label: "Unsubscribed", color: "var(--chart-5)" },
  bounced: { label: "Bounced", color: "var(--chart-6)" },
} satisfies ChartConfig;

type RateKey = keyof typeof RATES;
type CountKey = keyof typeof COUNTS;

export const TREND_VIEWS: { value: View; label: string }[] = [
  { value: "rates", label: "Rates" },
  { value: "counts", label: "Counts" },
];

export function TrendViewSwitch({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  // shadcn segmented Tabs (user request 2026-10-30), replacing an outline ToggleGroup. Only the list is used:
  // the chart below is the panel.
  return (
    <Tabs value={view} onValueChange={(v) => onChange(v as View)}>
      <TabsList variant="default" aria-label="Show rates or counts">
        {TREND_VIEWS.map((v) => (
          <TabsTrigger key={v.value} value={v.value} className="px-3">
            {v.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function SendTrend({ points, view }: { points: Point[]; view: View }) {
  const [rateKeys, setRateKeys] = useState<RateKey[]>([
    "openRate",
    "clickRate",
    "replyRate",
  ]);
  const [countKeys, setCountKeys] = useState<CountKey[]>([
    "opened",
    "clicked",
    "replied",
  ]);
  const config = view === "rates" ? RATES : COUNTS;
  const picked: string[] = view === "rates" ? rateKeys : countKeys;
  // Keep at least one series: an empty chart reads as "no data".
  const pick = (v: string[]) => {
    if (v.length === 0) return;
    if (view === "rates") setRateKeys(v as RateKey[]);
    else setCountKeys(v as CountKey[]);
  };

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        type="multiple"
        variant="outline"
        size="sm"
        aria-label="Series to show"
        value={picked}
        onValueChange={pick}
        className="flex-wrap"
      >
        {Object.entries(config).map(([key, c]) => (
          <ToggleGroupItem key={key} value={key} aria-label={c.label}>
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full in-data-[state=off]:opacity-30"
              style={{ backgroundColor: c.color }}
            />
            {c.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        {view === "rates" ? (
          <LineChart data={points} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={14}
              minTickGap={32}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={40}
              tickFormatter={(v: number) => `${v}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <TooltipRow
                      color={RATES[name as RateKey]?.color}
                      label={RATES[name as RateKey]?.label ?? String(name)}
                      value={`${Number(value).toFixed(1)}%`}
                    />
                  )}
                />
              }
            />
            {rateKeys.map((k) => (
              <Line
                key={k}
                dataKey={k}
                type="linear"
                stroke={`var(--color-${k})`}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart
            data={points}
            margin={{ left: 0, right: 8, top: 8 }}
            barGap={1}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {countKeys.map((k) => (
              <Bar
                key={k}
                dataKey={k}
                fill={`var(--color-${k})`}
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        )}
      </ChartContainer>
    </div>
  );
}

function TooltipRow({
  color,
  label,
  value,
}: {
  color?: string;
  label: string;
  value: string;
}) {
  return (
    <>
      <div
        className="size-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium text-foreground tabular-nums">
          {value}
        </span>
      </div>
    </>
  );
}
