"use client";

// Batch report: /batches/[id]/report?tab=overview|deliverability|clicks|recipients (PRD-02 AC-EC-O-01..07, live
// app batches/[id]/report/*). Header = what was sent, to whom, from whom (operator + send-as, BR-RULE-EC-44);
// then status (progress while sending, reason when failed or paused), then four tabs. Overview is the default
// tab (AC-EC-O-07). Rates follow the live app: open/click/reply/unsub over delivered, bounce over sent, machine
// traffic excluded (AC-EC-K-07), grey below 20 sends (BR-RULE-EC-21). Reply is a headline rate (live app OverviewTab
// "Performance"); "View email" shows the email as sent (AC-EC-O-03); "Other batches of this template" stands in for
// the live app's cross-batch comparison. Not built: industry benchmark and top locations (AC-EC-O-03), which have no
// data in the mock or, for locations, in the live app yet.
// Preview states (?state=): loading, error, paused (shows b2 as paused by the workspace auto-pause).

import { SCROLL_CARD_TABLE } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  CircleAlertIcon,
  CirclePauseIcon,
  FileSpreadsheetIcon,
  InboxIcon,
  InfoIcon,
  MailIcon,
  RotateCwIcon,
  SearchXIcon,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatDate, formatDateTime, rate } from "@/lib/mock/campaigns";
