"use client";

import { useState } from "react";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dataTableFeatures } from "@/lib/data-table-features";
import { cn } from "@/lib/utils";
import { type Company, MAX_OFFSET } from "@/lib/mock/companies";

// Companies table, structure and presentation from Studio Admin /dashboard/products (products-table.tsx,
// 2026-11-10): the table fills the rest of the page and scrolls under a sticky header, cells are split by
// hairlines, column names carry a small icon, and a footer row keeps the count and paging in view.
// Saella rules on top (DESIGN §2 "Bảng"): row hover muted/50, checkbox and row menu appear on hover or focus,
// paging only when there is more than one page; sorting kept from the previous screen.

const HEADER_ICONS: Record<string, typeof Building2Icon> = {
  name: Building2Icon,
  taxCode: HashIcon,
  industry: FactoryIcon,
  status: CircleCheckIcon,
  founded: CalendarIcon,
  email: MailIcon,
  phone: PhoneIcon,
};

const PAGE_SIZES = [20, 50, 100];
const NARROW = new Set(["select", "actions"]);
// Same exclusions as the shared DataTable's onRowClick.
const ROW_CLICK_IGNORE =
  "button, a, input, label, select, textarea, [role=checkbox], [role=menuitem], [data-no-row-click]";

export function CompaniesTable({
  data,
  columns,
  loading,
  emptyState,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  activeRowId,
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
}) {
  // Newest first, like the live app (activate_date desc).
  const [sorting, setSorting] = useState<SortingState>([{ id: "founded", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZES[0] });

  // New results start from page 1 (reset during render, not in an effect).
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    state: { sorting, rowSelection, pagination },
    // Tax code is hidden by default (designer decision 2026-11-12): it stays searchable and in the sheet, and its
    // width goes to Company, Industry, Email and Phone.
    initialState: { columnVisibility: { taxCode: false } },
    getRowId: (c) => c.id,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange,
    onPaginationChange: setPagination,
  });

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
      className="group/dt flex min-h-0 flex-1 flex-col *:data-[slot=table-container]:min-h-0 *:data-[slot=table-container]:flex-1 *:data-[slot=table-container]:overflow-auto"
      data-selecting={selected > 0 || undefined}
    >
      <Table aria-label="Companies" aria-busy={loading || undefined} className="border-separate border-spacing-0">
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
                      NARROW.has(id) && "w-10 min-w-10",
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
                    // Controls in the row (checkbox, name button, "+N" card, "…" menu, portalled menu items) keep their
                    // own click; selecting text doesn't open the sheet either.
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
                {selected > 0 && ` · ${selected.toLocaleString("en-US")} selected`}
                {capped && pageIndex === pageCount - 1 && " · Narrow the filters to see the rest"}
              </span>
            )
          )}
          {!loading && total > PAGE_SIZES[0] && (
            <div className="flex items-center gap-2">
              <span id="companies-page-size">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPagination({ pageIndex: 0, pageSize: Number(v) })}
              >
                <SelectTrigger size="sm" className="w-18" aria-labelledby="companies-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
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
