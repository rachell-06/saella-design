"use client";

// Overview boards and cards, in the live app's content and order (Repo EmailMetricsDashboard, origin/development
// 2026-11-05): Campaign details, Campaign leaderboard, Template leaderboard, Templates in this campaign,
// Deliverability by recipient domain, Volume by template, Sender board. Saella look: tables in a bordered card with
// thin column dividers (as on Leads), rates through RateCell ("38.3% (467)", blank when nothing is under them),
// numbered medals instead of emoji.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts";
import { campaignStatus, formatDate, industryLabels, sampleCampaigns } from "@/lib/mock/campaigns";
import { Button } from "@/components/ui/button";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hint } from "@/components/saella/hint";
import { RateCell, type RateKind } from "@/components/saella/rate-meter";
import { StatusBadge } from "@/components/saella/status-badge";
import { cn } from "@/lib/utils";
import {
  type DomainRow,
  type GroupRow,
  type RankMode,
  type Span,
  type Totals,
  measure,
  rank,
  type RankMetric,
  sum,
} from "./metrics";

const n = (x: number) => x.toLocaleString("en-US");

// Table frame from Leads (PATTERNS 9.16): cells px-3, outer cells px-5 to line up with the card, thin vertical
// dividers, last column none.
// Narrow content (agent panel open): every table has a min width = its fixed columns + 12.5rem for the name column,
// and scrolls sideways inside its card (table-container is overflow-x-auto) instead of crushing the name column.
export const frame = cn(
  "**:data-[slot=table-cell]:px-3 **:data-[slot=table-head]:px-3",
  "**:data-[slot=table-cell]:first:pl-5 **:data-[slot=table-head]:first:pl-5",
  "**:data-[slot=table-cell]:last:pr-5 **:data-[slot=table-head]:last:pr-5",
  "**:data-[slot=table-cell]:border-r **:data-[slot=table-head]:border-r",
  "**:data-[slot=table-cell]:border-border/50 **:data-[slot=table-head]:border-border/50",
  "**:data-[slot=table-cell]:last:border-r-0 **:data-[slot=table-head]:last:border-r-0",
);
export const headRow = "[&_tr]:border-y";
export const card = "flex flex-col gap-3 overflow-hidden rounded-card border bg-card pt-4";