import { contactsHref } from "@/lib/mock/contacts";
import { WORKSPACE_TZ_LABEL } from "@/lib/time";
import { METRIC_COLOR } from "@/lib/metric-colors";
import { Hint } from "@/components/saella/hint";
import { detailsFor, findTemplate } from "@/lib/mock/templates";
import { EmailBody, TagText } from "@/components/features/email-body";
import { PageHeader } from "@/components/layout/page-header";
import { KpiStrip, KpiStripItem } from "@/components/saella/kpi-strip";
import { RateCell, rateKpi } from "@/components/saella/rate-meter";
import { StatusBadge } from "@/components/saella/status-badge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type ReportBatch,
  SEND_PER_HOUR,
  SUBJECTS,
  allBatches,
  batchCode,
  batchTitle,
  getBatch,
  hourlySnapshot,
  linkStats,
  memberById,
  senderById,
  updateCreatedBatch,
} from "@/lib/mock/batches";
import { exportToast } from "./export";
import { ClicksTab, DeliverabilityTab, RecipientsTab } from "./report-tabs";
import { SubjectText } from "./subject-text";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "deliverability", label: "Deliverability" },
  { value: "clicks", label: "Clicks" },
  { value: "recipients", label: "Recipients" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const n = (x: number) => x.toLocaleString("en-US");

export function ReportRoute() {
  const { id } = useParams<{ id: string }>();
  // Keyed by id so moving between batches starts fresh (state is seeded from the batch).
  return <ReportScreen key={id} id={id} />;
}

export function ReportScreen({ id }: { id: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = params.get("state");
  const tabParam = params.get("tab");
  const tab: Tab = TABS.some((t) => t.value === tabParam) ? (tabParam as Tab) : "overview";

  const [batch, setBatch] = useState<ReportBatch | undefined>(() => {
    const b = getBatch(id);
    // Preview of a batch stopped by the workspace auto-pause (BR-RULE-EC-19).
    if (b && state === "paused" && b.status === "sending")
      return { ...b, status: "paused", reason: "Bounces reached 10.4% over the last 7 days." };
    return b;
  });

  // A batch created in this session "sends" in the background: the worker drips recipients out.
  const live = batch?.status === "sending" && batch.id.startsWith("n");
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => {
      setBatch((b) => {
        if (!b || b.status !== "sending" || !b.metrics) return b;
        const sent = Math.min(b.recipients, b.sent + Math.max(1, Math.ceil(b.recipients / 30)));
        const bounces = Math.round(sent * 0.012);
        const delivered = sent - bounces;
        const opens = Math.round(delivered * 0.22);
        const clicks = Math.round(delivered * 0.03);
        const next: ReportBatch = {
          ...b,
          sent,
          status: sent >= b.recipients ? "sent" : "sending",
          metrics: { ...b.metrics, delivered, bounces, opens, clicks, totalOpens: Math.round(opens * 1.3), totalClicks: Math.round(clicks * 1.2), botOpens: Math.round(opens * 0.2), botClicks: Math.round(clicks * 0.3) },
        };
        updateCreatedBatch(b.id, next);
        return next;
      });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [live]);

  function setTab(v: string) {
    const next = new URLSearchParams(params.toString());
    if (v === "overview") next.delete("tab");
    else next.set("tab", v);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  if (state === "loading") return <ReportSkeleton />;

  if (state === "error") {
    return (
      <>
        <PageHeader title="Batch report" description="Delivery, engagement and replies for this send." breadcrumbs={[{ label: "Templates", href: "/templates" }]} />
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Couldn&apos;t load this report</AlertTitle>
          <AlertDescription>Check your connection and try again. The batch itself is not affected.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => router.replace(pathname)}>
              <RotateCwIcon data-icon="inline-start" />
              Retry
            </Button>
          </AlertAction>
        </Alert>
      </>
    );
  }

  if (!batch) {
    return (
      <>
        <PageHeader title="Batch report" description="Delivery, engagement and replies for this send." breadcrumbs={[{ label: "Templates", href: "/templates" }]} />
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>Batch not found</EmptyTitle>
            <EmptyDescription>It may belong to another workspace, or the link is incomplete.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link href="/templates">Back to Templates</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </>
    );
  }

  const tpl = findTemplate(batch.templateId);
  const sender = senderById(batch.senderId);
  const operator = memberById(batch.operatorId);
  const hasResults = !!batch.metrics && batch.sent > 0;
  const draft = batch.status === "draft";
  // Nothing went out yet (draft) or ever (failed): the people fields say who it is from and to, not who it was sent to.
  const unsent = draft || batch.sent === 0;
  const fileBase = `batch-${batchCode(batch).slice(1)}`;
  // Batches only send now (decisions.md "Gửi batch": Save draft + Send now); timing lives on schedules.
  const when = batch.sentAt
    ? // Still going out (or held by a pause): it started then, it isn't "sent" yet.
      `${batch.status === "sending" || batch.status === "paused" ? "Started" : "Sent"} ${formatDateTime(batch.sentAt)} ${WORKSPACE_TZ_LABEL}`
    : `Created ${formatDate(batch.createdOn, true)}`;

  return (
    <>
      <PageHeader
        title={batchTitle(batch)}
        // A batch is a send of one template: Templates › the template; the sidebar marks Templates.
        breadcrumbs={[
          { label: "Templates", href: "/templates" },
          ...(tpl ? [{ label: tpl.template.name, href: `/templates/${tpl.template.id}` }] : []),
        ]}
        // "Export report" vs the tabs' "Export links" / "Export recipients": each label names the data it exports.
        actions={
          <>
            <SentEmailDialog batch={batch} />
            {hasResults && (
              <Button size="sm" variant="outline" onClick={() => exportToast("this report", fileBase)}>
                <FileSpreadsheetIcon data-icon="inline-start" />
                Export report
              </Button>
            )}
            {/* A draft's one next step, the page's solid button. Back to Review with the picks saved on the draft; a draft
without them (seed data, or after a reload) starts at Recipients. */}
            {draft && (
              <Button size="sm" asChild>
                <Link href={`/batches/new?template=${encodeURIComponent(batch.templateId)}&draft=${encodeURIComponent(batch.id)}`}>
                  Continue
                </Link>
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {/* Only the workspace auto-pause stops a batch (BR-RULE-EC-18/19), so a paused batch says so. */}
          <StatusBadge status={batch.status} label={batch.status === "paused" ? "Auto-paused" : undefined} />
          <span>{when}</span>
        </div>
      </PageHeader>

      {/* What was sent, to whom and from whom. Columns sized to their content; when the row is full, short items keep
          their width and only the long ones truncate (grid shares the rest equally up to each item's max-content). The
          row never wraps, so no divider can start a row: long values truncate with a tooltip instead. */}
      <dl className="grid grid-cols-[repeat(6,minmax(0,max-content))] divide-x divide-border rounded-card border bg-card px-4 py-3 text-sm">
        <Meta label="Template" value={tpl?.template.name ?? "Deleted template"} href={tpl ? `/templates/${tpl.template.id}` : undefined} />
        <Meta label="Subject" value={SUBJECTS[batch.templateId] ?? "–"}>
          <SubjectText subject={SUBJECTS[batch.templateId] ?? "–"} />
        </Meta>
        <Meta label={unsent ? "From" : "Sent as"} value={sender ? `${sender.name} <${sender.email}>` : "–"} />
        <Meta label={draft ? "Created by" : "Sent by"} value={operator?.name ?? "–"} />
        {/* A batch to Saella companies has no contact tags. The batch went to anyone carrying any of its
            tags, so the link lists that union, not the contacts carrying all of them. */}
        <Meta
          label={unsent ? "To" : "Sent to"}
          value={batch.tags.length ? batch.tags.join(", ") : "Saella companies"}
          href={batch.tags.length ? contactsHref(batch.tags, { any: true }) : undefined}
        />
        {/* Paused: the unsent ones are held, so they read as waiting, not failed. */}
        <Meta
          label="Recipients"
          value={
            batch.status === "paused"
              ? `${n(batch.recipients)} · ${n(batch.recipients - batch.sent)} waiting`
              : n(batch.recipients)
          }
          href={hasResults ? `${pathname}?tab=recipients` : undefined}
        />
      </dl>

      <StatusPanel batch={batch} />

      <div className="flex flex-col gap-6">
        {/* No tabs without results (draft, failed, nothing delivered yet): every tab would show the same empty state. */}
        {!hasResults ? (
          <NoResults batch={batch} />
        ) : (
          // Each view is its tab's panel, so a tab's aria-controls points at a real region.
          <Tabs value={tab} onValueChange={setTab} className="gap-6">
            <TabsList aria-label="Report sections">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="overview" className="text-base">
              <OverviewTab
                batch={batch}
                onOpenClicks={() => setTab("clicks")}
                peopleHref={(event) => `${pathname}?tab=recipients${event ? `&event=${event}` : ""}`}
              />
            </TabsContent>
            <TabsContent value="deliverability" className="text-base">
              <DeliverabilityTab batch={batch} />
            </TabsContent>
            <TabsContent value="clicks" className="text-base">
              <ClicksTab batch={batch} fileBase={fileBase} />
            </TabsContent>
            <TabsContent value="recipients" className="text-base">
              <RecipientsTab batch={batch} fileBase={fileBase} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}

// The full value in a tooltip, since long ones truncate (shadcn Tooltip, not a native title).
function Meta({ label, value, href, children }: { label: string; value: string; href?: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-6 first:pl-0 last:pr-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <Tooltip>
        <TooltipTrigger asChild>
          <dd className="truncate font-medium">
            {href ? (
              <Link href={href} className="text-primary underline-offset-4 hover:underline">
                {value}
              </Link>
            ) : (
              (children ?? value)
            )}
          </dd>
        </TooltipTrigger>
        <TooltipContent className="max-w-80">{value}</TooltipContent>
      </Tooltip>
    </div>
  );
}

// Progress while sending; the reason when it stopped.
function StatusPanel({ batch }: { batch: ReportBatch }) {
  if (batch.status === "sending") {
    const pct = Math.round((batch.sent / Math.max(1, batch.recipients)) * 100);
    const left = batch.recipients - batch.sent;
    const minutes = Math.ceil(left / (SEND_PER_HOUR / 60));
    return (
      <div className="flex flex-col gap-2 rounded-card border p-4" role="status" aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium tabular-nums">
            Sending: {n(batch.sent)} of {n(batch.recipients)} ({pct}%)
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {minutes < 60 ? `About ${minutes} min left` : `About ${(minutes / 60).toFixed(1)} hours left`}
          </p>
        </div>
        <Progress value={pct} aria-label={`${pct}% sent`} className="h-1.5 *:data-[slot=progress-indicator]:bg-brand" />
      </div>
    );
  }
  // Auto-paused: the unsent emails are held, not failed, and go out once Saella lifts the pause (PRD Master v1.2.9
  // "holds the queue"; not PRD-02 EC-EC-08 "marked failed"). No Resume: Saella lifts it.
  if (batch.status === "paused") {
    return (
      // Same alert as Overview's (warning, matching the amber "Auto-paused" badge); the counts are in the header line.
      <Alert variant="warning">
        <CirclePauseIcon />
        <AlertTitle>Sending is paused for this workspace</AlertTitle>
        <AlertDescription>
          {/* The count is in the header ("228 waiting"). */}
          {batch.reason} The rest are waiting and go out once Saella lifts
          the pause.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/sending">Sending health</Link>
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  if (batch.status === "failed") {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>This batch didn&apos;t send</AlertTitle>
        <AlertDescription>{batch.reason ?? "Something went wrong before the first email went out."} Nobody received it.</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/batches/new?template=${batch.templateId}`}>Send again</Link>
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  return null;
}

// Continue for a draft is the header's solid button, so the empty state only explains.
function NoResults({ batch }: { batch: ReportBatch }) {
  const copy =
    batch.status === "draft"
      ? { title: "This batch is a draft", body: "Continue to review and send it." }
      : batch.status === "failed"
        ? { title: "No results", body: "Nothing was sent, so there is nothing to report." }
        : { title: "No results yet", body: "The first emails are on their way. This page updates as they're delivered." };
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>{copy.title}</EmptyTitle>
        <EmptyDescription>{copy.body}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

// Colours from the one metric map (Opens teal, Clicks gold), as Overview's Send volume.
const chartConfig = {
  opens: { label: "Opens", color: METRIC_COLOR.opens },
  clicks: { label: "Clicks", color: METRIC_COLOR.clicks },
} satisfies ChartConfig;

function OverviewTab({
  batch,
  onOpenClicks,
  peopleHref,
}: {
  batch: ReportBatch;
  onOpenClicks: () => void;
  /** Recipients tab filtered to one event, so each headline number opens the people behind it. */
  peopleHref: (event?: string) => string;
}) {
  const met = batch.metrics!;
  const sent = batch.sent;
  const links = useMemo(() => linkStats(batch).sort((a, b) => b.totalClicks - a.totalClicks), [batch]);
  const hourly = useMemo(() => hourlySnapshot(batch), [batch]);
  const ctor = rate(met.clicks, met.opens);
  const complaint = rate(met.complaints, met.delivered);
  const lastOpened = batch.sentAt ? new Date(new Date(batch.sentAt).getTime() + 26 * 3_600_000).toISOString() : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Headline rates (AC-EC-O-01) plus delivery (AC-EC-O-02). */}
      {/* Same six rates, pattern and wording as Overview and Campaigns (rateKpi); Reply as the live app OverviewTab
          "Performance". */}
      <KpiStrip>
        <KpiStripItem
          label="Delivery rate"
          {...rateKpi("delivery", met.delivered, sent)}
          href={peopleHref("delivered")}
          hrefLabel="See who it was delivered to"
        />
        <KpiStripItem
          label="Open rate"
          {...rateKpi("open", met.opens, met.delivered)}
          href={peopleHref("opened")}
          hrefLabel="See who opened"
        />
        <KpiStripItem
          label="Click rate"
          {...rateKpi("click", met.clicks, met.delivered)}
          href={peopleHref("clicked")}
          hrefLabel="See who clicked"
        />
        <KpiStripItem
          label="Reply rate"
          {...rateKpi("reply", met.replies, met.delivered)}
          href={peopleHref("replied")}
          hrefLabel="See who replied"
        />
        <KpiStripItem
          label="Bounce rate"
          {...rateKpi("bounce", met.bounces, sent)}
          href={peopleHref("bounced")}
          hrefLabel="See who bounced"
        />
        <KpiStripItem
          label="Unsubscribe rate"
          {...rateKpi("unsub", met.unsubs, met.delivered)}
          href={peopleHref("unsubscribed")}
          hrefLabel="See who unsubscribed"
        />
      </KpiStrip>

      {/* items-start: Top links sizes to its rows instead of stretching to the chart with empty space. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>First 24 hours</CardTitle>
            <CardDescription>Opens and clicks per hour after sending</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
              <AreaChart data={hourly} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} interval={2} />
                <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
                <Area dataKey="opens" type="monotone" stroke="var(--color-opens)" fill="var(--color-opens)" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
                <Area dataKey="clicks" type="monotone" stroke="var(--color-clicks)" fill="var(--color-clicks)" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top links</CardTitle>
            <CardDescription>By total clicks</CardDescription>
            <CardAction>
              <Button variant="link" size="sm" className="px-0" onClick={onOpenClicks}>
                All links
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {links.length === 0 ? (
              <p className="text-sm text-muted-foreground">No links in this email.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {links.slice(0, 5).map((l) => {
                  const share = met.totalClicks ? l.totalClicks / met.totalClicks : 0;
                  return (
                    <li key={l.url} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate" title={l.url}>
                          {l.url.replace(/^https:\/\//, "")}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {n(l.totalClicks)} · {Math.round(share * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={share * 100}
                        aria-label={`${Math.round(share * 100)}% of clicks`}
                        className="h-1.5 *:data-[slot=progress-indicator]:bg-brand"
                      />
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <OtherBatches batch={batch} />

      {/* Secondary numbers (AC-EC-O-02). */}
      <section aria-labelledby="more-details" className="flex flex-col gap-3">
        <div className="flex items-center gap-1">
          <h2 id="more-details" className="font-heading text-base font-medium">
            More details
          </h2>
          {/* Machine traffic (AC-EC-K-07) is a footnote to every number, not a number to act on. */}
          <Hint label={`${n(met.botOpens + met.botClicks)} machine opens and clicks are left out of every number.`}>
            <Button variant="ghost" size="icon-xs" aria-label="About these numbers" className="text-muted-foreground">
              <InfoIcon />
            </Button>
          </Hint>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-card border p-4 text-sm tabular-nums md:grid-cols-4">
          <Detail label="Total opens" value={n(met.totalOpens)} />
          <Detail label="Total clicks" value={n(met.totalClicks)} />
          <Detail label="Clicks per unique open" value={ctor?.text ?? "–"} />
          <Detail label="Forwarded" value={n(met.forwarded)} />
          <Detail label="Last opened" value={met.opens && lastOpened ? formatDateTime(lastOpened) : "–"} />
          <Detail label="Last clicked" value={met.clicks && lastOpened ? formatDateTime(lastOpened) : "–"} />
          <Detail label="Spam complaints" value={`${n(met.complaints)}${complaint && met.complaints ? ` (${complaint.text})` : ""}`} />
        </dl>
      </section>
    </div>
  );
}

// The email as sent (AC-EC-O-03, B-07 snapshot; live app preview beside Top links). Merge tags stay as chips:
// each recipient got their own values.
function SentEmailDialog({ batch }: { batch: ReportBatch }) {
  const details = detailsFor(batch.templateId);
  const subject = SUBJECTS[batch.templateId] ?? details.subject;
  const sender = senderById(batch.senderId);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MailIcon data-icon="inline-start" />
          View email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email as sent</DialogTitle>
          <DialogDescription>Merge tags were filled in for each recipient.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">From</dt>
          <dd className="truncate">{sender ? `${sender.name} <${sender.email}>` : "–"}</dd>
          <dt className="text-muted-foreground">Subject</dt>
          <dd className="font-medium">
            <TagText text={subject} mode="edit" />
          </dd>
        </dl>
        <div className="email-canvas max-h-112 overflow-y-auto rounded-lg border p-6">
          <EmailBody blocks={details.blocks} html={details.html} kind={details.kind} mode="edit" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// This batch against the latest other sends of the same template (live app OverviewTab "Benchmarking": other
// batches of the template, AC-EC-O-03). One rate per column, numbers only (DESIGN.md §2). Hidden with no other
// batch to compare (PATTERNS 9.15: no one-row block).
function OtherBatches({ batch }: { batch: ReportBatch }) {
  const others = allBatches()
    .filter((b) => b.id !== batch.id && b.templateId === batch.templateId && b.metrics && b.sent > 0 && b.status !== "sending")
    .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))
    .slice(0, 3);
  if (others.length === 0) return null;
  const rows = [batch, ...others];
  const divider = "border-r border-border/50 last:border-r-0";
  return (
    <section aria-labelledby="other-batches" className="flex flex-col gap-3">
      <h2 id="other-batches" className="font-heading text-base font-medium">
        Other batches of this template
      </h2>
      <div className={cn("overflow-hidden rounded-card border", SCROLL_CARD_TABLE)}>
        <Table aria-label="This batch and other batches of the same template">
          <TableHeader>
            <TableRow>
              <TableHead className={divider}>Batch</TableHead>
              <TableHead className={divider}>Date</TableHead>
              <TableHead className={divider}>Sent</TableHead>
              <TableHead className={divider}>Delivery</TableHead>
              <TableHead className={divider}>Open</TableHead>
              <TableHead className={divider}>Click</TableHead>
              <TableHead className={divider}>Reply</TableHead>
              <TableHead className={divider}>Bounce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => {
              const met = b.metrics!;
              const current = b.id === batch.id;
              return (
                <TableRow key={b.id}>
                  <TableCell className={`${divider} max-w-64`}>
                    {current ? (
                      <span className="font-medium">This batch</span>
                    ) : (
                      <Link href={`/batches/${b.id}/report`} className="truncate text-primary underline-offset-4 hover:underline">
                        {batchTitle(b)}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className={`${divider} text-muted-foreground`}>{b.sentAt ? formatDate(b.sentAt.slice(0, 10), true) : ""}</TableCell>
                  <TableCell className={`${divider} tabular-nums`}>{n(b.sent)}</TableCell>
                  <RateCell className={divider} kind="delivery" part={met.delivered} whole={b.sent} strong={current} />
                  <RateCell className={divider} kind="open" part={met.opens} whole={met.delivered} strong={current} />
                  <RateCell className={divider} kind="click" part={met.clicks} whole={met.delivered} strong={current} />
                  <RateCell className={divider} kind="reply" part={met.replies} whole={met.delivered} strong={current} />
                  <RateCell className={divider} kind="bounce" part={met.bounces} whole={b.sent} strong={current} />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-8 w-96" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
