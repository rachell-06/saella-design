import type { ComponentMeta } from "@/components/meta";

export const emptyMeta: ComponentMeta = {
  name: "Empty",
  category: "atom",
  description:
    "Empty state for a table, list, section or page: icon → one-line title → one sentence → one next action. Parts: EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent.",
  variants: {
    "EmptyMedia variant=icon": "Lucide icon in a muted square: the default for every empty state.",
    "no data yet": "Why it is empty + the create action.",
    "filter matched nothing": "'No … match these filters' + Clear filters (outline).",
    "no access": "Who can give access; no create button.",
    "load error": "What failed + Retry (outline). A list's load error is a destructive Alert + Retry instead.",
  },
  relationships: {
    usedIn: ["DataTable emptyState", "Campaigns board", "Leads", "Batch report (no results)", "New batch › Recipients", "Settings sections"],
    preferInstead: {
      "a lasting problem the user must fix": "Alert",
      "data still loading": "SectionLoader skeleton",
    },
  },
  tokens: ["--muted", "--foreground", "--muted-foreground", "--primary"],
  aiHints: [
    "One next action. Outline when the page already has its solid orange button (usually in PageHeader); solid only when the empty state holds the page's only main action.",
    "Title one line, description one sentence: why it is empty and what to do, not how the system works.",
    "Each of the four kinds has its own words; never reuse the 'no data yet' text for 'no match'.",
    "A table keeps its header and frame; Empty goes in the body.",
  ],
  invalid: [
    "A solid button in the empty state while PageHeader already has the page's solid one (a second solid on the page).",
    "Two solid buttons side by side, or a third action.",
    "A chibi or illustration (icon only).",
    "Zeros, a '0' KPI or an empty chart in place of an empty state.",
    "An empty state shown while data is still loading.",
  ],
};
