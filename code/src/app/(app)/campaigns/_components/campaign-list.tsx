"use client";

import { StatusBadge } from "@/components/saella/status-badge";
import { cn } from "@/lib/utils";
import { type Campaign, campaignStatus, rate, totals } from "@/lib/mock/campaigns";
import { Hint } from "@/components/saella/hint";

// Master list of the master–detail Campaigns screen (pattern learned from Studio Admin mail/logistics,
// 2026-10-27). Name on the first line; status (only when not Active), template count and open rate on the second.
// The selected item carries the brand accent on its left edge.
export function CampaignList({
  campaigns,
  selectedId,
  onSelect,
}: {
  campaigns: Campaign[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Campaigns" className="min-h-0 overflow-y-auto">
      <ul className="flex flex-col divide-y">
        {campaigns.map((c) => {
          const status = campaignStatus(c);
          const t = totals(c);
          const open = rate(t.opens, t.delivered);
          const selected = c.id === selectedId;
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(c.id)}
                className={cn(
                  "relative flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                  "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand before:opacity-0",
                  "aria-[current=true]:bg-primary-subtle aria-[current=true]:before:opacity-100"
                )}
              >
                <span className="truncate font-medium">{c.name}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {status !== "active" && <StatusBadge status={status} />}
                  <span className="truncate">
                    {c.templates.length === 0
                      ? "No templates"
                      : `${c.templates.length} ${c.templates.length === 1 ? "template" : "templates"}`}
                  </span>
                  {open && (
                    <Hint label={open.lowSample ? "Fewer than 20 sends: too few to judge" : "Open rate"}>
                      <span className={cn("ml-auto shrink-0 tabular-nums", open.lowSample ? "text-subtle-foreground" : "text-foreground")}>
                        {open.text} <span className="text-muted-foreground">open</span>
                      </span>
                    </Hint>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
