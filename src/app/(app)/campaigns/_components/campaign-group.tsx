"use client";

import { useRef, useState } from "react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  BarChart3Icon,
  ChevronRightIcon,
  CircleDashedIcon,
  EllipsisVerticalIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import {
  type Campaign,
  industryLabels,
  formatDate,
  formatDateTime,
  rate,
  totals,
} from "@/lib/mock/campaigns";
import type { Viewer } from "@/lib/mock/templates";
import { AutomateDialog } from "@/components/features/automation-panel";
import { Hint } from "@/components/saella/hint";
import { RateCell } from "@/components/saella/rate-meter";
import { type CampaignStatus, StatusBadge } from "@/components/saella/status-badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EditIconButton, SendButton, TemplateMenu, TemplateNameCell, useRowOpen } from "@/components/features/template-menu";

// Numbers: the card's rows and ⓘ totals come from applyTemplateStore (lib/mock/templates.ts), which takes each
// template's figures from its batches, the same source as Templates and the template page.
// One campaign as a collapsible card. Presentation: Studio Admin /dashboard/infrastructure ProjectEnvironments:
// header = chevron + name + "(N templates)", ⓘ with targeting and totals (a popover, opened by click or keyboard
// focus), a ghost "Add template" and an outline ⋮; inside, a table with one RateCell column per rate (numbers, not
// Infrastructure's usage bars), and a muted empty row. The template table matches the Templates
// list; a click anywhere on a row opens the template. No follow-ups here; Automate is a ⋯ item that
// opens the automation dialog (active templates only).

// Templates shown per campaign before "Show all N templates" (follow-ups don't count).
const TEMPLATE_LIMIT = 5;

