"use client";

import { type CSSProperties, Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CircleAlertIcon,
  CopyIcon,
  EyeIcon,
  FolderIcon,
  FileSpreadsheetIcon,
  LockIcon,
  PencilIcon,
  RotateCwIcon,
  SearchIcon,
  SendIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import {
  CURRENT_USER,
  type Template,
  campaignStatus,
  formatDate,
  formatDateTime,
  rate,
  sampleCampaigns,
} from "@/lib/mock/campaigns";
import { type RecipientEvent, type RecipientRow, type ReportBatch, allBatches, batchTitle, recipientRows } from "@/lib/mock/batches";
import { senders } from "@/lib/mock/workspace";
import { useCreatedCampaigns } from "@/lib/mock/created-campaigns";
import { PageHeader } from "@/components/layout/page-header";
import { Hint } from "@/components/saella/hint";
import { KpiStrip, KpiStripItem, type MetricDelta } from "@/components/saella/kpi-strip";
import { RateCell, rateKpi } from "@/components/saella/rate-meter";
import { StatusBadge } from "@/components/saella/status-badge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { FilterChips, FilterMultiSelect, FilterPopover, FilterSelect } from "@/components/saella/filter-popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { LockedTip } from "@/components/features/automate-dialog";
import { AutomationPanel } from "@/components/features/automation-panel";
import { EmailBody } from "@/components/features/email-body";
import {
  SAMPLE_VALUES,
  type Viewer,
  accessFor,
  canEdit,
  detailsFor,
  findTemplate,
  ownerName,
  resolveTags,
  viewerFor,
} from "@/lib/mock/templates";
import { SendButton, TemplateMenu, sendBlockedReason, useCopyTemplate } from "@/components/features/template-menu";
import { useTemplateStore } from "@/lib/mock/use-template-store";

// One template's results across every send (live app EmailTemplateAnalytics; Repo src/lib/email/analytics.ts
// TemplateRollup). Layout follows the live page (user decision 2026-11-12), section by section: header (name,
// status; Edit + Send batch), Performance card (sent line + six rates in 3 × 2) with the content preview beside
// it, Performance trend (one point per batch), Link performance, Send history, All recipients (Resend beside
// the title; Export, event filter select with counts, search on the right). Added: Automation (schedule + follow-up chain),
// next to Link performance. Not carried over: the Company / Self-upload audience tabs and the Audience type
// column (contacts are one tag-grouped book here, decisions.md "Leads › Self-upload").
// Rates: delivery and bounce over sent, the rest over delivered; under 20 sends grey (rate-meter.tsx).
// Colour accents (kept to two): Reply rate delta, trend lines. Status colour stays on badges only.
// Preview states: ?state=loading | error | paused | locked | member.

const divider = "border-r border-border/50 last:border-r-0";
// Section card → table frame (Studio Admin "Recent Leads", designer 2026-11-12, PATTERNS 9.1): the table sits in its
// own rounded bordered frame inside the card's padding; its header row is the warm table-head token (no grey),
// opaque so scrolled rows pass under it.
const tableFrame = "overflow-hidden rounded-lg border";
const n = (x: number) => x.toLocaleString("en-US");

export function TemplateDetailScreen({ id }: { id: string }) {
  const params = useSearchParams();
  const created = useCreatedCampaigns();
  const copyTargets = useMemo(() => [...created, ...sampleCampaigns], [created]);
  const previewState = params.get("state");
  const viewer = viewerFor(previewState);
  const router = useRouter();
  // Status, owner, shares, deletes and copies from the ⋯ menu (lib/mock/template-store.ts).
  useTemplateStore();
  const found = findTemplate(id);
  const copyTo = useCopyTemplate(viewer);
  // /templates/<id>#automation (row menu "Automate" on the Templates list): bring the Automation card into view.
  useEffect(() => {
    if (window.location.hash === "#automation") document.getElementById("automation")?.scrollIntoView({ block: "start" });
  }, []);

  const sendingBlocked =
    previewState === "paused"
      ? "Sending is paused for this workspace"
      : previewState === "locked"
        ? "Verify a sending domain and confirm a sender first"
        : undefined;

  const myBatches = useMemo(
    () =>
      allBatches()
        .filter((b) => b.templateId === id)
        .sort((a, b) => (b.sentAt ?? b.scheduledFor ?? b.createdOn).localeCompare(a.sentAt ?? a.scheduledFor ?? a.createdOn)),
    [id]
  );

  if (previewState === "loading") return <DetailSkeleton />;
  // Deleted from the ⋯ menu, or a copy made in a session that has ended (reload).
  if (!found) return <GoneState />;
  const { template, campaign } = found;
  const details = detailsFor(id);
  const access = accessFor(template, viewer);
  const mayEdit = canEdit(access);

  const ended = campaignStatus(campaign) === "ended";
  const sentBatches = myBatches.filter((b) => b.sent > 0 && b.metrics);
  const hasSends = sentBatches.length > 0;
  const error = previewState === "error";

  return (
    <>
      <PageHeader
        title={template.name}
        breadcrumbs={[{ label: "Templates", href: "/templates" }]}
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/templates/${id}/edit`}>
                {mayEdit ? <PencilIcon data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
                {mayEdit ? "Edit" : "View content"}
              </Link>
            </Button>
            <SendButton template={template} viewer={viewer} sendingBlocked={sendingBlocked} variant="default" />
            <TemplateMenu
              template={template}
              viewer={viewer}
              campaigns={copyTargets}
              showAnalytics={false}
              showEdit={false}
              onAutomate={() => document.getElementById("automation")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              triggerVariant="outline"
              onDeleted={() => router.push("/templates")}
            />
          </>
        }
      >
        {/* Live app: name + status tag only. Saella adds the campaign link; the owner only when it isn't yours. */}
        <dl className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
          <dt className="sr-only">Status</dt>
          <dd>
            <StatusBadge status={template.status === "active" ? "template-active" : "template-inactive"} />
          </dd>
          <dt className="sr-only">Campaign</dt>
          <dd className="flex items-center gap-1.5">
            <span aria-hidden className="mr-1">
              ·
            </span>
            <FolderIcon aria-hidden className="size-3.5" />
            <Link href={`/campaigns?c=${campaign.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
              {campaign.name}
            </Link>
            {ended && " (ended)"}
          </dd>
          {template.owner !== CURRENT_USER && (
            <>
              <dt className="sr-only">Owner</dt>
              <dd>{access === "shared" ? `Shared by ${ownerName(template.owner)}` : `Owner ${ownerName(template.owner)}`}</dd>
            </>
          )}
        </dl>
      </PageHeader>

      {previewState === "paused" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Sending is paused for this workspace</AlertTitle>
          <AlertDescription>Too many messages bounced or were marked as spam. An admin can resume sending in Settings.</AlertDescription>
        </Alert>
      )}
      {previewState === "locked" && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>Sending is locked</AlertTitle>
          <AlertDescription>Verify a sending domain and confirm a sender to send batches.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/domain">Go to Domain</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}
      {!mayEdit && (
        <Alert>
          <LockIcon />
          <AlertTitle>You can view and copy this template</AlertTitle>
          <AlertDescription>To edit or send it, ask {ownerName(template.owner)} to share it with you.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => copyTo(template, campaign)}>
              <CopyIcon data-icon="inline-start" />
              Make a copy
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* Live order: performance overview with the content preview beside it, trend, link performance, send
          history, all recipients. */}
      <div className="grid items-stretch gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {error ? (
          <Alert variant="destructive" className="self-start">
            <CircleAlertIcon />
            <AlertTitle>Results didn&apos;t load</AlertTitle>
            <AlertDescription>The template is fine; only its numbers are missing. Try again in a moment.</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/templates/${id}`}>
                  <RotateCwIcon data-icon="inline-start" />
                  Retry
                </Link>
              </Button>
            </AlertAction>
          </Alert>
        ) : (
          <PerformanceCard template={template} batches={sentBatches} fallbackReplies={details.replies} />
        )}
        <ContentCard id={id} mayEdit={mayEdit} />
      </div>

      {!error && hasSends && <TrendCard batches={sentBatches} />}

      {!error && <LinksCard links={details.links} sent={hasSends} />}
      {/* Full width, right above Send history: the batches a schedule sends land there (designer 2026-11-13). */}
      <AutomationCard templateId={id} viewer={viewer} />

      {!error && <BatchesCard template={template} batches={myBatches} viewer={viewer} sendingBlocked={sendingBlocked} />}
      {!error && hasSends && <RecipientsCard template={template} batches={myBatches} viewer={viewer} sendingBlocked={sendingBlocked} />}

    </>
  );
}

// Live app "Performance" card: one line on how much was sent, then five rates (open, click, reply / bounce,
// unsubscribe; the live app's click-to-open is left out). Delivery sits in that first line; its threshold flag stays on each
// batch row below. One data source (PATTERNS.md §9.7): sums of the same batches the tables below list; a template
// whose batches carry no metrics keeps its own totals. Accent: Reply rate (the outcome a template is judged by)
// carries a delta, latest batch vs the batches before it.
function PerformanceCard({ template, batches, fallbackReplies }: { template: Template; batches: ReportBatch[]; fallbackReplies: number }) {
  const sum = (list: ReportBatch[], k: "delivered" | "opens" | "clicks" | "bounces" | "unsubs" | "replies") => list.reduce((x, b) => x + b.metrics![k], 0);
  const t = batches.length
    ? { recipients: batches.reduce((x, b) => x + b.sent, 0), delivered: sum(batches, "delivered"), opens: sum(batches, "opens"), clicks: sum(batches, "clicks"), bounces: sum(batches, "bounces"), unsubs: sum(batches, "unsubs") }
    : template;
  const replies = batches.length ? sum(batches, "replies") : fallbackReplies;
  const delivery = rate(t.delivered, t.recipients);

  // Latest batch vs the ones before it, both with at least 20 delivered (BR-RULE-EC-21).
  const [latest, ...earlier] = batches;
  const earlierDelivered = earlier.length ? sum(earlier, "delivered") : 0;
  let replyDelta: MetricDelta | undefined;
  if (latest && latest.metrics && latest.metrics.delivered >= 20 && earlierDelivered >= 20) {
    const now = (latest.metrics.replies / latest.metrics.delivered) * 100;
    const before = (sum(earlier, "replies") / earlierDelivered) * 100;
    const diff = now - before;
    if (Math.abs(diff) >= 0.1)
      replyDelta = { value: `${diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)} pts`, direction: diff > 0 ? "up" : "down", good: diff > 0, period: "Latest batch vs earlier batches" };
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h2>Performance</h2>
        </CardTitle>
        <CardDescription className="tabular-nums">
          {t.recipients && template.lastSent
            ? `${n(batches.length || 1)} ${batches.length === 1 ? "batch" : "batches"} · ${n(t.recipients)} sent · ${delivery?.text ?? "–"} delivered · last sent ${formatDate(template.lastSent)}`
            : "Not sent yet. Numbers show here after the first batch."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <KpiStrip>
          <KpiStripItem label="Open rate" {...rateKpi("open", t.opens, t.delivered)} />
          <KpiStripItem label="Click rate" {...rateKpi("click", t.clicks, t.delivered)} />
          <KpiStripItem label="Reply rate" {...rateKpi("reply", replies, t.delivered)} delta={replyDelta} />
        </KpiStrip>
        {/* No Click-to-open (designer 2026-11-13): it is Click ÷ Open, both shown above. Engagement on the first
            line, the warning rates on the second. */}
        <KpiStrip>
          <KpiStripItem label="Bounce rate" {...rateKpi("bounce", t.bounces, t.recipients)} />
          <KpiStripItem label="Unsubscribe" {...rateKpi("unsub", t.unsubs, t.delivered)} />
        </KpiStrip>
      </CardContent>
    </Card>
  );
}

// Live app: a preview of the template beside the performance card; it opens the editor.
function ContentCard({ id, mayEdit }: { id: string; mayEdit: boolean }) {
  const details = detailsFor(id);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h2>Content</h2>
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/templates/${id}/edit`}>{mayEdit ? "Edit" : "View"}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5 text-sm">
          <span className="font-medium">{resolveTags(details.subject, SAMPLE_VALUES) || "No subject"}</span>
          {details.preheader && <span className="truncate text-muted-foreground">{resolveTags(details.preheader, SAMPLE_VALUES)}</span>}
        </div>
        {/* A clipped, inert preview of the body (no fade: no gradients in the UI). */}
        <div aria-hidden className="email-canvas pointer-events-none relative max-h-44 overflow-hidden rounded-lg border p-4 select-none">
          <EmailBody blocks={details.blocks} html={details.html} kind={details.kind} mode="preview" values={SAMPLE_VALUES} footer={false} />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Performance trend (live app "Performance trend"): one point per sent batch, oldest first, rates in %. Batches
// under 20 delivered are left out (too few to judge). Series picker as on Overview's Send volume.

const TREND = {
  open: { label: "Open", color: "var(--chart-2)" },
  click: { label: "Click", color: "var(--chart-5)" },
  reply: { label: "Reply", color: "var(--chart-4)" },
  bounce: { label: "Bounce", color: "var(--chart-1)" },
  unsub: { label: "Unsubscribe", color: "var(--chart-3)" },
} satisfies ChartConfig;
type TrendKey = keyof typeof TREND;

function TrendCard({ batches }: { batches: ReportBatch[] }) {
  const [series, setSeries] = useState<TrendKey[]>(["open", "click", "reply"]);
  const usable = batches.filter((b) => b.metrics && b.metrics.delivered >= 20);
  const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
  const points = [...usable].reverse().map((b) => {
    const m = b.metrics!;
    return {
      label: b.sentAt ? formatDate(b.sentAt) : batchTitle(b),
      open: pct(m.opens, m.delivered),
      click: pct(m.clicks, m.delivered),
      reply: pct(m.replies, m.delivered),
      bounce: pct(m.bounces, b.sent),
      unsub: pct(m.unsubs, m.delivered),
    };
  });
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h2>Performance trend</h2>
        </CardTitle>
        <CardDescription>One point per batch, oldest first.</CardDescription>
        <CardAction>
          <div role="group" aria-label="Rates to show" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {(Object.keys(TREND) as TrendKey[]).map((key) => {
              const on = series.includes(key);
              const last = on && series.length === 1;
              const cid = `trend-${key}`;
              return (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={cid}
                    checked={on}
                    disabled={last}
                    onCheckedChange={(c) => setSeries(c ? [...series, key] : series.filter((k) => k !== key))}
                    style={{ "--series": TREND[key].color } as CSSProperties}
                    className="border-(--series) data-checked:border-(--series) data-checked:bg-(--series) data-checked:text-background disabled:opacity-100"
                  />
                  <Label htmlFor={cid} className="font-normal">
                    {TREND[key].label}
                  </Label>
                </div>
              );
            })}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {points.length < 2 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">The trend shows once two batches have 20 or more delivered.</p>
        ) : (
          <ChartContainer config={TREND} className="aspect-auto h-64 w-full">
            <LineChart data={points} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={44} unit="%" />
              <ChartTooltip content={<ChartTooltipContent indicator="line" formatter={(v, name) => `${TREND[name as TrendKey]?.label ?? name} ${v}%`} />} />
              {series.map((k) => (
                <Line key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Send history (live app "Send history"): one row per batch, columns in the live order (name, date, status,
// delivered, open, click, bounce, unsub, reply); the name opens its report. Live "Audience type" is not carried
// over (one tag-grouped contact book). Recipients count sits on line 2 of the name; tags have their own column. Dates are plain text: the
// status colour belongs only to the badge.

function BatchesCard({
  template,
  batches,
  viewer,
  sendingBlocked,
}: {
  template: Template;
  batches: ReportBatch[];
  viewer: Viewer;
  sendingBlocked?: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h2>
            Send history
          </h2>
        </CardTitle>
      </CardHeader>
      {batches.length === 0 ? (
        <CardContent>
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SendIcon />
            </EmptyMedia>
            <EmptyTitle>Not sent yet</EmptyTitle>
            <EmptyDescription>
              {template.status === "active" ? "Send a batch, or automate it on a schedule." : "Mark it active when the content is ready, then send a batch."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <SendButton template={template} viewer={viewer} sendingBlocked={sendingBlocked} />
          </EmptyContent>
        </Empty>
        </CardContent>
      ) : (
        // About five rows, then the table scrolls inside the card under a sticky header (designer 2026-11-12).
        <CardContent>
        <div className={tableFrame}>
        <div className="max-h-80 overflow-auto *:data-[slot=table-container]:overflow-visible">
          <Table aria-label="Batches sent with this template" className="min-w-[60rem] table-fixed [&_td]:px-3 [&_th]:px-3">
            {/* Batch takes the rest; the others at content width (px-3). Tags in their own column, as on Leads. */}
            <colgroup>
              <col />
              <col className="w-24" />
              <col className="w-33" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-26" />
              <col className="w-22" />
              <col className="w-22" />
              <col className="w-20" />
              <col className="w-22" />
            </colgroup>
            <TableHeader className={"sticky top-0 z-10 bg-table-head shadow-[inset_0_-1px_0_var(--border)]"}>
              <TableRow>
                <TableHead className={divider}>Batch</TableHead>
                <TableHead className={divider}>Tags</TableHead>
                <TableHead className={divider}>Date</TableHead>
                <TableHead className={divider}>Status</TableHead>
                <TableHead className={divider}>Delivered</TableHead>
                <TableHead className={divider}>Open</TableHead>
                <TableHead className={divider}>Click</TableHead>
                <TableHead className={divider}>Bounce</TableHead>
                <TableHead className={divider}>Unsub</TableHead>
                <TableHead className={divider}>Reply</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => {
                const when = b.sentAt ?? b.scheduledFor;
                const m = b.metrics;
                const hasReport = b.status === "sent" || b.status === "sending" || b.status === "paused";
                const sender = senders.find((s) => s.id === b.senderId);
                const date = when ? formatDateTime(when) : `Created ${formatDate(b.createdOn)}`;
                const count = b.status === "sending" ? `${n(b.sent)}/${n(b.recipients)} sent` : `${n(b.recipients)} recipients`;
                const sub = count;
                const title = batchTitle(b);
                return (
                  <TableRow key={b.id}>
                    <TableCell className={divider}>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {hasReport ? (
                          <Link
                            href={`/batches/${b.id}/report`}
                            className="truncate rounded-sm font-medium tabular-nums underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {title}
                          </Link>
                        ) : (
                          <span className="truncate font-medium tabular-nums">{title}</span>
                        )}
                        <Hint label={sender ? `From ${sender.email}` : undefined}>
                          <span className="truncate text-sm text-muted-foreground tabular-nums">{sub}</span>
                        </Hint>
                      </div>
                    </TableCell>
                    <TableCell className={divider}>
                      {/* Two tags, the rest behind "+N" (Self-upload). A batch with no tags (unlocked companies): blank, §9.7. */}
                      <div className="flex items-center gap-1">
                        {b.tags.slice(0, 2).map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}
                          </Badge>
                        ))}
                        {b.tags.length > 2 && (
                          <Hint label={b.tags.slice(2).join(", ")}>
                            <Badge variant="outline" tabIndex={0} className="tabular-nums">
                              +{b.tags.length - 2}
                            </Badge>
                          </Hint>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={cn(divider, "text-muted-foreground tabular-nums")}>
                      {date}
                    </TableCell>
                    <TableCell className={divider}>
                      <Hint label={b.reason}>
                        <span className="inline-flex rounded-full" tabIndex={b.reason ? 0 : undefined}>
                          <StatusBadge status={b.status} />
                        </span>
                      </Hint>
                    </TableCell>
                    {hasReport && m && b.sent > 0 ? (
                      <>
                        <RateCell kind="delivery" part={m.delivered} whole={b.sent} className={divider} />
                        <RateCell kind="open" part={m.opens} whole={m.delivered} className={divider} />
                        <RateCell kind="click" part={m.clicks} whole={m.delivered} className={divider} />
                        <RateCell kind="bounce" part={m.bounces} whole={b.sent} className={divider} />
                        <RateCell kind="unsub" part={m.unsubs} whole={m.delivered} className={divider} />
                        <RateCell kind="reply" part={m.replies} whole={m.delivered} className={divider} />
                      </>
                    ) : (
                      Array.from({ length: 6 }, (_, i) => <TableCell key={i} className={divider} />)
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        </div>
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Recipients of every send (live app "All recipients"): one event filter select with counts, search,
// Excel export of exactly what the filter shows (PRD Master v1.2.8), Resend to people it didn't reach
// (AC-EC-R-01..04: bounced, as a new batch, one copy per mailbox; addresses that don't exist start unticked).

type EventFilter = "all" | "delivered" | "opened" | "unopened" | "clicked" | "bounced" | "unsubscribed";

const FILTERS: { value: EventFilter; label: string; test: (r: RecipientRow) => boolean }[] = [
  { value: "all", label: "Everyone", test: () => true },
  { value: "delivered", label: "Delivered", test: (r) => r.delivered },
  { value: "opened", label: "Opened", test: (r) => r.opened },
  { value: "unopened", label: "Didn't open", test: (r) => r.delivered && !r.opened },
  { value: "clicked", label: "Clicked", test: (r) => r.clicked },
  { value: "bounced", label: "Bounced", test: (r) => r.bounced },
  { value: "unsubscribed", label: "Unsubscribed", test: (r) => r.unsubscribed },
];

// Same words and tones as the batch report's Recipients tab.
const EVENT_BADGE: Record<RecipientEvent, { label: string; variant: "secondary" | "info" | "success" | "destructive" | "warning" | "outline" }> = {
  pending: { label: "Queued", variant: "outline" },
  delivered: { label: "Delivered", variant: "secondary" },
  opened: { label: "Opened", variant: "info" },
  clicked: { label: "Clicked", variant: "success" },
  bounced: { label: "Bounced", variant: "destructive" },
  unsubscribed: { label: "Unsubscribed", variant: "warning" },
  complained: { label: "Marked as spam", variant: "destructive" },
};

const PAGE = 20;

type Row = RecipientRow & { batchId: string; batchName: string };

/** Mock: about half of the bounced addresses no longer exist (live app isDeadAddress); they start unticked. */
const isDead = (r: Row) => r.bounced && r.email.length % 2 === 0;

function RecipientsCard({
  template,
  batches,
  viewer,
  sendingBlocked,
}: {
  template: Template;
  batches: ReportBatch[];
  viewer: Viewer;
  sendingBlocked?: string;
}) {
  const rows = useMemo<Row[]>(
    () =>
      batches
        .filter((b) => b.sent > 0 && b.metrics)
        .flatMap((b) =>
          recipientRows(b)
            .filter((r) => r.status !== "pending")
            .map((r) => ({ ...r, batchId: b.id, batchName: batchTitle(b) }))
        )
        // Latest activity first, across every batch.
        .sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "")),
    [batches]
  );
  const [filter, setFilter] = useState<EventFilter>("all");
  const [batchPick, setBatchPick] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [resending, setResending] = useState(false);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.value, rows.filter(f.test).length])) as Record<EventFilter, number>,
    [rows]
  );
  // One resend per mailbox (live app dedupes by email).
  const eligible = useMemo(() => {
    const seen = new Map<string, Row>();
    for (const r of rows) if (r.bounced && !seen.has(r.email)) seen.set(r.email, r);
    return [...seen.values()];
  }, [rows]);

  const q = query.trim().toLowerCase();
  const test = FILTERS.find((f) => f.value === filter)!.test;
  const matched = rows.filter(
    (r) =>
      test(r) &&
      (!batchPick.length || batchPick.includes(r.batchName)) &&
      (!q || r.email.includes(q) || r.name.toLowerCase().includes(q))
  );
  const batchNames = [...new Set(rows.map((r) => r.batchName))];
  const filterCount = (filter !== "all" ? 1 : 0) + batchPick.length;
  const clearFilters = () => {
    setFilter("all");
    setBatchPick([]);
    setLimit(PAGE);
  };
  const chips = [
    ...(filter !== "all"
      ? [{ key: "event", label: "Event", value: FILTERS.find((f) => f.value === filter)!.label, remove: () => setFilter("all") }]
      : []),
    ...batchPick.map((b) => ({ key: `b-${b}`, label: "Batch", value: b, remove: () => setBatchPick(batchPick.filter((x) => x !== b)) })),
  ];
  const shown = matched.slice(0, limit);
  const resendReason = sendBlockedReason(template, viewer, sendingBlocked) ?? (eligible.length === 0 ? "Everyone it was sent to received it" : undefined);

  return (
    <Card size="sm">
      {/* One line, as the Leads card headers (designer 2026-11-13): title left; search (w-64, shrinks first), Filter,
          Resend, Export on the right, all h-7 outline, gap-2. Chips under it; the total only in the footer. */}
      <CardHeader className="grid-cols-[auto_minmax(0,1fr)]">
        <CardTitle className="self-center">
          <h2>All recipients</h2>
        </CardTitle>
        <CardAction className="row-span-1 flex min-w-0 items-center gap-2 self-center">
          {/* Nothing to search or filter before the first batch. */}
          {rows.length > 0 && (
          <>
          <InputGroup className="h-7 w-64 min-w-28 shrink">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search recipients"
              placeholder="Search name or email"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
            />
          </InputGroup>
          {/* The standard Filter button (designer 2026-11-12): Event (7 options → one select with counts) and
              Batch (several → MultiSelect). Active values show as chips below. */}
          <FilterPopover count={filterCount} onClearAll={clearFilters}>
            <FilterSelect
              label="Event"
              allLabel="Everyone"
              allCount={counts.all}
              value={filter === "all" ? undefined : filter}
              options={FILTERS.filter((f) => f.value !== "all").map((f) => ({ value: f.value, label: f.label, count: counts[f.value] }))}
              onChange={(v) => {
                setFilter((v ?? "all") as EventFilter);
                setLimit(PAGE);
              }}
            />
            {batchNames.length > 1 && (
              <FilterMultiSelect
                label="Batch"
                options={batchNames}
                value={batchPick}
                onChange={(v) => {
                  setBatchPick(v);
                  setLimit(PAGE);
                }}
                placeholder="Any batch"
                searchPlaceholder="Search batches"
              />
            )}
          </FilterPopover>
          </>
          )}
          <LockedTip reason={resendReason}>
            <Button variant="outline" size="sm" disabled={Boolean(resendReason)} onClick={() => setResending(true)}>
              <SendIcon data-icon="inline-start" />
              Resend{eligible.length > 0 && ` (${n(eligible.length)})`}
            </Button>
          </LockedTip>
          {rows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={matched.length === 0}
              onClick={() =>
                toast.success(`Exporting ${n(matched.length)} recipients`, { description: "The .xlsx file downloads when it's ready." })
              }
            >
              <FileSpreadsheetIcon data-icon="inline-start" />
              Export
            </Button>
          )}
        </CardAction>
      </CardHeader>

      {rows.length === 0 ? (
        <CardContent className="text-sm text-muted-foreground">People show here after the first batch.</CardContent>
      ) : (
        <CardContent className="flex flex-col gap-2">
          <FilterChips
            className="mb-1"
            chips={chips.map((chip) => ({
              ...chip,
              onRemove: () => {
                chip.remove();
                setLimit(PAGE);
              },
            }))}
            onClearAll={clearFilters}
          />
          {matched.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border py-10 text-sm text-muted-foreground">
              No results.
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  clearFilters();
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            // About seven rows, scrolling inside the card; the next page loads near the bottom (designer 2026-11-12).
            <div
              className={cn(tableFrame, "max-h-96 overflow-auto *:data-[slot=table-container]:overflow-visible")}
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight > el.scrollHeight - 120 && limit < matched.length) setLimit((l) => l + PAGE);
              }}
            >
              <Table aria-label="Recipients of this template" className="min-w-[60rem] table-fixed [&_td]:px-3 [&_th]:px-3">
                {/* Email takes the rest; the others at content width (px-3); Note is mostly empty and wraps. */}
                <colgroup>
                  <col />
                  <col className="w-36" />
                  <col className="w-36" />
                  <col className="w-30" />
                  <col className="w-18" />
                  <col className="w-18" />
                  <col className="w-34" />
                  <col className="w-32" />
                </colgroup>
                <TableHeader className={"sticky top-0 z-10 bg-table-head shadow-[inset_0_-1px_0_var(--border)]"}>
                  <TableRow>
                    <TableHead className={divider}>Email</TableHead>
                    <TableHead className={divider}>Name</TableHead>
                    <TableHead className={divider}>Batch</TableHead>
                    <TableHead className={divider}>Status</TableHead>
                    <TableHead className={divider}>Opens</TableHead>
                    <TableHead className={divider}>Clicks</TableHead>
                    <TableHead className={divider}>Last activity</TableHead>
                    <TableHead className={divider}>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((r) => {
                    const s = EVENT_BADGE[r.status];
                    return (
                      <TableRow key={r.id}>
                        <TableCell className={divider}>
                          <span className="block truncate font-medium" title={r.email}>
                            {r.email}
                          </span>
                        </TableCell>
                        <TableCell className={divider}>
                          <span className="block truncate" title={r.name}>
                            {r.name}
                          </span>
                        </TableCell>
                        <TableCell className={divider}>
                          <Link
                            href={`/batches/${r.batchId}/report`}
                            className="block truncate rounded-sm tabular-nums underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {r.batchName}
                          </Link>
                        </TableCell>
                        <TableCell className={divider}>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </TableCell>
                        <TableCell className={cn(divider, "tabular-nums")}>{r.opens ? n(r.opens) : ""}</TableCell>
                        <TableCell className={cn(divider, "tabular-nums")}>{r.clicks ? n(r.clicks) : ""}</TableCell>
                        <TableCell className={cn(divider, "text-muted-foreground tabular-nums")}>
                          {r.lastActivity ? formatDateTime(r.lastActivity) : ""}
                        </TableCell>
                        <TableCell className={cn(divider, "text-sm whitespace-normal text-muted-foreground")}>
                          {isDead(r) ? "Address doesn't exist" : ""}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {matched.length > 0 && (
            <p className="text-sm text-muted-foreground tabular-nums">
              Showing {n(shown.length)} of {n(matched.length)}
            </p>
          )}
        </CardContent>
      )}

      {resending && <ResendDialog rows={eligible} onOpenChange={setResending} />}
    </Card>
  );
}

function ResendDialog({ rows, onOpenChange }: { rows: Row[]; onOpenChange: (open: boolean) => void }) {
  const [picked, setPicked] = useState(() => new Set(rows.filter((r) => !isDead(r)).map((r) => r.id)));
  const toggle = (id: string, on: boolean) =>
    setPicked((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resend to people it didn&apos;t reach</DialogTitle>
          <DialogDescription>It goes out as a new batch.</DialogDescription>
        </DialogHeader>
        <ul className="-mx-1 flex max-h-72 flex-col overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id}>
              <Label className="flex items-center gap-3 rounded-md px-1 py-2 font-normal hover:bg-muted/50">
                <Checkbox checked={picked.has(r.id)} onCheckedChange={(v) => toggle(r.id, v === true)} />
                <span className="min-w-0 flex-1 truncate">{r.email}</span>
                {isDead(r) && <span className="shrink-0 text-sm text-muted-foreground">Address doesn&apos;t exist</span>}
              </Label>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={picked.size === 0}
            onClick={() => {
              toast.success(`Resend queued for ${n(picked.size)} ${picked.size === 1 ? "person" : "people"}`, {
                description: "Unsubscribed or blocked addresses are skipped.",
              });
              onOpenChange(false);
            }}
          >
            Resend {n(picked.size)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------------

// The Automation card: the shared AutomationPanel (same as the Automate dialog on the Templates list).
function AutomationCard({ templateId, viewer }: { templateId: string; viewer: Viewer }) {
  return (
    <Card size="sm" id="automation" className="scroll-mt-20">
      <CardContent>
        <AutomationPanel templateId={templateId} viewer={viewer} title={<h2 className="font-medium">Automation</h2>} />
      </CardContent>
    </Card>
  );
}

function LinksCard({ links, sent }: { links: { url: string; clicks: number }[]; sent: boolean }) {
  // Live app "Link performance": a table of every link with its clicks. Share = this link's part of all clicks.
  const total = links.reduce((x, l) => x + l.clicks, 0);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h2>Link performance</h2>
        </CardTitle>
      </CardHeader>
      {links.length === 0 ? (
        <CardContent className="text-sm text-muted-foreground">{sent ? "No link was clicked yet." : "Clicks per link show here after the first send."}</CardContent>
      ) : (
        <CardContent>
        <div className={tableFrame}>
          <Table aria-label="Clicks per link" className="table-fixed">
            <colgroup>
              <col />
              <col className="w-28" />
              <col className="w-28" />
            </colgroup>
            <TableHeader className="bg-table-head">
              <TableRow>
                <TableHead className={divider}>Link</TableHead>
                <TableHead className={divider}>Clicks</TableHead>
                <TableHead className={divider}>Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((l) => {
                const short = l.url.replace(/^https?:\/\//, "");
                return (
                  <TableRow key={l.url}>
                    <TableCell className={divider}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="block truncate underline-offset-4 hover:underline" title={short}>
                        {short}
                      </a>
                    </TableCell>
                    <TableCell className={cn(divider, "tabular-nums")}>{n(l.clicks)}</TableCell>
                    <TableCell className={cn(divider, "tabular-nums text-muted-foreground")}>{total ? `${((l.clicks / total) * 100).toFixed(1)}%` : ""}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        </CardContent>
      )}
    </Card>
  );
}

function GoneState() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchIcon />
        </EmptyMedia>
        <EmptyTitle>This template isn&apos;t here any more</EmptyTitle>
        <EmptyDescription>It was deleted, or it was a copy that wasn&apos;t saved.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" asChild>
          <Link href="/templates">Back to Templates</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
