"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CircleAlertIcon,
  ClockIcon,
  CopyIcon,
  CornerDownRightIcon,
  CornerLeftUpIcon,
  EyeIcon,
  FileTextIcon,
  LayoutTemplateIcon,
  LockIcon,
  PencilIcon,
  RepeatIcon,
  RotateCwIcon,
  SendIcon,
  TriangleAlertIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  CURRENT_USER,
  type Rate,
  type Template,
  campaignStatus,
  followUpRule,
  formatDate,
  formatDateTime,
  rate,
  sampleCampaigns,
} from "@/lib/mock/campaigns";
import { PageHeader } from "@/components/layout/page-header";
import { KpiStrip, KpiStripItem } from "@/components/saella/kpi-strip";
import { RateCell } from "@/components/saella/rate-meter";
import { StatusBadge } from "@/components/saella/status-badge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { batches, contactLists, senders } from "@/lib/mock/workspace";
import { AutomateDialog } from "@/components/features/automate-dialog";
import { TRIGGERS, currentSchedule, delayLabel, nextRun, scheduleWhen, tzLabel, useAutomation } from "@/components/features/automation";
import { SAMPLE_VALUES, accessFor, canEdit, detailsFor, resolveTags, findTemplate, lockReason, ownerName, viewerFor, withBatchTotals } from "@/lib/mock/templates";
import { EmailBody } from "@/components/features/email-body";
import { SendButton, TemplateMenu } from "./template-actions";
import { Hint } from "@/components/saella/hint";

// One template's results (live app EmailTemplateAnalytics + Repo src/lib/email/analytics.ts TemplateRollup):
// KPI strip (delivered, open, click, click-to-open, bounce, unsubscribe, reply), the batches sent with it
// (each links to its report), its follow-up chain and automation, top links and a preview.
// Rates: open/click/unsub/reply over delivered, bounce over recipients, click-to-open = clicks ÷ opens.
// Below 20 sends a rate is grey "too few to judge" (BR-RULE-EC-21). Opens/clicks exclude bots (AC-EC-K-07).
// Preview states: ?state=loading | error | paused | locked | member.
// Layout pass 2026-10-28 (Studio Admin analytics): shared KpiStrip (notes at 14px), then every section is a card
// with its title in the header and tables flush to the card edge, so the two columns start level. A batch opens
// its report from its name (the separate Report column pushed the table into a horizontal scroll).

