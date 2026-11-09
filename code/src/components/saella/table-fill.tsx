import { cn } from "@/lib/utils";

// Full-height table area (2026-10-28, learned from Studio Admin /dashboard/products): wrap a DataTable in this
// and give the wrapper a bounded height (e.g. `flex-1 min-h-0` inside a full-height screen). The table body
// scrolls inside its border with the header row stuck on top, while the selection bar above and the paging row
// below stay in view. Fixes long lists (50–100 rows) where the bulk actions and column names scrolled away.
// Styles DataTable from outside so data-table.tsx stays untouched; it relies on its structure
// (root column → bordered box holding [data-slot=table-container] → paging row).
export function TableFill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        // DataTable root fills the wrapper.
        "*:min-h-0 *:flex-1",
        // The bordered box becomes the scroller.
        "[&_div:has(>[data-slot=table-container])]:min-h-0 [&_div:has(>[data-slot=table-container])]:flex-1 [&_div:has(>[data-slot=table-container])]:overflow-auto",
        // The table's own x-scroller would trap the sticky header; let the box scroll both ways instead.
        "[&_[data-slot=table-container]]:overflow-visible",
        "[&_[data-slot=table-header]]:sticky [&_[data-slot=table-header]]:top-0 [&_[data-slot=table-header]]:z-10",
        className
      )}
    >
      {children}
    </div>
  );
}
