"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronsUpDownIcon,
  CircleAlertIcon,
  FileTextIcon,
  LayoutTemplateIcon,
  LockIcon,
  PlusIcon,
  RotateCwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Campaign,
  CURRENT_USER,
  type Template,
  formatDate,
  formatDateTime,
  sampleCampaigns,
  withFollowUps,
} from "@/app/(app)/campaigns/_components/data";
import { TemplateName } from "@/app/(app)/campaigns/_components/template-table";
import { manyCampaigns } from "@/app/(app)/campaigns-2/_components/many-campaigns";
import { PageHeader } from "@/components/layout/page-header";
import { revealOnRowHover } from "@/components/saella/data-table";
import { FilterBar, type FilterValue } from "@/components/saella/filter-bar";
import { RateCell } from "@/components/saella/rate-meter";
import { StatusBadge } from "@/components/saella/status-badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AutomateDialog } from "./automate-dialog";
import { currentSchedule, useAutomation } from "./automation";
import { type TemplateRow, allTemplates, ownerName, viewerFor } from "./data";
import { NewTemplateDialog } from "./new-template-dialog";
import { AutomateButton, SendButton, TemplateMenu } from "./template-actions";

// All templates across campaigns (live app /dashboard/email/templates, EmailTemplatesList). Same rows, rates
// and actions as the Campaigns screens; filters by campaign, status, owner and kind; follow-ups stay under
// the template whose automation sends them (DESIGN.md §9.6).
// Preview states: ?state=loading | error | empty | paused | locked | member (Linh as a plain member, not admin)
// | many (the 60 fictional campaigns of /campaigns-2?state=many, ~150 templates; their rows open no detail page).
// Long lists (2026-10-28, Studio Admin products/tasks): the header row sticks to the top while scrolling, so the
// three rate columns stay labelled; rows still grow in place with "Show N more" like /campaigns-2, no pagination.

const KIND_LABEL = { letter: "Letter", design: "Design" } as const;
const STATUS_LABEL = { active: "Active", inactive: "Inactive" } as const;
// Rows shown before "Show N more" (follow-ups don't count, same as /campaigns-2).
const ROW_LIMIT = 25;

// Most recent send first; templates that never sent go last.
const byLastSent = (a: Template, b: Template) => (b.lastSent ?? "").localeCompare(a.lastSent ?? "");

