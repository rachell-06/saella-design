"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CirclePauseIcon,
  FileTextIcon,
  LockIcon,
  PlusIcon,
  RotateCwIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  type Campaign,
  campaignStatus,
  formatDate,
  formatDateTime,
  sampleCampaigns,
} from "@/lib/mock/campaigns";
import { manyCampaigns } from "@/lib/mock/many-campaigns";
import { applyCampaignStore } from "@/lib/mock/campaign-store";
import { useCampaignStore } from "@/lib/mock/created-campaigns";
import { PageHeader } from "@/components/layout/page-header";
import { revealOnRowHover } from "@/components/saella/data-table";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
// The Leads Filter button + popover (Find companies, Self-upload); not in components/saella yet, so read from there.
import { FilterCheckList, FilterChips, FilterMultiSelect, FilterPopover } from "@/components/saella/filter-popover";
import { Hint } from "@/components/saella/hint";
import { RateCell } from "@/components/saella/rate-meter";
import { StatusBadge } from "@/components/saella/status-badge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  type TemplateRow,
  allTemplates,
  applyTemplateStore,
  detailsFor,
  viewerFor,
} from "@/lib/mock/templates";
import { NewTemplateDialog } from "@/components/features/new-template-dialog";
import { AutomateDialog } from "@/components/features/automation-panel";
import { EditIconButton, SendButton, TemplateMenu, TemplateNameCell, useRowOpen } from "@/components/features/template-menu";
import { useTemplateStore } from "@/lib/mock/use-template-store";

// All templates across campaigns, one flat table built like the live list (Repo EmailTemplatesList.tsx and
// app/dashboard/email/templates/page.tsx, same on master and development):
// - columns in the live order: Template (name + a Letter / Design chip; live shows no type), Campaign, Status,
//   Delivered, Open, Click, Bounce, Last sent, actions. Live "Delivered / total" is the Delivery rate "98.2% (1,218)"
//   with "of 1,240 sent" in its tooltip (PATTERNS.md §9.7: rates are RateCell, no separate count column; Delivery
//   keeps its threshold);
// - order: last edited first (live: updated_at desc), no column sorting (live has none);
// - search (name, subject; Saella adds campaign name) + one Filter button as on Leads (live: one Campaign select):
//   Campaign (searchable, several), Type, Status; active values as chips + Clear all. A follow-up that matches brings
//   up its template (follow-ups themselves are not listed);
// - paging 20 per page, hidden on a single page (live pagination pageSize 20, hideOnSinglePage);
// - row actions as live, condensed: Edit and Send on the row (live order), Automate (active templates) / Share /
//   View log / Transfer / Delete (+ Copy) in ⋯; disabled with the reason when the viewer may not
//   (template-permissions.ts). The same cells and buttons as the Campaigns cards;
// - a click anywhere on a row opens the template (PATTERNS 9.1).
// Name only (live shows the subject): the subject appears when the search matched it; owner and access (PRD Master)
// are in the name's tooltip (TemplateNameCell). Follow-ups are not on the list (PATTERNS 9.6): they show on the
// template's own page (Automation card).
// Preview states: ?state=loading | error | empty | paused | locked | member (Linh as a plain member, not admin)
// | many (the 60 fictional campaigns of /campaigns?state=many, ~150 templates; their rows open no detail page).

const PAGE_SIZE = 20;
const COLS = 9;
const divider = "border-r border-border/50 last:border-r-0";

type Row = TemplateRow & { subject: string; updatedAt: string };

type Filters = { campaign: string[]; type: string[]; status: string[]; campaignStatus: string[] };
const NO_FILTERS: Filters = { campaign: [], type: [], status: [], campaignStatus: [] };
// The campaign's own status (as on Campaigns). Templates of an archived campaign are off and hidden until Archived is
// picked here, or their campaign is picked by name.
const CAMPAIGN_STATUS_OPTIONS = ["Active", "Not started", "Ended", "Archived"];
const CAMPAIGN_STATUS_LABEL = { active: "Active", "not-started": "Not started", ended: "Ended", archived: "Archived" } as const;
const TYPE_OPTIONS = [
  { value: "letter", label: "Letter" },
  { value: "design", label: "Design" },
];
// The two template statuses (PRD: Active / Inactive).
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// Last edited first (live app: updated_at desc).
const byUpdated = (a: Row, b: Row) => b.updatedAt.localeCompare(a.updatedAt);

