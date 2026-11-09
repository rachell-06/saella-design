"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  CircleAlertIcon,
  InboxIcon,
  PlusCircleIcon,
  PlusIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Campaign,
  CURRENT_USER,
  type Template,
  campaignStatus,
  sampleCampaigns,
  totals,
} from "@/app/(app)/campaigns/_components/data";
import { NewCampaignDialog, type StartWith } from "@/app/(app)/campaigns/_components/new-campaign-dialog";
import { PageHeader } from "@/components/layout/page-header";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignGroup } from "./campaign-group";
import { manyCampaigns } from "./many-campaigns";

// Campaigns, option 2 (decisions.md, pending): every campaign is a collapsible card with its templates inside,
// learned from Studio Admin /dashboard/infrastructure (wide search + "⊕ facet" buttons, grouped
// cards with a table and meters). Same data, rules and actions as option 1 (/campaigns, master–detail).
// Preview states with ?state=paused | locked | empty | many (60 campaigns).

const STATUS_GROUPS = [
  { status: "active", label: "Active" },
  { status: "not-started", label: "Not started" },
  { status: "ended", label: "Ended" },
] as const;

type StatusTab = (typeof STATUS_GROUPS)[number]["status"];

// Long lists (2026-10-27): from this many campaigns every card starts collapsed.
const MANY_AT = 8;
// Campaigns shown per tab before "Show N more".
const GROUP_LIMIT = 10;

// Most recent send first; campaigns that never sent go last.
const byLastSent = (a: Campaign, b: Campaign) => (totals(b).lastSent ?? "").localeCompare(totals(a).lastSent ?? "");

type Facet = { label: string; options: string[] };

