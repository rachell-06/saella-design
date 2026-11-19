"use client";

import { SCROLL_TABLE_FILL } from "@/lib/scroll";
import { useImperativeHandle, useMemo, useState } from "react";
import { type OnChangeFn, type PaginationState, type RowSelectionState, type SortingState, useTable } from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Building2Icon,
  CalendarIcon,
  PhoneIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  HashIcon,
  FactoryIcon,
  MailIcon,
} from "lucide-react";
import type { DataTableColumn } from "@/components/saella/data-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dataTableFeatures } from "@/lib/data-table-features";
import { cn } from "@/lib/utils";
import { type Company, MAX_OFFSET } from "@/lib/mock/companies";

// Companies table, structure and presentation from Studio Admin /dashboard/products (products-table.tsx): the table
// fills the rest of the page and scrolls under a sticky header, cells split by hairlines, column names carry a small
// icon, and a footer row keeps the count and paging in view. Saella rules on top (DESIGN §2 "Bảng").

const HEADER_ICONS: Record<string, typeof Building2Icon> = {
  name: Building2Icon,
  taxCode: HashIcon,
  industry: FactoryIcon,
  status: CircleCheckIcon,
  founded: CalendarIcon,
  email: MailIcon,
  phone: PhoneIcon,
};

/** Rows a page (50 everywhere, no Rows per page). */
const PAGE_SIZE = 50;
// Fixed layout: short columns get the width their content needs; Company, Industry and Email share the rest.
const COL_WIDTH: Record<string, string> = {
  select: "w-10",
  name: "w-[22%]",
  taxCode: "w-36",
  industry: "w-[20%]",
  status: "w-30",
  founded: "w-32",
  email: "w-[20%]",
  phone: "w-32",
};
const HAS_EMAIL = "hasEmail";
const NARROW = new Set(["select", "actions"]);
// Same exclusions as the shared DataTable's onRowClick.
const ROW_CLICK_IGNORE =
  "button, a, input, label, select, textarea, [role=checkbox], [role=menuitem], [data-no-row-click]";

export type CompaniesTableHandle = { sortedRows: () => Company[] };

