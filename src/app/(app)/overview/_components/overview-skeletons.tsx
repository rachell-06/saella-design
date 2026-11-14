"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CardHead, card, frame, headRow } from "./leaderboards";

// Skeletons of the Overview boards: the real card, title and column headers, the same
// column widths (colgroup copied from leaderboards.tsx) and row count, so nothing moves when the rows arrive.

/** twoLine: the real cell has a name and a second line under it (row ~69px instead of ~49px). */
type Col = { label: string; end?: boolean; width?: string; twoLine?: boolean };

const RATE_COLS: Col[] = [
  { label: "Open", end: true, width: "w-28" },
  { label: "Click", end: true, width: "w-24" },
];

export const BOARD_COLUMNS = {
  campaignLeaderboard: [
    { label: "#", width: "w-14" },
    { label: "Campaign" },
    { label: "Status", width: "w-28" },
    { label: "Delivered / Recip.", end: true, width: "w-36" },
    ...RATE_COLS,
    { label: "Replies", end: true, width: "w-20" },
    { label: "Unsub", end: true, width: "w-24" },
    { label: "Bounce", end: true, width: "w-24" },
  ],
  templateLeaderboard: [
    { label: "#", width: "w-14" },
    { label: "Template" },
    { label: "Campaign", width: "w-44" },
    { label: "Delivered / Recip.", end: true, width: "w-36" },
    ...RATE_COLS,
    { label: "Replied", end: true, width: "w-24" },
    { label: "Unsub", end: true, width: "w-24" },
    { label: "Bounce", end: true, width: "w-24" },
  ],
  templateLeaderboardFull: [
    { label: "#", width: "w-14" },
    { label: "Template", twoLine: true },
    { label: "Delivered / Recip.", end: true, width: "w-36" },
    ...RATE_COLS,
    { label: "Replied", end: true, width: "w-24" },
    { label: "Unsub", end: true, width: "w-24" },
    { label: "Bounce", end: true, width: "w-24" },
    { label: "Last sent", width: "w-28" },
  ],
  templatesInCampaign: [
    { label: "#", width: "w-14" },
    { label: "Template" },
    { label: "Delivered / Recip.", end: true, width: "w-36" },
    ...RATE_COLS,
    { label: "Bounce", end: true, width: "w-24" },
    { label: "Unsub", end: true, width: "w-24" },
    { label: "Last sent", width: "w-32" },
  ],
  deliverability: [
    { label: "Recipient domain" },
    { label: "Delivered / Recipients", end: true, width: "w-44" },
    ...RATE_COLS,
    { label: "Reply", end: true, width: "w-24" },
    { label: "Unsub", end: true, width: "w-24" },
    { label: "Bounce", end: true, width: "w-28" },
  ],
  senders: [
    { label: "Sender", twoLine: true },
    { label: "Domain", width: "w-48" },
    { label: "Sent", end: true, width: "w-20" },
    { label: "Delivery", end: true, width: "w-28" },
    { label: "Open", end: true, width: "w-28" },
    { label: "Bounce", end: true, width: "w-28" },
  ],
} satisfies Record<string, Col[]>;

/** Same min width as the real table: its fixed columns (Tailwind w-N = N/4 rem) + 12.5rem for the name column. */
const minRem = (columns: Col[]) =>
  columns.reduce((x, c) => x + (c.width ? Number(c.width.replace("w-", "")) / 4 : 12.5), 0);

/** A board while its rows load: the real header, then skeleton rows the height of real ones. */
export function BoardSkeleton({
  title,
  subtitle,
  columns,
  rows = 5,
  ranked = false,
  controls = false,
  footer = false,
  pie = false,
  chartHeight,
}: {
  title: string;
  subtitle?: string;
  columns: Col[];
  rows?: number;
  /** First column holds the place medals (24px circles) of a leaderboard. */
  ranked?: boolean;
  /** Leaderboard controls ([Highest ▾] [All metrics ▾], real widths) on the right of the title. */
  controls?: boolean;
  /** Footer row with "View all →", only when the real board will show it (more rows than BOARD_TOP). */
  footer?: boolean;
  /** Sender board: a pie and its legend on the left of the table, as in SenderBoard. */
  pie?: boolean;
  /** A chart above the table, in px. With no columns the card is the chart alone (Template view ranked chart). */
  chartHeight?: number;
}) {
  const table = (
      <Table aria-hidden className={cn("table-fixed", frame)} style={{ minWidth: `${minRem(columns)}rem` }}>
        <colgroup>
          {columns.map((c, i) => (
            <col key={i} className={c.width} />
          ))}
        </colgroup>
        <TableHeader className={headRow}>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.label}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, r) => (
            <TableRow key={r} className="hover:bg-transparent">
              {columns.map((c, i) => (
                <TableCell key={c.label}>
                  <div
                    className={cn(
                      "flex h-5 items-center",
                      c.twoLine && "h-10 flex-col items-start justify-center gap-1.5",
                      // Real place slots: #1 medal 28px, #2–3 24px, 4+ a number 22px tall.
                      ranked && i === 0 && (r === 0 ? "h-7" : r < 3 ? "h-6" : "h-5.5")
                    )}
                  >
                    {c.twoLine ? (
                      <>
                        <Skeleton className={cn("h-3.5", r % 2 ? "w-1/2" : "w-2/3")} />
                        <Skeleton className="h-3 w-1/3" />
                      </>
                    ) : ranked && i === 0 && r < 3 ? (
                      // Same sizes as the real medals: #1 is larger (leaderboards.tsx MEDALS).
                      <Skeleton className={cn("rounded-full", r === 0 ? "size-7" : "size-6")} />
                    ) : (
                      <Skeleton className={cn("h-3.5", c.width ? "w-3/5" : r % 2 ? "w-1/2" : "w-2/3")} />
                    )}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );
  return (
    <section aria-label={title} className={cn(card, columns.length === 0 ? "pb-4" : footer || controls ? "" : "pb-1")}>
      <CardHead id={`${title}-loading`} title={title} subtitle={subtitle}>
        {controls && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-32" />
          </div>
        )}
      </CardHead>
      {chartHeight && (
        <div className="px-5">
          <Skeleton className="w-full" style={{ height: chartHeight }} />
        </div>
      )}
      {columns.length > 0 &&
        (pie ? (
          <div className="grid items-start gap-4 border-t pt-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="flex flex-col items-center gap-3 px-5 pb-4">
              <Skeleton className="size-56 rounded-full" />
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-5 items-center">
                  <Skeleton className="h-3.5 w-48" />
                </div>
                <div className="flex h-5 items-center">
                  <Skeleton className="h-3.5 w-32" />
                </div>
              </div>
            </div>
            {table}
          </div>
        ) : (
          table
        ))}
      {footer && (
        <div className="-mt-3 flex justify-end border-t px-3 py-1.5">
          <Skeleton className="h-7 w-20" />
        </div>
      )}
    </section>
  );
}
