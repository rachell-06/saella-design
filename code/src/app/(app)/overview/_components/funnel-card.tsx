"use client";

// Funnel (Campaign view; next to the KPIs): how the email narrows from Sent to Replied.
// Shape from Studio Admin's "Sales Pipeline" card (crm-v1 operational-cards.tsx: recharts FunnelChart in a card,
// stage on one side, value on the other, card-coloured stroke between stages). Saella changes: stage names left and
// "count · rate" right in the margins so thin stages stay readable; a brand-orange ramp, light at the top to full
// brand at Replied (no grey); rates on the KPI cards' denominators (PATTERNS 9.7): Delivered over sent, Opened,
// Clicked and Replied over delivered, so "40.8%" here is the Open rate card's 40.8%. Same data and filters as the
// KPIs. No footer line.
// The labels show counts only: each stage's rate is the KPI card beside it, so the rate lives in the tooltip. The
// thinnest stage keeps a minimum width (MIN_SHARE of Sent) so Replied stays visible; widths are drawn from `plot`,
// every number shown comes from `value`.

import { Funnel, FunnelChart, LabelList } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ChartCard } from "@/components/saella/chart-card";
import type { Totals } from "./metrics";

const n = (x: number) => x.toLocaleString("en-US");
const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "");

// Brand ramp: chart-1 mixed into the card colour, so it follows light and dark mode.
const shade = (p: number) => `color-mix(in oklch, var(--chart-1) ${p}%, var(--card))`;
const SHADES = [shade(28), shade(42), shade(58), shade(78), "var(--chart-1)"];

const MARGIN = { left: 76, right: 64, top: 4, bottom: 4 };
const MIN_SHARE = 0.04;
const config = { value: { label: "Emails", color: "var(--chart-1)" } } satisfies ChartConfig;

type Stage = { stage: string; value: number; plot: number; rate: string; detail: string; fill: string };

export function funnelStages(t: Totals): Stage[] {
  const rows: [string, number, number | null, string][] = [
    ["Sent", t.sends, null, ""],
    ["Delivered", t.delivered, t.sends, "sent"],
    ["Opened", t.opens, t.delivered, "delivered"],
    ["Clicked", t.clicks, t.delivered, "delivered"],
    ["Replied", t.replies, t.delivered, "delivered"],
  ];
  const floor = t.sends * MIN_SHARE;
  return rows.map(([stage, value, whole, unit], i) => ({
    stage,
    value,
    plot: Math.max(value, floor),
    rate: whole === null ? "" : pct(value, whole),
    detail: whole === null ? `${n(value)} sent` : `${n(value)} of ${n(whole)} ${unit}`,
    fill: SHADES[i],
  }));
}

type LabelProps = { x?: number | string; y?: number | string; width?: number | string; height?: number | string; index?: number };

export function FunnelCard({ totals }: { totals: Totals }) {
  const data = funnelStages(totals);
  const label = (side: "left" | "right") =>
    function StageLabel(p: LabelProps) {
      const [x, y, w, h] = [p.x, p.y, p.width, p.height].map(Number);
      const s = data[p.index ?? 0];
      if (!s) return null;
      const cx = x + w / 2;
      const cy = y + h / 2;
      if (side === "left")
        return (
          <text x={MARGIN.left - 10} y={cy} textAnchor="end" dominantBaseline="central" className="fill-muted-foreground text-xs">
            {s.stage}
          </text>
        );
      return (
        <text x={2 * cx - MARGIN.left + 10} y={cy} dominantBaseline="central" className="fill-foreground text-xs font-medium tabular-nums">
          {n(s.value)}
        </text>
      );
    };

  return (
    <ChartCard title="Funnel">
      {totals.sends === 0 ? (
        <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">No sends in this period</p>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-48 w-full">
          <FunnelChart margin={MARGIN}>
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                const s = active ? (payload?.[0]?.payload as Stage | undefined) : undefined;
                if (!s) return null;
                return (
                  <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <span className="font-medium">{s.stage}</span>{" "}
                    <span className="text-muted-foreground tabular-nums">
                      {s.detail}
                      {s.rate && ` (${s.rate})`}
                    </span>
                  </div>
                );
              }}
            />
            <Funnel className="stroke-card stroke-2" dataKey="plot" data={data} isAnimationActive={false}>
              <LabelList dataKey="stage" content={label("left")} />
              <LabelList dataKey="value" content={label("right")} />
            </Funnel>
          </FunnelChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}
