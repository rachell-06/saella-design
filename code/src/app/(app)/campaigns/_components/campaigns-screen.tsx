"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlertIcon, InboxIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, type FilterValue } from "@/components/saella/filter-bar";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignDetail } from "./campaign-detail";
import { CampaignList } from "./campaign-list";
import { type Campaign, CURRENT_USER, campaignStatus, sampleCampaigns } from "@/lib/mock/campaigns";
import { NewCampaignDialog, type StartWith } from "@/components/features/new-campaign-dialog";

// Campaign screen (PRD-02 + live app /dashboard/email), master–detail layout (DESIGN.md §9.6):
// status tabs with counts and search/country filter on top, campaign list on the left, the selected
// campaign (targeting, totals, templates) on the right. Patterns learned from Studio Admin (mail and
// logistics split, analytics KPI strip, tabs with counts), rebuilt on Saella components.
// Preview states with ?state=paused | locked | empty; ?c=<id> selects a campaign.

type StatusTab = "all" | Exclude<CampaignStatus, "archived">;
const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "not-started", label: "Not started" },
  { value: "ended", label: "Ended" },
];

export function CampaignsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const previewState = params.get("state");
  const [campaigns, setCampaigns] = useState<Campaign[]>(previewState === "empty" ? [] : sampleCampaigns);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [filters, setFilters] = useState<FilterValue>({});
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(params.get("c") ?? undefined);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Campaign | null>(null);

  const paused = previewState === "paused";
  const locked = previewState === "locked";
  const sendingBlocked = paused
    ? "Sending is paused for this workspace"
    : locked
      ? "Verify a sending domain and confirm a sender first"
      : undefined;

  // Search and country narrow the list first; the tab counts then describe what's left.
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    const countries = filters.country ?? [];
    return campaigns.filter(
      (c) =>
        (!q || c.name.toLowerCase().includes(q) || c.templates.some((t) => t.name.toLowerCase().includes(q))) &&
        (countries.length === 0 || c.countries.some((x) => countries.includes(x)))
    );
  }, [campaigns, filters, query]);

  const counts = useMemo(() => {
    const n: Record<StatusTab, number> = { all: searched.length, active: 0, "not-started": 0, ended: 0 };
    for (const c of searched) {
      const s = campaignStatus(c);
      if (s !== "archived") n[s] += 1;
    }
    return n;
  }, [searched]);

  const visible = statusTab === "all" ? searched : searched.filter((c) => campaignStatus(c) === statusTab);
  // Keep the selection while it's visible, otherwise fall back to the first campaign in the list.
  const selected = visible.find((c) => c.id === selectedId) ?? visible[0];

  const countryOptions = useMemo(() => [...new Set(campaigns.flatMap((c) => c.countries))].sort(), [campaigns]);

  function select(id: string) {
    setSelectedId(id);
    // Shareable link to the selected campaign, without a navigation.
    const url = new URL(window.location.href);
    url.searchParams.set("c", id);
    window.history.replaceState(null, "", url);
  }

  function clearFilters() {
    setFilters({});
    setQuery("");
    setStatusTab("all");
  }

  const updateCampaign = (id: string, fn: (c: Campaign) => Campaign) =>
    setCampaigns((list) => list.map((c) => (c.id === id ? fn(c) : c)));

  // Archived campaigns are hidden from the board (AC-EC-C-02), so archiving removes the row.
  function archive(c: Campaign) {
    setCampaigns((all) => all.filter((x) => x.id !== c.id));
    toast.success(`Archived “${c.name}”`, {
      description: "Archived campaigns are hidden from this list. Their reports are kept.",
    });
  }

  function create(c: Omit<Campaign, "id" | "templates">, startWith: StartWith) {
    const id = `new-${Date.now()}`;
    setCampaigns((all) => [{ ...c, id, templates: [] }, ...all]);
    setCreating(false);
    clearFilters();
    select(id);
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
      <PageHeader
        title="Campaigns"
        description="Each campaign groups templates aimed at the same countries and industries."
        actions={newCampaignButton}
      />

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
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
              <TabsList aria-label="Campaign status">
                {STATUS_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 tabular-nums">
                      {counts[tab.value]}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <FilterBar
              facets={[{ key: "country", label: "Country", options: countryOptions }]}
              value={filters}
              onChange={setFilters}
              query={query}
              onQueryChange={setQuery}
              searchPlaceholder="Campaign or template"
            />
          </div>

          {!selected ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No campaigns match</EmptyTitle>
                <EmptyDescription>Try another status, country or search term.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid min-h-[560px] grid-cols-[280px_minmax(0,1fr)] divide-x overflow-hidden rounded-card border bg-card">
              <CampaignList campaigns={visible} selectedId={selected.id} onSelect={select} />
              <CampaignDetail
                key={selected.id}
                campaign={selected}
                campaigns={campaigns}
                sendingBlocked={sendingBlocked}
                onToast={(m) => toast(m)}
                onAddTemplate={() => toast("Template picker opens here (built with the Template screen).")}
                onEdit={() => toast(`Edit “${selected.name}”: same form as New campaign.`)}
                onArchive={() => archive(selected)}
                onDeleteCampaign={() => setToDelete(selected)}
                onViewReport={() => router.push(`/overview?campaign=${selected.id}`)}
                onToggleStatus={(id) =>
                  updateCampaign(selected.id, (c) => ({
                    ...c,
                    templates: c.templates.map((t) =>
                      t.id === id ? { ...t, status: t.status === "active" ? "inactive" : "active" } : t
                    ),
                  }))
                }
                onDelete={(id) => {
                  updateCampaign(selected.id, (c) => ({ ...c, templates: c.templates.filter((t) => t.id !== id) }));
                  toast.success("Template deleted", { description: "Past sends and reports are kept." });
                }}
                onCopy={(id, toId) => {
                  const tpl = selected.templates.find((t) => t.id === id);
                  const target = campaigns.find((x) => x.id === toId);
                  if (!tpl || !target) return;
                  updateCampaign(toId, (c) => ({
                    ...c,
                    templates: [
                      ...c.templates,
                      { ...tpl, id: `copy-${Date.now()}`, name: `${tpl.name} (copy)`, owner: CURRENT_USER, shared: false, status: "inactive", recipients: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubs: 0, lastSent: undefined, followUp: undefined },
                    ],
                  }));
                  toast.success(`Copied to ${target.name}`);
                }}
              />
            </div>
          )}
        </div>
      )}

      <NewCampaignDialog open={creating} onOpenChange={setCreating} onCreate={create} />

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign “{toDelete?.name}”?</AlertDialogTitle>
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
                setCampaigns((all) => all.filter((c) => c.id !== toDelete?.id));
                toast.success("Campaign deleted");
                setToDelete(null);
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
