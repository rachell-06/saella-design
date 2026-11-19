"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronsUpDownIcon,
  CirclePauseIcon,
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
import { campaignActions, isArchived } from "@/lib/mock/campaign-store";
import { addCampaign, useCampaignStore, useCreatedCampaigns, useCurrentCampaigns } from "@/lib/mock/created-campaigns";
import { templateActions } from "@/lib/mock/template-store";
import { useTemplateStore } from "@/lib/mock/use-template-store";
import { manyCampaigns } from "@/lib/mock/many-campaigns";
import { viewerFor } from "@/lib/mock/templates";
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

// Campaigns (decisions.md "Campaigns"): every campaign is a collapsible card with its templates inside.
// Presentation: Studio Admin /dashboard/infrastructure: a wide search, one card per campaign with a table inside
// (campaign-group.tsx). Status is the first section of Filter: All (default, everything but Archived), then each
// status incl. Archived (PRD AC-EC-C-02), with counts. Edit, Archive/Unarchive.
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

// Filter (as on Templates): Status (one choice, default All), then Country and Industry, several values each (any
// of them matches). A campaign with no countries or no industries targets any, so it matches every value.
// Campaigns have no owner, so no "Created by".
type Filters = { status: StatusPick; country: string[]; industry: string[] };
const NO_FILTERS: Filters = { status: "all", country: [], industry: [] };
// Filter › Industry is by ISIC section (campaigns store classes): a campaign matches a section when it targets any
// class of it.
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
  // Board list = the shared campaign store (lib/mock/campaign-store.ts: created from any screen, e.g. Overview's
  // "+ New campaign", edits, archive, deletes) over the seed list, so Templates, New template and Copy to… see the
  // same campaigns. Template changes (status, owner, copies, moves, deletes) are in the shared template store.
  const created = useCreatedCampaigns();
  const campaignState = useCampaignStore();
  const templateStore = useTemplateStore();
  const campaigns = useCurrentCampaigns(initial);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  // Archive is a flag on the campaign (live is_archived), kept in the campaign store.
  const statusOf = (c: Campaign): CampaignStatus => (isArchived(c.id, campaignState) ? "archived" : campaignStatus(c));
  // ?c=<id> (links from the agent and the template page) opens that campaign: its card expanded, scrolled into view
  // and briefly highlighted. It is always under Status All, the default.
  const [focus] = useState(() => [...created, ...initial].find((c) => c.id === params.get("c")));
  // Every card starts collapsed; only a linked campaign (?c=<id>) and one just created start open.
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

  // Copy to… targets: the menu leaves out ended and archived campaigns (template-menu.tsx).
  const copyTargets = campaigns;

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
    toast.success(`Created “${c.name}”`, {
      action: { label: "Add template", onClick: () => setAddingTo(id) },
    });
  }

  // Archived campaigns leave the board (AC-EC-C-02), shown again under Filter › Status › Archived; unarchive is the
  // same flag back (live PATCH /api/email/campaigns/:id { is_archived }).
  function setArchived(c: Campaign, archived: boolean) {
    campaignActions.setArchived(c.id, archived);
    toast.success(archived ? `Archived “${c.name}”` : `Restored “${c.name}”`, {
      description: archived ? "Pick Archived under Filter to see it." : undefined,
      action: { label: "Undo", onClick: () => campaignActions.setArchived(c.id, !archived) },
    });
  }

  function saveEdit(id: string, fields: CampaignFields) {
    const before = campaigns.find((c) => c.id === id);
    // An ended campaign moved back into its period stays off (live campaign-expiry: reviving doesn't switch the
    // templates back on; whoever extends it chooses what runs again).
    if (before && campaignStatus(before) === "ended" && campaignStatus({ ...before, ...fields }) !== "ended")
      for (const t of before.templates) {
        const own =
          templateStore.patch[t.id]?.status ??
          [...initial.flatMap((x) => x.templates), ...templateStore.copies.map((x) => x.template)].find((x) => x.id === t.id)?.status;
        if (own !== "inactive") templateActions.setStatus(t.id, "inactive", viewer.email);
      }
    campaignActions.update(id, fields);
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
      <PageHeader title="Campaigns" description="Organise emails by audience and compare their results." actions={newCampaignButton} />

      {paused && (
        // Same alert as Overview and the batch report (warning, matches the "Auto-paused" badge).
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
      {locked && (
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
          {/* One solid orange button per page (DESIGN.md §2): the header's; this one is outline. */}
          <EmptyContent>
            <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
              <PlusIcon data-icon="inline-start" />
              New campaign
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Toolbar query={query} onQueryChange={setQuery} />
              <FilterPopover size="default" count={filterCount} onClearAll={() => setFilters(NO_FILTERS)}>
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
            {/* Same wording as Delete template (template-menu.tsx): what goes with it, then what stays. */}
            <AlertDialogDescription>
              Its templates are deleted with it. Sent batches keep their reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep campaign</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                // Soft delete that cascades to its templates (PRD-02 AC-EC-C-03); sent batches keep their reports.
                const c = deleteCampaign && campaigns.find((x) => x.id === deleteCampaign.id);
                if (c) {
                  for (const t of c.templates) templateActions.remove(t.id, viewer.email);
                  campaignActions.remove(c.id);
                }
                if (deleteCampaign) toast.success(`Deleted “${deleteCampaign.name}”`);
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

// Search (Infrastructure header) stretches across the row; Filter sits at its right. Both h-8, as on Templates.
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