export function CampaignsBoard() {
  const params = useSearchParams();
  const router = useRouter();
  const previewState = params.get("state");
  const [initial] = useState<Campaign[]>(() =>
    previewState === "empty" ? [] : previewState === "many" ? manyCampaigns : sampleCampaigns
  );
  const many = initial.length >= MANY_AT;
  const [campaigns, setCampaigns] = useState<Campaign[]>(initial);
  const [query, setQuery] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  // Opens on the first status that has campaigns (normally Active).
  const [statusTab, setStatusTab] = useState<StatusTab>(
    () => STATUS_GROUPS.find((g) => initial.some((c) => campaignStatus(c) === g.status))?.status ?? "active"
  );
  // Few campaigns: all open except Ended (they can't send any more). Many: every card starts as one line.
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(many ? [] : initial.filter((c) => campaignStatus(c) !== "ended").map((c) => c.id))
  );
  const [fullTabs, setFullTabs] = useState<Set<string>>(() => new Set());
  const [creating, setCreating] = useState(false);
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<{ campaignId: string; template: Template } | null>(null);

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
        (countries.length === 0 || c.countries.some((x) => countries.includes(x)))
    );
  }, [campaigns, countries, query]);


  const countryFacet: Facet = {
    label: "Country",
    options: [...new Set(campaigns.flatMap((c) => c.countries))].sort(),
  };
  const filtering = query.trim() !== "" || countries.length > 0;
  const searching = query.trim() !== "";

  const counts = Object.fromEntries(
    STATUS_GROUPS.map((g) => [g.status, visible.filter((c) => campaignStatus(c) === g.status).length])
  ) as Record<StatusTab, number>;
  const tabAll = visible.filter((c) => campaignStatus(c) === statusTab).sort(byLastSent);
  const tabLabel = (STATUS_GROUPS.find((g) => g.status === statusTab)?.label ?? "").toLowerCase();
  // Searching shows every match; otherwise a long tab stops at GROUP_LIMIT.
  const limited = !searching && !fullTabs.has(statusTab) && tabAll.length > GROUP_LIMIT;
  const tabList = limited ? tabAll.slice(0, GROUP_LIMIT) : tabAll;
  const allOpen = tabAll.length > 0 && tabAll.every((c) => openIds.has(c.id));

  const setOpen = (id: string, open: boolean) =>
    setOpenIds((s) => {
      const next = new Set(s);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });

  const updateCampaign = (id: string, fn: (c: Campaign) => Campaign) =>
    setCampaigns((list) => list.map((c) => (c.id === id ? fn(c) : c)));

  function clearFilters() {
    setQuery("");
    setCountries([]);
  }

  function create(c: Omit<Campaign, "id" | "templates">, startWith: StartWith) {
    const id = `new-${Date.now()}`;
    setCampaigns((all) => [{ ...c, id, templates: [] }, ...all]);
    setOpen(id, true);
    setCreating(false);
    clearFilters();
    toast.success(`Created “${c.name}”`, {
      description:
        startWith === "empty"
          ? "Add a template to start sending."
          : `The ${startWith} editor opens next (built with the Template screen).`,
    });
  }

  const newCampaignButton = (
    <Button onClick={() => setCreating(true)}>
      <PlusIcon data-icon="inline-start" />
      New campaign
    </Button>
  );

  return (
    <>
      <div className="flex flex-col gap-3">
        <PageHeader
          title="Campaigns"
          description="Each campaign groups templates aimed at the same countries and industries."
          actions={newCampaignButton}
        />
      </div>

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
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            {/* Status as tabs (user request 2026-10-27): one status at a time, easy to switch. Counts follow the
                search and country filter. */}
            <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
              <TabsList aria-label="Campaign status">
                {STATUS_GROUPS.map((g) => (
                  <TabsTrigger key={g.status} value={g.status}>
                    {g.label}
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 tabular-nums">
                      {counts[g.status]}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex flex-wrap items-center gap-2">
              <InputGroup className="w-72">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  aria-label="Search campaigns or templates"
                  placeholder="Search campaigns or templates"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </InputGroup>
              <FacetButton facet={countryFacet} value={countries} onChange={setCountries} />
              {filtering && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              )}
              <Button
                variant="outline"
                disabled={tabAll.length === 0}
                onClick={() => setOpenIds(allOpen ? new Set() : new Set(tabAll.map((c) => c.id)))}
              >
                {allOpen ? <ChevronsDownUpIcon data-icon="inline-start" /> : <ChevronsUpDownIcon data-icon="inline-start" />}
                {allOpen ? "Collapse all" : "Expand all"}
              </Button>
            </div>
          </div>

          {tabAll.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{filtering ? `No ${tabLabel} campaigns match` : `No ${tabLabel} campaigns`}</EmptyTitle>
                <EmptyDescription>
                  {filtering
                    ? "Try another country or search term, or another tab."
                    : "Campaigns move between tabs by their start and end dates."}
                </EmptyDescription>
              </EmptyHeader>
              {filtering && (
                <EmptyContent>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="flex flex-col gap-2">
              {tabList.map((c) => (
              <CampaignGroup
                key={c.id}
                campaign={c}
                campaigns={campaigns}
                // Searching opens the matching campaigns so template hits are visible.
                open={openIds.has(c.id) || searching}
                onOpenChange={(o) => setOpen(c.id, o)}
                sendingBlocked={sendingBlocked}
                onToast={(m) => toast(m)}
                onAddTemplate={() => toast("Template picker opens here (built with the Template screen).")}
                onEdit={() => toast(`Edit “${c.name}”: same form as New campaign.`)}
                onViewReport={() => router.push(`/overview?campaign=${c.id}`)}
                onArchive={() => {
                  setCampaigns((all) => all.filter((x) => x.id !== c.id));
                  toast.success(`Archived “${c.name}”`, {
                    description: "Archived campaigns are hidden from this list. Their reports are kept.",
                  });
                }}
                onDeleteCampaign={() => setDeleteCampaign(c)}
                onToggleStatus={(id) =>
                  updateCampaign(c.id, (x) => ({
                    ...x,
                    templates: x.templates.map((t) =>
                      t.id === id ? { ...t, status: t.status === "active" ? "inactive" : "active" } : t
                    ),
                  }))
                }
                onCopy={(id, toId) => {
                  const tpl = c.templates.find((t) => t.id === id);
                  const target = campaigns.find((x) => x.id === toId);
                  if (!tpl || !target) return;
                  updateCampaign(toId, (x) => ({
                    ...x,
                    templates: [
                      ...x.templates,
                      { ...tpl, id: `copy-${Date.now()}`, name: `${tpl.name} (copy)`, owner: CURRENT_USER, shared: false, status: "inactive", recipients: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubs: 0, lastSent: undefined, followUp: undefined },
                    ],
                  }));
                  toast.success(`Copied to ${target.name}`);
                }}
                onRequestDeleteTemplate={(template) => setDeleteTemplate({ campaignId: c.id, template })}
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

      <AlertDialog open={deleteCampaign !== null} onOpenChange={(o) => !o && setDeleteCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign “{deleteCampaign?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the campaign and every template inside it. They disappear from the board, overview,
              leaderboard and metrics. Past sends and reports are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setCampaigns((all) => all.filter((c) => c.id !== deleteCampaign?.id));
                toast.success("Campaign deleted");
                setDeleteCampaign(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteTemplate !== null} onOpenChange={(o) => !o && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template “{deleteTemplate?.template.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the board, overview, leaderboard and metrics. Past sends and reports are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep template</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTemplate) {
                  updateCampaign(deleteTemplate.campaignId, (x) => ({
                    ...x,
                    templates: x.templates.filter((t) => t.id !== deleteTemplate.template.id),
                  }));
                  toast.success("Template deleted", { description: "Past sends and reports are kept." });
                }
                setDeleteTemplate(null);
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

// "⊕ Status" button (Studio Admin infrastructure toolbar). Picked values show as a count on the button.
function FacetButton({ facet, value, onChange }: { facet: Facet; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <PlusCircleIcon data-icon="inline-start" />
          {facet.label}
          {value.length > 0 && (
            <Badge variant="brand" className="tabular-nums">
              {value.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          {facet.options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={value.includes(option)}
              onCheckedChange={(on) => onChange(on ? [...value, option] : value.filter((o) => o !== option))}
              onSelect={(e) => e.preventDefault()}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
