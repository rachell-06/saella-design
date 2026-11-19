// One colour per email metric, on every chart (DESIGN.md §4.3: "each metric keeps one colour"). Charts take their
// series colours from here, never their own: Overview Send volume, the batch report's First 24 hours, the template
// page, the agent's charts.
//  - Gold (chart-5, Clicks) is 2.16:1 on white: always with a legend or label, never as text (DESIGN.md §4.5).
//  - Unsubscribes share blue with Delivered: the two never sit on the same chart.
export const METRIC_COLOR = {
  sends: "var(--chart-1)",
  delivered: "var(--chart-3)",
  opens: "var(--chart-2)",
  clicks: "var(--chart-5)",
  replies: "var(--chart-4)",
  bounces: "var(--chart-6)",
  unsubs: "var(--chart-3)",
} as const;

export type Metric = keyof typeof METRIC_COLOR;
