"use client";

import { SCROLL_TABLE_FILL } from "@/lib/scroll";
import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The recipient tables of New batch › Recipients, built like the Leads tables (companies-table.tsx): a bordered
// frame that fills the space left, the selection line on top, rows scrolling under a sticky header, and the Leads
// footer ("1 – 50 of 36 companies", page buttons; no Rows per page).
// Local because DataTable has no "select all matching" and no exported pager.

const n = (x: number) => x.toLocaleString("en-US");

/** Header cell, body cell and table classes shared with Leads (companies-table.tsx). */
export const HEAD_CELL = "border-r border-b border-border/50 bg-table-head last:border-r-0";
export const BODY_CELL = "h-12 border-r border-b border-border/50 py-2 last:border-r-0";
export const TABLE = "border-separate border-spacing-0";
export const HEADER = "sticky top-0 z-10 bg-table-head";

export type Paging<T> = {
  rows: T[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  total: number;
  setPageIndex: (i: number) => void;
  setPageSize: (s: number) => void;
};

/** One page of `items`; a new list (filter, search) starts again from page 1. Live app: 50 a page. */
export function usePaging<T>(items: T[], initialSize = 50): Paging<T> {
  const [pageSize, setSize] = useState(initialSize);
  const [page, setPage] = useState(0);
  const [prev, setPrev] = useState(items);
  if (items !== prev) {
    setPrev(items);
    if (page !== 0) setPage(0);
  }
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const pageIndex = Math.min(page, pageCount - 1);
  return {
    rows: items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    pageIndex,
    pageSize,
    pageCount,
    total: items.length,
    setPageIndex: setPage,
    setPageSize: (s) => {
      setSize(s);
      setPage(0);
    },
  };
}

export function TableFrame<T>({
  status,
  paging,
  noun,
  label,
  children,
  className,
}: {
  /** The selection line above the table ("12 of 36 selected · Clear selection"). */
  status: React.ReactNode;
  paging: Paging<T>;
  /** Plural noun for the footer count, e.g. "companies". */
  noun: string;
  /** Accessible name of the page buttons. */
  label: string;
  /** The <Table>; it scrolls inside the frame. */
  children: React.ReactNode;
  className?: string;
}) {
  const { pageIndex, pageSize, pageCount, total } = paging;
  const start = Math.max(0, Math.min(pageIndex - 2, pageCount - 5));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i);
  return (
    <div
      className={cn(
        // Low floor (min-h-48): on a laptop with an alert above, the rows scroll inside instead of the frame spilling over
        // Back / Continue.
        "flex min-h-48 flex-1 flex-col overflow-hidden rounded-lg border",
        SCROLL_TABLE_FILL,
        className
      )}
    >
      <div
        className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5 text-sm text-muted-foreground tabular-nums"
        role="status"
      >
        {status}
      </div>
      {children}
      {/* Only with 2+ pages: on one page "1 – 8 of 8" repeats the selection line above. */}
      {pageCount > 1 && (
      <footer className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background px-4 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          {total > 0 && (
            <span className="tabular-nums" aria-live="polite">
              {n(pageIndex * pageSize + 1)} – {n(Math.min((pageIndex + 1) * pageSize, total))} of {n(total)} {noun}
            </span>
          )}
          {/* No Rows per page here: 50 a page and Select all N matching are enough; the Leads tables keep it. */}
        </div>
        {pageCount > 1 && (
          <nav aria-label={label} className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={pageIndex === 0}
              onClick={() => paging.setPageIndex(pageIndex - 1)}
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
                onClick={() => paging.setPageIndex(page)}
              >
                {page + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => paging.setPageIndex(pageIndex + 1)}
            >
              <ChevronRightIcon />
            </Button>
          </nav>
        )}
      </footer>
      )}
    </div>
  );
}
