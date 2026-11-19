import type { ComponentMeta } from "@/components/meta";

export const tableFrameMeta: ComponentMeta = {
  name: "TableFrame / usePaging",
  category: "organism",
  description:
    "Frame for the New batch › Recipients tables, built like the Leads tables: a bordered frame filling the space left, a status line on top, rows scrolling under a sticky header, a footer with '1 – 50 of N' and page buttons, only when there are 2+ pages. Local to batches/_components.",
  variants: {
    status: "The selection line: '12 of 36 selected · Select all N matching · Clear selection'. Counts said here only.",
    "paging (usePaging)": "Client paging, 50 a page like the live app; a new list (filter, search) goes back to page 1. Rows per page shows past 20 rows, page buttons past one page.",
    "HEAD_CELL / BODY_CELL / TABLE / HEADER": "Shared classes for the <Table> inside: column hairlines, bg-table-head, 48px rows, sticky header.",
    "noun / label": "Footer count noun ('companies') and the page nav's accessible name.",
  },
  relationships: {
    usedIn: ["New batch › Recipients (batch-wizard.tsx, company-picker.tsx)"],
    preferInstead: {
      "a table that sorts, selects and pages without 'select all matching'": "DataTable",
      "bulk actions on the selection": "SelectionBar under the frame",
      "a table that doesn't fill a column": "Table alone: its container already caps the height and sticks the header",
    },
  },
  tokens: ["--border", "--table-head", "--background", "--muted-foreground"],
  aiHints: [
    "The parent is a flex column with a bounded height; flex-1 takes what is left. Only the rows scroll, never the page or the wizard footer (Back / Continue stays in view).",
    "min-h-48 is the floor: on a laptop with an Alert above, rows scroll inside instead of the frame spilling over the footer.",
    "Laptops (1280×800 and 1366×768): no sideways scroll. Below 1440 narrow the columns (table-fixed + colgroup), wrap rate brackets (max-[1439px]:[&_[data-slot=rate-value]]:flex-wrap), names up to 2 lines, tags 1 + '+N'.",
    "Needed by a second screen: move it to components/saella/ first (no imports across screens' _components).",
  ],
  invalid: [
    "A table spread over the page with the page scrolling.",
    "Sideways scrolling to reach columns at 1280–1440px.",
    "The selected count repeated in the footer or the card header.",
    "Importing it from another screen's _components.",
    "A fixed max-w on cell text instead of table-fixed column widths.",
  ],
};
