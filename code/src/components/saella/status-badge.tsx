import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Status badges, always a dot + a word, never color alone. Three families (2026-10-27, per PRD-02 and the live app):
// - campaign: derived from the campaign period (starts_on / ends_on) or archived. Campaigns have no send status.
// - template: active / inactive (only active templates can send).
// - batch: one send run. Uses the status-* tokens (DESIGN.md §4.2).
export type CampaignStatus = "not-started" | "active" | "ended" | "archived";
export type TemplateStatus = "template-active" | "template-inactive";
export type BatchStatus = "draft" | "scheduled" | "sending" | "sent" | "paused" | "failed";
export type Status = CampaignStatus | TemplateStatus | BatchStatus;

const statusStyles: Record<Status, { label: string; className: string }> = {
  "not-started": { label: "Not started", className: "bg-info-soft text-info-soft-foreground" },
  active: { label: "Active", className: "bg-status-active text-status-active-foreground [&>[data-dot]]:bg-status-active-dot" },
  ended: { label: "Ended", className: "bg-muted text-muted-foreground" },
  archived: { label: "Archived", className: "bg-muted text-subtle-foreground" },
  "template-active": { label: "Active", className: "bg-status-active text-status-active-foreground [&>[data-dot]]:bg-status-active-dot" },
  "template-inactive": { label: "Inactive", className: "bg-muted text-muted-foreground" },
  draft: { label: "Draft", className: "bg-status-draft text-status-draft-foreground" },
  scheduled: { label: "Scheduled", className: "bg-status-scheduled text-status-scheduled-foreground" },
  sending: { label: "Sending", className: "bg-status-sending text-status-sending-foreground" },
  sent: { label: "Sent", className: "bg-status-sent text-status-sent-foreground" },
  paused: { label: "Paused", className: "bg-status-paused text-status-paused-foreground" },
  failed: { label: "Failed", className: "bg-status-failed text-status-failed-foreground" },
};

export function statusLabel(status: Status) {
  return statusStyles[status].label;
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: Status;
  /** Overrides the default word, e.g. "Auto-paused". */
  label?: string;
  className?: string;
}) {
  const style = statusStyles[status];
  return (
    <Badge data-status={status} className={cn("gap-1.5 border-current/20 px-2", style.className, className)}>
      {/* Static dot: no infinite animation on controls (DESIGN.md); the brand colour already marks Sending as live. */}
      <span aria-hidden data-dot className="size-1.5 rounded-full bg-current" />
      {label ?? style.label}
    </Badge>
  );
}
