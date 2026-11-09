"use client";

import { Fragment, useState } from "react";
import {
  type ColumnDef,
  type ExpandedState,
  type PaginationState,
  type RowData,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type DataTableFeatures, dataTableFeatures } from "@/lib/data-table-features";
import { cn } from "@/lib/utils";

// List table for Campaigns, Contacts, Companies (DESIGN.md §9.1). Structure learned from Studio Admin's
// customers table (2026-10-27), rebuilt on Saella's Table/Checkbox/Select and tokens.
// Filtering happens before `data` comes in (FilterBar), so this only sorts, selects and pages.
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData>;

export function DataTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  label,
  selectable = false,
  bulkActions,
  initialSorting = [],
  pageSizeOptions = [10, 20, 50],
  loading = false,
  emptyState,
  renderExpanded,
  getRowCanExpand,
  defaultExpanded = {},
}: {
  data: TData[];
  columns: DataTableColumn<TData>[];
  getRowId: (row: TData) => string;
  /** Accessible name of the table, e.g. "Campaigns". */
  label: string;
  selectable?: boolean;
  /** Actions for the selected rows, shown in a bar above the table. */
  bulkActions?: (rows: TData[]) => React.ReactNode;
  initialSorting?: SortingState;
  pageSizeOptions?: number[];
  loading?: boolean;
  /** Shown when `data` is empty: say why and what to do next. */
  emptyState?: React.ReactNode;
  /** Detail shown under an expanded row, full width (e.g. a campaign's templates). Adds a chevron column. */
  renderExpanded?: (row: TData) => React.ReactNode;
  getRowCanExpand?: (row: TData) => boolean;
  /** `true` expands every row, or a map of row ids. */
  defaultExpanded?: ExpandedState;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [rowSelection, setRowSelection] = useState({});
  const [expanded, setExpanded] = useState<ExpandedState>(defaultExpanded);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: pageSizeOptions[0] });

  // New filter results start from page 1 (reset during render, not in an effect).
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  const allColumns: DataTableColumn<TData>[] = [
    ...(selectable ? [selectColumn<TData>()] : []),
    ...(renderExpanded ? [expandColumn<TData>()] : []),
    ...columns,
  ];

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns: allColumns,
    state: { sorting, rowSelection, pagination, expanded },
    getRowId,
    enableRowSelection: selectable,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getRowCanExpand: (row) => Boolean(renderExpanded) && (getRowCanExpand?.(row.original) ?? true),
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const rows = table.getRowModel().rows;
  const columnCount = allColumns.length;

  return (
    <div className="flex flex-col gap-3">
      {selectable && selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary-subtle px-3 py-2 text-sm" role="status">
          <span className="font-medium tabular-nums">{selectedRows.length} selected</span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions?.(selectedRows)}</div>
          <Button variant="link" size="sm" className="ml-auto" onClick={() => table.resetRowSelection()}>
            Clear selection
          </Button>
        </div>
      )}

      <div className="group/dt overflow-hidden rounded-card border" data-selecting={selectedRows.length > 0 || undefined}>
        <Table aria-label={label} aria-busy={loading || undefined}>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="group/row">
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const alignEnd = (header.column.columnDef.meta as ColumnMeta | undefined)?.align === "end";
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(alignEnd && "text-right", (header.column.id === "select" || header.column.id === "expand") && "w-10")}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "group/sort -mx-1 inline-flex items-center gap-1 rounded-sm px-1 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                            alignEnd && "flex-row-reverse",
                            sorted && "text-foreground"
                          )}
                        >
                          <table.FlexRender header={header} />
                          {sorted === "asc" ? (
                            <ArrowUpIcon aria-hidden className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon aria-hidden className="size-3.5" />
                          ) : (
                            <ArrowUpDownIcon aria-hidden className="size-3.5 opacity-0 transition-opacity group-hover/sort:opacity-50 group-focus-visible/sort:opacity-50" />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnCount }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className={cn("h-4", j === 0 && selectable ? "size-4" : "w-full max-w-32")} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    data-expanded={row.getIsExpanded() || undefined}
                    className="group/row"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const alignEnd = (cell.column.columnDef.meta as ColumnMeta | undefined)?.align === "end";
                      return (
                        <TableCell key={cell.id} className={cn(alignEnd && "text-right tabular-nums")}>
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {renderExpanded && row.getIsExpanded() && (
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={columnCount} className="p-0 whitespace-normal">
                        {renderExpanded(row.original)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="p-0 whitespace-normal">
                  {emptyState ?? <p className="py-10 text-center text-muted-foreground">No results.</p>}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paging only when the list is longer than the smallest page; selection count lives in the bulk bar. */}
      {!loading && data.length > pageSizeOptions[0] && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <p className="text-muted-foreground tabular-nums">
            {selectable
              ? `${selectedRows.length} of ${data.length.toLocaleString("en-US")} selected`
              : `${data.length.toLocaleString("en-US")} rows`}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <span id={`${label}-page-size`} className="text-muted-foreground">
              Rows per page
            </span>
            <Select value={`${pagination.pageSize}`} onValueChange={(v) => table.setPageSize(Number(v))}>
              <SelectTrigger size="sm" className="w-18" aria-labelledby={`${label}-page-size`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <p className="font-medium tabular-nums">
            Page {pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </p>
          <div className="flex items-center gap-1">
            <PageButton label="First page" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronsLeftIcon />
            </PageButton>
            <PageButton label="Previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeftIcon />
            </PageButton>
            <PageButton label="Next page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRightIcon />
            </PageButton>
            <PageButton label="Last page" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>
              <ChevronsRightIcon />
            </PageButton>
          </div>
        </div>
      )}
    </div>
  );
}

/** Per-column options read by DataTable. Set `meta: { align: "end" }` on number columns. */
export type ColumnMeta = { align?: "start" | "end" };

function PageButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button variant="outline" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}

/**
 * Controls that only matter when you act on a row (checkbox, row actions): hidden until the row is hovered
 * or focused, always shown while a selection is in progress, on checked boxes, and on devices without hover.
 * Use it on row-action wrappers in cells too.
 */
export const revealOnRowHover = cn(
  "opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100",
  "group-data-[selecting=true]/dt:opacity-100 data-[state=checked]:opacity-100 data-[state=indeterminate]:opacity-100",
  "[@media(hover:none)]:opacity-100"
);

function selectColumn<TData extends RowData>(): DataTableColumn<TData> {
  return {
    id: "select",
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows on this page"
        className={revealOnRowHover}
        checked={
          table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false
        }
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        className={revealOnRowHover}
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(v === true)}
      />
    ),
  };
}

function expandColumn<TData extends RowData>(): DataTableColumn<TData> {
  return {
    id: "expand",
    enableSorting: false,
    header: () => <span className="sr-only">Expand</span>,
    cell: ({ row }) =>
      row.getCanExpand() ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-expanded={row.getIsExpanded()}
          aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
          onClick={row.getToggleExpandedHandler()}
        >
          {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </Button>
      ) : null,
  };
}
