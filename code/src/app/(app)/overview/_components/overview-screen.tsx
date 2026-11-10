"use client";

// Overview: the email metrics dashboard (live app /dashboard/email/metrics, EmailMetricsDashboard).
// URL: ?view=campaign|template|sender &window=7|14|30|90|180|year|range (&from=&to=) &campaign=<id>.
// Campaigns' "View report" links here with ?campaign=, which narrows every number to that campaign.
// Rates: open/click/unsub over delivered, bounce over sent, machine traffic excluded (AC-EC-K-07).
// Leaderboards rank only rows with ≥ 100 delivered, by Wilson interval (live app lib/email/ranking.ts).
// Preview states (?state=): loading, error, empty (no sends ever), paused (workspace auto-paused),
// new (fresh workspace: only a domain verified). Empty and new also show the Get started card (R14, 2026-10-29).
// Recent replies (R15, 2026-10-29): ?replies=<intent> filters it; ?state=no-replies previews it with no replies,
// ?state=error shows its own error.

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CircleAlertIcon,
  InboxIcon,
  PlusIcon,
  RotateCwIcon,
  XIcon,
} from "lucide-react";
import { allBatches, batchTitle } from "@/lib/mock/batches";
import { INTENTS, type ReplyIntent } from "@/lib/mock/replies";
import {
  campaignStatus,
  formatDate,
  formatDateTime,
  sampleCampaigns,
} from "@/lib/mock/campaigns";
import { contactLists, senders, sendingDomains } from "@/lib/mock/workspace";
import { PageHeader } from "@/components/layout/page-header";
import { ChartCard } from "@/components/saella/chart-card";
import { SendTrend, TrendViewSwitch } from "./send-trend";
import { DateRangePicker } from "@/components/saella/date-picker";
import { KpiStrip, KpiStripItem } from "@/components/saella/kpi-strip";
import { type RateKind, rateKpi } from "@/components/saella/rate-meter";
import { StatusBadge } from "@/components/saella/status-badge";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaderboard, SenderBoard } from "./leaderboards";
import { RecentReplies } from "./recent-replies";
import { SetupGuide, type SetupStepKey } from "./setup-guide";
import {
  type Span,
  type Totals,
  WINDOWS,
  type WindowKey,
  groupBy,
  ratio,
  recentBatches,
  resolveSpan,
  sentIn,
  sum,
  trend,
} from "./metrics";
import { Hint } from "@/components/saella/hint";

const VIEWS = [
  { value: "campaign", label: "Campaigns" },
  { value: "template", label: "Templates" },
  { value: "sender", label: "Senders" },
] as const;
type View = (typeof VIEWS)[number]["value"];

const pct = (r: number | null) =>
  r === null ? null : `${(r * 100).toFixed(1)}%`;

