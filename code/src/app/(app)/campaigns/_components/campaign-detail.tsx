"use client";

import {
  ArchiveIcon,
  BarChart3Icon,
  CalendarIcon,
  FactoryIcon,
  FileTextIcon,
  GlobeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { KpiStrip, KpiStripItem } from "@/components/saella/kpi-strip";
import { rateKpi } from "@/components/saella/rate-meter";
import { StatusBadge } from "@/components/saella/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { type Campaign, campaignStatus, formatDate, totals } from "@/lib/mock/campaigns";
import { TemplateTable, type TemplateTableProps } from "@/components/features/template-table";

// Detail pane of the master–detail Campaigns screen. The live app has no campaign page: clicking a campaign
// jumps to Metrics filtered by it. Here the campaign gets its own pane: targeting, the totals the live app
// computes but never shows (joined KPI strip, learned from Studio Admin analytics), then its templates.
export function CampaignDetail({
  campaign,
  onEdit,
  onAddTemplate,
  onArchive,
  onDeleteCampaign,
  onViewReport,
  ...templateProps
}: {
  campaign: Campaign;
  onEdit: () => void;
  onAddTemplate: () => void;
  onArchive: () => void;
  onDeleteCampaign: () => void;
  onViewReport: () => void;
} & Omit<TemplateTableProps, "campaign" | "onAddTemplate">) {
  const c = campaign;
  const status = campaignStatus(c);
  const t = totals(c);
  const sent = t.recipients > 0;

  return (
    <section aria-labelledby="campaign-title" className="flex min-w-0 flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="campaign-title" className="text-xl font-semibold tracking-title">
              {c.name}
            </h2>
            <StatusBadge status={status} />
          </div>
          {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <Meta icon={GlobeIcon} label="Countries">
              {c.countries.join(", ") || "All countries"}
            </Meta>
            <Meta icon={FactoryIcon} label="Industries">
              {c.industries.join(", ") || "Any industry"}
            </Meta>
            <Meta icon={CalendarIcon} label="Period">
              {period(c)}
            </Meta>
          </dl>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onViewReport} disabled={!sent}>
            <BarChart3Icon data-icon="inline-start" />
            View report
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={onEdit}>
                  <PencilIcon />
                  Edit campaign
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onArchive}>
                  <ArchiveIcon />
                  Archive
                </DropdownMenuItem>
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
      </header>

      {/* Campaign totals, the shared KpiStrip + rateKpi (2026-11-05: same pattern and wording as Overview and the batch
          report). Rates follow the live app: open/click over delivered, delivery and bounce over recipients. */}
      <KpiStrip>
        <KpiStripItem
          label="Recipients"
          value={sent ? n(t.recipients) : undefined}
          note={t.lastSent ? `Last sent ${formatDate(t.lastSent)}` : "No sends yet"}
        />
        <KpiStripItem label="Delivery rate" {...rateKpi("delivery", t.delivered, t.recipients)} />
        <KpiStripItem label="Open rate" {...rateKpi("open", t.opens, t.delivered)} />
        <KpiStripItem label="Click rate" {...rateKpi("click", t.clicks, t.delivered)} />
        <KpiStripItem label="Bounce rate" {...rateKpi("bounce", t.bounces, t.recipients)} />
      </KpiStrip>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold">
            Templates <span className="font-normal text-muted-foreground tabular-nums">{c.templates.length}</span>
          </h3>
          {c.templates.length > 0 && (
            <Button variant="outline" size="sm" onClick={onAddTemplate}>
              <PlusIcon data-icon="inline-start" />
              Add template
            </Button>
          )}
        </div>
        {c.templates.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileTextIcon />
              </EmptyMedia>
              <EmptyTitle>No templates in this campaign</EmptyTitle>
              <EmptyDescription>Add a template to start sending to {c.countries.join(", ") || "your contacts"}.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={onAddTemplate}>
                <PlusIcon data-icon="inline-start" />
                Add template
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <TemplateTable campaign={c} onAddTemplate={onAddTemplate} {...templateProps} />
        )}
      </div>
    </section>
  );
}

function period(c: Campaign) {
  if (!c.startsOn && !c.endsOn) return "No end date";
  return `${c.startsOn ? formatDate(c.startsOn, true) : "…"} → ${c.endsOn ? formatDate(c.endsOn, true) : "No end date"}`;
}

function Meta({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt>
        <Icon aria-hidden className="size-4" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

const n = (x: number) => x.toLocaleString("en-US");
