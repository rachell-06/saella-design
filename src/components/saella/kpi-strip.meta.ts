import type { ComponentMeta } from "@/components/meta";

export const kpiStripMeta: ComponentMeta = {
  name: "KpiStrip / KpiStripItem",
  category: "molecule",
  description:
    "The KPI pattern the current screens use (Overview, Campaigns, batch report, template detail, Billing): a single bordered row of cells split by hairlines. A screen rebuilt from a Studio Admin page uses that page's KPI presentation instead; the rate logic (rateKpi) stays.",
  variants: {
    default: "Label, value, one short note under it.",
    "detail=": "Counts or threshold behind the number, shown in a tooltip instead of an extra line.",
    "href=": "The whole cell links to the filtered list behind the number; an arrow after the note shows it is clickable.",
    "delta=": "Small change vs a previous period next to the number; the period goes in the tooltip.",
    "muted": "Grey value: too few sends to judge, or not available yet.",
    "tone=warning | danger": "Value past a threshold; icon + soft-foreground text. For rates, comes from rateKpi().",
    loading: "Skeleton in place of the value.",
  },
  relationships: {
    usedIn: ["Overview", "Campaign detail", "Batch report (all tabs)", "Template detail", "Settings / Billing"],
    preferInstead: {
      "an email rate in a cell": "spread rateKpi(kind, part, whole) into KpiStripItem",
      "a number that needs its own card": "do not build one; put it in a KpiStrip cell",
    },
  },
  tokens: ["--border", "--muted", "--muted-foreground", "--subtle-foreground", "--warning-soft-foreground", "--destructive-soft-foreground", "--success-soft-foreground", "--ring", "--tracking-title"],
  aiHints: [
    "One KpiStrip per block; 4–7 items read well at 1440px.",
    "Rates: always {...rateKpi(kind, part, whole)} so wording, note and colour match every other screen.",
    "Note wording for rates: delivery and bounce '8,479 of 8,675 sent'; others '3,462 of 8,479 delivered'.",
    "KPI numbers, charts and tables in the same filter block must come from the same filtered data.",
  ],
  invalid: [
    "Decorative icons in cells.",
    "Shadow or tinted background on the strip (hairline border only).",
    "Rates computed as an average of row rates; use total part ÷ total whole.",
    "tone set by hand for open, click, reply or unsub.",
  ],
};
