"use client";

// Overview: the email metrics dashboard, matched to what the dev team built (Repo origin/development 2026-11-05,
// app/dashboard/email/metrics/page.tsx + components/email/EmailMetricsDashboard.tsx), in Saella's look.
//   Gate: until every Get started step is done (by data or by a tick) the page shows the checklist, not numbers.
//   Toolbar: Campaign / Template / Sender view on the left; campaign and period on the right (default all, 30 days).
//   Campaign view: 4 KPIs (2×2) + See more (6) beside the Funnel (Sent → Replied), a bounce warning when a recipient domain is flagged, Send volume, Campaign
//   leaderboard, Template leaderboard (top 3), or with a campaign picked its details and Templates in this campaign.
//   Template view: 4 KPIs + See more, a chart of the leaderboard's top 3 (same order and metric), then the full
//   Template leaderboard (user decision 2026-11-13).
//   Sender view: 4 KPIs + See more, Sender board, Deliverability by recipient domain (only here, user decision
//   2026-11-12; the live app shows it on the Campaign view too). The Campaign view links to it when a domain's
//   bounce rate is flagged (RATE_BANDS: 5% or more, 20+ sent; PATTERNS 9.1).
// URL: ?view=campaign|template|sender &window=7|14|30|90|180|year|range (&from=&to=) &campaign=<id>.
// Preview states (?state=): new (fresh workspace), empty (set up, nothing sent: checklist on its last step),
// paused (workspace auto-paused), bounce (two recipient domains past the bounce warning), loading, error (Saella
// states; the live app has neither).
// Loading (PATTERNS.md §9.17): the header and toolbar render at once; KPIs, Send volume and the boards each load on
// their own (SectionLoader). ?slow=1 simulates a slow workspace (KPIs 1.5s, chart 4s, boards 8s); ?slow=fail makes
// Send volume fail and the boards pass 15s on the first try, Retry then works.
// Saella over the live app (user decision 2026-11-11): the paused alert, Send volume gaps
// instead of 0, Template view rates pooled over all templates.

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, ChevronUpIcon, CircleAlertIcon, InboxIcon, PlusIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { TODAY, sampleCampaigns } from "@/lib/mock/campaigns";
import { addCampaign } from "@/lib/mock/created-campaigns";
import { WORKSPACE, senders } from "@/lib/mock/workspace";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { NewCampaignDialog, starterHref } from "@/components/features/new-campaign-dialog";
import { ChartCard } from "@/components/saella/chart-card";
import { cn } from "@/lib/utils";
import { KpiStrip, KpiStripItem } from "@/components/saella/kpi-strip";
import { UpdatedIndicator } from "@/components/saella/loading-status";
import { rateBand, rateKpi } from "@/components/saella/rate-meter";
import { SectionLoader, combineLoads, useSectionLoad } from "@/components/saella/section-loader";
import { slowDelay, slowModeOf } from "@/lib/mock/delay";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignPicker } from "./campaign-picker";
import { FunnelCard } from "./funnel-card";
import {
  CampaignDetailCard,
  CampaignLeaderboard,
  DeliverabilityCard,
  SenderBoard,
  TemplateLeaderboard,
  TemplatesInCampaign,
} from "./leaderboards";
import {
  type GroupRow,
  type Totals,
  WINDOWS,
  type WindowKey,
  type DomainRow,
  byRecipientDomain,
  groupBy,
  ratio,
  resolveSpan,
  sentIn,
  sum,
  trend,
  workspaceCounts,
} from "./metrics";
import { BOARD_COLUMNS, BoardSkeleton } from "./overview-skeletons";
import { PeriodPicker } from "@/components/saella/period-picker";
import { DEFAULT_SERIES, SERIES, SendTrend, SeriesPicker, type SeriesKey } from "./send-trend";
import { STEPS, SetupGuide, type SetupStepKey } from "./setup-guide";

