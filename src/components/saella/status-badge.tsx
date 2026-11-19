import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Status badges, always a dot + a word, never color alone. Three families (per PRD-02 and the live app):
// - campaign: derived from the campaign period (starts_on / ends_on) or archived. Campaigns have no send status.
// - template: active / inactive (only active templates can send).
// - batch: one send run. Uses the status-* tokens.
// - schedule: running / waiting for credits / paused / completed, on the schedule cards.
// - recipient: one recipient of a batch, on every row of the report's Recipients table. Neutral for the plain
//   outcomes (queued, delivered), soft tones for what the user acts on.
export type CampaignStatus = "not-started" | "active" | "ended" | "archived";
export type TemplateStatus = "template-active" | "template-inactive";
export type BatchStatus = "draft" | "scheduled" | "sending" | "sent" | "paused" | "failed";
export type ScheduleCardStatus = "schedule-running" | "schedule-waiting" | "schedule-paused" | "schedule-completed";
export type RecipientStatus =
  | "recipient-queued"
  | "recipient-delivered"
  | "recipient-opened"
  | "recipient-clicked"
  | "recipient-bounced"
  | "recipient-unsubscribed"
  | "recipient-complained";
export type Status = CampaignStatus | TemplateStatus | BatchStatus | ScheduleCardStatus | RecipientStatus;

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
  "schedule-running": { label: "Running", className: "bg-success-soft text-success-soft-foreground" },
  "schedule-waiting": { label: "Waiting for credits", className: "bg-warning-soft text-warning-soft-foreground" },
  "schedule-paused": { label: "Paused", className: "bg-status-paused text-status-paused-foreground" },
  "schedule-completed": { label: "Completed", className: "bg-muted text-muted-foreground" },
  "recipient-queued": { label: "Queued", className: "bg-muted text-muted-foreground" },
  "recipient-delivered": { label: "Delivered", className: "bg-muted text-muted-foreground" },
  "recipient-opened": { label: "Opened", className: "bg-info-soft text-info-soft-foreground" },
  "recipient-clicked": { label: "Clicked", className: "bg-success-soft text-success-soft-foreground" },
  "recipient-bounced": { label: "Bounced", className: "bg-destructive-soft text-destructive-soft-foreground" },
  "recipient-unsubscribed": { label: "Unsubscribed", className: "bg-warning-soft text-warning-soft-foreground" },
  "recipient-complained": { label: "Marked as spam", className: "bg-destructive-soft text-destructive-soft-foreground" },
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
      {/* Static dot: no infinite animation on controls; the brand colour already marks Sending as live. */}
      <span aria-hidden data-dot className="size-1.5 rounded-full bg-current" />
      {label ?? style.label}
    </Badge>
  );
}
