"use client";

// Deliverability, Clicks and Recipients tabs of the batch report (live app components/email/report/*).

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheetIcon, SearchIcon } from "lucide-react";
import { formatDateTime, rate } from "@/lib/mock/campaigns";
import { KpiStrip, KpiStripItem } from "@/components/saella/kpi-strip";
import { rateKpi } from "@/components/saella/rate-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type RecipientEvent, type ReportBatch, domainStats, linkStats, recipientRows } from "@/lib/mock/batches";
import { exportToast } from "./export";
import { INTENTS, type ReplyIntent, type ReplyRow, withReplies } from "@/lib/mock/replies";

const n = (x: number) => x.toLocaleString("en-US");

// ---------------------------------------------------------------------------------------------------------------
// Deliverability: results by recipient domain (AC-EC-O-06).

export function DeliverabilityTab({ batch }: { batch: ReportBatch }) {
  const rows = useMemo(() => recipientRows(batch), [batch]);
  const domains = useMemo(() => domainStats(rows), [rows]);
  const [all, setAll] = useState(false);
  const met = batch.metrics!;
  const complaint = rate(met.complaints, met.delivered);
  const shown = all ? domains : domains.slice(0, 12);

  return (
    <div className="flex flex-col gap-6">
      <KpiStrip>
        {/* Same wording as the Overview tab (rateKpi, 2026-11-05); the pause level is in the bounce tooltip. */}
        <KpiStripItem label="Delivery rate" {...rateKpi("delivery", met.delivered, batch.sent)} />
        <KpiStripItem label="Bounce rate" {...rateKpi("bounce", met.bounces, batch.sent)} />
        <KpiStripItem label="Spam complaints" value={complaint?.text} muted={complaint?.lowSample} note={`${n(met.complaints)} · pauses at 0.3%`} />
        <KpiStripItem label="Recipient domains" value={n(domains.length)} note={domains[0] ? `Most: ${domains[0].domain}` : undefined} />
      </KpiStrip>
      <p className="-mt-3 text-sm text-subtle-foreground">
        Bounced and unsubscribed addresses are suppressed automatically and won&apos;t be emailed again. A domain with a
        high bounce rate usually means old addresses at that company.
      </p>

      <div className="overflow-hidden rounded-lg border">
        <Table aria-label="Results by recipient domain">
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead className="text-right">Bounced</TableHead>
              <TableHead className="text-right">Opened</TableHead>
              <TableHead className="text-right">Clicked</TableHead>
              <TableHead className="text-right">Unsubscribed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((d) => {
              const bounced = rate(d.bounced, d.sends);
              const high = !!bounced && !bounced.lowSample && d.bounced / d.sends >= 0.1;
              return (
                <TableRow key={d.domain}>
                  <TableCell className="font-medium">{d.domain}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(d.sends)}</TableCell>
                  <RateCell part={d.delivered} whole={d.sends} />
                  <RateCell part={d.bounced} whole={d.sends} danger={high} />
                  <RateCell part={d.opened} whole={d.delivered} />
                  <RateCell part={d.clicked} whole={d.delivered} />
                  <RateCell part={d.unsubscribed} whole={d.delivered} />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {domains.length > shown.length && (
          <div className="border-t px-2 py-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setAll(true)}>
              Show all {domains.length} domains
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function RateCell({ part, whole, danger }: { part: number; whole: number; danger?: boolean }) {
  const r = rate(part, whole);
  return (
    <TableCell
      className={cn("text-right tabular-nums", r?.lowSample && "text-subtle-foreground", danger && "font-medium text-destructive")}
      title={r ? `${n(part)} of ${n(whole)}${r.lowSample ? " · too few to judge" : ""}` : undefined}
    >
      {r?.text ?? ""}
    </TableCell>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Clicks: every link, sortable by clicks (AC-EC-O-04), exportable (AC-EC-X-01).

export function ClicksTab({ batch, fileBase }: { batch: ReportBatch; fileBase: string }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"totalClicks" | "uniqueClicks">("totalClicks");
  const met = batch.metrics!;
  const links = useMemo(() => linkStats(batch), [batch]);
  const q = query.trim().toLowerCase();
  const shown = links.filter((l) => !q || l.url.toLowerCase().includes(q)).sort((a, b) => b[sort] - a[sort]);
  const click = rate(met.clicks, met.delivered);

  return (
    <div className="flex flex-col gap-6">
      <KpiStrip>
        <KpiStripItem label="Click rate" value={click?.text} muted={click?.lowSample} note={`${n(met.clicks)} people clicked`} />
        <KpiStripItem label="Total clicks" value={n(met.totalClicks)} />
        <KpiStripItem label="Unique clicks" value={n(met.clicks)} />
        <KpiStripItem label="Links in this email" value={n(links.length)} />
      </KpiStrip>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <InputGroup className="w-80">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput type="search" aria-label="Filter by URL" placeholder="Filter by URL" value={query} onChange={(e) => setQuery(e.target.value)} />
        </InputGroup>
        <Button variant="outline" disabled={links.length === 0} onClick={() => exportToast("link clicks", `${fileBase}-links`)}>
          <FileSpreadsheetIcon data-icon="inline-start" />
          Export links
        </Button>
      </div>

      {shown.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{links.length === 0 ? "No links in this email" : "No links match"}</EmptyTitle>
            <EmptyDescription>{links.length === 0 ? "Add a link to the template to measure clicks." : "Try part of the address instead."}</EmptyDescription>
          </EmptyHeader>
          {links.length > 0 && (
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                Clear filter
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table aria-label="Link performance">
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <SortHead label="Unique clicks" active={sort === "uniqueClicks"} onClick={() => setSort("uniqueClicks")} />
                <SortHead label="Total clicks" active={sort === "totalClicks"} onClick={() => setSort("totalClicks")} />
                <TableHead className="w-48">Share of clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((l) => {
                const share = met.totalClicks ? l.totalClicks / met.totalClicks : 0;
                return (
                  <TableRow key={l.url}>
                    <TableCell className="max-w-0 truncate" title={l.url}>
                      {l.url}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{n(l.uniqueClicks)}</TableCell>
                    <TableCell className="text-right tabular-nums">{n(l.totalClicks)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={share * 100}
                          aria-label={`${Math.round(share * 100)}% of clicks`}
                          className="h-1.5 max-w-24 *:data-[slot=progress-indicator]:bg-brand"
                        />
                        <span className="text-sm tabular-nums text-muted-foreground">{Math.round(share * 100)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SortHead({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <TableHead className="text-right" aria-sort={active ? "descending" : "none"}>
      <Button variant="ghost" size="sm" className={cn("-mr-2", !active && "text-muted-foreground")} onClick={onClick}>
        {label}
        {active && <span aria-hidden>↓</span>}
      </Button>
    </TableHead>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Recipients: who did what (AC-EC-O-05), search + filter by event (live app RecipientActivityTab filters).

type EventFilter = "all" | "pending" | "delivered" | "opened" | "unopened" | "clicked" | "replied" | "bounced" | "unsubscribed" | "complained";

const FILTERS: { value: EventFilter; label: string; test: (r: ReplyRow) => boolean }[] = [
  { value: "all", label: "Everyone", test: () => true },
  { value: "pending", label: "Not sent yet", test: (r) => r.status === "pending" },
  { value: "delivered", label: "Delivered", test: (r) => r.delivered },
  { value: "opened", label: "Opened", test: (r) => r.opened },
  { value: "unopened", label: "Didn't open", test: (r) => r.delivered && !r.opened },
  { value: "clicked", label: "Clicked", test: (r) => r.clicked },
  { value: "replied", label: "Replied", test: (r) => !!r.reply },
  { value: "bounced", label: "Bounced", test: (r) => r.bounced },
  { value: "unsubscribed", label: "Unsubscribed", test: (r) => r.unsubscribed },
  { value: "complained", label: "Marked as spam", test: (r) => r.complained },
];

const STATUS_BADGE: Record<RecipientEvent, { label: string; variant: "secondary" | "info" | "success" | "destructive" | "warning" | "outline" }> = {
  pending: { label: "Queued", variant: "outline" },
  delivered: { label: "Delivered", variant: "secondary" },
  opened: { label: "Opened", variant: "info" },
  clicked: { label: "Clicked", variant: "success" },
  bounced: { label: "Bounced", variant: "destructive" },
  unsubscribed: { label: "Unsubscribed", variant: "warning" },
  complained: { label: "Marked as spam", variant: "destructive" },
};

const PAGE = 50;

export function RecipientsTab({ batch, fileBase }: { batch: ReportBatch; fileBase: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rows = useMemo(() => withReplies(batch, recipientRows(batch)), [batch]);
  const eventParam = params.get("event") as EventFilter | null;
  const filter: EventFilter = FILTERS.some((f) => f.value === eventParam) ? eventParam! : "all";
  // Intent narrows Replied only (?event=replied&intent=meet); with any other event it is ignored.
  const intentParam = params.get("intent") as ReplyIntent | null;
  const intent = filter === "replied" && INTENTS.some((i) => i.value === intentParam) ? intentParam : null;
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  // The event filter lives in the URL so the agent and notifications can link to "who bounced".
  function setFilter(v: string, nextIntent?: string) {
    const next = new URLSearchParams(params.toString());
    if (v === "all") next.delete("event");
    else next.set("event", v);
    if (v === "replied" && nextIntent) next.set("intent", nextIntent);
    else next.delete("intent");
    setLimit(PAGE);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.value, rows.filter(f.test).length])) as Record<EventFilter, number>,
    [rows]
  );
  const intentCounts = useMemo(
    () => Object.fromEntries(INTENTS.map((i) => [i.value, rows.filter((r) => r.reply?.intent === i.value).length])) as Record<ReplyIntent, number>,
    [rows]
  );
  const q = query.trim().toLowerCase();
  const test = FILTERS.find((f) => f.value === filter)!.test;
  const matched = rows.filter((r) => test(r) && (!intent || r.reply?.intent === intent) && (!q || r.email.includes(q) || r.name.toLowerCase().includes(q) || r.company.toLowerCase().includes(q)));
  const shown = matched.slice(0, limit);
  const filtering = filter !== "all" || q !== "";
  const noReplies = filter === "replied" && counts.replied === 0 && !q;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="w-80">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search recipients"
              placeholder="Search name, email or company"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
            />
          </InputGroup>
          <span className="text-sm text-muted-foreground tabular-nums">
            {n(matched.length)} {matched.length === 1 ? "person" : "people"}
          </span>
        </div>
        <Button variant="outline" disabled={matched.length === 0} onClick={() => exportToast(`${n(matched.length)} recipients`, `${fileBase}-recipients-${intent ?? filter}`)}>
          <FileSpreadsheetIcon data-icon="inline-start" />
          Export recipients
        </Button>
      </div>

      {/* Event chips with counts replace the dropdown (2026-10-29, learned from Apollo/Unify): every count is
          visible at once and one click filters. Radix lets a single group deselect; that falls back to Everyone. */}
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        aria-label="Filter by event"
        className="flex-wrap"
        value={filter}
        onValueChange={(v) => setFilter(v || "all")}
      >
        {FILTERS.filter((f) => f.value !== "pending" || counts.pending > 0).map((f) => (
          <ToggleGroupItem key={f.value} value={f.value} aria-label={`${f.label}, ${n(counts[f.value])}`}>
            {f.label}
            <span className="text-muted-foreground tabular-nums">{n(counts[f.value])}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* Replied opens a second row of chips by intent (ĐX R6, 2026-10-29, Apollo "Recent replies" / Unify): who
          wants a meeting is the first follow-up. Hidden at 0 replies; the empty state below explains instead. */}
      {filter === "replied" && counts.replied > 0 && (
        <div className="-mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            aria-label="Filter replies by intent"
            className="flex-wrap"
            value={intent ?? "any"}
            onValueChange={(v) => setFilter("replied", v === "any" ? undefined : v)}
          >
            <ToggleGroupItem value="any" aria-label={`All replies, ${n(counts.replied)}`}>
              All replies
              <span className="text-muted-foreground tabular-nums">{n(counts.replied)}</span>
            </ToggleGroupItem>
            {INTENTS.map((i) => (
              <ToggleGroupItem key={i.value} value={i.value} aria-label={`${i.label}, ${n(intentCounts[i.value])}`}>
                {i.label}
                <span className="text-muted-foreground tabular-nums">{n(intentCounts[i.value])}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="text-sm text-subtle-foreground">Sorted by what the reply says. Check before acting on it.</span>
        </div>
      )}

      {matched.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{rows.length === 0 ? "No recipients yet" : noReplies ? "No replies yet" : "Nobody matches"}</EmptyTitle>
            <EmptyDescription>
              {rows.length === 0
                ? "Recipients appear here once the batch starts sending."
                : noReplies
                  ? "Replies to the reply-to address show up here, sorted by intent. Most arrive within two days of sending."
                  : intent
                    ? "No replies of this kind. Try another intent or All replies."
                    : "Try another event or search term."}
            </EmptyDescription>
          </EmptyHeader>
          {filtering && rows.length > 0 && (
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table aria-label="Recipient activity" className="text-dense">
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reply</TableHead>
                <TableHead className="text-right">Opens</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => {
                const s = STATUS_BADGE[r.status];
                const reply = r.reply && INTENTS.find((i) => i.value === r.reply!.intent)!;
                // A reply is the latest thing that happened, so it moves Last activity too.
                const last = r.reply && (!r.lastActivity || r.reply.at > r.lastActivity) ? r.reply.at : r.lastActivity;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground">{r.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.company}</TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {reply && (
                        <div className="flex flex-col items-start gap-0.5">
                          <Badge variant={reply.variant}>{reply.label}</Badge>
                          <span className="text-muted-foreground">{formatDateTime(r.reply!.at)}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.opens || ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.clicks || ""}</TableCell>
                    <TableCell className="text-muted-foreground">{last ? formatDateTime(last) : ""}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {matched.length > shown.length && (
            <div className="flex items-center justify-between border-t px-4 py-2 text-sm text-muted-foreground">
              <span className="tabular-nums">
                Showing {n(shown.length)} of {n(matched.length)}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, matched.length - shown.length)} more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
