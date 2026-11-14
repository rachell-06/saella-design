"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronsUpDownIcon,
  CircleAlertIcon,
  InboxIcon,
  PlusIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Campaign,
  campaignStatus,
  INDUSTRY_TREE,
  industrySections,
  MARKETS,
  sampleCampaigns,
  totals,
} from "@/lib/mock/campaigns";
import { addCampaign, useCreatedCampaigns } from "@/lib/mock/created-campaigns";
import { useTemplateStore } from "@/lib/mock/use-template-store";
import { manyCampaigns } from "@/lib/mock/many-campaigns";
import { applyTemplateStore, viewerFor } from "@/lib/mock/templates";
import { type CampaignStarter, NewCampaignDialog, starterHref } from "@/components/features/new-campaign-dialog";
import { NewTemplateDialog } from "@/components/features/new-template-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { FilterChips, FilterMultiSelect, FilterPopover, FilterSelect } from "@/components/saella/filter-popover";
import type { CampaignStatus } from "@/components/saella/status-badge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { type CampaignFields, EditCampaignDialog } from "./edit-campaign-dialog";
import { CampaignGroup } from "./campaign-group";

// Campaigns (decisions.md "Campaigns", chosen 2026-11-11 over the master–detail option): every campaign is a
// collapsible card with its templates inside. Presentation: Studio Admin /dashboard/infrastructure, as first ported
// on the Templates list: a wide search (no facet filters or Expand all: user request
// 2026-11-12), one card per campaign with a table inside (campaign-group.tsx). Status is the first section of
// Filter (user request 2026-11-12, replaced the status tabs): All (default, everything but Archived), then each status
// incl. Archived (PRD AC-EC-C-02), with counts. Edit, Archive/Unarchive.
// URL: ?c=<id> opens that campaign; ?new=1 opens New campaign; preview states ?state=paused | locked | empty | member
// | many (60 campaigns).

const STATUS_GROUPS = [
  { status: "active", label: "Active" },
  { status: "not-started", label: "Not started" },
  { status: "ended", label: "Ended" },
  { status: "archived", label: "Archived" },
] as const satisfies readonly { status: CampaignStatus; label: string }[];

// "All" = every campaign on the board; archived ones show only when Archived is picked (they left the board,
// AC-EC-C-02).
const STATUS_OPTIONS = [{ status: "all", label: "All" }, ...STATUS_GROUPS] as const;

type StatusPick = (typeof STATUS_OPTIONS)[number]["status"];

// Campaigns shown per tab before "Show N more".
const GROUP_LIMIT = 10;

// Filter (one button at the right of the search, as on Templates; user request 2026-11-12): Status (one choice,
// default All), then targeting: Country and Industry, several values each (any of them matches). A campaign with no countries or
// no industries targets any, so it matches every value. Campaigns have no owner, so no "Created by".
type Filters = { status: StatusPick; country: string[]; industry: string[] };
const NO_FILTERS: Filters = { status: "all", country: [], industry: [] };
// Filter › Industry is by ISIC section (campaigns store classes, 2026-11-14): a campaign matches a section when it
// targets any class of it.
const INDUSTRY_SECTION_LABELS = INDUSTRY_TREE.map((g) => g.label);
const SECTION_LABEL = new Map(INDUSTRY_TREE.map((g) => [g.value, g.label]));
const industrySectionLabels = (codes: string[]) => industrySections(codes).map((s) => SECTION_LABEL.get(s) ?? s);
const matchesAny = (picked: string[], values: string[]) =>
  picked.length === 0 || values.length === 0 || values.some((v) => picked.includes(v));

// Most recent send first; campaigns that never sent go last.
const byLastSent = (a: Campaign, b: Campaign) => (totals(b).lastSent ?? "").localeCompare(totals(a).lastSent ?? "");