export function OverviewScreen() {
  const [trendView, setTrendView] = useState<"rates" | "counts">("rates");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = params.get("state");
  const view: View = VIEWS.some((v) => v.value === params.get("view"))
    ? (params.get("view") as View)
    : "campaign";
  const windowKey: WindowKey = WINDOWS.some(
    (w) => w.value === params.get("window"),
  )
    ? (params.get("window") as WindowKey)
    : "30";
  const from = params.get("from");
  const to = params.get("to");
  const campaignId = params.get("campaign");
  const campaign = sampleCampaigns.find((c) => c.id === campaignId);

  function setParam(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  }

  const span = useMemo(
    () => resolveSpan(windowKey, from, to),
    [windowKey, from, to],
  );
  const empty = state === "empty" || state === "new";
  const setupDone = useMemo(() => setupSteps(state), [state]);
  // Dismissal is per person and stays hidden after reload (backend: one flag per user and workspace).
  const [setupHidden, setSetupHidden] = useState(false);
  const list = useMemo(
    () => (empty ? [] : sentIn(span, campaign?.id)),
    [empty, span, campaign],
  );
  const totals = sum(list);
  const series = useMemo(() => trend(list, span), [list, span]);
  const recent = empty ? [] : recentBatches(campaign?.id, 5);
  const loading = state === "loading";
  const repliesParam = params.get("replies");
  const replyIntent = INTENTS.some((i) => i.value === repliesParam)
    ? (repliesParam as ReplyIntent)
    : null;

  const newBatch = (
    <Button asChild>
      <Link href="/batches/new">
        <PlusIcon data-icon="inline-start" />
        New batch
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Overview"
        description="How your emails are doing across campaigns, templates and senders."
        actions={newBatch}
      />

      {state === "paused" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Sending is paused for this workspace</AlertTitle>
          <AlertDescription>
            Bounces reached 10.4% over the last 7 days. Clean the lists in the
            batches below, then ask an admin to resume sending.
          </AlertDescription>
        </Alert>
      )}
      {state === "error" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Couldn&apos;t load your metrics</AlertTitle>
          <AlertDescription>
            Your emails are still sending. Try again in a moment.
          </AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setParam({ state: null })}
            >
              <RotateCwIcon data-icon="inline-start" />
              Retry
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* Above the filters: until the four steps are done there are no numbers worth filtering yet. */}
      {!setupHidden && setupDone.size < 4 && (
        <SetupGuide done={setupDone} onDismiss={() => setSetupHidden(true)} />
      )}

      {/* Filters that scope every number on the page. The Campaigns/Templates/Senders switch moved down to the
          Breakdown section (2026-10-28): at the top it looked page-wide but only changed the tables below the fold. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={campaign?.id ?? "all"}
            onValueChange={(v) =>
              setParam({ campaign: v === "all" ? null : v })
            }
          >
            <SelectTrigger className="w-60" aria-label="Campaign">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All campaigns</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                {sampleCampaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={windowKey}
            onValueChange={(v) =>
              setParam(
                v === "range"
                  ? {
                      window: v,
                      from: from ?? "2026-10-01",
                      to: to ?? "2026-10-27",
                    }
                  : { window: v === "30" ? null : v, from: null, to: null },
              )
            }
          >
            <SelectTrigger className="w-44" aria-label="Time window">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {WINDOWS.map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {windowKey === "range" && (
            <DateRangePicker
              aria-label="Custom range"
              className="w-64"
              from={from ?? undefined}
              to={to ?? undefined}
              max="2026-10-27"
              onChange={(r) =>
                setParam({ from: r.from || null, to: r.to || null })
              }
            />
          )}
        </div>
      </div>

      {campaign && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-primary-subtle px-4 py-2.5 text-sm">
          <span>
            Showing <span className="font-medium">{campaign.name}</span>
          </span>
          <span className="text-muted-foreground">
            {[
              campaign.countries.join(", "),
              campaign.startsOn &&
                `${formatDate(campaign.startsOn)} → ${campaign.endsOn ? formatDate(campaign.endsOn, true) : "no end"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <StatusBadge status={campaignStatus(campaign)} />
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setParam({ campaign: null })}
          >
            <XIcon data-icon="inline-start" />
            All campaigns
          </Button>
        </div>
      )}

      {empty ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>No emails sent yet</EmptyTitle>
            <EmptyDescription>
              Send your first batch and its opens, clicks and bounces show up
              here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link href="/campaigns">Go to Campaigns</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <Kpis totals={totals} span={span} loading={loading} />

          {/* Stretched so the chart and the list end on one line (Studio Admin analytics rows). */}
          <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <ChartCard
              title="Email performance"
              description={
                trendView === "rates"
                  ? `Rates per ${series.unit}, ${span.label}`
                  : `Counts per ${series.unit}, ${span.label}`
              }
              action={
                <TrendViewSwitch view={trendView} onChange={setTrendView} />
              }
              loading={loading}
            >
              {totals.batches === 0 ? (
                <NoSendsInWindow
                  span={span}
                  onWiden={() =>
                    setParam({ window: "year", from: null, to: null })
                  }
                />
              ) : (
                <SendTrend points={series.points} view={trendView} />
              )}
            </ChartCard>

            <RecentBatches batches={recent} loading={loading} />
          </div>

          {/* Below the chart row, above Breakdown: who to follow up is the next thing to do after reading the
              numbers, before the analysis tables. Full width for the Apollo two-pane layout (filter | replies);
              the side slot next to the chart is too narrow for it and keeps Recent batches (where sends are). */}
          {(loading || totals.batches > 0) && (
            <RecentReplies
              batches={state === "no-replies" ? [] : list}
              periodLabel={span.label}
              intent={replyIntent}
              onIntentChange={(i) => setParam({ replies: i })}
              loading={loading}
              error={state === "error"}
              onRetry={() => setParam({ state: null })}
            />
          )}

          {!loading && totals.batches > 0 && (
            <section
              aria-labelledby="breakdown"
              className="flex flex-col gap-6"
            >
              {/* Section header with its own view switch, like a CardHeader + CardAction in Studio Admin CRM. */}
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-3">
                <div className="flex flex-col gap-0.5">
                  <h2
                    id="breakdown"
                    className="font-heading text-lg font-medium tracking-title"
                  >
                    Breakdown
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    The same numbers, split by campaign, template or sender.
                  </p>
                </div>
                <Tabs
                  value={view}
                  onValueChange={(v) =>
                    setParam({ view: v === "campaign" ? null : v })
                  }
                >
                  <TabsList aria-label="Break down by">
                    {VIEWS.map((v) => (
                      <TabsTrigger key={v.value} value={v.value}>
                        {v.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              {view === "campaign" && !campaign && (
                <Leaderboard
                  kind="campaigns"
                  title="Campaigns"
                  description="Click a campaign to see only its numbers."
                  rows={groupBy(list, "campaign")}
                  viewAll={{ href: "/campaigns", label: "View all campaigns" }}
                />
              )}
              {/* Each tab shows its own table only (user request 2026-10-28). With one campaign picked, its
                  one-row campaign table says nothing, so the Campaigns tab lists that campaign's templates (live app). */}
              {(view === "template" || (view === "campaign" && campaign)) && (
                <Leaderboard
                  kind="templates"
                  title={
                    campaign ? `Templates in ${campaign.name}` : "Templates"
                  }
                  description={
                    campaign
                      ? undefined
                      : "Best and worst templates across campaigns."
                  }
                  rows={groupBy(list, "template")}
                  viewAll={{
                    href: campaign
                      ? `/templates?campaign=${campaign.id}`
                      : "/templates",
                    label: "View all templates",
                  }}
                />
              )}
              {view === "sender" && (
                <SenderBoard
                  rows={groupBy(list, "sender")}
                  span={span}
                  viewAll={{
                    href: "/settings/sending",
                    label: "Manage senders",
                  }}
                />
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}

function Kpis({
  totals: t,
  span,
  loading,
}: {
  totals: Totals;
  span: Span;
  loading: boolean;
}) {
  const empty = t.batches === 0;
  // Card set from the live app's KPI cards (Delivery, Open, Click, Reply, then Bounce and Unsubscribe). No change
  // vs the previous period: the live app has none yet (2026-10-29).
  // 2026-11-05: the joined KpiStrip used on Campaigns and the batch report, instead of six cards with a decorative
  // corner icon each. Wording and colour come from rateKpi: note "8,479 of 8,675 sent" / "3,462 of 8,479
  // delivered", counts in the tooltip, only Bounce and Delivery flagged past their threshold.
  const cells: { kind: RateKind; label: string; part: number; whole: number }[] = [
    { kind: "delivery", label: "Delivery rate", part: t.delivered, whole: t.sends },
    { kind: "open", label: "Open rate", part: t.opens, whole: t.delivered },
    { kind: "click", label: "Click rate", part: t.clicks, whole: t.delivered },
    { kind: "reply", label: "Reply rate", part: t.replies, whole: t.delivered },
    { kind: "bounce", label: "Bounce rate", part: t.bounces, whole: t.sends },
    { kind: "unsub", label: "Unsubscribe rate", part: t.unsubs, whole: t.delivered },
  ];
  return (
    <KpiStrip>
      {cells.map((c) => (
        <KpiStripItem
          key={c.kind}
          label={c.label}
          loading={loading}
          {...(empty ? { note: `No batches sent ${span.label}` } : rateKpi(c.kind, c.part, c.whole))}
        />
      ))}
    </KpiStrip>
  );
}

function NoSendsInWindow({
  span,
  onWiden,
}: {
  span: Span;
  onWiden: () => void;
}) {
  return (
    <Empty className="h-64">
      <EmptyHeader>
        <EmptyTitle>No batches sent {span.label}</EmptyTitle>
        <EmptyDescription>
          Pick a longer period to see earlier sends.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onWiden}>
          Show last 12 months
        </Button>
      </EmptyContent>
    </Empty>
  );
}

// Latest batches of any status; sent ones show their open rate, others their status (status only where it helps).
function RecentBatches({
  batches,
  loading,
}: {
  batches: ReturnType<typeof recentBatches>;
  loading: boolean;
}) {
  return (
    <Card aria-busy={loading || undefined}>
      <CardHeader>
        <CardTitle className="font-heading text-base font-medium">
          Recent batches
        </CardTitle>
        <CardDescription>Latest sends and where they are</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing sent in this campaign yet.
          </p>
        ) : (
          <ItemGroup className="-mx-2 gap-0 has-data-[size=sm]:gap-0">
            {batches.map((b) => {
              const open =
                b.metrics && b.metrics.delivered >= 20
                  ? ratio(b.metrics.opens, b.metrics.delivered)
                  : null;
              const when = b.sentAt ?? `${b.createdOn}T00:00:00Z`;
              // One status badge on every row; the result (progress or open rate) is on hover, the report has the rest.
              const result =
                b.status === "sending"
                  ? `${b.sent.toLocaleString("en-US")} of ${b.recipients.toLocaleString("en-US")} sent`
                  : b.status === "sent"
                    ? open !== null
                      ? `${pct(open)} open`
                      : "too few to judge"
                    : undefined;
              return (
                <Hint key={b.id} label={result}>
                  <Item
                    size="sm"
                    asChild
                    className="px-2 [a]:hover:bg-transparent"
                  >
                    <Link href={`/batches/${b.id}/report`}>
                      <ItemContent className="min-w-0">
                        <ItemTitle className="w-full truncate group-hover/item:underline">
                          {batchTitle(b)}
                        </ItemTitle>
                        <ItemDescription className="truncate">
                          {/* Day and time it went out; a failed batch never went out, so only its day. */}
                          {b.sentAt ? formatDateTime(b.sentAt) : formatDate(when)}{" "}
                          · {templateName(b.templateId)}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <StatusBadge status={b.status} />
                      </ItemActions>
                    </Link>
                  </Item>
                </Hint>
              );
            })}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}

// Which Get started steps are done, from data the workspace already has. Preview: new = only a verified domain,
// empty = everything but a sent batch; otherwise the mock workspace, which has finished all four.
function setupSteps(state: string | null): Set<SetupStepKey> {
  if (state === "new") return new Set(["domain"]);
  const done = new Set<SetupStepKey>();
  if (sendingDomains.some((d) => d.status === "verified")) done.add("domain");
  if (senders.some((s) => !s.shared && s.status === "confirmed"))
    done.add("sender");
  if (contactLists.length > 0) done.add("list");
  if (state !== "empty" && allBatches().some((b) => b.sentAt && b.sent > 0))
    done.add("batch");
  return done;
}

function templateName(id: string) {
  return (
    sampleCampaigns.flatMap((c) => c.templates).find((t) => t.id === id)
      ?.name ?? "Deleted template"
  );
}
