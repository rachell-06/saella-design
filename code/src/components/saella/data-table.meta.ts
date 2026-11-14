import type { ComponentMeta } from "@/components/meta";

export const dataTableMeta: ComponentMeta = {
  name: "DataTable",
  category: "organism",
  description: "TanStack v9 table with sorting, multi-select + bulk-action bar, pagination, loading, empty state and expandable rows.",
  variants: {
    selectable: "Adds a checkbox column; pair with bulkActions.",
    bulkActions: "Buttons for the selected rows, shown in a bar above the table (primary-subtle).",
    renderExpanded: "Child rows under a parent, e.g. a campaign's templates. Adds a chevron column.",
    loading: "Skeleton rows with the real column count.",
    emptyState: "Shown when data is empty: why it is empty + one next action.",
    "columns[].meta.align='end'": "Numeric columns: tabular-nums. Left-aligned like every column (PATTERNS 9.1).",
    revealOnRowHover: "className for row actions: always visible, muted, darken on row hover. Never hide them: a hidden actions column reads as empty.",
  },
  relationships: {
    usedIn: ["Leads (companies, contacts)", "Templates", "Batch recipients"],
    preferInstead: {
      "filters / search": "FilterBar above the table; filter data before passing it in (PATTERNS.md §9.1)",
      "rate columns": "RateCell (components/saella/rate-meter)",
      "status column": "StatusBadge",
      "full-height table": "TableFill (temporary, see DESIGN.md §8.2)",
    },
  },
  tokens: ["--muted", "--muted-foreground", "--primary-subtle", "--border"],
  aiHints: [
    "Follow DESIGN.md §2 Bảng: max 2 text lines per row, one display kind per column, no row hover background, empty cell when there is no number.",
    "Three distinct empties: no data yet (explain + create button), filter matched nothing (Clear filters), error (destructive Alert + Retry).",
    "Pagination appears only when rows exceed one page.",
    "Measure: when adding a column, check the name column is not squeezed and secondary lines are not cut.",
  ],
  invalid: [
    "Hand-built <table> for a list that needs sorting or selection.",
    "Hover background on rows.",
    "Filtering inside the table instead of before it.",
  ],
};