export function CampaignsBoard() {
  const params = useSearchParams();
  const router = useRouter();
  const previewState = params.get("state");
  const viewer = viewerFor(previewState);
  const [initial] = useState<Campaign[]>(() =>
    previewState === "empty" ? [] : previewState === "many" ? manyCampaigns : sampleCampaigns
  );
  // Board list = campaigns created this session from any screen (shared store, e.g. Overview's "+ New campaign")
  // + the board's own list. The first edit of a created campaign copies it into the local list; a deleted one is
  // remembered so the store can't bring it back.
  const created = useCreatedCampaigns();
  const [local, setLocal] = useState<Campaign[]>(initial);
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(() => new Set());
  // Template changes from the ⋯ menu (status, owner, copies, deletes) are in the shared template store.
  const templateStore = useTemplateStore();
  const campaigns = useMemo(() => {
    const localIds = new Set(local.map((c) => c.id));
    return applyTemplateStore(
      [...created.filter((c) => !localIds.has(c.id) && !removedIds.has(c.id)), ...local],
      templateStore
    );
  }, [created, local, removedIds, templateStore]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  // Archive is a flag on the campaign (live is_archived); the mock Campaign type has none, so the board keeps it.
  const [archivedIds, setArchivedIds] = useState<ReadonlySet<string>>(() => new Set());
  const statusOf = (c: Campaign): CampaignStatus => (archivedIds.has(c.id) ? "archived" : campaignStatus(c));
  // ?c=<id> (links from the agent and the template page) opens that campaign: its card expanded, scrolled into view
  // and briefly highlighted. It is always under Status All, the default.
  const [focus] = useState(() => [...created, ...initial].find((c) => c.id === params.get("c")));
  // Every card starts collapsed (user request 2026-11-12); the user opens one by clicking it. Only a linked
  // campaign (?c=<id>) and one just created start open.
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(focus ? [focus.id] : []));
  // A linked campaign past the first GROUP_LIMIT: show the whole list for that status.
  const [fullTabs, setFullTabs] = useState<Set<string>>(() => new Set(focus ? ["all"] : []));
  const [highlightId, setHighlightId] = useState(focus?.id);
  // ?new=1 (from /campaigns/new, the command menu) opens the New campaign dialog.
  const [creating, setCreatingState] = useState(() => params.get("new") === "1");
  const setCreating = (open: boolean) => {
    setCreatingState(open);
    if (!open && params.get("new")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState(null, "", url);
    }
  };

  useEffect(() => {
    if (!focus) return;
    document.getElementById(`campaign-${focus.id}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
    const t = window.setTimeout(() => setHighlightId(undefined), 2400);
    return () => window.clearTimeout(t);
  }, [focus]);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);

  const paused = previewState === "paused";
  const locked = previewState === "locked";
  const sendingBlocked = paused
    ? "Sending is paused for this workspace"
    : locked
      ? "Verify a sending domain and confirm a sender first"
      : undefined;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter(
      (c) =>
        (!q || c.name.toLowerCase().includes(q) || c.templates.some((t) => t.name.toLowerCase().includes(q))) &&
        matchesAny(filters.country, c.countries) &&
        matchesAny(filters.industry, industrySectionLabels(c.industries))
    );
  }, [campaigns, query, filters]);

  const searching = query.trim() !== "";
  const statusTab = filters.status;
  const statusPicked = statusTab !== "all";
  // Search, Country or Industry narrow the list; a Status pick alone just switches the view.
  const narrowing = searching || filters.country.length + filters.industry.length > 0;
  const filterCount = (statusPicked ? 1 : 0) + filters.country.length + filters.industry.length;
  const filtering = searching || filterCount > 0;
  const chips = [
    ...(statusPicked
      ? [
          {
            key: "status",
            label: "Status",
            value: STATUS_OPTIONS.find((g) => g.status === statusTab)?.label ?? "",
            remove: { ...filters, status: "all" as const },
          },
        ]
      : []),
    ...filters.country.map((v) => ({
      key: `c-${v}`,
      label: "Country",
      value: v,
      remove: { ...filters, country: filters.country.filter((x) => x !== v) },
    })),
    ...filters.industry.map((v) => ({
      key: `i-${v}`,
      label: "Industry",
      value: v,
      remove: { ...filters, industry: filters.industry.filter((x) => x !== v) },
    })),
  ];

  // Templates can only be copied into campaigns on the board (live app: Copy to… skips archived ones).
  const copyTargets = campaigns.filter((c) => !archivedIds.has(c.id));

  const inTab = (c: Campaign, tab: StatusPick) => (tab === "all" ? statusOf(c) !== "archived" : statusOf(c) === tab);
  // Counts beside each Status choice follow search, Country and Industry.
  const counts = Object.fromEntries(
    STATUS_OPTIONS.map((g) => [g.status, visible.filter((c) => inTab(c, g.status)).length])
  ) as Record<StatusPick, number>;
  // Campaigns created this session sit on top, newest first (store order); the rest by last send.
  const createdRank = new Map(created.map((c, i) => [c.id, i]));
  const tabAll = visible
    .filter((c) => inTab(c, statusTab))
    .sort(
      (a, b) =>
        (createdRank.get(a.id) ?? Infinity) - (createdRank.get(b.id) ?? Infinity) || byLastSent(a, b)
    );
  // Empty-state copy: "No archived campaigns", or plain "No campaigns" under All.
  const tabNoun = statusPicked
    ? `${STATUS_OPTIONS.find((g) => g.status === statusTab)?.label.toLowerCase()} campaigns`
    : "campaigns";
  // Searching shows every match; otherwise a long list stops at GROUP_LIMIT.
  const limited = !searching && !fullTabs.has(statusTab) && tabAll.length > GROUP_LIMIT;
  const tabList = limited ? tabAll.slice(0, GROUP_LIMIT) : tabAll;

  const setOpen = (id: string, open: boolean) =>
    setOpenIds((s) => {
      const next = new Set(s);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });

  const updateCampaign = (id: string, fn: (c: Campaign) => Campaign) =>
    setLocal((list) => {
      if (list.some((c) => c.id === id)) return list.map((c) => (c.id === id ? fn(c) : c));
      const fromStore = created.find((c) => c.id === id);
      return fromStore ? [fn(fromStore), ...list] : list;
    });

  function clearFilters() {
    setQuery("");
    setFilters(NO_FILTERS);
  }

  // "Add template" (card button, and the toast after creating a campaign) opens New template with that campaign
  // pre-picked (AC-EC-T-01: a template is created inside a campaign).
  const [addingTo, setAddingTo] = useState<string | null>(null);

  function create(c: Omit<Campaign, "id" | "templates">, starter?: CampaignStarter) {
    const id = addCampaign(c);
    setCreating(false);
    // A starter picked in the dialog (live finishCampaign): straight into the editor on the campaign's first template.
    if (starter) {
      toast.success("Campaign created");
      router.push(starterHref(id, starter));
      return;
    }
    setOpen(id, true);
    clearFilters();
    // Live app: "Campaign created" and the new campaign on top of the board; its empty row surfaces Add template.
    // The action is the next step, so no description repeats it.
    toast.success(`Created “${c.name}”`, {
      action: { label: "Add template", onClick: () => setAddingTo(id) },
    });
  }

  // Archived campaigns leave the board (AC-EC-C-02) for the Archived tab; unarchive is the same flag back
  // (live PATCH /api/email/campaigns/:id { is_archived }).
  function setArchived(c: Campaign, archived: boolean) {
    setArchivedIds((ids) => {
      const next = new Set(ids);
      if (archived) next.add(c.id);
      else next.delete(c.id);
      return next;
    });
    toast.success(archived ? `Archived “${c.name}”` : `Restored “${c.name}”`, {
      description: archived ? "It's under the Archived tab." : undefined,
    });
  }

  function saveEdit(id: string, fields: CampaignFields) {
    updateCampaign(id, (c) => ({ ...c, ...fields }));
    setEditing(null);
    toast.success("Campaign updated");
  }

  const newCampaignButton = (
    <Button size="sm" onClick={() => setCreating(true)}>
      <PlusIcon data-icon="inline-start" />
      New campaign
    </Button>
  );

  return (
    <>
      <PageHeader title="Campaigns" description="Group templates by who you target and track how each one does." actions={newCampaignButton} />

      {paused && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Sending is paused for this workspace</AlertTitle>
          <AlertDescription>
            Sending was paused automatically because too many messages bounced or were marked as spam. Clean your
            recipient list, then ask an admin to resume sending.
          </AlertDescription>
        </Alert>
      )}
      {locked && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>Sending is locked</AlertTitle>
          <AlertDescription>To send batches, verify a sending domain and confirm a sender first.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}

      {campaigns.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>No campaigns yet</EmptyTitle>
            <EmptyDescription>
              Create a campaign to group templates by country and industry, or ask the agent to set one up.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newCampaignButton}</EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Toolbar query={query} onQueryChange={setQuery} />
              <FilterPopover size="default" count={filterCount} onClearAll={() => setFilters(NO_FILTERS)}>
                {/* Compact: one labelled control per section (designer 2026-11-12), not inline lists. */}
                <FilterSelect
                  label="Status"
                  allLabel="All"
                  allCount={counts.all}
                  value={statusTab === "all" ? undefined : statusTab}
                  options={STATUS_OPTIONS.filter((o) => o.status !== "all").map((o) => ({
                    value: o.status,
                    label: o.label,
                    count: counts[o.status],
                  }))}
                  onChange={(status) => setFilters({ ...filters, status: (status ?? "all") as StatusPick })}
                />
                <FilterMultiSelect
                  label="Country"
                  options={MARKETS}
                  value={filters.country}
                  onChange={(country) => setFilters({ ...filters, country })}
                  placeholder="Any country"
                  searchPlaceholder="Search countries"
                />
                <FilterMultiSelect
                  label="Industry"
                  options={INDUSTRY_SECTION_LABELS}
                  value={filters.industry}
                  onChange={(industry) => setFilters({ ...filters, industry })}
                  placeholder="Any industry"
                  searchPlaceholder="Search industries"
                />
              </FilterPopover>
              <span className="sr-only" role="status" aria-live="polite">
                {filtering ? `${tabAll.length} ${tabAll.length === 1 ? "campaign" : "campaigns"} found` : ""}
              </span>
            </div>
            <FilterChips
              chips={chips.map((chip) => ({ ...chip, onRemove: () => setFilters(chip.remove) }))}
              onClearAll={() => setFilters(NO_FILTERS)}
            />
          </div>

          {tabAll.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{narrowing ? `No ${tabNoun} match` : `No ${tabNoun}`}</EmptyTitle>
                <EmptyDescription>
                  {narrowing
                    ? "Change the search or filters."
                    : statusTab === "archived"
                      ? "Campaigns you archive show up here."
                      : statusTab === "all"
                        ? "Every campaign is archived. Pick Archived under Filter to see them."
                        : "A campaign's status follows its start and end dates."}
                </EmptyDescription>
              </EmptyHeader>
              {filtering && (
                <EmptyContent>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    {searching && filterCount > 0 ? "Clear search and filters" : searching ? "Clear search" : "Clear filters"}
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="flex flex-col gap-4">
              {tabList.map((c) => (
                <CampaignGroup
                  key={c.id}
                  campaign={c}
                  highlighted={c.id === highlightId}
                  status={statusOf(c)}
                  campaigns={copyTargets}
                  viewer={viewer}
                  // Searching opens the matching campaigns so template hits are visible.
                  open={openIds.has(c.id) || searching}
                  onOpenChange={(o) => setOpen(c.id, o)}
                  sendingBlocked={sendingBlocked}
                  onAddTemplate={() => setAddingTo(c.id)}
                  onEdit={() => setEditing(c)}
                  onViewReport={() => router.push(`/overview?campaign=${c.id}`)}
                  onArchive={(archived) => setArchived(c, archived)}
                  onDeleteCampaign={() => setDeleteCampaign(c)}
                />
              ))}
              {limited && (
                <Button
                  variant="ghost"
                  className="self-start text-muted-foreground"
                  onClick={() => setFullTabs((s) => new Set(s).add(statusTab))}
                >
                  <ChevronsUpDownIcon data-icon="inline-start" />
                  Show {tabAll.length - GROUP_LIMIT} more
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <NewCampaignDialog open={creating} onOpenChange={setCreating} onCreate={create} />
      {addingTo && (
        // key: the dialog reads its pre-picked campaign once, so each campaign gets a fresh dialog.
        <NewTemplateDialog
          key={addingTo}
          open
          onOpenChange={(o) => !o && setAddingTo(null)}
          campaigns={campaigns}
          defaultCampaignId={addingTo}
        />
      )}
      <EditCampaignDialog campaign={editing} onOpenChange={(o) => !o && setEditing(null)} onSave={saveEdit} />

      <AlertDialog open={deleteCampaign !== null} onOpenChange={(o) => !o && setDeleteCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign “{deleteCampaign?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the campaign and every template inside it. They disappear from the board, overview,
              leaderboard and metrics. Past batches and reports are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const id = deleteCampaign?.id;
                setLocal((all) => all.filter((c) => c.id !== id));
                if (id) setRemovedIds((ids) => new Set(ids).add(id));
                toast.success("Campaign and its templates deleted");
                setDeleteCampaign(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}

// Search (Infrastructure header): stretches across the row; Filter sits at its right. Both h-8 (FilterPopover
// size="default"), as on Templates.
function Toolbar({ query, onQueryChange }: { query: string; onQueryChange: (q: string) => void }) {
  return (
    <InputGroup className="flex-1">
      <InputGroupAddon align="inline-start">
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label="Search campaigns or templates"
        placeholder="Search campaigns or templates"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
    </InputGroup>
  );
}