export function TemplatesScreen() {
  const params = useSearchParams();
  const previewState = params.get("state");
  const viewer = viewerFor(previewState);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() =>
    previewState === "empty" ? [] : previewState === "many" ? manyCampaigns : sampleCampaigns
  );
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  // ?campaign=<id> lets the Campaigns screen link straight to its templates.
  const [filters, setFilters] = useState<FilterValue>(() => {
    const c = sampleCampaigns.find((x) => x.id === params.get("campaign"));
    return c ? ({ campaign: [c.name] } as FilterValue) : ({} as FilterValue);
  });
  const [showAll, setShowAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const [automating, setAutomating] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Template | null>(null);
  const store = useAutomation();

  const loading = previewState === "loading";
  const error = previewState === "error";
  const sendingBlocked =
    previewState === "paused"
      ? "Sending is paused for this workspace"
      : previewState === "locked"
        ? "Verify a sending domain and confirm a sender first"
        : undefined;

  const rows = useMemo(() => allTemplates(campaigns), [campaigns]);

  const facets = [
    { key: "campaign", label: "Campaign", options: campaigns.map((c) => c.name) },
    { key: "status", label: "Status", options: ["Active", "Inactive"] },
    { key: "owner", label: "Owner", options: [...new Set(rows.map((r) => ownerName(r.owner)))].sort() },
    { key: "kind", label: "Kind", options: ["Letter", "Design"] },
  ];

  const q = query.trim().toLowerCase();
  const matches = (r: TemplateRow) =>
    (!q || r.name.toLowerCase().includes(q) || r.campaignName.toLowerCase().includes(q)) &&
    (!filters.campaign?.length || filters.campaign.includes(r.campaignName)) &&
    (!filters.status?.length || filters.status.includes(STATUS_LABEL[r.status])) &&
    (!filters.owner?.length || filters.owner.includes(ownerName(r.owner))) &&
    (!filters.kind?.length || filters.kind.includes(KIND_LABEL[r.kind]));
  const visible = rows.filter(matches).sort(byLastSent);
  const filtering = q !== "" || Object.values(filters).some((v) => v.length > 0);

  // A follow-up stays under its template when both are shown; otherwise it is a row of its own.
  const ordered = withFollowUps(visible) as { template: TemplateRow; isChild: boolean; hasChildren: boolean }[];
  const parents = ordered.filter((r) => !r.isChild).length;
  const limited = !showAll && !filtering && parents > ROW_LIMIT;
  let seen = 0;
  const shown = limited ? ordered.filter((r) => (r.isChild ? seen <= ROW_LIMIT : ++seen <= ROW_LIMIT)) : ordered;

  const updateTemplate = (id: string, fn: (t: Template) => Template) =>
    setCampaigns((all) => all.map((c) => ({ ...c, templates: c.templates.map((t) => (t.id === id ? fn(t) : t)) })));

  function toggleStatus(id: string) {
    const t = rows.find((r) => r.id === id);
    if (!t) return;
    updateTemplate(id, (x) => ({ ...x, status: x.status === "active" ? "inactive" : "active" }));
    toast.success(t.status === "active" ? `“${t.name}” is inactive` : `“${t.name}” is active`, {
      description: t.status === "active" ? "It can't be sent until you mark it active again." : "It can be sent now.",
    });
  }

  // AC-EC-T-06: a copy is always a draft (inactive), owned by whoever copies it (BR-RULE-EC-41).
  function copy(id: string, toId: string) {
    const t = rows.find((r) => r.id === id);
    const target = campaigns.find((c) => c.id === toId);
    if (!t || !target) return;
    const copyOf: Template = {
      id: `copy-${Date.now()}`,
      name: `${t.name} (copy)`,
      owner: CURRENT_USER,
      status: "inactive",
      recipients: 0,
      delivered: 0,
      opens: 0,
      clicks: 0,
      bounces: 0,
      unsubs: 0,
    };
    setCampaigns((all) => all.map((c) => (c.id === toId ? { ...c, templates: [...c.templates, copyOf] } : c)));
    toast.success(`Copied to ${target.name}`, { description: "The copy is inactive and yours." });
  }

  const newButton = (
    <Button onClick={() => setCreating(true)} disabled={campaigns.length === 0}>
      <PlusIcon data-icon="inline-start" />
      New template
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Templates"
        description="Every email you send, across all campaigns. Open one to see how it performs or to edit it."
        actions={newButton}
      />

      {previewState === "paused" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Sending is paused for this workspace</AlertTitle>
          <AlertDescription>
            Too many messages bounced or were marked as spam. Clean your recipient list, then ask an admin to resume
            sending.
          </AlertDescription>
        </Alert>
      )}
      {previewState === "locked" && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>Sending is locked</AlertTitle>
          <AlertDescription>To send batches, verify a sending domain and confirm a sender first.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/sending">Go to Sending</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}
      {previewState === "member" && (
        <Alert>
          <LockIcon />
          <AlertTitle>Previewing as a member</AlertTitle>
          <AlertDescription>
            You can edit, send and automate your own templates and the ones shared with you. Others you can view and
            copy.
          </AlertDescription>
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
              Templates live inside campaigns. Create a campaign first, then add a letter or a design to it, or ask the
              agent to draft one.
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
          <FilterBar
            facets={facets}
            value={filters}
            onChange={setFilters}
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search templates or campaigns"
            resultCount={loading ? undefined : visible.length}
            resultNoun={visible.length === 1 ? "template" : "templates"}
          />

          {!loading && visible.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No templates match</EmptyTitle>
                <EmptyDescription>Try another search term or remove a filter.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setFilters({});
                  }}
                >
                  Clear filters
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            // overflow-clip (not hidden) rounds the corners without becoming a scroll box, so the header can stick
            // to the page's scroller; the table is fixed-width, so its own x-scroll box is not needed.
            <div className="overflow-clip rounded-card border *:data-[slot=table-container]:overflow-visible">
              <Table aria-label="Templates" aria-busy={loading || undefined} className="table-fixed">
                <colgroup>
                  <col className="w-10" />
                  <col />
                  <col className="w-48" />
                  <col className="w-24" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-20" />
                  <col className="w-32" />
                </colgroup>
                <TableHeader className="sticky top-0 z-10 shadow-[inset_0_-1px_0_var(--border)]">
                  <TableRow>
                    <TableHead className="pl-4">
                      <span className="sr-only">Kind</span>
                    </TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead className="text-right">Click</TableHead>
                    <TableHead className="text-right">Bounce</TableHead>
                    <TableHead>Last sent</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                {/* No row background on hover or open menu (DESIGN.md, table rules). */}
                <TableBody className="**:data-[slot=table-row]:has-aria-expanded:bg-transparent">
                  {loading
                    ? Array.from({ length: 6 }, (_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 9 }, (_, j) => (
                            <TableCell key={j} className={j === 0 ? "pl-4" : undefined}>
                              <Skeleton className={cn("h-4", j === 1 ? "w-48" : j === 0 ? "w-4" : "w-16")} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : shown.map(({ template: t, isChild, hasChildren }) => {
                        const schedule = currentSchedule(store, t.id);
                        const KindIcon = t.kind === "design" ? LayoutTemplateIcon : FileTextIcon;
                        return (
                          <TableRow key={t.id} className={cn("group/row", hasChildren && "border-b-0")}>
                            <TableCell className="pl-4 text-muted-foreground" title={KIND_LABEL[t.kind]}>
                              <KindIcon aria-hidden className="size-4" />
                              <span className="sr-only">{KIND_LABEL[t.kind]}</span>
                            </TableCell>
                            {/* Names wrap to two lines before they cut; the grey lines under them stay one line. */}
                            <TableCell className="whitespace-normal [&_a]:line-clamp-2 [&_a]:break-words [&_span]:truncate">
                              {/* TemplateName links to /templates/[id] itself (shared with Campaigns). */}
                              <TemplateName template={t} isChild={isChild} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <span className="block truncate" title={t.campaignName}>
                                {t.campaignName}
                              </span>
                              {schedule && (
                                <span className="block truncate text-xs" title="This template has a schedule">
                                  {schedule.status === "active" ? "Scheduled" : "Schedule paused"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={t.status === "active" ? "template-active" : "template-inactive"} />
                            </TableCell>
                            {t.recipients === 0 ? (
                              <TableCell colSpan={3} className="text-right text-muted-foreground">
                                No sends yet
                              </TableCell>
                            ) : (
                              <>
                                <RateCell kind="open" part={t.opens} whole={t.delivered} />
                                <RateCell kind="click" part={t.clicks} whole={t.delivered} />
                                <RateCell kind="bounce" part={t.bounces} whole={t.recipients} />
                              </>
                            )}
                            <TableCell className="text-muted-foreground" title={t.lastSent ? formatDateTime(t.lastSent) : undefined}>
                              {t.lastSent ? formatDate(t.lastSent) : null}
                            </TableCell>
                            <TableCell className="pr-4">
                              <div className={cn("flex items-center justify-end gap-1", revealOnRowHover)}>
                                <SendButton template={t} viewer={viewer} sendingBlocked={sendingBlocked} />
                                <AutomateButton template={t} viewer={viewer} onOpen={() => setAutomating(t.id)} />
                                <TemplateMenu
                                  template={t}
                                  viewer={viewer}
                                  campaigns={campaigns}
                                  onToggleStatus={toggleStatus}
                                  onCopy={copy}
                                  onRequestDelete={setToDelete}
                                  onToast={(title, description) => toast(title, { description })}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
              {limited && (
                <div className="border-t px-2 py-1">
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowAll(true)}>
                    <ChevronsUpDownIcon data-icon="inline-start" />
                    Show {parents - ROW_LIMIT} more
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <NewTemplateDialog open={creating} onOpenChange={setCreating} campaigns={campaigns} />
      {automating && (
        <AutomateDialog templateId={automating} open onOpenChange={(o) => !o && setAutomating(null)} viewer={viewer} />
      )}

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It disappears from the board, overview, leaderboard and metrics. Batches already sent keep working and
              keep their report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep template</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (toDelete)
                  setCampaigns((all) => all.map((c) => ({ ...c, templates: c.templates.filter((t) => t.id !== toDelete.id) })));
                toast.success("Template deleted", { description: "Past sends and reports are kept." });
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