export function TemplateDetailScreen({ id }: { id: string }) {
  const params = useSearchParams();
  const previewState = params.get("state");
  const viewer = viewerFor(previewState);
  const found = findTemplate(id)!;
  const [template, setTemplate] = useState<Template>(found.template);
  const campaign = found.campaign;
  const details = detailsFor(id);
  const store = useAutomation();
  const [automating, setAutomating] = useState(false);

  const access = accessFor(template, viewer);
  const mayEdit = canEdit(access);
  const sendingBlocked =
    previewState === "paused"
      ? "Sending is paused for this workspace"
      : previewState === "locked"
        ? "Verify a sending domain and confirm a sender first"
        : undefined;

  if (previewState === "loading") return <DetailSkeleton />;

  const allTemplates = sampleCampaigns.flatMap((c) => c.templates.map(withBatchTotals));
  const schedule = currentSchedule(store, id);
  const flow = store.flows.find((f) => f.templateId === id) ?? null;
  const flowTemplate = flow ? allTemplates.find((t) => t.id === flow.stepTemplateId) : undefined;
  // This template as someone else's follow-up (one level, as in the live app).
  const parentFlow = store.flows.find((f) => f.stepTemplateId === id);
  const parent = parentFlow ? allTemplates.find((t) => t.id === parentFlow.templateId) : undefined;
  const sent = template.recipients > 0;
  const KindIcon = details.kind === "design" ? LayoutTemplateIcon : FileTextIcon;
  const myBatches = batches
    .filter((b) => b.templateId === id)
    .sort((a, b) => (b.sentAt ?? b.scheduledFor ?? b.createdOn).localeCompare(a.sentAt ?? a.scheduledFor ?? a.createdOn));
  const sentRecipients = myBatches.filter((b) => b.sent > 0).reduce((n, b) => n + b.sent, 0);

  return (
    <>
      <PageHeader
        title={template.name}
        breadcrumbs={[{ label: "Templates", href: "/templates" }]}
        actions={
          <>
            <SendButton template={template} viewer={viewer} sendingBlocked={sendingBlocked} size="default" />
            <Button variant="outline" onClick={() => setAutomating(true)}>
              <ZapIcon data-icon="inline-start" />
              Automate
            </Button>
            {mayEdit ? (
              <Button asChild>
                <Link href={`/templates/${id}/edit`}>
                  <PencilIcon data-icon="inline-start" />
                  Edit template
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href={`/templates/${id}/edit`}>
                  <EyeIcon data-icon="inline-start" />
                  View content
                </Link>
              </Button>
            )}
            <TemplateMenu
              template={template}
              viewer={viewer}
              campaigns={sampleCampaigns}
              showAnalytics={false}
              triggerVariant="outline"
              onToggleStatus={() => {
                setTemplate((t) => ({ ...t, status: t.status === "active" ? "inactive" : "active" }));
                toast.success(template.status === "active" ? "Marked inactive" : "Marked active");
              }}
              onCopy={(_, toId) =>
                toast.success(`Copied to ${sampleCampaigns.find((c) => c.id === toId)?.name}`, { description: "The copy is inactive and yours." })
              }
              onRequestDelete={() => toast("Delete from the Templates list", { description: "Batches already sent keep their report." })}
              onToast={(title, description) => toast(title, { description })}
            />
          </>
        }
      >
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <dt className="sr-only">Status</dt>
          <dd>
            <StatusBadge status={template.status === "active" ? "template-active" : "template-inactive"} />
          </dd>
          <dt className="sr-only">Kind</dt>
          <dd className="flex items-center gap-1.5">
            <KindIcon aria-hidden className="size-4" />
            {details.kind === "design" ? "Design" : "Letter"}
          </dd>
          <dt className="sr-only">Campaign</dt>
          <dd>
            <Link href={`/campaigns?c=${campaign.id}`} className="underline-offset-4 hover:text-foreground hover:underline">
              {campaign.name}
            </Link>
            {campaignStatus(campaign) === "ended" && " (ended)"}
          </dd>
          <dt className="sr-only">Owner</dt>
          <dd>
            {template.owner === CURRENT_USER ? "Yours" : `Owner ${ownerName(template.owner)}`}
            {access === "shared" && " · shared with you"}
          </dd>
          <dt className="sr-only">Updated</dt>
          <Hint label={formatDateTime(details.updatedAt)}><dd>Edited {formatDate(details.updatedAt)}</dd></Hint>
        </dl>
      </PageHeader>

      {previewState === "paused" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Sending is paused for this workspace</AlertTitle>
          <AlertDescription>Too many messages bounced or were marked as spam. An admin can resume sending once the list is cleaned.</AlertDescription>
        </Alert>
      )}
      {previewState === "locked" && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>Sending is locked</AlertTitle>
          <AlertDescription>Verify a sending domain and confirm a sender to send batches.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/sending">Go to Sending</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}
      {!mayEdit && (
        <Alert>
          <LockIcon />
          <AlertTitle>You can view and copy this template</AlertTitle>
          <AlertDescription>{lockReason.edit(template.owner)}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => toast.success("Copy created", { description: "It's inactive and yours to edit." })}>
              <CopyIcon data-icon="inline-start" />
              Make a copy
            </Button>
          </AlertAction>
        </Alert>
      )}

      {previewState === "error" ? (
        <Alert variant="destructive">
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
        <Kpis template={template} replies={details.replies} />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card size="sm" className="pb-0">
            <CardHeader>
              <CardTitle>
                <h2>
                  Batches <span className="font-normal text-muted-foreground tabular-nums">{myBatches.length}</span>
                </h2>
              </CardTitle>
            </CardHeader>
            {myBatches.length === 0 ? (
              <Empty className="rounded-none border-t">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SendIcon />
                  </EmptyMedia>
                  <EmptyTitle>Not sent yet</EmptyTitle>
                  <EmptyDescription>
                    {template.status === "active"
                      ? "Send a batch to a contact list, or set up a schedule to send it automatically."
                      : "Mark it active when the content is ready, then send a batch."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <SendButton template={template} viewer={viewer} sendingBlocked={sendingBlocked} />
                </EmptyContent>
              </Empty>
            ) : (
              <div className="border-t">
                <Table aria-label="Batches sent with this template" className="table-fixed">
                  <colgroup>
                    <col />
                    <col className="w-36" />
                    <col className="w-28" />
                    <col className="w-28" />
                    <col className="w-28" />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-3">Batch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Recipients</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                      <TableHead className="pr-3 text-right">Click</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myBatches.map((b) => {
                      const when = b.sentAt ?? b.scheduledFor;
                      // Per-batch numbers are the template's totals split by recipients sent (mock).
                      const share = sentRecipients > 0 ? b.sent / sentRecipients : 0;
                      const delivered = Math.round(template.delivered * share);
                      const hasReport = b.status === "sent" || b.status === "sending" || b.status === "paused";
                      const sender = senders.find((s) => s.id === b.senderId);
                      const label = `${b.status === "scheduled" ? "Scheduled for " : ""}${when ? formatDateTime(when) : `Created ${formatDate(b.createdOn)}`}`;
                      const audience = `${b.listIds.map((l) => contactLists.find((x) => x.id === l)?.name).join(", ")} · from ${sender?.email}`;
                      return (
                        <TableRow key={b.id} className="last:border-b-0">
                          <TableCell className="pl-3">
                            <div className="flex min-w-0 flex-col gap-0.5">
                              {hasReport ? (
                                <Link
                                  href={`/batches/${b.id}/report`}
                                  className="truncate rounded-sm font-medium tabular-nums underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                  {label}
                                </Link>
                              ) : (
                                <span className="truncate font-medium tabular-nums">{label}</span>
                              )}
                              <span className="truncate text-xs text-muted-foreground" title={audience}>
                                {audience}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={b.status} />
                            {b.reason && <p className="mt-1 text-xs whitespace-normal text-muted-foreground">{b.reason}</p>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {b.status === "sending" ? `${b.sent.toLocaleString("en-US")} / ` : ""}
                            {b.recipients.toLocaleString("en-US")}
                          </TableCell>
                          {hasReport && b.sent > 0 ? (
                            <>
                              <RateCell kind="open" part={Math.round(template.opens * share)} whole={delivered} />
                              <RateCell kind="click" part={Math.round(template.clicks * share)} whole={delivered} className="pr-3" />
                            </>
                          ) : (
                            <>
                              <TableCell />
                              <TableCell className="pr-3" />
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>
                <h2>Links</h2>
              </CardTitle>
            </CardHeader>
            {details.links.length === 0 ? (
              <CardContent className="text-muted-foreground">
                {sent ? "No link in this email was clicked." : "Clicks per link show here after the first send."}
              </CardContent>
            ) : (
              <ul className="flex flex-col gap-3 px-3">
                {details.links.map((l) => {
                  // The bar is this link's real share of all link clicks, and the % printed is that same share.
                  const total = details.links.reduce((n, x) => n + x.clicks, 0);
                  const share = total ? (l.clicks / total) * 100 : 0;
                  return (
                    <li key={l.url} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 text-sm">
                      <span className="truncate" title={l.url}>
                        {l.url}
                      </span>
                      <Hint label={`${share.toFixed(1)}% of ${total.toLocaleString("en-US")} link clicks`}>
                        <span className="tabular-nums">
                          {share.toFixed(1)}% <span className="text-muted-foreground">({l.clicks.toLocaleString("en-US")})</span>
                        </span>
                      </Hint>
                      <Progress
                        value={share}
                        aria-label={`${share.toFixed(1)}% of link clicks (${l.clicks})`}
                        className="col-span-2 h-1.5 *:data-[slot=progress-indicator]:bg-brand"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Automation</CardTitle>
              <CardAction>
                <Button variant="ghost" size="sm" onClick={() => setAutomating(true)}>
                  {mayEdit ? "Manage" : "View"}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <div className="flex items-start gap-2">
                <ClockIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {schedule ? (
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{scheduleWhen(schedule)}</span>
                      {schedule.status === "paused" && <Badge variant="secondary">Paused</Badge>}
                    </span>
                    <span className="text-muted-foreground">{tzLabel(schedule.timezone)}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {schedule.sentCount.toLocaleString("en-US")} sent · up to {schedule.perRunCap.toLocaleString("en-US")} per run
                      {schedule.targetTotal > 0 ? ` · stops at ${schedule.targetTotal.toLocaleString("en-US")}` : ""}
                    </span>
                    {nextRun(schedule, campaign.startsOn) && <span>Next run {nextRun(schedule, campaign.startsOn)}</span>}
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    No schedule.
                    {campaignStatus(campaign) === "ended" ? " The campaign has ended." : " Sends only when you start a batch."}
                  </span>
                )}
              </div>

              {/* The chain: parent → this → follow-up, one level each way (live app: step_order 1). */}
              <div className="flex flex-col gap-2" aria-label="Follow-up chain">
                {parent && parentFlow && (
                  <div className="flex items-start gap-2">
                    <CornerLeftUpIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="min-w-0">
                      <span className="text-muted-foreground">Follow-up of </span>
                      <Link href={`/templates/${parent.id}`} className="font-medium hover:underline">
                        {parent.name}
                      </Link>
                      <span className="block text-muted-foreground">
                        {followUpRule({ of: parent.id, trigger: parentFlow.trigger, delayHours: parentFlow.delayHours })}
                      </span>
                    </p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <RepeatIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {flow && flowTemplate ? (
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-muted-foreground">
                        {TRIGGERS.find((t) => t.value === flow.trigger)?.label} within {delayLabel(flow.delayHours)}, send
                      </span>
                      <span className="flex items-start gap-1.5">
                        <CornerDownRightIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <Link href={`/templates/${flowTemplate.id}`} className="font-medium hover:underline">
                          {flowTemplate.name}
                        </Link>
                      </span>
                      <span className="pl-6 text-muted-foreground tabular-nums">
                        {flow.status === "paused" ? "Paused · " : ""}
                        {flow.sent.toLocaleString("en-US")} sent
                        {flowTemplate.delivered >= 20 && ` · ${rate(flowTemplate.opens, flowTemplate.delivered)?.text} open`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No follow-up.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardAction>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/templates/${id}/edit`}>{mayEdit ? "Edit" : "View"}</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5 text-sm">
                <span className="font-medium">{resolveTags(details.subject, SAMPLE_VALUES) || "No subject"}</span>
                {details.preheader && <span className="text-muted-foreground">{resolveTags(details.preheader, SAMPLE_VALUES)}</span>}
              </div>
              {/* A clipped, inert preview of the body (no fade: no gradients in the UI). */}
              <div aria-hidden className="email-canvas pointer-events-none relative max-h-72 overflow-hidden rounded-lg border p-4 select-none">
                <EmailBody blocks={details.blocks} kind={details.kind} mode="preview" values={SAMPLE_VALUES} footer={false} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AutomateDialog templateId={id} open={automating} onOpenChange={setAutomating} viewer={viewer} />
    </>
  );
}

function Kpis({ template: t, replies }: { template: Template; replies: number }) {
  const sent = t.recipients > 0;
  const cto = rate(t.clicks, t.opens);
  return (
    <KpiStrip>
      <KpiStripItem
        label="Delivered"
        value={sent ? t.delivered.toLocaleString("en-US") : undefined}
        note={sent ? `${rate(t.delivered, t.recipients)?.text} of ${t.recipients.toLocaleString("en-US")}` : "No sends yet"}
      />
      <KpiRate label="Open rate" value={rate(t.opens, t.delivered)} note={`${t.opens.toLocaleString("en-US")} opened`} />
      <KpiRate label="Click rate" value={rate(t.clicks, t.delivered)} note={`${t.clicks.toLocaleString("en-US")} clicked`} />
      <KpiRate label="Click-to-open" value={cto} note="Clicks ÷ opens" lowNote="Too few opens to judge" />
      <KpiRate
        label="Bounce rate"
        value={rate(t.bounces, t.recipients)}
        note={`${t.bounces.toLocaleString("en-US")} bounced`}
        // 10% is where the workspace pauses sending (PRD-02).
        danger={t.recipients > 0 && t.bounces / t.recipients >= 0.1}
      />
      <KpiRate label="Unsubscribe" value={rate(t.unsubs, t.delivered)} note={`${t.unsubs.toLocaleString("en-US")} left`} />
      <KpiRate label="Reply rate" value={rate(replies, t.delivered)} note={`${replies.toLocaleString("en-US")} replied`} />
    </KpiStrip>
  );
}

function KpiRate({
  label,
  value,
  note,
  lowNote = "Too few sends to judge",
  danger = false,
}: {
  label: string;
  value: Rate;
  note: string;
  lowNote?: string;
  danger?: boolean;
}) {
  return (
    <KpiStripItem
      label={label}
      value={value?.text}
      muted={value?.lowSample}
      tone={danger ? "danger" : undefined}
      note={value ? (value.lowSample ? lowNote : note) : undefined}
    />
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