/** Numerator and denominator of a rate: delivery and bounce over sent, the rest over delivered (live app). */
export function rateParts(t: Totals, k: RateKind): [number, number] {
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

function Rate({ t, k, strong, className }: { t: Totals; k: RateKind; strong?: boolean; className?: string }) {
  const [part, whole] = rateParts(t, k);
  return <RateCell kind={k} part={part} whole={whole} strong={strong} className={className} />;
}

/** "Delivered / Recip." as in the live app boards. */
function DeliveredCell({ t }: { t: Totals }) {
  return (
    <TableCell className="tabular-nums">
      {n(t.delivered)}
      <span className="text-muted-foreground"> / {n(t.recipients)}</span>
    </TableCell>
  );
}

/** Card title + controls. No descriptive subtext under the title (user decision 2026-11-12): only a time window
 *  may stay as `subtitle`. */
export function CardHead({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5">
      <div className="flex flex-col gap-0.5">
        <h3 id={id} className="font-heading text-base font-medium">
          {title}
        </h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Whole row opens or filters (PATTERNS 9.1): hand cursor + row hover; the name stays a real control for the
 *  keyboard. Clicks on a control inside the row are left to it. */
const clickRow = "cursor-pointer";
const fromControl = (e: React.MouseEvent) => (e.target as HTMLElement).closest("a,button,[role=button]") !== null;

function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-6 text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Campaign details (live app CampaignDetailCard): Campaign view with one campaign picked.

export function CampaignDetailCard({ campaignId, templateCount }: { campaignId: string; templateCount: number }) {
  const c = sampleCampaigns.find((x) => x.id === campaignId);
  if (!c) return null;
  // Campaign industries are ISIC classes; a fully checked section reads as the section.
  const industryNames = industryLabels(c.industries);
  const rows: { group: string; items: [string, React.ReactNode][] }[] = [
    {
      group: "Overview",
      items: [
        ["Templates", n(templateCount)],
        ["Description", c.description || "–"],
      ],
    },
    {
      group: "Targeting",
      items: [
        ["Country", c.countries.length ? c.countries.join(", ") : "All"],
        [
          "Industry",
          industryNames.length === 0 ? (
            "–"
          ) : industryNames.length > 2 ? (
            <Hint label={industryNames.join(", ")}>
              <span tabIndex={0} className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {industryNames[0]} <span className="text-muted-foreground">+{industryNames.length - 1}</span>
              </span>
            </Hint>
          ) : (
            industryNames.join(", ")
          ),
        ],
      ],
    },
  ];
  return (
    <section aria-labelledby="campaign-detail" className={cn(card, "pb-4")}>
      <CardHead id="campaign-detail" title="Campaign details" />
      <div className="grid gap-x-8 gap-y-4 px-5 md:grid-cols-2">
        {rows.map((r) => (
          <dl key={r.group} className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-medium tracking-wide text-subtle-foreground uppercase">{r.group}</span>
            {r.items.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Leaderboards (live app LeaderHead + rankCampaigns / rankTemplates + BelowGate).

/** Leaderboards on the Campaign view show the top 3 of the current ranking (user decision 2026-11-12); the rest
 *  sits behind "View all". */
export const BOARD_TOP = 3;
/** Rows in the Template view's board and its chart (more go behind "View all"). */
const FULL_TOP = 10;

const MODES: { value: RankMode; label: string }[] = [
  { value: "top", label: "Highest" },
  { value: "lowest", label: "Lowest" },
];

/** Two small dropdowns side by side: [Highest ▾] [All metrics ▾] (user decision 2026-11-12). Fixed widths fit the
 *  longest option, so the triggers don't jump. */
function LeaderControls<M extends string>({
  title,
  mode,
  onMode,
  sort,
  onSort,
  options,
}: {
  title: string;
  mode: RankMode;
  onMode: (m: RankMode) => void;
  sort: M;
  onSort: (m: M) => void;
  options: { value: M; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <Select value={mode} onValueChange={(v) => onMode(v as RankMode)}>
        <SelectTrigger size="sm" className="w-24" aria-label={`${title}: highest or lowest`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            {MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={(v) => onSort(v as M)}>
        <SelectTrigger size="sm" className="w-32" aria-label={`${title}: rank by`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Footer row of a leaderboard (user decision 2026-11-12): left, the rows under the sample gate, listed not hidden
 * (live app BelowGate); right, a quiet "View all →" to the full list when the board cut rows. Nothing to show: no row.
 */
function BoardFooter({ rows, viewAll }: { rows: GroupRow[]; viewAll?: { href: string; label: string } | null }) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0 && !viewAll) return null;
  return (
    <div className="-mt-3 flex flex-col gap-1 border-t px-3 py-1.5">
      <div className="flex items-center justify-between gap-2">
        {rows.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronUpIcon data-icon="inline-start" /> : <ChevronDownIcon data-icon="inline-start" />}
            Not enough data to rank yet ({rows.length})
          </Button>
        ) : (
          <span />
        )}
        {viewAll && (
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href={viewAll.href} aria-label={viewAll.label}>
              View all
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        )}
      </div>
      {open && (
        <ul className="flex flex-col gap-1 px-2.5 pb-1 text-sm text-muted-foreground">
          {[...rows]
            .sort((a, b) => b.totals.sends - a.totals.sends)
            .map((r) => (
              <li key={r.id}>
                {r.name} · {n(r.totals.sends)} sent
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

// Ranked column (PATTERNS 9.1): the metric picked in the dropdown tints its whole column and its header gets the
// direction arrow, so the user sees which column the order comes from. "All metrics" highlights nothing. The tint is
// translucent so the row hover still shows through it.
const rankedTint = "bg-primary-soft/40";

function RankHead({ on, mode, children }: { on: boolean; mode: RankMode; children: React.ReactNode }) {
  return (
    <TableHead
      aria-sort={on ? (mode === "top" ? "descending" : "ascending") : undefined}
      className={cn(on && cn(rankedTint, "text-primary-soft-foreground"))}
    >
      {on ? (
        <span className="inline-flex items-center gap-1">
          {mode === "top" ? (
            <ArrowDownIcon aria-hidden className="size-3.5" />
          ) : (
            <ArrowUpIcon aria-hidden className="size-3.5" />
          )}
          {children}
        </span>
      ) : (
        children
      )}
    </TableHead>
  );
}

/** Cell class for a column that may be the ranked one. */
const ranked = (on: boolean) => (on ? rankedTint : undefined);

// Medals for places 1–3 when ranking highest first (live app rankCell); numbered so the place stays readable.
// Clear steps at a glance (user feedback 2026-11-12): #1 solid gold and larger, #2 neutral, #3 soft bronze,
// 4+ a plain muted number centred in the same slot.
const MEDALS = [
  {
    label: "1st place",
    className: "size-7 bg-warning text-warning-foreground ring-2 ring-warning-soft",
  },
  {
    label: "2nd place",
    className: "size-6 bg-muted text-foreground ring-1 ring-muted-foreground/40",
  },
  {
    label: "3rd place",
    className: "size-6 bg-primary-soft text-primary-soft-foreground ring-1 ring-brand/50",
  },
];

function Place({ i, medals }: { i: number; medals: boolean }) {
  if (!medals || i > 2)
    return <span className="inline-flex w-7 justify-center tabular-nums text-muted-foreground">{i + 1}</span>;
  const m = MEDALS[i];
  return (
    <Hint label={m.label}>
      <span className="inline-flex w-7 justify-center">
        <span
          aria-label={m.label}
          className={cn(
            "inline-flex items-center justify-center rounded-full text-dense font-semibold tabular-nums",
            m.className,
          )}
        >
          {i + 1}
        </span>
      </span>
    </Hint>
  );
}

type CampSort = "all" | "reply" | "open" | "click" | "unsub" | "bounce";
const CAMP_SORTS: { value: CampSort; label: string }[] = [
  { value: "all", label: "All metrics" },
  { value: "reply", label: "Replies" },
  { value: "open", label: "Open rate" },
  { value: "click", label: "Click rate" },
  { value: "unsub", label: "Unsub rate" },
  { value: "bounce", label: "Bounce rate" },
];

/** Campaign leaderboard: top 3. "All metrics" (default) ranks by Replies (a count) with no column highlighted; a
 *  picked metric highlights its column. A row narrows Overview to that campaign. */
export function CampaignLeaderboard({ rows, onPick }: { rows: GroupRow[]; onPick: (id: string) => void }) {
  const [mode, setMode] = useState<RankMode>("top");
  const [sort, setSort] = useState<CampSort>("all");
  const metric = sort === "all" ? "reply" : sort;
  // Same shape as the Template view (designer 2026-11-13): a chart of the ranked campaigns above, then every campaign
  // (up to FULL_TOP, ranked first, under-sampled after), top 3 with medals, "View all" to Campaigns.
  // Campaigns with no sends in the period are listed too, last (designer 2026-11-13: every campaign shows).
  const idle: GroupRow[] = sampleCampaigns
    .filter((c) => !rows.some((r) => r.id === c.id))
    .map((c) => ({ id: c.id, name: c.name, status: campaignStatus(c), totals: sum([]) }));
  const res = rank([...rows, ...idle], metric, mode, {
    replyIsCount: true,
    limit: FULL_TOP,
  });
  const shown = [...res.ranked, ...res.belowGate.slice(0, Math.max(0, FULL_TOP - res.ranked.length))];
  return (
    <>
    {/* No ranked chart on the Campaign view (designer 2026-11-13); the Template view keeps its own. */}
    <section aria-labelledby="camp-leader" className={card}>
      <CardHead id="camp-leader" title="Campaign leaderboard">
        <LeaderControls
          title="Campaign leaderboard"
          mode={mode}
          onMode={setMode}
          sort={sort}
          onSort={setSort}
          options={CAMP_SORTS}
        />
      </CardHead>
      <Table aria-label="Campaign leaderboard" className={cn("table-fixed min-w-[62rem]", frame)}>
        <colgroup>
          <col className="w-14" />
          <col />
          <col className="w-28" />
          <col className="w-36" />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-20" />
          <col className="w-24" />
          <col className="w-24" />
        </colgroup>
        <TableHeader className={headRow}>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Delivered / Recip.</TableHead>
            <RankHead on={sort === "open"} mode={mode}>
              Open
            </RankHead>
            <RankHead on={sort === "click"} mode={mode}>
              Click
            </RankHead>
            <RankHead on={sort === "reply"} mode={mode}>
              Replies
            </RankHead>
            <RankHead on={sort === "unsub"} mode={mode}>
              Unsub
            </RankHead>
            <RankHead on={sort === "bounce"} mode={mode}>
              Bounce
            </RankHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.length === 0 ? (
            <EmptyRow cols={9}>Not enough data to rank yet.</EmptyRow>
          ) : (
            shown.map((r, i) => (
              <TableRow key={r.id} className={clickRow} onClick={(e) => !fromControl(e) && onPick(r.id)}>
                <TableCell>{i < res.ranked.length ? <Place i={i} medals={mode === "top"} /> : null}</TableCell>
                <TableCell>
                  <Button
                    variant="link"
                    className="block h-auto max-w-full truncate border-0 p-0 text-left font-medium text-foreground"
                    onClick={() => onPick(r.id)}
                  >
                    {r.name}
                  </Button>
                </TableCell>
                <TableCell>{r.status && <StatusBadge status={r.status} />}</TableCell>
                <DeliveredCell t={r.totals} />
                <Rate t={r.totals} k="open" strong={sort === "open"} className={ranked(sort === "open")} />
                <Rate t={r.totals} k="click" strong={sort === "click"} className={ranked(sort === "click")} />
                <TableCell className={cn("font-medium tabular-nums", ranked(sort === "reply"))}>
                  {n(r.totals.replies)}
                </TableCell>
                <Rate t={r.totals} k="unsub" strong={sort === "unsub"} className={ranked(sort === "unsub")} />
                <Rate t={r.totals} k="bounce" strong={sort === "bounce"} className={ranked(sort === "bounce")} />
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <BoardFooter rows={[]} viewAll={{ href: "/campaigns", label: "View all campaigns" }} />
    </section>
    </>
  );
}

type TplSort = "all" | "open" | "click" | "reply" | "unsub" | "bounce";
const TPL_SORTS: { value: TplSort; label: string }[] = [
  { value: "all", label: "All metrics" },
  { value: "open", label: "Open rate" },
  { value: "click", label: "Click rate" },
  { value: "reply", label: "Reply rate" },
  { value: "unsub", label: "Unsub rate" },
  { value: "bounce", label: "Bounce rate" },
];

/**
 * Template leaderboard. Campaign view: top 3 across campaigns. Template view (`full`): every template, the ranked
 * ones first and the under-sampled ones after them, plus Click-to-open and Last sent (live app tplRankAll).
 * "All metrics" (default) ranks by click rate with no column highlighted; a picked metric highlights its column.
 */
export function TemplateLeaderboard({
  rows,
  full = false,
  chart = false,
}: {
  rows: GroupRow[];
  full?: boolean;
  /** Template view: the ranked chart above the board, driven by the board's dropdowns. */
  chart?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<RankMode>("top");
  const [sort, setSort] = useState<TplSort>("all");
  // Default ranking: click rate (designer 2026-11-13; was open rate, which privacy proxies inflate).
  const metric = sort === "all" ? "click" : sort;
  const res = rank(rows, metric, mode, {
    limit: full ? FULL_TOP : BOARD_TOP,
  });
  // Template view: up to FULL_TOP ranked rows, then the under-sampled ones; the chart above draws the same ranked rows
  // (designer 2026-11-13: chart and table show the same templates). "View all" goes to Templates for the rest.
  const shown = full ? [...res.ranked, ...res.belowGate.slice(0, Math.max(0, FULL_TOP - res.ranked.length))] : res.ranked;
  // No CTO column (designer 2026-11-13): it repeats Click ÷ Open, both already shown.
  const cols = 9;
  return (
    <>
      {chart && <RankChart rows={shown} metric={metric} mode={mode} />}
      <section aria-labelledby={full ? "tpl-leader-all" : "tpl-leader"} className={card}>
        <CardHead id={full ? "tpl-leader-all" : "tpl-leader"} title="Template leaderboard">
          <LeaderControls
            title="Template leaderboard"
            mode={mode}
            onMode={setMode}
            sort={sort}
            onSort={setSort}
            options={TPL_SORTS}
          />
        </CardHead>
        <Table aria-label="Template leaderboard" className={cn("table-fixed min-w-[67rem]", frame)}>
          <colgroup>
            <col className="w-14" />
            <col />
            {!full && <col className="w-44" />}
            <col className="w-36" />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-24" />
            {full && <col className="w-28" />}
          </colgroup>
          <TableHeader className={headRow}>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Template</TableHead>
              {!full && <TableHead>Campaign</TableHead>}
              <TableHead>Delivered / Recip.</TableHead>
              <RankHead on={sort === "open"} mode={mode}>
                Open
              </RankHead>
              <RankHead on={sort === "click"} mode={mode}>
                Click
              </RankHead>
              <RankHead on={sort === "reply"} mode={mode}>
                Replied
              </RankHead>
              <RankHead on={sort === "unsub"} mode={mode}>
                Unsub
              </RankHead>
              <RankHead on={sort === "bounce"} mode={mode}>
                Bounce
              </RankHead>
              {full && <TableHead>Last sent</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <EmptyRow cols={cols}>Not enough data to rank yet.</EmptyRow>
            ) : (
              shown.map((r, i) => {
                return (
                  <TableRow key={r.id} className={clickRow} onClick={(e) => !fromControl(e) && router.push(r.href!)}>
                    <TableCell>{i < res.ranked.length ? <Place i={i} medals={mode === "top"} /> : null}</TableCell>
                    {/* Full list: the campaign is the second line, so eleven columns fit without cutting names. */}
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <Link
                          href={r.href!}
                          className="truncate font-medium underline-offset-4 hover:underline"
                          title={r.name}
                        >
                          {r.name}
                        </Link>
                        {full && (
                          <span className="truncate text-sm text-muted-foreground" title={r.sub}>
                            {r.sub ?? "–"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {!full && (
                      <TableCell className="truncate text-muted-foreground" title={r.sub}>
                        {r.sub ?? "–"}
                      </TableCell>
                    )}
                    <DeliveredCell t={r.totals} />
                    <Rate t={r.totals} k="open" strong={sort === "open"} className={ranked(sort === "open")} />
                    <Rate t={r.totals} k="click" strong={sort === "click"} className={ranked(sort === "click")} />
                    <Rate t={r.totals} k="reply" strong={sort === "reply"} className={ranked(sort === "reply")} />
                    <Rate t={r.totals} k="unsub" strong={sort === "unsub"} className={ranked(sort === "unsub")} />
                    <Rate t={r.totals} k="bounce" strong={sort === "bounce"} className={ranked(sort === "bounce")} />
                    {full && (
                      <TableCell className="text-muted-foreground tabular-nums">
                        {r.totals.lastSentAt ? formatDate(r.totals.lastSentAt, true) : ""}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {/* "View all" in both views, like the campaign board (designer 2026-11-13). */}
        <BoardFooter
          rows={full ? [] : res.belowGate}
          viewAll={full || rows.length > BOARD_TOP ? { href: "/templates", label: "View all templates" } : null}
        />
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Ranked chart (Template view, above the full leaderboard; user decision 2026-11-13): a picture of the leaderboard's
// current state: the same ranked rows the table lists, in its order (designer 2026-11-13), bars = the ranking metric's value. It follows the leaderboard's
// Highest/Lowest and metric dropdowns and its sample gate; under "All metrics" it shows the default, open rate, and
// the title says so. All bars brand: a gold #1 bar reads as a second colour scale next to the orange.

const CHART_TOP = FULL_TOP;
const chartConfig = {
  value: { label: "Rate", color: "var(--chart-1)" },
} satisfies ChartConfig;

function RankChart({
  id = "tpl-rank-chart",
  rows,
  metric,
  mode,
  options = TPL_SORTS,
  replyIsCount = false,
}: {
  id?: string;
  rows: GroupRow[];
  metric: RankMetric;
  mode: RankMode;
  /** The board's metric dropdown, for the title's wording. */
  options?: { value: string; label: string }[];
  /** Campaign board: Replies rank as a count, so the bars are counts, not rates. */
  replyIsCount?: boolean;
}) {
  const label = options.find((o) => o.value === metric)!.label.toLowerCase();
  const asCount = replyIsCount && metric === "reply";
  const fmt = (v: unknown) => (asCount ? Number(v).toLocaleString("en-US") : `${(Number(v) * 100).toFixed(1)}%`);
  const title = `${mode === "top" ? "Top" : "Lowest"} ${Math.min(CHART_TOP, rows.length) || CHART_TOP} by ${label}`;
  // Two templates can share a name across campaigns: qualify only the names that clash (live app).
  const seen = new Map<string, number>();
  rows.forEach((r) => seen.set(r.name, (seen.get(r.name) ?? 0) + 1));
  const name = (r: GroupRow) => ((seen.get(r.name) ?? 0) > 1 && r.sub ? `${r.name} · ${r.sub}` : r.name);
  const bars = rows.slice(0, CHART_TOP).map((r) => {
    const { successes, denominator } = measure(r.totals, metric);
    const value = asCount ? r.totals.replies : denominator > 0 ? successes / denominator : 0;
    // A row with no sends in the period (an idle campaign) gets an empty bar and says so beside its name (recharts
    // draws no label on a zero-width bar).
    const idle = r.totals.sends === 0;
    return { name: idle ? `${name(r)} · no sends` : name(r), value, text: idle ? "" : fmt(value) };
  });
  return (
    <section aria-labelledby={id} className={cn(card, "pb-4")}>
      <CardHead id={id} title={title} />
      {bars.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">Not enough data to rank yet.</p>
      ) : (
        <div className="px-5">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: Math.max(120, bars.length * 34 + 24) }}
          >
            <BarChart data={bars} layout="vertical" margin={{ left: 0, right: 56, top: 4, bottom: 4 }}>
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis
                type="category"
                dataKey="name"
                width={240}
                tickLine={false}
                axisLine={false}
                // One line per name: recharts wraps long ticks, so draw the text ourselves, cut with "…" (the full
                // name is in the bar's tooltip).
                tick={({ x, y, payload }: { x: number | string; y: number | string; payload: { value: string } }) => {
                  const v = payload.value;
                  return (
                    <text
                      x={Number(x)}
                      y={Number(y)}
                      textAnchor="end"
                      dominantBaseline="central"
                      className="fill-muted-foreground text-xs"
                    >
                      {v.length > 40 ? `${v.slice(0, 39)}…` : v}
                    </text>
                  );
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(v) => `${fmt(v)} ${label}`}
                  />
                }
              />
              <Bar dataKey="value" fill="var(--color-value)" radius={4} maxBarSize={22} isAnimationActive={false}>
                <LabelList dataKey="text" position="right" className="fill-foreground text-xs font-medium tabular-nums" />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </section>
  );
}

/** Templates in this campaign (live app, Campaign view with a campaign picked): all of them, best open rate first. */
export function TemplatesInCampaign({ rows }: { rows: GroupRow[] }) {
  const open = (r: GroupRow) => (r.totals.delivered ? r.totals.opens / r.totals.delivered : -1);
  const shown = [...rows].sort((a, b) => open(b) - open(a));
  return (
    <section aria-labelledby="tpl-in-campaign" className={cn(card, "pb-1")}>
      <CardHead id="tpl-in-campaign" title="Templates in this campaign" />
      <Table aria-label="Templates in this campaign" className={cn("table-fixed min-w-[58rem]", frame)}>
        <colgroup>
          <col className="w-14" />
          <col />
          <col className="w-36" />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-32" />
        </colgroup>
        <TableHeader className={headRow}>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Delivered / Recip.</TableHead>
            <TableHead>Open</TableHead>
            <TableHead>Click</TableHead>
            <TableHead>Bounce</TableHead>
            <TableHead>Unsub</TableHead>
            <TableHead>Last sent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((r, i) => (
            <TableRow key={r.id}>
              <TableCell>
                <Place i={i} medals />
              </TableCell>
              <TableCell className="truncate" title={r.name}>
                <Link href={r.href!} className="font-medium underline-offset-4 hover:underline">
                  {r.name}
                </Link>
              </TableCell>
              <DeliveredCell t={r.totals} />
              <Rate t={r.totals} k="open" strong />
              <Rate t={r.totals} k="click" />
              <Rate t={r.totals} k="bounce" />
              <Rate t={r.totals} k="unsub" />
              <TableCell className="text-muted-foreground tabular-nums">
                {r.totals.lastSentAt ? formatDate(r.totals.lastSentAt, true) : ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Deliverability by recipient domain (Campaign and Sender views).

const DOMAIN_RATES = ["open", "click", "reply", "unsub", "bounce"] as const;

export function DeliverabilityCard({ rows }: { rows: DomainRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="deliverability" className={cn(card, "pb-1")}>
      <CardHead id="deliverability" title="Deliverability by recipient domain" />
      <Table aria-label="Deliverability by recipient domain" className={cn("table-fixed min-w-[56rem]", frame)}>
        <colgroup>
          <col />
          <col className="w-44" />
          {DOMAIN_RATES.map((k) => (
            <col key={k} className={k === "open" || k === "bounce" ? "w-28" : "w-24"} />
          ))}
        </colgroup>
        <TableHeader className={headRow}>
          <TableRow>
            <TableHead>Recipient domain</TableHead>
            <TableHead>Delivered / Recipients</TableHead>
            <TableHead>Open</TableHead>
            <TableHead>Click</TableHead>
            <TableHead>Reply</TableHead>
            <TableHead>Unsub</TableHead>
            <TableHead>Bounce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell
                className={cn("truncate", r.others ? "text-muted-foreground" : "font-medium")}
                title={r.others ? undefined : r.name}
              >
                {r.others ? `Others (${n(r.others)} domains)` : r.name}
              </TableCell>
              <DeliveredCell t={r.totals} />
              {DOMAIN_RATES.map((k) => (
                <Rate key={k} t={r.totals} k={k} />
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Sender board (Sender view): share of emails sent as a pie, and per-sender delivery, open and bounce.

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];
const SENDER_RATES = ["delivery", "open", "bounce"] as const;

export function SenderBoard({
  rows,
  domains,
  span,
}: {
  rows: GroupRow[];
  /** Every sending domain of the workspace (live app senderDomains), not only those that sent. */
  domains: string[];
  span: Span;
}) {
  const [domain, setDomain] = useState("all");
  const shown = rows.filter((r) => domain === "all" || r.domain === domain);
  const total = shown.reduce((x, r) => x + r.totals.sends, 0);
  const slices = shown
    .filter((r) => r.totals.sends > 0)
    .map((r, i) => ({
      id: r.id,
      name: r.name,
      sends: r.totals.sends,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
  const config = Object.fromEntries(slices.map((s) => [s.id, { label: s.name, color: s.fill }])) satisfies ChartConfig;
  return (
    <section aria-labelledby="sender-board" className={cn(card, "pb-1")}>
      {/* The window is in the title (live app): a sender that didn't send in it is simply absent. */}
      <CardHead
        id="sender-board"
        title="Sender board"
        subtitle={span.label.charAt(0).toUpperCase() + span.label.slice(1)}
      >
        <Select value={domain} onValueChange={setDomain}>
          <SelectTrigger size="sm" className="w-56" aria-label="Sending domain">
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
      </CardHead>
      {shown.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">No senders</p>
      ) : (
        <div className="grid items-start gap-4 border-t pt-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-3 px-5 pb-4">
            <ChartContainer config={config} className="aspect-square h-56">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="id" hideLabel />} />
                <Pie
                  data={slices}
                  dataKey="sends"
                  nameKey="id"
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.id} fill={s.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
              {slices.map((s) => (
                <li key={s.id} className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.fill }} />
                  {s.name}
                  <span className="text-muted-foreground tabular-nums">{Math.round((s.sends / total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
          <Table
            aria-label="Senders"
            className={cn(
              "table-fixed min-w-[51rem]",
              frame,
              "lg:**:data-[slot=table-cell]:first:pl-3 lg:**:data-[slot=table-head]:first:pl-3",
            )}
          >
            <colgroup>
              <col />
              <col className="w-48" />
              <col className="w-20" />
              {SENDER_RATES.map((k) => (
                <col key={k} className="w-28" />
              ))}
            </colgroup>
            <TableHeader className={headRow}>
              <TableRow>
                <TableHead>Sender</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Open</TableHead>
                <TableHead>Bounce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium" title={r.name}>
                        {r.name}
                      </span>
                      <span className="truncate text-sm text-muted-foreground" title={r.sub}>
                        {r.sub}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="truncate text-muted-foreground" title={r.domain}>
                    {r.domain}
                  </TableCell>
                  <TableCell className="tabular-nums">{n(r.totals.sends)}</TableCell>
                  {SENDER_RATES.map((k) => (
                    <Rate key={k} t={r.totals} k={k} />
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
