"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3Icon,
  CopyIcon,
  CornerDownRightIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PowerIcon,
  SendIcon,
  Share2Icon,
  Trash2Icon,
  UserRoundCogIcon,
  ZapIcon,
} from "lucide-react";
import { revealOnRowHover } from "@/components/saella/data-table";
import { AutomateDialog } from "@/components/features/automate-dialog";
import { RateCell } from "@/components/saella/rate-meter";
import { StatusBadge } from "@/components/saella/status-badge";
import { members } from "@/lib/mock/workspace";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CURRENT_USER, type Campaign, type Template, followUpRule, formatDate, rate, withFollowUps } from "@/lib/mock/campaigns";

export type TemplateTableProps = {
  campaign: Campaign;
  campaigns: Campaign[];
  /** Why no batch can be sent right now (workspace paused, no verified sender). */
  sendingBlocked?: string;
  onAddTemplate: () => void;
  onToast: (message: string) => void;
  onToggleStatus: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onCopy: (templateId: string, toCampaignId: string) => void;
};

// Templates of the selected campaign (live app: inner table of EmailCampaignBoard). In the detail pane the
// table has room for a visible header, a Status column (active/inactive, always shown) and the open, click and bounce
// rates. Row actions appear on hover or keyboard focus (DESIGN.md, table rules). Actions the viewer can't take stay
// visible-on-hover but disabled, with the reason in a tooltip.
// 2026-11-05: fixed column widths so the Template name gets the room (it wrapped to 2–4 lines while an empty actions
// column sat at the end). Rates read "38.3% (466)" with the denominator in the tooltip (§9.7), which is what the
// Delivered column showed, so that column went (the campaign's delivery rate is in the KPI strip above). The row
// actions, icon-only, float over Last sent on hover instead of holding their own column.
export function TemplateTable({ campaign, campaigns, sendingBlocked, onToast, onToggleStatus, onDelete, onCopy }: TemplateTableProps) {
  const [toDelete, setToDelete] = useState<Template | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table aria-label={`Templates in ${campaign.name}`} className="table-fixed">
        <colgroup>
          <col />
          <col className="w-24" />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-28" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Template</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Open</TableHead>
            <TableHead className="text-right">Click</TableHead>
            <TableHead className="text-right">Bounce</TableHead>
            <TableHead>
              Last sent<span className="sr-only"> and actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withFollowUps(campaign.templates).map(({ template: tpl, isChild, hasChildren }) => (
            <TableRow key={tpl.id} className={cn("group/row", hasChildren && "border-b-0")}>
              <TableCell className="whitespace-normal">
                <TemplateName template={tpl} isChild={isChild} />
              </TableCell>
              <TableCell>
                <StatusBadge status={tpl.status === "active" ? "template-active" : "template-inactive"} />
              </TableCell>
              {tpl.recipients === 0 ? (
                <TableCell colSpan={3} className="text-muted-foreground">
                  No sends yet
                </TableCell>
              ) : (
                <>
                  <RateCell kind="open" part={tpl.opens} whole={tpl.delivered} />
                  <RateCell kind="click" part={tpl.clicks} whole={tpl.delivered} />
                  <RateCell kind="bounce" part={tpl.bounces} whole={tpl.recipients} />
                </>
              )}
              <TableCell className="relative text-muted-foreground">
                {tpl.lastSent ? formatDate(tpl.lastSent) : null}
                <div className={cn("absolute inset-y-0 right-0 flex items-center bg-card pr-2 pl-1", revealOnRowHover)}>
                  <TemplateActions
                    compact
                    template={tpl}
                    campaigns={campaigns}
                    sendingBlocked={sendingBlocked}
                    onToast={onToast}
                    onToggleStatus={onToggleStatus}
                    onCopy={onCopy}
                    onRequestDelete={setToDelete}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the board, overview, leaderboard and metrics. Past sends and reports are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep template</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (toDelete) onDelete(toDelete.id);
                setToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const VIEWER_IS_ADMIN = members.find((m) => m.email === CURRENT_USER)?.role === "admin";

// Template name cell, shared by both Campaigns layouts. A follow-up sits indented under the template whose
// automation sends it, with an arrow and its rule ("After 3 days if no open/click"), so the pair reads as
// one sequence. The owner shows only when it isn't the viewer.
export function TemplateName({ template, isChild, truncate }: { template: Template; isChild?: boolean; truncate?: boolean }) {
  return (
    <div className={cn("flex min-w-0 gap-2", isChild && "pl-4")}>
      {isChild && <CornerDownRightIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          href={`/templates/${template.id}`}
          className={cn(
            "rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            truncate && "truncate"
          )}
          title={template.name}
        >
          {template.name}
        </Link>
        {template.followUp && (
          // Under its template the arrow already says "follow-up"; a follow-up of a template in another
          // campaign keeps the word.
          <span
            className={cn("text-xs text-muted-foreground", truncate && "truncate")}
            title={`Sent as a follow-up: ${followUpRule(template.followUp)}`}
          >
            {isChild ? followUpRule(template.followUp) : `Follow-up · ${followUpRule(template.followUp)}`}
          </span>
        )}
        {template.owner !== CURRENT_USER && (
          <span className={cn("text-xs text-muted-foreground", truncate && "truncate")}>
            {template.owner}
            {template.shared ? " · shared with you" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// Row actions for one template, shared by both Campaigns layouts. Send needs edit access, an active template
// and a workspace that may send; Automate needs edit access. Disabled actions explain why in a tooltip.
export function TemplateActions({
  template,
  compact = false,
  campaigns,
  sendingBlocked,
  onToast,
  onToggleStatus,
  onCopy,
  onRequestDelete,
}: {
  template: Template;
  /** Send as an icon button, for tight tables (the tooltip names it). */
  compact?: boolean;
  campaigns: Campaign[];
  sendingBlocked?: string;
  onToast: (message: string) => void;
  onToggleStatus: (templateId: string) => void;
  onCopy: (templateId: string, toCampaignId: string) => void;
  onRequestDelete: (template: Template) => void;
}) {
  const router = useRouter();
  const [automating, setAutomating] = useState(false);
  // Same access tiers as /templates (live app template-permissions.ts): owner, shared, or a workspace admin.
  const canEdit = template.owner === CURRENT_USER || template.shared === true || VIEWER_IS_ADMIN;
  const ownerName = template.owner.split("@")[0];
  const noAccess = `Only ${ownerName}, people they share with, or an admin can do this. Ask ${ownerName} to share it.`;
  const sendReason = !canEdit
    ? noAccess
    : sendingBlocked
      ? sendingBlocked
      : template.status !== "active"
        ? "Mark this template active first to send a batch"
        : undefined;

  return (
        <div className={cn("flex items-center justify-end gap-1", revealOnRowHover)}>
          <ActionTooltip label={sendReason ?? "Send batch"}>
            {compact ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Send batch"
                disabled={Boolean(sendReason)}
                onClick={() => router.push(`/batches/new?template=${template.id}`)}
              >
                <SendIcon />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(sendReason)}
                onClick={() => router.push(`/batches/new?template=${template.id}`)}
              >
                <SendIcon data-icon="inline-start" />
                Send
              </Button>
            )}
          </ActionTooltip>
          <ActionTooltip label={canEdit ? "Automate: schedules and follow-ups" : noAccess}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Automate"
              disabled={!canEdit}
              onClick={() => setAutomating(true)}
            >
              <ZapIcon />
            </Button>
          </ActionTooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${template.name}`}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem disabled={!canEdit} onSelect={() => router.push(`/templates/${template.id}/edit`)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!canEdit} onSelect={() => onToast(`Share “${template.name}” with your team.`)}>
                  <Share2Icon />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <CopyIcon />
                    Copy to…
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-56">
                    {campaigns.map((c) => (
                      <DropdownMenuItem key={c.id} onSelect={() => onCopy(template.id, c.id)}>
                        {c.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onSelect={() => router.push(`/templates/${template.id}`)}>
                  <BarChart3Icon />
                  View analytics
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onToast(`Activity log for “${template.name}”.`)}>
                  <HistoryIcon />
                  View log
                </DropdownMenuItem>
                <DropdownMenuItem disabled={template.owner !== CURRENT_USER} onSelect={() => onToast("Pick a new owner.")}>
                  <UserRoundCogIcon />
                  Transfer owner
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!canEdit} onSelect={() => onToggleStatus(template.id)}>
                  <PowerIcon />
                  {template.status === "active" ? "Mark inactive" : "Mark active"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" disabled={!canEdit} onSelect={() => onRequestDelete(template)}>
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <AutomateDialog templateId={template.id} open={automating} onOpenChange={setAutomating} />
        </div>
  );
}

// Disabled buttons don't fire pointer events, so the tooltip wraps a span.
function ActionTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Delivered count; recipients and unsubscribes in a tooltip (shared with Campaigns option 2). */
export function DeliveredCell({ template: t }: { template: Template }) {
  const unsub = rate(t.unsubs, t.delivered);
  return (
    <TableCell className="text-right tabular-nums">
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{n(t.delivered)}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          {n(t.delivered)} delivered of {n(t.recipients)} sent · {n(t.unsubs)} unsubscribed ({unsub?.text ?? "–"})
        </TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

const n = (x: number) => x.toLocaleString("en-US");
