"use client";

import { useState } from "react";

import {
  ArchiveIcon,
  BarChart3Icon,
  ChevronDownIcon,
  CircleDashedIcon,
  InfoIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import {
  DeliveredCell,
  TemplateActions,
  TemplateName,
} from "@/components/features/template-table";
import {
  type Campaign,
  type Template,
  formatDate,
  formatDateTime,
  rate,
  totals,
  withFollowUps,
} from "@/lib/mock/campaigns";
import { StatusBadge } from "@/components/saella/status-badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { RateCell } from "@/components/saella/rate-meter";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// One campaign as a collapsible card (pattern learned from Studio Admin /dashboard/infrastructure, 2026-10-27):
// header = chevron + name + status, an ⓘ hover card with targeting and totals, Add template and a ⋯ menu; body = its templates in a
// fixed-layout table, one right-aligned column per rate ("38.3% (467)", DESIGN.md §9.7, 2026-11-05). A campaign without templates shows a quiet muted band instead.


// Templates shown per campaign before "Show all N templates" (follow-ups don't count).
const TEMPLATE_LIMIT = 5;

export function CampaignGroup({
  campaign,
  campaigns,
  open,
  onOpenChange,
  sendingBlocked,
  onToast,
  onAddTemplate,
  onEdit,
  onViewReport,
  onArchive,
  onDeleteCampaign,
  onToggleStatus,
  onCopy,
  onRequestDeleteTemplate,
}: {
  campaign: Campaign;
  campaigns: Campaign[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sendingBlocked?: string;
  onToast: (message: string) => void;
  onAddTemplate: () => void;
  onEdit: () => void;
  onViewReport: () => void;
  onArchive: () => void;
  onDeleteCampaign: () => void;
  onToggleStatus: (templateId: string) => void;
  onCopy: (templateId: string, toCampaignId: string) => void;
  onRequestDeleteTemplate: (template: Template) => void;
}) {
  const c = campaign;
  const t = totals(c);
  const [showAll, setShowAll] = useState(false);
  // Long campaigns show their first TEMPLATE_LIMIT templates; follow-ups always stay with their template.
  const rows = withFollowUps(c.templates);
  const limited = !showAll && rows.filter((r) => !r.isChild).length > TEMPLATE_LIMIT;
  let parentsSeen = 0;
  const shownRows = limited
    ? rows.filter((r) => (r.isChild ? parentsSeen <= TEMPLATE_LIMIT : ++parentsSeen <= TEMPLATE_LIMIT))
    : rows;

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="group/card flex flex-col overflow-hidden rounded-card border bg-card py-1.5 data-[state=open]:gap-3 data-[state=open]:pt-3 data-[state=open]:pb-0"
    >
      {/* Header is the name only; the board groups cards by status (user request 2026-10-27) (user request 2026-10-27); targeting, period and totals sit behind ⓘ. */}
      <div className="flex items-center gap-1 px-4">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="group/trigger -ml-2 h-auto min-w-0 justify-start gap-2 px-2 py-1 hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent"
          >
            <ChevronDownIcon className="transition-transform group-data-[state=closed]/trigger:-rotate-90" />
            <span className="truncate font-semibold">{c.name}</span>
          </Button>
        </CollapsibleTrigger>
        <CampaignInfo campaign={c} />
        {/* Collapsed cards show their actions on hover or keyboard focus, so a long list isn't 60 rows of
            identical buttons (2026-10-27). Open cards and touch screens always show them. */}
        <div
          className={cn(
            "ml-auto flex shrink-0 items-center gap-2 transition-opacity",
            "group-data-[state=closed]/card:opacity-0 group-hover/card:opacity-100! group-focus-within/card:opacity-100!",
            "has-aria-expanded:opacity-100! [@media(hover:none)]:opacity-100!"
          )}
        >
          <Button variant="ghost" size="sm" onClick={onAddTemplate}>
            <PlusIcon data-icon="inline-start" />
            Add template
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`Actions for ${c.name}`}
              >
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={onEdit}>
                  <PencilIcon />
                  Edit campaign
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={t.recipients === 0}
                  onSelect={onViewReport}
                >
                  <BarChart3Icon />
                  View report
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onArchive}>
                  <ArchiveIcon />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={onDeleteCampaign}
                >
                  <Trash2Icon />
                  Delete campaign
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CollapsibleContent>
        {c.templates.length === 0 ? (
          <div className="flex min-h-20 items-center justify-center gap-2 border-t bg-muted/50 p-4 text-sm">
            <CircleDashedIcon
              aria-hidden
              className="size-4 text-muted-foreground"
            />
            <span className="font-medium">No templates in this campaign</span>
            <Button variant="link" size="sm" onClick={onAddTemplate}>
              Add one
            </Button>
          </div>
        ) : (
          <Table aria-label={`Templates in ${c.name}`} className="table-fixed">
            <colgroup>
              <col />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-44" />
            </colgroup>
            <TableHeader className="[&_tr]:border-t">
              <TableRow>
                <TableHead className="pl-4">Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">Click</TableHead>
                <TableHead className="text-right">Bounce</TableHead>
                <TableHead className="pl-6">Last sent</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            {/* No row background on hover or open menu, as on Studio Admin infrastructure (user request 2026-10-27). */}
            <TableBody className="**:data-[slot=table-row]:has-aria-expanded:bg-transparent">
              {shownRows.map(
                ({ template: tpl, isChild, hasChildren }) => {
                  const sent = tpl.recipients > 0;
                  return (
                    <TableRow
                      key={tpl.id}
                      className={cn("group/row", hasChildren && "border-b-0")}
                    >
                      <TableCell className="pl-4">
                        <TemplateName
                          template={tpl}
                          isChild={isChild}
                          truncate
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            tpl.status === "active"
                              ? "template-active"
                              : "template-inactive"
                          }
                        />
                      </TableCell>
                      {sent ? (
                        <>
                          <DeliveredCell template={tpl} />
                          <RateCell kind="open" part={tpl.opens} whole={tpl.delivered} />
                          <RateCell kind="click" part={tpl.clicks} whole={tpl.delivered} />
                          <RateCell kind="bounce" part={tpl.bounces} whole={tpl.recipients} />
                        </>
                      ) : (
                        <TableCell
                          colSpan={4}
                          className="text-muted-foreground"
                        >
                          No sends yet
                        </TableCell>
                      )}
                      <TableCell
                        className="pl-6 text-muted-foreground"
                        title={
                          tpl.lastSent
                            ? formatDateTime(tpl.lastSent)
                            : undefined
                        }
                      >
                        {tpl.lastSent ? formatDate(tpl.lastSent) : null}
                      </TableCell>
                      <TableCell className="pr-4">
                        <TemplateActions
                          template={tpl}
                          campaigns={campaigns}
                          sendingBlocked={sendingBlocked}
                          onToast={onToast}
                          onToggleStatus={onToggleStatus}
                          onCopy={onCopy}
                          onRequestDelete={onRequestDeleteTemplate}
                        />
                      </TableCell>
                    </TableRow>
                  );
                },
              )}
            </TableBody>
          </Table>
        )}
        {c.templates.length > 0 && limited && (
          <div className="border-t px-2 py-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowAll(true)}>
              Show all {c.templates.length} templates
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Everything about the campaign that isn't its name, in a hover card on the ⓘ next to it (hover or keyboard focus).
function CampaignInfo({ campaign: c }: { campaign: Campaign }) {
  const t = totals(c);
  const open = rate(t.opens, t.delivered);
  const click = rate(t.clicks, t.delivered);
  const bounce = rate(t.bounces, t.recipients);
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`About ${c.name}`}
          className="text-muted-foreground"
        >
          <InfoIcon />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="flex w-80 flex-col gap-3">
        {c.description && (
          <p className="text-sm text-muted-foreground">{c.description}</p>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm tabular-nums">
          <dt className="text-muted-foreground">Countries</dt>
          <dd>{c.countries.join(", ") || "All countries"}</dd>
          <dt className="text-muted-foreground">Industries</dt>
          <dd>{c.industries.join(", ") || "Any industry"}</dd>
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
      </HoverCardContent>
    </HoverCard>
  );
}

function period(c: Campaign) {
  if (!c.startsOn && !c.endsOn) return "No end date";
  return `${c.startsOn ? formatDate(c.startsOn) : "…"} → ${c.endsOn ? formatDate(c.endsOn) : "no end"}`;
}
