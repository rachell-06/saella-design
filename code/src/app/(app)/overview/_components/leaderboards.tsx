"use client";

// Leaderboards (live app EmailMetricsDashboard campaign/template boards + sender board), rebuilt on the live
// app's logic 2026-10-28: five rank choices, Highest/Lowest, gate on the metric's own denominator, Replies as a
// count on the campaign board. Each board shows its top three and links to the full list.
// Default is "All metrics" (user request 2026-10-29): most emails sent first, no medals. Picking a metric ranks the
// board by it. 2026-11-05: one right-aligned column per rate ("38.3% (467)", PATTERNS.md §9.7) replaces the 3-step
// meters; every rate stays visible and the ranked one is in medium weight, so rows compare across metrics.

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RateCell, type RateKind } from "@/components/saella/rate-meter";
import { StatusBadge } from "@/components/saella/status-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  type GroupRow,
  type RankMetric,
  type RankMode,
  type Span,
  gateUnit,
  rank,
} from "./metrics";
import { Hint } from "@/components/saella/hint";

const n = (x: number) => x.toLocaleString("en-US");
// Table layout from Studio Admin /dashboard/infrastructure (user request 2026-10-28): cells and heads px-5,
// header row muted between two hairlines, the table flush to the card edges.
// 2026-11-05: px-3 between columns so one column per rate fits; the outer cells keep px-5 to line up with the card.
const infraTable = cn(
  "table-fixed **:data-[slot=table-cell]:px-3 **:data-[slot=table-head]:px-3",
  "**:data-[slot=table-cell]:first:pl-5 **:data-[slot=table-head]:first:pl-5",
  "**:data-[slot=table-cell]:last:pr-5 **:data-[slot=table-head]:last:pr-5",
);
const infraHeader = "[&_tr]:border-y";
const card =
  "flex flex-col gap-3 overflow-hidden rounded-card border bg-card pt-3";

// Every board shows its top three, then links to the page that lists them all (user request 2026-10-28).
const TOP = 3;

export type ViewAll = { href: string; label: string };

function BoardFooter({
  viewAll,
  shown,
  total,
  unit,
}: {
  viewAll: ViewAll;
  shown: number;
  total: number;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t px-5 py-2">
      <span className="text-sm text-muted-foreground tabular-nums">
        {shown} of {total} {unit}
      </span>
      <Button variant="ghost" size="sm" asChild>
        <Link href={viewAll.href}>
          {viewAll.label}
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </Button>
    </div>
  );
}

// Board pickers as in the live app (EmailMetricsDashboard LeaderHead): one sentence, "Show [Highest] [Open rate]".
// The campaign board leads with Replies (a count); the template board with Open rate.
const DIRECTIONS: { value: RankMode; label: string }[] = [
  { value: "top", label: "Highest" },
  { value: "lowest", label: "Lowest" },
];
type BoardMetric = RankMetric | "all";
/** Rate columns per board, in the live app's order. Campaigns show replies as a count (their own column). */
const RATE_COLUMNS: Record<BoardKind, RankMetric[]> = {
  campaigns: ["open", "click", "unsub", "bounce"],
  templates: ["open", "click", "reply", "unsub", "bounce"],
};
const RATE_HEAD: Record<RankMetric, string> = {
  open: "Open",
  click: "Click",
  reply: "Reply",
  unsub: "Unsub",
  bounce: "Bounce",
};
const METRICS: Record<BoardKind, { value: BoardMetric; label: string }[]> = {
  campaigns: [
    { value: "all", label: "All metrics" },
    { value: "reply", label: "Replies" },
    { value: "open", label: "Open rate" },
    { value: "click", label: "Click rate" },
    { value: "unsub", label: "Unsubscribe rate" },
    { value: "bounce", label: "Bounce rate" },
  ],
  templates: [
    { value: "all", label: "All metrics" },
    { value: "open", label: "Open rate" },
    { value: "click", label: "Click rate" },
    { value: "reply", label: "Reply rate" },
    { value: "unsub", label: "Unsubscribe rate" },
    { value: "bounce", label: "Bounce rate" },
  ],
};

export type BoardKind = "campaigns" | "templates";