export function TemplatesScreen() {
  const params = useSearchParams();
  const previewState = params.get("state");
  const viewer = viewerFor(previewState);
  const campaignState = useCampaignStore();
  const store = useTemplateStore();
  const [campaigns] = useState<Campaign[]>(() =>
    previewState === "empty" ? [] : previewState === "many" ? manyCampaigns : sampleCampaigns
  );
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  // ?campaign=<id> lets the Campaigns screen link straight to its templates.
  const [filters, setFilters] = useState<Filters>(() => {
    const c = applyCampaignStore(campaigns, campaignState).find((x) => x.id === params.get("campaign"));
    return { ...NO_FILTERS, campaign: c ? [c.name] : [] };
  });
  const [page, setPage] = useState(0);
  const [automating, setAutomating] = useState<string | null>(null);
  // The shared campaign store over the list's campaigns: made this session (newest first), edited, deleted (with
  // their templates). Archived campaigns keep their templates here; New template and Copy to… leave them out.
  const allCampaigns = useMemo(() => applyCampaignStore(campaigns, campaignState), [campaigns, campaignState]);
  const [creating, setCreating] = useState(false);
  const rowOpen = useRowOpen();

  const loading = previewState === "loading";
  const error = previewState === "error";
  const sendingBlocked =
    previewState === "paused"
      ? "Sending is paused for this workspace"
      : previewState === "locked"
        ? "Verify a sending domain and confirm a sender first"
        : undefined;

  const rows = useMemo<Row[]>(
    () =>
      // The store's changes (status, owner, copies, deletes) from the ⋯ menu here, on a template's page or Campaigns.
      allTemplates(applyTemplateStore(allCampaigns, store)).map((r) => {
        const d = detailsFor(r.id);
        return { ...r, subject: d.subject, updatedAt: d.updatedAt };
      }),
    [allCampaigns, store]
  );

  // The campaign status of each row's campaign, archived first (the store's flag).
  const campaignStatusOf = useMemo(() => {
    const out = new Map<string, string>();
    for (const c of allCampaigns)
      out.set(c.id, campaignState.archived.includes(c.id) ? "Archived" : CAMPAIGN_STATUS_LABEL[campaignStatus(c)]);
    return out;
  }, [allCampaigns, campaignState]);
  const q = query.trim().toLowerCase();
  const matches = (r: Row) =>
    (!q ||
      r.name.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      r.campaignName.toLowerCase().includes(q)) &&
    (!filters.campaign.length || filters.campaign.includes(r.campaignName)) &&
    (!filters.type.length || filters.type.includes(r.kind)) &&
    (!filters.status.length || filters.status.includes(r.status)) &&
    (filters.campaignStatus.length
      ? filters.campaignStatus.includes(campaignStatusOf.get(r.campaignId) ?? "Active")
      : campaignStatusOf.get(r.campaignId) !== "Archived" || filters.campaign.includes(r.campaignName));
  // Follow-ups are not listed; one that matches the search or filters brings up its template instead.
  const isFollowUp = (r: Row) => Boolean(r.followUp && rows.some((x) => x.id === r.followUp!.of));
  const hits = rows.filter(matches);
  const visibleIds = new Set(hits.map((r) => (isFollowUp(r) ? r.followUp!.of : r.id)));
  const visible = rows.filter((r) => visibleIds.has(r.id) && !isFollowUp(r)).sort(byUpdated);
  const matched = visible;
  const filterCount =
    filters.campaign.length + filters.type.length + filters.status.length + filters.campaignStatus.length;
  const chips = [
    ...filters.campaign.map((v) => ({
      key: `c-${v}`,
      label: "Campaign",
      value: v,
      remove: { ...filters, campaign: filters.campaign.filter((x) => x !== v) },
    })),
    ...filters.campaignStatus.map((v) => ({
      key: `cs-${v}`,
      label: "Campaign status",
      value: v,
      remove: { ...filters, campaignStatus: filters.campaignStatus.filter((x) => x !== v) },
    })),
    ...filters.type.map((v) => ({
      key: `t-${v}`,
      label: "Type",
      value: v === "design" ? "Design" : "Letter",
      remove: { ...filters, type: filters.type.filter((x) => x !== v) },
    })),
    ...filters.status.map((v) => ({
      key: `s-${v}`,
      label: "Status",
      value: v === "active" ? "Active" : "Inactive",
      remove: { ...filters, status: filters.status.filter((x) => x !== v) },
    })),
  ];

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const shown = visible.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const applyFilters = (v: Filters) => {
    setFilters(v);
    setPage(0);
  };
  const applyQuery = (v: string) => {
    setQuery(v);
    setPage(0);
  };

  return (
    <>
      <PageHeader
        title="Templates"
        description="Every email you've written and how each one performs."
        actions={
          <Button size="sm" onClick={() => setCreating(true)} disabled={allCampaigns.length === 0}>
            <PlusIcon data-icon="inline-start" />
            New template
          </Button>
        }
      />

      {/* Same paused alert as Campaigns, Overview and the batch report: warning + pause icon. */}
      {previewState === "paused" && (
        <Alert variant="warning">
          <CirclePauseIcon />
          <AlertTitle>Sending is paused for this workspace</AlertTitle>
          <AlertDescription>
            Too many messages bounced or were marked as spam. Remove those addresses. Saella reviews and lifts the
            pause; unsent emails go out then.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/sending">Sending health</Link>
            </Button>
          </AlertAction>
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
      {previewState === "member" && (
        <Alert>
          <LockIcon />
          <AlertTitle>Previewing as a member</AlertTitle>
        </Alert>
      )}

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Templates didn&apos;t load</AlertTitle>
          <AlertDescription>Check your connection and try again. Nothing was changed.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/templates">
                <RotateCwIcon data-icon="inline-start" />
                Retry
              </Link>
            </Button>
          </AlertAction>
        </Alert>
      ) : !loading && rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>No templates yet</EmptyTitle>
            <EmptyDescription>
              Templates live inside campaigns. Create a campaign first, then add a template to it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/campaigns">Go to Campaigns</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Same toolbar as Campaigns: search fills the row (InputGroup default h-8), Filter at the far right. */}
              <InputGroup className="min-w-0 flex-1">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  aria-label="Search name or subject"
                  placeholder="Search name or subject"
                  value={query}
                  onChange={(e) => applyQuery(e.target.value)}
                />
              </InputGroup>
              <FilterPopover count={filterCount} onClearAll={() => applyFilters(NO_FILTERS)} disabled={loading} size="default">
                {/* Order (PATTERNS 9.1): status first, then the multi-select, then the other inline list. */}
                <FilterCheckList
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={filters.status}
                  onChange={(status) => applyFilters({ ...filters, status })}
                />
                <FilterMultiSelect
                  label="Campaign"
                  options={allCampaigns.map((c) => c.name)}
                  value={filters.campaign}
                  onChange={(campaign) => applyFilters({ ...filters, campaign })}
                  placeholder="Any campaign"
                  searchPlaceholder="Search campaigns"
                />
                <FilterMultiSelect
                  label="Campaign status"
                  options={CAMPAIGN_STATUS_OPTIONS}
                  value={filters.campaignStatus}
                  onChange={(picked) => applyFilters({ ...filters, campaignStatus: picked })}
                  placeholder="Any except archived"
                  searchPlaceholder="Search statuses"
                />
                <FilterCheckList
                  label="Type"
                  options={TYPE_OPTIONS}
                  value={filters.type}
                  onChange={(type) => applyFilters({ ...filters, type })}
                />
              </FilterPopover>
              {/* No visible count; screen readers still hear the result of a search or filter. */}
              <span className="sr-only" role="status" aria-live="polite">
                {!loading && (q || filterCount > 0)
                  ? `${matched.length} ${matched.length === 1 ? "template" : "templates"} found`
                  : ""}
              </span>
            </div>
            <FilterChips
              chips={chips.map((chip) => ({ ...chip, onRemove: () => applyFilters(chip.remove) }))}
              onClearAll={() => applyFilters(NO_FILTERS)}
            />
          </div>

          {/* overflow-clip (not hidden) rounds the corners. Below its minimum width (the name must stay readable at 1280)
              the table scrolls sideways inside this card (its table-container), never the page. */}
          <div className="overflow-clip rounded-card border">
            <Table
              aria-label="Templates"
              aria-busy={loading || undefined}
              className="min-[1441px]:min-w-279 table-fixed [&_[data-slot=rate-value]]:flex-wrap [&_[data-slot=rate-value]]:gap-y-0 border-separate border-spacing-0 [&_th]:border-b [&_td]:border-b [&_tbody_tr:last-child_td]:border-b-0 [&_td]:px-2 [&_th]:px-2 [&_td:first-child]:px-3 [&_th:first-child]:px-3 min-[1600px]:[&_td]:px-3 min-[1600px]:[&_th]:px-3"
            >
              {/* Widths. Numbers at content width, padded px-2 (Template px-3); Template takes the rest, never less than ~13rem
                  (min-w-279 on the table: below that it scrolls in its card, ~1366px viewport) and wraps to two lines before it
                  truncates; Campaign (w-48) fits the usual names whole above 1440. From a 1600px viewport: px-3 everywhere,
                  Template fixed to its longest name, Campaign wide enough for whole names. */}
              <colgroup>
                {/* Up to and including 1440 (laptops) the table fits its card with no sideways scroll: narrower columns, Campaign
                    on up to two lines, a rate's count may wrap under it. */}
                <col className="min-[1600px]:w-80" />
                <col className="w-36 min-[1441px]:w-48 min-[1600px]:w-52" />
                <col className="w-22 min-[1441px]:w-24 min-[1600px]:w-26" />
                <col className="w-22 min-[1441px]:w-30 min-[1600px]:w-auto" />
                <col className="w-22 min-[1441px]:w-28 min-[1600px]:w-auto" />
                <col className="w-20 min-[1441px]:w-25 min-[1600px]:w-auto" />
                <col className="w-20 min-[1441px]:w-24 min-[1600px]:w-auto" />
                <col className="w-18 min-[1441px]:w-20 min-[1600px]:w-24" />
                <col className="w-28 min-[1600px]:w-30" />
              </colgroup>
              {/* Header row: the table-head token like every other table. Its bottom rule is drawn per cell (separate
                  borders above), so it stays under the sticky row while the rows scroll. */}
              <TableHeader>
                <TableRow>
                  <TableHead className={divider}>Template</TableHead>
                  <TableHead className={divider}>Campaign</TableHead>
                  <TableHead className={divider}>Status</TableHead>
                  <TableHead className={divider}>Delivery</TableHead>
                  <TableHead className={divider}>Open</TableHead>
                  <TableHead className={divider}>Click</TableHead>
                  <TableHead className={divider}>Bounce</TableHead>
                  <TableHead className={divider}>Last sent</TableHead>
                  <TableHead className={divider}>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }, (_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: COLS }, (_, j) => (
                        <TableCell key={j} className={divider}>
                          <Skeleton className={cn("h-4", j === 0 ? "w-40" : j === COLS - 1 ? "w-8" : "w-14")} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : visible.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLS} className="py-10 text-center whitespace-normal text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        No templates match.
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            applyQuery("");
                            applyFilters(NO_FILTERS);
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  shown.map((t) => {
                    return (
                      <TableRow key={t.id} className="group/row cursor-pointer" onClick={rowOpen(`/templates/${t.id}`)}>
                        <TableCell className={cn(divider, "whitespace-normal")}>
                          <TemplateNameCell template={t} viewer={viewer} query={q} />
                        </TableCell>
                        <TableCell className={divider}>
                          {/* Name only, as live (schedule and campaign state are on the detail page). */}
                          <span
                            className="line-clamp-2 whitespace-normal min-[1441px]:line-clamp-none min-[1441px]:block min-[1441px]:truncate min-[1441px]:whitespace-nowrap"
                            title={t.campaignName}
                          >
                            {t.campaignName}
                          </span>
                        </TableCell>
                        <TableCell className={divider}>
                          <StatusBadge status={t.status === "active" ? "template-active" : "template-inactive"} />
                        </TableCell>
                        <RateCell kind="delivery" part={t.delivered} whole={t.recipients} className={divider} />
                        <RateCell kind="open" part={t.opens} whole={t.delivered} className={divider} />
                        <RateCell kind="click" part={t.clicks} whole={t.delivered} className={divider} />
                        <RateCell kind="bounce" part={t.bounces} whole={t.recipients} className={divider} />
                        <TableCell className={cn(divider, "text-muted-foreground tabular-nums")}>
                          {t.lastSent && (
                            <Hint label={formatDateTime(t.lastSent)}>
                              <span
                                tabIndex={0}
                                className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {formatDate(t.lastSent)}
                              </span>
                            </Hint>
                          )}
                        </TableCell>
                        <TableCell className={cn(divider, "px-2")}>
                          <div className={cn("flex items-center justify-end gap-1", revealOnRowHover)}>
                            <EditIconButton template={t} viewer={viewer} />
                            <SendButton template={t} viewer={viewer} sendingBlocked={sendingBlocked} iconOnly />
                            <TemplateMenu
                              template={t}
                              viewer={viewer}
                              showEdit={false}
                              onAutomate={() => setAutomating(t.id)}
                              campaigns={allCampaigns}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {/* Live app: 20 per page, pager hidden on a single page. */}
            {!loading && visible.length > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 border-t px-4 py-2 text-sm text-muted-foreground">
                <span className="tabular-nums">
                  Page {current + 1} of {pageCount}
                </span>
                <nav aria-label="Pagination" className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Previous page"
                    disabled={current === 0}
                    onClick={() => setPage(current - 1)}
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Next page"
                    disabled={current >= pageCount - 1}
                    onClick={() => setPage(current + 1)}
                  >
                    <ChevronRightIcon />
                  </Button>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}

      {automating && (
        <AutomateDialog templateId={automating} open onOpenChange={(o) => !o && setAutomating(null)} viewer={viewer} />
      )}
      <NewTemplateDialog open={creating} onOpenChange={setCreating} campaigns={allCampaigns} />

    </>
  );
}