export function CompaniesTable({
  data,
  columns,
  loading,
  emptyState,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  activeRowId,
  handle,
}: {
  data: Company[];
  columns: DataTableColumn<Company>[];
  loading?: boolean;
  emptyState: React.ReactNode;
  /** Owned by the screen, so the bulk bar can sit in the toolbar above the table. */
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  /** Clicking a row opens its detail sheet; the name button stays the keyboard way in. */
  onRowClick?: (c: Company) => void;
  /** Row whose sheet is open: kept highlighted so the user sees which one they are reading. */
  activeRowId?: string;
  /** The rows in the table's current sort, for Export (the file follows what the user sees). */
  handle?: React.Ref<CompaniesTableHandle>;
}) {
  // Newest first, like the live app (activate_date desc).
  const [sorting, setSorting] = useState<SortingState>([{ id: "founded", desc: true }]);
  // Companies with an email come first, whatever the column sort: only they can be unlocked and sent to. A hidden
  // column leads every sort; the header arrows show only the user's sort.
  const allColumns = useMemo<DataTableColumn<Company>[]>(
    () => [...columns, { id: HAS_EMAIL, accessorFn: (c) => (c.email ? 1 : 0), enableHiding: false }],
    [columns],
  );
  const fullSorting = useMemo<SortingState>(() => [{ id: HAS_EMAIL, desc: true }, ...sorting], [sorting]);
  const onSortingChange: OnChangeFn<SortingState> = (next) => {
    const value = typeof next === "function" ? next(fullSorting) : next;
    setSorting(value.filter((s) => s.id !== HAS_EMAIL));
  };
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });

  // New results start from page 1 (reset during render, not in an effect).
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns: allColumns,
    state: { sorting: fullSorting, rowSelection, pagination },
    // Tax code is hidden by default: it stays searchable and in the sheet.
    initialState: { columnVisibility: { taxCode: false, [HAS_EMAIL]: false } },
    getRowId: (c) => c.id,
    enableRowSelection: true,
    onSortingChange,
    onRowSelectionChange,
    onPaginationChange: setPagination,
  });

  useImperativeHandle(handle, () => ({ sortedRows: () => table.getPrePaginatedRowModel().rows.map((r) => r.original) }), [table]);

  const { pageIndex, pageSize } = pagination;
  const total = data.length;
  const selected = Object.values(rowSelection).filter(Boolean).length;
  // Paging stops at the registry's depth ceiling (AC-CON-B-03); past it the user narrows the filters.
  const reachable = Math.floor(MAX_OFFSET / pageSize) + 1;
  const pageCount = Math.max(1, Math.min(table.getPageCount(), reachable));
  const capped = table.getPageCount() > reachable;
  const pageStart = Math.max(0, Math.min(pageIndex - 2, pageCount - 5));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => pageStart + i);
  const rows = table.getRowModel().rows;

  return (
    <div
      className={cn("group/dt flex min-h-0 flex-1 flex-col", SCROLL_TABLE_FILL)}
      data-selecting={selected > 0 || undefined}
    >
      <Table aria-label="Companies" aria-busy={loading || undefined} className="table-fixed border-separate border-spacing-0">
        <TableHeader className="sticky top-0 z-10 bg-table-head">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="group/row border-border/60 hover:bg-transparent">
              {group.headers.map((header) => {
                const id = header.column.id;
                const Icon = HEADER_ICONS[id];
                const sorted = header.column.getIsSorted();
                const label = (
                  <>
                    {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground dark:text-foreground" aria-hidden />}
                    <table.FlexRender header={header} />
                    {sorted === "asc" && <ArrowUpIcon className="size-3.5" aria-hidden />}
                    {sorted === "desc" && <ArrowDownIcon className="size-3.5" aria-hidden />}
                  </>
                );
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    className={cn(
                      "border-r border-b border-border/50 bg-table-head last:border-r-0",
                      COL_WIDTH[id],
                      id === "select" && "px-0 text-center [&:has([role=checkbox])]:pr-0",
                      id === "actions" && "px-1.5"
                    )}
                  >
                    {header.isPlaceholder ? null : id === "select" ? (
                      <div className="flex justify-center">
                        <table.FlexRender header={header} />
                      </div>
                    ) : header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "-mx-1 h-auto gap-2 rounded-sm border-0 px-1 py-0.5 text-sm font-medium text-foreground hover:bg-transparent"
                        )}
                      >
                        {label}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 font-medium text-foreground">{label}</div>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 8 }, (_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {table.getVisibleLeafColumns().map((col, j) => (
                  <TableCell key={j} className="h-12 border-r border-b border-border/50 py-2 last:border-r-0">
                    {!NARROW.has(col.id ?? "") && <Skeleton className="h-4 w-full max-w-32" />}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                data-active={row.id === activeRowId || undefined}
                aria-current={row.id === activeRowId || undefined}
                className={cn("group/row border-0 data-active:bg-muted", onRowClick && "cursor-pointer")}
                onClick={
                  onRowClick &&
                  ((e) => {
                    // Controls in the row (checkbox, name button, "+N" card, "…" menu, portalled menu items) keep their own click;
                    // selecting text doesn't open the sheet either.
                    const target = e.target as HTMLElement;
                    if (!e.currentTarget.contains(target)) return;
                    if (target.closest(ROW_CLICK_IGNORE)) return;
                    if (window.getSelection()?.toString()) return;
                    onRowClick(row.original);
                  })
                }
              >
                {row.getVisibleCells().map((cell) => {
                  const id = cell.column.id;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "h-12 border-r border-b border-border/50 py-2 last:border-r-0",
                        NARROW.has(id) && "w-10 min-w-10",
                      id === "select" && "px-0 text-center [&:has([role=checkbox])]:pr-0",
                        id === "actions" && "px-1.5"
                      )}
                    >
                      {id === "select" ? (
                        <div className="flex justify-center">
                          <table.FlexRender cell={cell} />
                        </div>
                      ) : (
                        <table.FlexRender cell={cell} />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={table.getVisibleLeafColumns().length} className="whitespace-normal">
                {emptyState}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <footer className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background px-4 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          {loading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            total > 0 && (
              <span className="tabular-nums" aria-live="polite">
                {total ? (pageIndex * pageSize + 1).toLocaleString("en-US") : 0} – {Math.min((pageIndex + 1) * pageSize, total).toLocaleString("en-US")} of{" "}
                {total.toLocaleString("en-US")} companies
                {capped && pageIndex === pageCount - 1 && " · Narrow the filters to see the rest"}
              </span>
            )
          )}
          {/* the header checkbox takes this page; with the page taken and more on other pages, every match. */}
          {!loading && table.getIsAllPageRowsSelected() && selected < total && rows.length < total && (
            <Button variant="link" className="h-auto min-h-6 border-0 p-0 tabular-nums" onClick={() => table.toggleAllRowsSelected(true)}>
              Select all {total.toLocaleString("en-US")} matching
            </Button>
          )}
        </div>
        {!loading && pageCount > 1 && (
          <nav aria-label="Company pages" className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={pageIndex === 0}
              onClick={() => table.previousPage()}
            >
              <ChevronLeftIcon />
            </Button>
            {pages.map((page) => (
              <Button
                key={page}
                variant={page === pageIndex ? "secondary" : "ghost"}
                size="icon-sm"
                className="tabular-nums"
                aria-label={`Page ${page + 1}`}
                aria-current={page === pageIndex ? "page" : undefined}
                onClick={() => table.setPageIndex(page)}
              >
                {page + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => table.nextPage()}
            >
              <ChevronRightIcon />
            </Button>
          </nav>
        )}
      </footer>
    </div>
  );
}