export function Leaderboard({
  kind,
  title,
  description,
  rows,
  viewAll,
}: {
  kind: BoardKind;
  title: string;
  description?: string;
  rows: GroupRow[];
  /** Where the full list lives; the board itself only shows the top three. */
  viewAll: ViewAll;
}) {
  const [metric, setMetric] = useState<BoardMetric>("all");
  const [mode, setMode] = useState<RankMode>("top");
  const replyIsCount = kind === "campaigns";
  const all = metric === "all";
  const result = all ? null : rank(rows, metric, mode, { replyIsCount });
  const ranked = (
    result
      ? result.ranked
      : [...rows].sort((a, b) => b.totals.sends - a.totals.sends)
  ).slice(0, TOP);
  // One short line (user request 2026-10-28); no method note on the page.
  const gateText =
    !result || metric === "all"
      ? "Most emails sent first. Pick a metric to rank by it."
      : metric === "reply" && replyIsCount
        ? "Ranked by number of replies."
        : result.lowered
          ? `Ranked with ${n(result.gate)}+ ${gateUnit(metric)}: few rows reach 100 yet.`
          : `Ranked with ${n(result.gate)}+ ${gateUnit(metric)}. Fewer emails rank a little lower.`;
  const metricLabel =
    METRICS[kind].find((m) => m.value === metric)?.label ?? "";
  const rateCols = RATE_COLUMNS[kind];
  const sortOf = (k: RankMetric) =>
    metric === k ? (mode === "top" ? "descending" : "ascending") : undefined;

  return (
    <section aria-labelledby={`lb-${kind}`} className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <h3
              id={`lb-${kind}`}
              className="font-heading text-base font-medium"
            >
              {title}
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label="How ranking works"
                >
                  <InfoIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">{gateText}</TooltipContent>
            </Tooltip>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          {!all && (
            <Select value={mode} onValueChange={(v) => setMode(v as RankMode)}>
              <SelectTrigger
                size="sm"
                className="w-28"
                aria-label={`${title}: highest or lowest`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  {DIRECTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          <Select
            value={metric}
            onValueChange={(v) => setMetric(v as BoardMetric)}
          >
            <SelectTrigger
              size="sm"
              className="w-44"
              aria-label={`${title}: rank by`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {METRICS[kind].map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table
        aria-label={
          all
            ? `${title}, most emails sent first`
            : `${title}, ${mode === "top" ? "highest" : "lowest"} ${metricLabel.toLowerCase()} first`
        }
        className={infraTable}
      >
        {/* Columns as in the live app boards: campaigns carry Status and Replies (a count); templates carry their
            Campaign. Sent and Delivered stay two columns (user request 2026-10-28; the live app joins them). */}
        <colgroup>
          <col className="w-12" />
          <col />
          <col className={kind === "campaigns" ? "w-28" : "w-44"} />
          <col className="w-20" />
          <col className="w-24" />
          {kind === "campaigns" && <col className="w-20" />}
          {/* Open carries the largest counts ("42.2% (1,517)"); the other rates fit in less. */}
          {rateCols.map((k) => (
            <col key={k} className={k === "open" ? "w-26" : "w-24"} />
          ))}
        </colgroup>
        <TableHeader className={infraHeader}>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>
              {kind === "campaigns" ? "Campaign" : "Template"}
            </TableHead>
            <TableHead>
              {kind === "campaigns" ? "Status" : "Campaign"}
            </TableHead>
            <TableHead
              className="text-right"
              aria-sort={all ? "descending" : undefined}
            >
              Sent
            </TableHead>
            <TableHead className="text-right">Delivered</TableHead>
            {kind === "campaigns" && (
              <TableHead
                className={cn(
                  "text-right",
                  metric === "reply" && "text-foreground",
                )}
                aria-sort={sortOf("reply")}
              >
                Replies
              </TableHead>
            )}
            {rateCols.map((k) => (
              <TableHead
                key={k}
                className={cn("text-right", metric === k && "text-foreground")}
                aria-sort={sortOf(k)}
              >
                {RATE_HEAD[k]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={(kind === "campaigns" ? 6 : 5) + rateCols.length}
                className="py-6 text-center text-muted-foreground"
              >
                {all
                  ? "No emails sent in this period."
                  : "Not enough data to rank yet."}
              </TableCell>
            </TableRow>
          ) : (
            ranked.map((r, i) => (
              <BoardRow
                key={r.id}
                kind={kind}
                row={r}
                place={i + 1}
                metric={metric}
                rateCols={rateCols}
                medals={!all && mode === "top"}
              />
            ))
          )}
        </TableBody>
      </Table>
      <BoardFooter
        viewAll={viewAll}
        shown={ranked.length}
        total={rows.length}
        unit={kind}
      />
    </section>
  );
}

function BoardRow({
  kind,
  row: r,
  place,
  metric,
  rateCols,
  medals = false,
}: {
  kind: BoardKind;
  row: GroupRow;
  place: number;
  metric: BoardMetric;
  rateCols: RankMetric[];
  /** Gold, silver and bronze for places 1–3; only when ranking highest first. */
  medals?: boolean;
}) {
  const t = r.totals;
  return (
    <TableRow>
      <TableCell className="tabular-nums text-muted-foreground">
        {medals && place <= 3 ? <Medal place={place} /> : place}
      </TableCell>
      <TableCell>
        {r.href ? (
          <Link
            href={r.href}
            className="line-clamp-2 whitespace-normal font-medium underline-offset-4 hover:underline"
            title={r.name}
          >
            {r.name}
          </Link>
        ) : (
          <span className="line-clamp-2 whitespace-normal font-medium">
            {r.name}
          </span>
        )}
      </TableCell>
      <TableCell>
        {kind === "campaigns" ? (
          r.status && <StatusBadge status={r.status} />
        ) : (
          <span className="block truncate text-muted-foreground" title={r.sub}>
            {r.sub}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{n(t.sends)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {n(t.delivered)}
      </TableCell>
      {kind === "campaigns" && (
        <TableCell
          className={cn(
            "text-right tabular-nums",
            metric === "reply" && "font-medium",
          )}
        >
          {n(t.replies)}
        </TableCell>
      )}
      {rateCols.map((k) => {
        const [part, whole] = rateParts(t, k);
        return (
          <RateCell
            key={k}
            kind={k}
            part={part}
            whole={whole}
            strong={metric === k}
          />
        );
      })}
    </TableRow>
  );
}

/** Numerator and denominator of a rate: delivery and bounce over sent, the rest over delivered (live app). */
function rateParts(t: GroupRow["totals"], k: RateKind): [number, number] {
  switch (k) {
    case "delivery":
      return [t.delivered, t.sends];
    case "open":
      return [t.opens, t.delivered];
    case "click":
      return [t.clicks, t.delivered];
    case "reply":
      return [t.replies, t.delivered];
    case "unsub":
      return [t.unsubs, t.delivered];
    case "bounce":
      return [t.bounces, t.sends];
  }
}

/** Sender health: delivery, open and bounce (click and reply depend on content, not the sender). */
const SENDER_RATES = ["delivery", "open", "bounce"] as const;

// Sender board (live app sender view, 2026-10-28): which sending identities are healthy. Not a ranking, so no
// place column or medals: every sender that sent in the period, most emails first, with its share of the volume
// (replaces the live app's pie) and the three health rates. Click and reply depend on content, not the sender.
export function SenderBoard({
  rows,
  span,
  viewAll,
}: {
  rows: GroupRow[];
  span: Span;
  viewAll: ViewAll;
}) {
  const [domain, setDomain] = useState("all");
  const domains = [
    ...new Set(rows.map((r) => r.domain).filter(Boolean) as string[]),
  ].sort();
  const shown = rows
    .filter((r) => domain === "all" || r.domain === domain)
    .sort((a, b) => b.totals.sends - a.totals.sends);
  const total = shown.reduce((x, r) => x + r.totals.sends, 0);
  return (
    <section aria-labelledby="lb-senders" className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4">
        <div className="flex flex-col gap-0.5">
          <h3 id="lb-senders" className="font-heading text-base font-medium">
            Senders
          </h3>
          <p className="text-sm text-muted-foreground">
            Every address that sent {span.label}, most emails first.
          </p>
        </div>
        {domains.length > 1 && (
          <Select value={domain} onValueChange={setDomain}>
            <SelectTrigger
              size="sm"
              className="w-56"
              aria-label="Sending domain"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                <SelectItem value="all">All domains</SelectItem>
                {domains.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>
      <Table aria-label="Senders" className={infraTable}>
        <colgroup>
          <col />
          <col className="w-56" />
          <col className="w-56" />
          {SENDER_RATES.map((k) => (
            <col key={k} className="w-26" />
          ))}
        </colgroup>
        <TableHeader className={infraHeader}>
          <TableRow>
            <TableHead>Sender</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Sent</TableHead>
            {SENDER_RATES.map((k) => (
              <TableHead key={k} className="text-right">
                {k === "delivery" ? "Delivery" : RATE_HEAD[k]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3 + SENDER_RATES.length}
                className="py-6 text-center text-muted-foreground"
              >
                No sends from this domain {span.label}.
              </TableCell>
            </TableRow>
          ) : (
            shown.map((r) => {
              const t = r.totals;
              const share = total ? t.sends / total : 0;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex min-w-0 flex-col">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{r.name}</span>
                        {r.flag === "shared" && (
                          <Hint label="Shared sender: up to 1,000 emails a month">
                            <Badge variant="info">
                              Shared
                            </Badge>
                          </Hint>
                        )}
                        {r.flag === "unconfirmed" && (
                          <Hint label="Not confirmed: this address can't send until it is">
                            <Badge variant="warning">
                              Unconfirmed
                            </Badge>
                          </Hint>
                        )}
                      </span>
                      <span
                        className="truncate text-sm text-muted-foreground"
                        title={r.sub}
                      >
                        {r.sub}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className="truncate text-muted-foreground"
                    title={r.domain}
                  >
                    {r.domain}
                  </TableCell>
                  {/* Share of the period's volume; neutral color because more volume is neither good nor bad. */}
                  <Hint label={`${(share * 100).toFixed(1)}% of emails sent ${span.label}`}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-baseline justify-between gap-2 text-dense font-medium">
                          <span className="tabular-nums">{n(t.sends)}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {Math.round(share * 100)}%
                          </span>
                        </span>
                        <Progress
                          value={share * 100}
                          aria-label={`${Math.round(share * 100)}% of emails sent`}
                          className="h-1.5 bg-muted-foreground/20 *:data-[slot=progress-indicator]:bg-muted-foreground"
                        />
                      </div>
                    </TableCell>
                  </Hint>
                  {SENDER_RATES.map((k) => {
                    const [part, whole] = rateParts(t, k);
                    return (
                      <RateCell key={k} kind={k} part={part} whole={whole} />
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between gap-3 border-t px-5 py-2">
        <span className="text-sm text-muted-foreground tabular-nums">
          {shown.length} {shown.length === 1 ? "sender" : "senders"} ·{" "}
          {domains.length} {domains.length === 1 ? "domain" : "domains"}
        </span>
        <Button variant="ghost" size="sm" asChild>
          <Link href={viewAll.href}>
            {viewAll.label}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

// Top three get a medal (live app rankCell), only when ranking highest first: in "lowest" order first place is
// the worst, so a medal would mislead. The place is in the label, so the color is not the only signal.
const MEDALS = [
  {
    label: "1st place",
    className: "bg-warning-soft text-warning-soft-foreground ring-warning",
  },
  {
    label: "2nd place",
    className: "bg-muted text-muted-foreground ring-muted-foreground/50",
  },
  {
    label: "3rd place",
    className: "bg-primary-soft text-primary-soft-foreground ring-brand",
  },
];

// A numbered medal (user reference 2026-10-28): the place stays readable, and the three tints differ in
// lightness too, not only in hue.
function Medal({ place }: { place: number }) {
  const m = MEDALS[place - 1];
  return (
    <Hint label={m.label}>
      <span
        aria-label={m.label}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-dense font-semibold ring-2",
          m.className,
        )}
      >
        {place}
      </span>
    </Hint>
  );
}
