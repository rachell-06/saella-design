import type { ComponentMeta } from "@/components/meta";

export const metricCardMeta: ComponentMeta = {
  name: "MetricCard",
  category: "molecule",
  description:
    "Retired KPI card (one number per Card with delta pill, sparkline, icon tile). Overview moved to KpiStrip on 2026-11-05; no screen uses it now (DESIGN.md §8.2).",
  relationships: {
    usedIn: [],
    preferInstead: {
      "any KPI or headline number": "KpiStrip / KpiStripItem",
      "an email rate": "rateKpi() inside a KpiStripItem",
      "a trend line": "ChartCard or Sparkline inside the screen's own layout",
    },
  },
  tokens: ["--muted", "--muted-foreground", "--subtle-foreground", "--destructive", "--tracking-display"],
  aiHints: [
    "Do not use for new screens. Kept only because MetricDelta (its type) is still imported by KpiStrip.",
    "If a screen seems to need a standalone number card, ask first: it is a design decision, not a component choice.",
  ],
  invalid: ["Any new usage of MetricCard.", "Mixing MetricCard and KpiStrip on the same page."],
};
