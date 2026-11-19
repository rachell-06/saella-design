"use client";

import { useId, useState } from "react";
import { CheckIcon, ShieldCheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// Approval for the agent's gated writes (PRD-03 AC-AG-G-01): create campaign, create template, edit template,
// activate template, send. Controls follow AC-AG-G-04: Approve, "Always allow this step", No. A live send also needs
// an explicit confirmation (AC-AG-G-06): pass `confirmLabel`.
// A step that costs credits says so before it runs (`cost`, PATTERNS 9.18): "Costs 1 credit ($0.09)" beside the buttons.
export type ApprovalState = "pending" | "running" | "approved" | "declined";

export type ApprovalDetail = { label: string; value: React.ReactNode };

export function ApprovalCard({
  action,
  details,
  note,
  confirmLabel,
  state = "pending",
  result,
  cost,
  onApprove,
  onAlwaysAllow,
  onDecline,
  className,
}: {
  /** What the agent wants to do, e.g. "Create campaign". */
  action: string;
  details: ApprovalDetail[];
  /** One line on consequences, e.g. "Nothing is sent until you approve." */
  note?: string;
  /** Required for a live send: Approve stays disabled until this is ticked. */
  confirmLabel?: string;
  state?: ApprovalState;
  /** Shown once approved, e.g. "Campaign created as a draft." */
  result?: string;
  /** What approving costs, e.g. "Costs 1 credit ($0.09)". Omit for a free step. */
  cost?: string;
  onApprove?: () => void;
  onAlwaysAllow?: () => void;
  onDecline?: () => void;
  className?: string;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const confirmId = useId();

  // After a decision the card collapses to one line, so the transcript stays readable.
  if (state === "approved" || state === "declined") {
    const approved = state === "approved";
    return (
      <div
        data-state={state}
        className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
      >
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full",
            approved ? "bg-success-soft text-success-soft-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {approved ? <CheckIcon className="size-3.5" /> : <XIcon className="size-3.5" />}
        </span>
        <span>
          <span className="font-medium text-foreground">{action}</span>
          {" · "}
          {approved ? (result ?? "Approved") : "You said no. Nothing was changed."}
        </span>
      </div>
    );
  }

  const running = state === "running";
  const blocked = Boolean(confirmLabel) && !confirmed;

  return (
    <div
      data-state={state}
      role="group"
      aria-label={`Approval needed: ${action}`}
      className={cn("overflow-hidden rounded-card border bg-card text-card-foreground", className)}
    >
      <div className="flex items-center gap-2 bg-primary-soft px-3 py-2 text-sm font-medium text-primary-soft-foreground">
        <ShieldCheckIcon className="size-4" aria-hidden />
        Needs your approval
      </div>
      <div className="flex flex-col gap-3 p-3">
        <p className="font-heading text-base font-medium">{action}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {details.map((d) => (
            <div key={d.label} className="contents">
              <dt className="text-muted-foreground">{d.label}</dt>
              <dd className="min-w-0 wrap-break-word">{d.value}</dd>
            </div>
          ))}
        </dl>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
        {confirmLabel && (
          <Field orientation="horizontal" data-disabled={running || undefined}>
            <Checkbox
              id={confirmId}
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              disabled={running}
            />
            <FieldLabel htmlFor={confirmId} className="font-normal">
              {confirmLabel}
            </FieldLabel>
          </Field>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/50 p-3">
        <Button onClick={onApprove} disabled={running || blocked}>
          {running && <Spinner data-icon="inline-start" />}
          {running ? "Working" : "Approve"}
        </Button>
        <Button variant="outline" onClick={onAlwaysAllow} disabled={running || blocked}>
          Always allow this step
        </Button>
        <Button variant="ghost" onClick={onDecline} disabled={running}>
          No
        </Button>
        {cost && <span className="ml-auto text-sm text-muted-foreground tabular-nums">{cost}</span>}
      </div>
    </div>
  );
}
