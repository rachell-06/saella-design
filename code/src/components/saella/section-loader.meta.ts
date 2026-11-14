import type { ComponentMeta } from "@/components/meta";

export const sectionLoaderMeta: ComponentMeta = {
  name: "SectionLoader / useSectionLoad",
  category: "organism",
  description:
    "One data section of a page (KPI strip, chart body, table) loading on its own, with feedback by wait time (PATTERNS.md §9.17): a skeleton shaped like the real section, a status box with a progress bar and percent after 1s (real count when `total` is set, else an estimate from `estimateMs` marked ~), an Alert with Retry after 15s or on error, and on a revisit in the same session the earlier copy at once with UpdatedIndicator.",
  variants: {
    "statusAt=center": "Default: status line and 15s Alert centred over the skeleton (KPI strip, chart, one table).",
    "statusAt=top": "A tall group of boards: status near the top so it is seen without scrolling.",
    "fail=error": "Demo: the first try fails after the wait; the Alert replaces the section. Retry succeeds.",
    "fail=stall": "Demo: the first try never answers; the 15s Alert sits over the skeleton. Retry succeeds.",
    forceLoading: "Preview ?state=loading: stays on the skeleton.",
  },
  relationships: {
    usedIn: ["Overview (KPIs, Send volume, boards)", "Leads › Self-upload (table)"],
    preferInstead: {
      "a whole route before it renders": "RouteProgress in the root layout; the page frame should render at once",
      "a long job the user started (import, send, verify)": "PATTERNS.md §9.14",
      "a short action result": "toast (PATTERNS.md §9.10)",
    },
  },
  tokens: ["--muted", "--card", "--border", "--muted-foreground", "--warning-soft", "--destructive-soft", "--shadow-card"],
  aiHints: [
    "Key each section by everything its data depends on (filters, view), so a filter change reloads only that section.",
    "Keep the frame real: card title, description and controls render outside SectionLoader; only the body is the skeleton.",
    "Build the skeleton from the real layout: same KPI cells (KpiStripItem loading keeps the note line), chart height, column headers, colgroup widths and row height.",
    "status = only the step being done; LoadingStatus adds the bar, percent and time. Pass total when rows arrive page by page (real progress), estimateMs from past loads otherwise. No 'Please wait'.",
    "Several sections on a page: show one UpdatedIndicator for them with combineLoads().",
    "Slow mode for demos: slowDelay(slowModeOf(params.get('slow')), 'quick' | 'chart' | 'table') from lib/mock/delay.ts.",
  ],
  invalid: [
    "A generic spinner or a full-page skeleton in place of a page whose frame can render.",
    "A skeleton with a different number of cells, columns or a different height than the loaded section.",
    "Waiting for every section before showing any.",
    "Blanking data already on screen while it refreshes.",
    "Status before 1s, an animated skeleton under prefers-reduced-motion, an estimated percent without ~, or 100% before the data is in.",
  ],
};
