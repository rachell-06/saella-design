"use client";

import { SCROLL_TABLE_FILL } from "@/lib/scroll";
import { useState } from "react";
import {
  type PaginationState,
  type ReactTable,
  type RowData,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type DataTableColumn } from "@/components/saella/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type DataTableFeatures, dataTableFeatures } from "@/lib/data-table-features";
import { cn } from "@/lib/utils";

// Table + pager for Self-upload, built like Find companies' table. The screen owns the table (useContactsTable) so it
// can read the selection.

export type ContactsTable<TData extends RowData> = ReactTable<DataTableFeatures, TData>;

export function useContactsTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  selectable = false,
  pageSizeOptions,
  initialSorting = [],
}: {
  data: TData[];
  columns: DataTableColumn<TData>[];
  getRowId: (row: TData) => string;
  selectable?: boolean;
  pageSizeOptions: number[];
  initialSorting?: SortingState;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: pageSizeOptions[0] });

  // New results (search, filter, or the book changed after a bulk action) start from page 1 with nothing selected
  // (reset during render, not in an effect). Paging keeps the selection.
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setRowSelection({});
  }

  return useTable({
    features: dataTableFeatures,
    data,
    columns: selectable ? [selectColumn<TData>(), ...columns] : columns,
    state: { sorting, rowSelection, pagination },
    getRowId,
    enableRowSelection: selectable,
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
  });
}

// Same exclusions as the shared DataTable's onRowClick.
const ROW_CLICK_IGNORE =
  "button, a, input, label, select, textarea, [role=checkbox], [role=menuitem], [data-no-row-click]";
const NARROW = new Set(["select", "actions"]);

const cellClass = (id: string, head = false) =>
  cn(
    "border-r border-b border-border/50 last:border-r-0",
    !head && "h-12 py-2",
    head && "bg-table-head",
    NARROW.has(id) && "w-10 min-w-10",
    id === "select" && "px-0 text-center [&:has([role=checkbox])]:pr-0",
    id === "actions" && "px-1.5"
  );

// Same build as Find companies' table (companies-table.tsx; the Leads tables must match): fills the card and
// scrolls under a sticky header, a footer "1 – 50 of N contacts" with up to 5 page buttons (no Rows per page).
export function ContactsTableView<TData extends RowData>({
  table,
  label,
  noun = "contacts",
  loading = false,
  emptyState,
  skeletonCell,
  skeletonRows = 8,
  onRowClick,
  activeRowId,
  headerIcons,
}: {
  table: ContactsTable<TData>;
  /** Small icon before a column name, by column id (Studio Admin, as on Find companies). */
  headerIcons?: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>>;
  /** Accessible name of the table. */
  label: string;
  /** Plural noun for the footer count. */
  noun?: string;
  loading?: boolean;
  /** Skeleton for one cell, shaped like the real cell of that column so rows keep their height (PATTERNS.md §9.17). */
  skeletonCell?: (columnId: string, row: number) => React.ReactNode;
  skeletonRows?: number;
  emptyState?: React.ReactNode;
  /** Clicking a row opens its profile sheet; the name button stays the keyboard way in. */
  onRowClick?: (row: TData) => void;
  /** Row whose sheet is open (matches getRowId): kept highlighted so the user sees which one they are reading. */
  activeRowId?: string | null;
}) {
  const rows = table.getRowModel().rows;
  const columns = table.getVisibleLeafColumns();
  const selected = Object.values(table.state.rowSelection as Record<string, boolean>).filter(Boolean).length;
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = Math.max(table.getPageCount(), 1);
  const pageStart = Math.max(0, Math.min(pageIndex - 2, pageCount - 5));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => pageStart + i);
  const total = table.getCoreRowModel().rows.length;
  const n = (x: number) => x.toLocaleString("en-US");

  return (
    <div
      className={cn("group/dt flex min-h-0 flex-1 flex-col", SCROLL_TABLE_FILL)}
      data-selecting={selected > 0 || undefined}
    >
      <Table aria-label={label} aria-busy={loading || undefined} className="border-separate border-spacing-0">
        <TableHeader className="sticky top-0 z-10 bg-table-head">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="group/row border-border/60 hover:bg-transparent">
              {group.headers.map((header) => {
                const id = header.column.id;
                const Icon = headerIcons?.[id];
                const sorted = header.column.getIsSorted();
                const content = (
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
                    className={cellClass(id, true)}
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
                        className="-mx-1 h-auto gap-2 rounded-sm border-0 px-1 py-0.5 text-sm font-medium text-foreground hover:bg-transparent"
                      >
                        {content}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 font-medium text-foreground">{content}</div>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }, (_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableCell key={column.id} className={cellClass(column.id)}>
                    {skeletonCell
                      ? skeletonCell(column.id, i)
                      : !NARROW.has(column.id) && <Skeleton className="h-4 w-full max-w-32" />}
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
                    // Controls in the row keep their own click (portalled menu items too); selecting text doesn't open it.
                    const target = e.target as HTMLElement;
                    if (!e.currentTarget.contains(target) || target.closest(ROW_CLICK_IGNORE)) return;
                    if (window.getSelection()?.toString()) return;
                    onRowClick(row.original);
                  })
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cellClass(cell.column.id)}>
                    {cell.column.id === "select" ? (
                      <div className="flex justify-center">
                        <table.FlexRender cell={cell} />
                      </div>
                    ) : (
                      <table.FlexRender cell={cell} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0 whitespace-normal">
                {emptyState ?? <p className="py-10 text-center text-muted-foreground">No results.</p>}
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
                {n(pageIndex * pageSize + 1)} – {n(Math.min((pageIndex + 1) * pageSize, total))} of {n(total)} {noun}
              </span>
            )
          )}
          {/* PATTERNS 9.1: the header checkbox takes this page; with the page taken and more on other pages, every match. */}
          {!loading && table.getIsAllPageRowsSelected() && selected < total && rows.length < total && (
            <Button variant="link" className="h-auto min-h-6 border-0 p-0 tabular-nums" onClick={() => table.toggleAllRowsSelected(true)}>
              Select all {n(total)} matching
            </Button>
          )}
        </div>
        {!loading && pageCount > 1 && (
          <nav aria-label={`${label} pages`} className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={pageIndex === 0} onClick={() => table.previousPage()}>
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

function selectColumn<TData extends RowData>(): DataTableColumn<TData> {
  return {
    id: "select",
    enableSorting: false,
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          aria-label="Select all rows on this page"
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(v === true)}
        />
      </div>
    ),
  };
}