export function CampaignGroup({
  campaign,
  highlighted = false,
  status,
  campaigns,
  viewer,
  open,
  onOpenChange,
  sendingBlocked,
  onAddTemplate,
  onEdit,
  onViewReport,
  onArchive,
  onDeleteCampaign,
}: {
  campaign: Campaign;
  /** Opened from a ?c= link: a brief brand ring so the eye lands on it. */
  highlighted?: boolean;
  /** Period-derived status, or archived (the board owns the archive flag). */
  status: CampaignStatus;
  /** Copy targets (campaigns on the board, not archived). */
  campaigns: Campaign[];
  viewer: Viewer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sendingBlocked?: string;
  onAddTemplate: () => void;
  onEdit: () => void;
  onViewReport: () => void;
  /** true archives, false restores to the board. */
  onArchive: (archived: boolean) => void;
  onDeleteCampaign: () => void;
}) {
  const c = campaign;
  const t = totals(c);
  const [showAll, setShowAll] = useState(false);
  // Automate opens the shared automation dialog, as in the live app.
  const [automating, setAutomating] = useState<string | null>(null);
  const rowOpen = useRowOpen();
  // Templates only: follow-ups are on the template page. Long campaigns show their first TEMPLATE_LIMIT.
  const rows = c.templates.filter((tpl) => !tpl.followUp);
  const limited = !showAll && rows.length > TEMPLATE_LIMIT;
  const shownRows = limited ? rows.slice(0, TEMPLATE_LIMIT) : rows;
  const count = rows.length;
  const addBlocked =
    status === "ended" ? "This campaign has ended" : status === "archived" ? "Unarchive the campaign to add templates" : undefined;

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      id={`campaign-${c.id}`}
      className={cn(
        "group/card flex scroll-mt-4 flex-col overflow-hidden rounded-card border bg-card py-3 text-card-foreground transition-shadow duration-500 data-[state=open]:gap-3 data-[state=open]:pb-0",
        highlighted && "ring-2 ring-brand/60"
      )}
    >
      <div className="flex items-center gap-1 px-4">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="group/trigger -ml-2 h-auto min-w-0 justify-start gap-2 px-2 py-1 hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent"
          >
            {/* › closed, ⌄ open: the same chevron as Social › Accounts. */}
            <ChevronRightIcon className="text-muted-foreground transition-transform group-data-[state=open]/trigger:rotate-90" />
            <span className="flex min-w-0 items-baseline gap-1.5 text-left">
              <span className="truncate leading-none font-medium">{c.name}</span>
              <span className="shrink-0 text-sm font-normal text-muted-foreground tabular-nums">
                ({count} {count === 1 ? "template" : "templates"})
              </span>
            </span>
          </Button>
        </CollapsibleTrigger>
        <CampaignInfo campaign={c} />
        {/* No campaign status badge on the card; status is a Filter section. */}
        {/* Collapsed cards show their actions on hover or keyboard focus; open cards always show them. */}
        <div
          className={cn(
            "ml-auto flex shrink-0 items-center gap-2 transition-opacity",
            "group-data-[state=closed]/card:opacity-0 group-hover/card:opacity-100! group-focus-within/card:opacity-100!",
            "has-aria-expanded:opacity-100! [@media(hover:none)]:opacity-100!"
          )}
        >
          {/* An ended or archived campaign can't send: the button stays, disabled with why. */}
          <Hint label={addBlocked}>
            <span tabIndex={addBlocked ? 0 : undefined}>
              <Button variant="ghost" size="sm" onClick={onAddTemplate} disabled={Boolean(addBlocked)}>
                <PlusIcon data-icon="inline-start" />
                Add template
              </Button>
            </span>
          </Hint>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label={`Actions for ${c.name}`}>
                <EllipsisVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={onEdit}>
                  <PencilIcon />
                  Edit campaign
                </DropdownMenuItem>
                <DropdownMenuItem disabled={t.recipients === 0} onSelect={onViewReport}>
                  <BarChart3Icon />
                  View report
                </DropdownMenuItem>
                {status === "archived" ? (
                  <DropdownMenuItem onSelect={() => onArchive(false)}>
                    <ArchiveRestoreIcon />
                    Unarchive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => onArchive(true)}>
                    <ArchiveIcon />
                    Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onSelect={onDeleteCampaign}>
                  <Trash2Icon />
                  Delete campaign
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CollapsibleContent>
        {count === 0 ? (
          <div className="flex min-h-24 items-center justify-center border-t bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <CircleDashedIcon aria-hidden className="size-4" />
              <p className="text-sm font-medium">No templates in this campaign</p>
            </div>
          </div>
        ) : (
          <Table
            aria-label={`Templates in ${c.name}`}
            className="table-fixed **:data-[slot='table-cell']:px-5 **:data-[slot='table-head']:px-5"
          >
            <colgroup>
              <col />
              <col className="w-30" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-30" />
              <col className="w-36" />
            </colgroup>
            <TableHeader className="bg-table-head [&_tr]:border-y">
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Open</TableHead>
                <TableHead>Click</TableHead>
                <TableHead>Bounce</TableHead>
                <TableHead>Last sent</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shownRows.map((tpl) => {
                return (
                  <TableRow key={tpl.id} className="group/row cursor-pointer" onClick={rowOpen(`/templates/${tpl.id}`)}>
                    <TableCell className="whitespace-normal">
                      <TemplateNameCell template={tpl} viewer={viewer} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tpl.status === "active" ? "template-active" : "template-inactive"} />
                    </TableCell>
                    <RateCell kind="delivery" part={tpl.delivered} whole={tpl.recipients} />
                    <RateCell kind="open" part={tpl.opens} whole={tpl.delivered} />
                    <RateCell kind="click" part={tpl.clicks} whole={tpl.delivered} />
                    <RateCell kind="bounce" part={tpl.bounces} whole={tpl.recipients} />
                    <TableCell className="text-muted-foreground tabular-nums">
                      {tpl.lastSent && (
                        <Hint label={formatDateTime(tpl.lastSent)}>
                          <span tabIndex={0} className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {formatDate(tpl.lastSent)}
                          </span>
                        </Hint>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="-mr-2 flex items-center justify-end gap-1">
                        <EditIconButton template={tpl} viewer={viewer} />
                        <SendButton template={tpl} viewer={viewer} sendingBlocked={sendingBlocked} iconOnly />
                        <TemplateMenu
                          template={tpl}
                          viewer={viewer}
                          showEdit={false}
                          campaigns={campaigns}
                          onAutomate={() => setAutomating(tpl.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {limited && (
          <div className="border-t px-3 py-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowAll(true)}>
              Show all {count} templates
            </Button>
          </div>
        )}
      </CollapsibleContent>
      {automating && (
        <AutomateDialog templateId={automating} open onOpenChange={(o) => !o && setAutomating(null)} viewer={viewer} />
      )}
    </Collapsible>
  );
}

// Everything about the campaign that isn't its name, in a popover on the ⓘ next to it. It opens on a click or when
// the ⓘ gets keyboard focus (a hover card can't be reached by touch). Focus that comes back to the ⓘ as the popover
// closes doesn't reopen it.
function CampaignInfo({ campaign: c }: { campaign: Campaign }) {
  const t = totals(c);
  const open = rate(t.opens, t.delivered);
  const click = rate(t.clicks, t.delivered);
  const bounce = rate(t.bounces, t.recipients);
  const [shown, setShown] = useState(false);
  const returning = useRef(false);
  return (
    <Popover open={shown} onOpenChange={setShown}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`About ${c.name}`}
          className="text-muted-foreground"
          onFocus={(e) => {
            if (returning.current) return;
            if (e.currentTarget.matches(":focus-visible")) setShown(true);
          }}
        >
          <InfoIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-80 flex-col gap-3"
        // Nothing to act on inside: focus stays on the ⓘ, so Tab moves on (and closes it) as usual.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={() => {
          returning.current = true;
          requestAnimationFrame(() => {
            returning.current = false;
          });
        }}
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm tabular-nums">
          {/* Labelled like the rest, at most 2 lines (unlabelled, the user's text reads as Saella's caption). The full text
              is in Edit campaign. */}
          {c.description && (
            <>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="line-clamp-2">{c.description}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Countries</dt>
          <dd>{c.countries.join(", ") || "All countries"}</dd>
          <dt className="text-muted-foreground">Industries</dt>
          <dd>{industryLabels(c.industries).join(", ") || "Any industry"}</dd>
          <dt className="text-muted-foreground">Period</dt>
          <dd>{period(c)}</dd>
          {/* One grid for both groups so the values line up; the separator spans both columns. */}
          <Separator className="col-span-2 my-1.5" />
          {t.recipients === 0 ? (
            <dd className="col-span-2 text-muted-foreground">No sends yet</dd>
          ) : (
            <>
              <dt className="text-muted-foreground">Recipients</dt>
              <dd>{t.recipients.toLocaleString("en-US")}</dd>
              <dt className="text-muted-foreground">Delivered</dt>
              <dd>{t.delivered.toLocaleString("en-US")}</dd>
              <dt className="text-muted-foreground">Open · Click · Bounce</dt>
              <dd>
                {open?.text} · {click?.text} · {bounce?.text}
              </dd>
              {t.lastSent && (
                <>
                  <dt className="text-muted-foreground">Last sent</dt>
                  <dd>{formatDate(t.lastSent)}</dd>
                </>
              )}
            </>
          )}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

function period(c: Campaign) {
  if (!c.startsOn && !c.endsOn) return "No end date";
  return `${c.startsOn ? formatDate(c.startsOn) : "…"} → ${c.endsOn ? formatDate(c.endsOn) : "no end"}`;
}
