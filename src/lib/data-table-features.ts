import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

// TanStack Table v9 needs every feature registered up front (pattern learned from Studio Admin,
// 2026-10-27). One shared registry keeps all Saella tables and their column definitions on the same type.
// Filtering is not registered on purpose: screens filter the data with FilterBar before passing it in,
// so the agent and the URL can set filters the same way.
export const dataTableFeatures = tableFeatures({
  columnVisibilityFeature, // needed for row.getVisibleCells()
  rowExpandingFeature, // expand a row to show a detail panel (DataTable renderExpanded), no sub-row model
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});

export type DataTableFeatures = typeof dataTableFeatures;