const VIEWS = [
  { value: "campaign", label: "Campaign" },
  { value: "template", label: "Template" },
  { value: "sender", label: "Sender" },
] as const;
type View = (typeof VIEWS)[number]["value"];
const PRESETS = WINDOWS.filter((w) => w.value !== "range");

const n = (x: number) => x.toLocaleString("en-US");
const pct = (r: number | null) => (r === null ? undefined : `${(r * 100).toFixed(1)}%`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Fewer than 20 sends: too few to judge (DESIGN §2), so such rows can't be "best". */
const LOW = 20;

// Every sending domain of the workspace, for the Sender board's domain filter (live app senderDomains).
const SENDER_DOMAINS = [...new Set(senders.map((s) => s.email.split("@")[1]))].sort();

// Recipient domains whose bounce rate the Deliverability card colours (RATE_BANDS warning or danger), worst first.
// Under 20 sent is "too few to judge" there, so not flagged here either; "Others" is not a domain.
function flaggedDomains(rows: DomainRow[]) {
  return rows
    .filter((d) => !d.others && d.totals.sends >= 20 && rateBand("bounce", d.totals.bounces / d.totals.sends) !== "good")
    .sort((a, b) => b.totals.bounces / b.totals.sends - a.totals.bounces / a.totals.sends);
}

// ?state=bounce: two domains past the 5% bounce warning (the mock data has none).
const BOUNCE_PREVIEW: Record<string, number> = { "outlook.com": 0.061, "kinabalu-trading.my": 0.054 };
function withBouncePreview(rows: DomainRow[]): DomainRow[] {
  return rows.map((d) => {
    const r = BOUNCE_PREVIEW[d.name];
    if (!r) return d;
    const bounces = Math.round(d.totals.sends * r);
    return { ...d, totals: { ...d.totals, bounces, delivered: d.totals.sends - bounces } };
  });
}

// Which Get started steps the data proves done, per preview state. The mock workspace has done all six.
function provenSteps(state: string | null): Set<SetupStepKey> {
  if (state === "new") return new Set();
  if (state === "empty") return new Set(["company", "data", "campaign", "template", "domain"]);
  return new Set(STEPS.map((s) => s.key));
}

export function OverviewScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = params.get("state");
  const view: View = VIEWS.some((v) => v.value === params.get("view")) ? (params.get("view") as View) : "campaign";
  const windowKey: WindowKey = WINDOWS.some((w) => w.value === params.get("window"))
    ? (params.get("window") as WindowKey)
    : "30";
  const from = params.get("from");
  const to = params.get("to");
  const campaign = sampleCampaigns.find((c) => c.id === params.get("campaign"));

  function setParam(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  // Gate (live app metrics/page.tsx): done by data or ticked by hand; the ticks are stored per workspace.
  const proven = useMemo(() => provenSteps(state), [state]);
  const [creating, setCreating] = useState(false);
  const [marked, setMarked] = useState<Set<SetupStepKey>>(() => new Set());
  const gated = STEPS.some((s) => !proven.has(s.key) && !marked.has(s.key));
  const neverSent = state === "new" || state === "empty";

  const span = useMemo(() => resolveSpan(windowKey, from, to), [windowKey, from, to]);
  const list = useMemo(() => (neverSent ? [] : sentIn(span, campaign?.id)), [neverSent, span, campaign]);
  const totals = sum(list);
  const loading = state === "loading";
  const failed = state === "error";
  const [series, setSeries] = useState<SeriesKey[]>(DEFAULT_SERIES);
  const [more, setMore] = useState(false);

  const campaignRows = useMemo(() => groupBy(list, "campaign"), [list]);
  const templateRows = useMemo(() => groupBy(list, "template"), [list]);
  const senderRows = useMemo(() => groupBy(list, "sender"), [list]);
  const points = useMemo(() => trend(list, span), [list, span]);
  // Recipient-level rows are heavy: only built on the views that show them.
  const domains = useMemo(() => {
    const rows = view === "template" ? [] : byRecipientDomain(list);
    return state === "bounce" ? withBouncePreview(rows) : rows;
  }, [view, list, state]);
  const flagged = useMemo(() => flaggedDomains(domains), [domains]);

  /** Campaign view warning → Sender view, same filters, scrolled to the Deliverability card once it has loaded. */
  function viewDomainsInSender() {
    setParam({ view: "sender" });
    const until = Date.now() + 15000;
    const timer = window.setInterval(() => {
      const el = document.getElementById("deliverability");
      if (el || Date.now() > until) window.clearInterval(timer);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }

  // Each section loads on its own, keyed by the filters it depends on (PATTERNS.md §9.17).
  const slow = slowModeOf(params.get("slow"));
  const filterKey = [view, windowKey, from, to, campaign?.id ?? "all"].join(":");
  const kpiLoad = useSectionLoad(`overview:kpis:${filterKey}`, { delayMs: slowDelay(slow, "quick"), forceLoading: loading });
  const chartLoad = useSectionLoad(`overview:chart:${filterKey}`, {
    delayMs: slowDelay(slow, "chart"),
    fail: slow === "fail" ? "error" : undefined,
    forceLoading: loading,
  });
  const boardLoad = useSectionLoad(`overview:boards:${filterKey}`, {
    delayMs: slowDelay(slow, "table"),
    fail: slow === "fail" ? "stall" : undefined,
    forceLoading: loading,
  });
  const updating = combineLoads([kpiLoad, chartLoad, boardLoad]);

  if (gated) {
    return (
      <>
        <PageHeader title="Overview" description="How your emails are doing across campaigns, templates and senders." />
        <SetupGuide
          workspace={WORKSPACE.company}
          proven={proven}
          marked={marked}
          onMark={(keys, on) =>
            setMarked((s) => {
              const next = new Set(s);
              for (const k of keys) {
                if (on) next.add(k);
                else next.delete(k);
              }
              return next;
            })
          }
        />
      </>
    );
  }

  const hasData = totals.batches > 0;

  return (
    <>
      {/* No header action (user decision 2026-11-12); New campaign sits in the filter row. */}
      <PageHeader title="Overview" description="How your emails are doing across campaigns, templates and senders." />
      <NewCampaignDialog
        open={creating}
        onOpenChange={setCreating}
        onCreate={(c, starter) => {
          const id = addCampaign(c);
          setCreating(false);
          // With a starter (designer 2026-11-14, live finishCampaign): straight into the editor on its first template.
          if (starter) {
            toast.success("Campaign created");
            router.push(starterHref(id, starter));
            return;
          }
          toast.success(`Created “${c.name}”`, { description: "Add a template to start sending." });
          router.push(`/campaigns?c=${encodeURIComponent(id)}`);
        }}
      />

      {/* Workspace auto-pause (PRD-02 BR-RULE-EC-18; Saella, user decision 2026-11-11). */}
      {state === "paused" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Sending is paused for this workspace</AlertTitle>
          <AlertDescription>
            Bounces reached 10.4% over the last 7 days. Check the contacts your latest batches went to, then ask an
            admin to resume sending.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/sending">Sending health</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* Toolbar (live app): view tabs on the left, aligned with the filters on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setParam({ view: v === "campaign" ? null : v })}>
          <TabsList aria-label="View">
            {VIEWS.map((v) => (
              <TabsTrigger key={v.value} value={v.value} className="px-4">
                {v.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <UpdatedIndicator {...updating} className="mr-2" />
          <CampaignPicker
            campaigns={sampleCampaigns}
            value={campaign?.id ?? null}
            onChange={(id) => setParam({ campaign: id })}
          />
          <PeriodPicker
            presets={PRESETS}
            value={span.key}
            from={from}
            to={to}
            label={span.key === "range" ? span.label : (WINDOWS.find((w) => w.value === span.key)?.label ?? "Last 30 days")}
            today={TODAY}
            className="w-44"
            onPreset={(v) => setParam({ window: v === "30" ? null : v, from: null, to: null })}
            onRange={(f, t) => setParam({ window: "range", from: f, to: t })}
          />
          {/* The page's one solid button (user decision 2026-11-13), in the filter row on every tab. Creating adds the
              campaign to the shared session store and opens it on Campaigns (/campaigns?c=<id>). */}
          <Button size="sm" onClick={() => setCreating(true)}>
            <PlusIcon data-icon="inline-start" />
            New campaign
          </Button>
        </div>
      </div>

      {failed ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Couldn&apos;t load your metrics</AlertTitle>
          <AlertDescription>Your emails are still sending. Try again in a moment.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => setParam({ state: null })}>
              <RotateCwIcon data-icon="inline-start" />
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : (
        <>
          {view === "campaign" && campaign && (
            <CampaignDetailCard campaignId={campaign.id} templateCount={templateRows.length} />
          )}

          {kpiLoad.status === "ready" && !hasData ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>No batches in the selected window</EmptyTitle>
                <EmptyDescription>Nothing was sent {span.label}. Pick a longer period or another campaign.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {/* Campaign view: KPIs 2×2 on the left (2/3), Funnel on the right (1/3), same data and filters. */}
              <div className={cn(view === "campaign" && "grid items-start gap-4 md:gap-6 xl:grid-cols-3")}>
                <div className="flex flex-col gap-3 xl:col-span-2">
                  <SectionLoader
                    load={kpiLoad}
                    label="Key numbers"
                    status="Calculating delivery and open rates…"
                    skeleton={<Kpis view={view} totals={totals} templates={templateRows} senders={senderRows} loading more={more} />}
                  >
                    <Kpis view={view} totals={totals} templates={templateRows} senders={senderRows} loading={false} more={more} />
                  </SectionLoader>
                  <div className="flex justify-center">
                    <Button variant="ghost" size="sm" className="text-muted-foreground" aria-expanded={more} onClick={() => setMore((v) => !v)}>
                      {more ? "See less" : "See more"}
                      {more ? <ChevronUpIcon data-icon="inline-end" /> : <ChevronDownIcon data-icon="inline-end" />}
                    </Button>
                  </div>
                </div>
                {view === "campaign" && (
                  <SectionLoader
                    load={kpiLoad}
                    label="Funnel"
                    status="Adding up sends…"
                    skeleton={
                      <ChartCard title="Funnel">
                        <Skeleton className="h-48 w-full" />
                      </ChartCard>
                    }
                  >
                    <FunnelCard totals={totals} />
                  </SectionLoader>
                )}
              </div>

              {view === "campaign" && (
                <>
                  {flagged.length > 0 && (
                    <Alert variant="warning">
                      <TriangleAlertIcon />
                      <AlertTitle>
                        High bounce at {flagged.length} recipient {flagged.length === 1 ? "domain" : "domains"} (
                        {flagged
                          .slice(0, 2)
                          .map((d) => `${d.name} ${pct(d.totals.bounces / d.totals.sends)}`)
                          .join(", ")}
                        {flagged.length > 2 ? `, +${flagged.length - 2}` : ""})
                      </AlertTitle>
                      <AlertAction>
                        <Button variant="outline" size="sm" onClick={viewDomainsInSender}>
                          View in Sender
                        </Button>
                      </AlertAction>
                    </Alert>
                  )}
                  <ChartCard
                    title="Send volume"
                    description={cap(span.label)}
                    action={
                      <SeriesPicker
                        value={series}
                        onChange={(v) => setSeries((Object.keys(SERIES) as SeriesKey[]).filter((k) => v.includes(k)))}
                      />
                    }
                  >
                    <SectionLoader
                      load={chartLoad}
                      label="Send volume"
                      status={`Adding up sends ${span.label}…`}
                      skeleton={<Skeleton className="h-72 w-full" />}
                    >
                      <SendTrend points={points} series={series} />
                    </SectionLoader>
                  </ChartCard>
                  <SectionLoader
                    load={boardLoad}
                    label="Leaderboards"
                    status="Ranking campaigns and templates…"
                    className="flex flex-col gap-4 md:gap-6"
                    statusAt="center"
                    skeleton={
                      <div className="flex flex-col gap-4 md:gap-6">
                        {campaign ? (
                          <BoardSkeleton title="Templates in this campaign" columns={BOARD_COLUMNS.templatesInCampaign} rows={3} />
                        ) : (
                          <>
                            <BoardSkeleton
                              title="Campaign leaderboard"
                              columns={BOARD_COLUMNS.campaignLeaderboard}
                              // Every campaign shows, up to 10 (CampaignLeaderboard lists idle ones too).
                              rows={Math.min(sampleCampaigns.length, 10)}
                              ranked
                              controls
                              footer
                            />
                          </>
                        )}
                      </div>
                    }
                  >
                    {!campaign && campaignRows.length > 0 && (
                      <CampaignLeaderboard rows={campaignRows} onPick={(id) => setParam({ campaign: id })} />
                    )}
                    {/* No template leaderboard here (designer 2026-11-13): the Template tab has the full one. */}
                    {campaign && templateRows.length > 0 && <TemplatesInCampaign rows={templateRows} />}
                  </SectionLoader>
                </>
              )}

              {view === "template" && (
                <SectionLoader
                  load={boardLoad}
                  label="Template boards"
                  status="Adding up sends per template…"
                  className="flex flex-col gap-4 md:gap-6"
                  statusAt="top"
                  skeleton={
                    <div className="flex flex-col gap-4 md:gap-6">
                      <BoardSkeleton title="Top 6 by click rate" columns={[]} chartHeight={228} />
                      <BoardSkeleton
                        title="Template leaderboard"
                        columns={BOARD_COLUMNS.templateLeaderboardFull}
                        rows={Math.min(templateRows.length, 10)}
                        ranked
                        controls
                        footer
                      />
                    </div>
                  }
                >
                  <TemplateLeaderboard rows={templateRows} full chart />
                </SectionLoader>
              )}

              {view === "sender" && (
                <SectionLoader
                  load={boardLoad}
                  label="Sender boards"
                  status="Adding up sends per sender…"
                  className="flex flex-col gap-4 md:gap-6"
                  statusAt="top"
                  skeleton={
                    <div className="flex flex-col gap-4 md:gap-6">
                      <BoardSkeleton title="Sender board" subtitle={cap(span.label)} columns={BOARD_COLUMNS.senders} rows={senderRows.length} pie />
                      <BoardSkeleton title="Deliverability by recipient domain" columns={BOARD_COLUMNS.deliverability} rows={domains.length} />
                    </div>
                  }
                >
                  <SenderBoard rows={senderRows} domains={SENDER_DOMAINS} span={span} />
                  <DeliverabilityCard rows={domains} />
                </SectionLoader>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

type Cell = { label: string; value?: string; note?: string; muted?: boolean; tone?: "warning" | "danger"; detail?: string };

/** KPI cells per view, as the live app lists them: four on top, the rest under "See more". */
function kpiCells(view: View, t: Totals, templates: GroupRow[], senders: GroupRow[]): [Cell[], Cell[]] {
  if (view === "campaign") {
    const c = workspaceCounts(templates);
    return [
      [
        { label: "Delivery rate", ...rateKpi("delivery", t.delivered, t.sends) },
        { label: "Open rate", ...rateKpi("open", t.opens, t.delivered) },
        { label: "Click rate", ...rateKpi("click", t.clicks, t.delivered) },
        { label: "Reply rate", ...rateKpi("reply", t.replies, t.delivered) },
      ],
      [
        { label: "Bounce rate", ...rateKpi("bounce", t.bounces, t.sends) },
        { label: "Unsubscribe rate", ...rateKpi("unsub", t.unsubs, t.delivered) },
        { label: "Total campaigns", value: n(c.totalCampaigns) },
        { label: "Active campaigns", value: n(c.activeCampaigns) },
        { label: "Total templates", value: n(c.totalTemplates) },
        { label: "Active templates", value: n(c.activeTemplates) },
      ],
    ];
  }
  if (view === "template") {
    // Pooled over all templates (sum of parts ÷ sum of wholes, PATTERNS 9.7; user decision 2026-11-11), not the
    // live app's mean of each template's rate.
    const judged = templates.filter((r) => r.totals.delivered >= LOW);
    const best = judged.reduce<GroupRow | null>(
      (b, r) => ((ratio(r.totals.opens, r.totals.delivered) ?? -1) > (b ? (ratio(b.totals.opens, b.totals.delivered) ?? -1) : -1) ? r : b),
      null,
    );
    const sends = templates.reduce((x, r) => x + r.totals.sends, 0);
    return [
      [
        { label: "Active templates", value: n(templates.length), note: `${n(sends)} sends` },
        { label: "Open rate", ...rateKpi("open", t.opens, t.delivered) },
        { label: "Click rate", ...rateKpi("click", t.clicks, t.delivered) },
        { label: "Bounce rate", ...rateKpi("bounce", t.bounces, t.sends) },
      ],
      [
        { label: "Unsubscribe rate", ...rateKpi("unsub", t.unsubs, t.delivered) },
        {
          label: "Click-to-open",
          value: pct(ratio(t.clicks, t.opens)),
          note: `${n(t.clicks)}/${n(t.opens)} opened`,
        },
        { label: "Best open rate", value: best ? pct(ratio(best.totals.opens, best.totals.delivered)) : undefined, note: best?.name },
        { label: "Email sent", value: n(sends) },
      ],
    ];
  }
  const sendersSent = senders.length;
  const domainCount = new Set(senders.map((s) => s.domain).filter(Boolean)).size;
  const judged = senders.filter((r) => r.totals.sends >= LOW);
  const best = judged.reduce<GroupRow | null>(
    (b, r) => ((ratio(r.totals.delivered, r.totals.sends) ?? -1) > (b ? (ratio(b.totals.delivered, b.totals.sends) ?? -1) : -1) ? r : b),
    null,
  );
  return [
    [
      { label: "Active senders", value: n(sendersSent), note: `${domainCount} ${domainCount === 1 ? "domain" : "domains"}` },
      { label: "Total sent", value: n(t.sends), note: `${n(t.delivered)} delivered` },
      { label: "Delivery rate", ...rateKpi("delivery", t.delivered, t.sends) },
      { label: "Bounce rate", ...rateKpi("bounce", t.bounces, t.sends) },
    ],
    [
      { label: "Open rate", ...rateKpi("open", t.opens, t.delivered) },
      { label: "Recipients", value: n(t.recipients) },
      { label: "Best delivery", value: best ? pct(ratio(best.totals.delivered, best.totals.sends)) : undefined, note: best?.name },
      { label: "Sending domains", value: n(domainCount) },
    ],
  ];
}

function Kpis({
  view,
  totals,
  templates,
  senders,
  loading,
  more,
}: {
  view: View;
  totals: Totals;
  templates: GroupRow[];
  senders: GroupRow[];
  loading: boolean;
  more: boolean;
}) {
  const [top, rest] = kpiCells(view, totals, templates, senders);
  // Campaign view sits beside the Funnel: one strip in two columns, hairlines between cells and rows.
  if (view === "campaign") {
    return (
      <KpiStrip className="grid-flow-row grid-cols-2 divide-x-0 [&>*:nth-child(odd)]:border-r [&>*:not(:nth-last-child(-n+2))]:border-b">
        {(more ? [...top, ...rest] : top).map((c) => (
          <KpiStripItem key={c.label} loading={loading} {...c} />
        ))}
      </KpiStrip>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <KpiStrip>
        {top.map((c) => (
          <KpiStripItem key={c.label} loading={loading} {...c} />
        ))}
      </KpiStrip>
      {more && (
        <KpiStrip>
          {rest.map((c) => (
            <KpiStripItem key={c.label} loading={loading} {...c} />
          ))}
        </KpiStrip>
      )}
    </div>
  );
}
