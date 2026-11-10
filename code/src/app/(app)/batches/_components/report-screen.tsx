"use client";

// Batch report: /batches/[id]/report?tab=overview|deliverability|clicks|recipients (PRD-02 AC-EC-O-01..07, live
// app batches/[id]/report/*). Header = what was sent, to whom, from whom (operator + send-as, BR-RULE-EC-44);
// then status (progress while sending, reason when failed or paused), then four tabs. Overview is the default
// tab (AC-EC-O-07). Rates follow the live app: open/click/unsub over delivered, bounce over recipients, machine
// traffic excluded (AC-EC-K-07), grey below 20 sends (BR-RULE-EC-21).
// Preview states (?state=): loading, error, paused (shows b2 as paused by the workspace auto-pause).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CircleAlertIcon,
  CirclePauseIcon,
  FileSpreadsheetIcon,
  InboxIcon,
  RotateCwIcon,
  SearchXIcon,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { formatDate, formatDateTime, rate } from "@/lib/mock/campaigns";
import { PageHeader } from "@/components/layout/page-header";
import { KpiStrip, KpiStripItem } from "@/components/saella/kpi-strip";
import { rateKpi } from "@/components/saella/rate-meter";
import { StatusBadge } from "@/components/saella/status-badge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type ReportBatch,
  SEND_PER_HOUR,
  SUBJECTS,
  batchCode,
  batchTitle,
  findTemplate,
  getBatch,
  hourlySnapshot,
  linkStats,
  listById,
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
      return { ...b, status: "paused", reason: "Sending is paused for this workspace: bounces reached 10.4% over the last 7 days." };
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
        <PageHeader title="Batch report" breadcrumbs={[{ label: "Overview", href: "/overview" }]} />
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
        <PageHeader title="Batch report" breadcrumbs={[{ label: "Overview", href: "/overview" }]} />
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
              <Link href="/overview">Back to Overview</Link>
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
  const fileBase = `batch-${batchCode(batch).slice(1)}`;
  const when =
    batch.status === "scheduled" && batch.scheduledFor
      ? `Scheduled for ${formatDateTime(batch.scheduledFor)}`
      : batch.sentAt
        ? // Still going out (or held by a pause): it started then, it isn't "sent" yet.
          `${batch.status === "sending" || batch.status === "paused" ? "Started" : "Sent"} ${formatDateTime(batch.sentAt)}`
        : `Created ${formatDate(batch.createdOn, true)}`;

  return (
    <>
      <PageHeader
        title={batchTitle(batch)}
        breadcrumbs={[
          { label: "Overview", href: "/overview" },
          ...(tpl ? [{ label: tpl.campaign.name, href: `/overview?campaign=${tpl.campaign.id}` }] : []),
        ]}
        // "Export report" vs the tabs' "Export links"/"Export recipients" (2026-10-28): three buttons all read
        // "Export to Excel" on Clicks and Recipients, with no hint which data each one exported.
        actions={
          hasResults && (
            <Button variant="outline" onClick={() => exportToast("this report", fileBase)}>
              <FileSpreadsheetIcon data-icon="inline-start" />
              Export report
            </Button>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusBadge status={batch.status} />
          <span>{when}</span>
        </div>
      </PageHeader>

      {/* What was sent, to whom and from whom. Columns sized to their content (2026-10-28): equal columns cut the
          subject and the send-as address short while "Sent by" sat half empty. When the row is full, short items keep
          their width and only the long ones truncate (grid shares the rest equally up to each item's max-content). */}
      <dl className="grid grid-cols-[repeat(5,minmax(0,max-content))] justify-between gap-x-8 text-sm">
        <Meta label="Template" value={tpl?.template.name ?? "Deleted template"} href={tpl ? `/templates/${tpl.template.id}` : undefined} />
        <Meta label="Subject" value={SUBJECTS[batch.templateId] ?? "–"}>
          <SubjectText subject={SUBJECTS[batch.templateId] ?? "–"} />
        </Meta>
        <Meta label="Sent as" value={sender ? `${sender.name} <${sender.email}>` : "–"} />
        <Meta label="Sent by" value={operator?.name ?? "–"} />
        <Meta
          label="Lists"
          value={batch.listIds.map((l) => listById(l)?.name ?? l).join(", ")}
          href={batch.listIds.length === 1 ? `/contacts/${batch.listIds[0]}` : undefined}
        />
      </dl>

      <StatusPanel batch={batch} />

      <div className="flex flex-col gap-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Report sections">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {!hasResults ? (
          <NoResults batch={batch} />
        ) : tab === "overview" ? (
          <OverviewTab
            batch={batch}
            onOpenClicks={() => setTab("clicks")}
            peopleHref={(event) => `${pathname}?tab=recipients${event ? `&event=${event}` : ""}`}
          />
        ) : tab === "deliverability" ? (
          <DeliverabilityTab batch={batch} />
        ) : tab === "clicks" ? (
          <ClicksTab batch={batch} fileBase={fileBase} />
        ) : (
          <RecipientsTab batch={batch} fileBase={fileBase} />
        )}
      </div>
    </>
  );
}

// The full value in a tooltip, since long ones truncate (shadcn Tooltip, not a native title).
function Meta({ label, value, href, children }: { label: string; value: string; href?: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <Tooltip>
        <TooltipTrigger asChild>
          <dd className="truncate">
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

// Progress while sending; the reason when it stopped; what happens next when scheduled.
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
        <p className="text-sm text-muted-foreground">
          Saella sends gradually to protect your reputation. Rates fill in as emails are delivered and opened.
        </p>
      </div>
    );
  }
  if (batch.status === "paused") {
    return (
      <Alert variant="warning">
        <CirclePauseIcon />
        <AlertTitle>
          Paused after {n(batch.sent)} of {n(batch.recipients)}
        </AlertTitle>
        <AlertDescription>
          {batch.reason} The other {n(batch.recipients - batch.sent)} stay queued and continue when an admin resumes sending.
        </AlertDescription>
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
  if (batch.status === "scheduled") {
    return (
      <Alert variant="info">
        <CalendarClockIcon />
        <AlertTitle>Goes out {batch.scheduledFor ? formatDateTime(batch.scheduledFor) : "later"}</AlertTitle>
        <AlertDescription>
          {n(batch.recipients)} recipients. People who unsubscribe or bounce before then are skipped.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => toast.success("Schedule cancelled", { description: "Nothing was sent. The template is unchanged." })}>
            Cancel schedule
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  return null;
}

function NoResults({ batch }: { batch: ReportBatch }) {
  const copy =
    batch.status === "scheduled"
      ? { title: "Results appear after it sends", body: "Opens, clicks and bounces show here once the first emails go out." }
      : batch.status === "draft"
        ? { title: "This batch is a draft", body: "Finish it to send. Drafts have no results." }
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
      {batch.status === "draft" && (
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href={`/batches/new?template=${batch.templateId}`}>Continue</Link>
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

const chartConfig = {
  opens: { label: "Opens", color: "var(--chart-1)" },
  clicks: { label: "Clicks", color: "var(--chart-2)" },
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
      <KpiStrip>
        <KpiStripItem
          label="Recipients"
          value={n(batch.recipients)}
          note={batch.status === "sending" ? `${n(sent)} sent so far` : `${n(sent)} sent`}
          href={peopleHref()}
          hrefLabel="See all recipients"
        />
        {/* Same pattern and wording as Overview and Campaigns (rateKpi, 2026-11-05). */}
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

      {/* items-start: Top links sizes to its rows instead of stretching to the chart with empty space (2026-11-05). */}
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
                        <span className="shrink-0 tabular-nums text-muted-foreground">{n(l.totalClicks)}</span>
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

      {/* Secondary numbers (AC-EC-O-02). */}
      <section aria-labelledby="more-details" className="flex flex-col gap-3">
        <h2 id="more-details" className="font-heading text-base font-medium">
          More details
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-card border p-4 text-sm tabular-nums md:grid-cols-4">
          <Detail label="Total opens" value={n(met.totalOpens)} />
          <Detail label="Total clicks" value={n(met.totalClicks)} />
          <Detail label="Clicks per unique open" value={ctor?.text ?? "–"} />
          <Detail label="Forwarded" value={n(met.forwarded)} />
          <Detail label="Last opened" value={met.opens && lastOpened ? formatDateTime(lastOpened) : "–"} />
          <Detail label="Last clicked" value={met.clicks && lastOpened ? formatDateTime(lastOpened) : "–"} />
          <Detail label="Spam complaints" value={`${n(met.complaints)}${complaint && met.complaints ? ` (${complaint.text})` : ""}`} />
          <Detail label="Machine traffic removed" value={`${n(met.botOpens + met.botClicks)} events`} />
        </dl>
      </section>
    </div>
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
