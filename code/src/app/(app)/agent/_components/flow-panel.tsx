"use client";

import { CircleCheckIcon, CircleDashedIcon, CircleDotIcon, CircleSlashIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FLOW_STEPS, type FlowStep } from "./data";

// Live panel of the full agent page (PRD-03 AC-AG-C-05): the campaign flow for this conversation, the same five
// steps as the live app's flow map (components/email/AgentFlowMap.tsx), with where each one stands and a personal
// "Always allow" switch per gated step (AC-AG-P-01 grant, P-02 revoke, P-03 personal). Under it, the last turn's
// usage (AC-AG-S-03). A waiting step links to the approval queue (R17), where the same approval can be decided.
export type StepState = "done" | "waiting" | "declined" | "idle";

export function FlowPanel({
  states,
  gates,
  alwaysAllowed,
  onToggle,
  lastTurn,
  onReview,
}: {
  states: Record<FlowStep, StepState>;
  gates: FlowStep[];
  alwaysAllowed: FlowStep[];
  onToggle: (step: FlowStep, on: boolean) => void;
  lastTurn?: string;
  onReview?: (step: FlowStep) => void;
}) {
  return (
    <aside aria-label="Campaign flow" className="flex min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center border-b px-4">
        <h2 className="text-sm font-medium text-muted-foreground">Campaign flow</h2>
        {/* Secondary detail behind ⓘ, not a footnote (DESIGN.md §2). */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label="About Always allow" className="ml-1 text-muted-foreground">
              <InfoIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-72">
            Always allow is just for you. Sends still check recipient caps, duplicates and unsubscribes.
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <ol className="flex flex-col gap-4">
          {FLOW_STEPS.map(({ step, label }) => {
            const s = states[step];
            const gated = gates.includes(step);
            const id = `flow-${step}`;
            return (
              <li key={step} className="flex gap-3">
                <StateIcon state={s} />
                <Field orientation="horizontal" className="flex-1 items-start gap-3">
                  <FieldContent>
                    <FieldLabel htmlFor={gated ? id : undefined} className={cn("font-medium", s === "waiting" && "text-foreground")}>
                      {label}
                    </FieldLabel>
                    <FieldDescription className="text-sm text-muted-foreground">
                      {s === "waiting" ? (
                        <>
                          Waiting for your approval
                          {onReview && (
                            <>
                              {" · "}
                              <Button variant="link" className="h-auto border-0 p-0 align-baseline" onClick={() => onReview(step)}>
                                Review
                              </Button>
                            </>
                          )}
                        </>
                      ) : !gated ? (
                        "Runs without asking"
                      ) : alwaysAllowed.includes(step) ? (
                        "Always allowed"
                      ) : (
                        "Asks every time"
                      )}
                    </FieldDescription>
                  </FieldContent>
                  {gated && (
                    <Switch
                      id={id}
                      aria-label={`Always allow ${label.toLowerCase()}`}
                      checked={alwaysAllowed.includes(step)}
                      onCheckedChange={(on) => onToggle(step, on)}
                    />
                  )}
                </Field>
              </li>
            );
          })}
        </ol>
        {lastTurn && (
          <div className="mt-auto flex flex-col gap-0.5 border-t pt-3">
            <span className="text-xs text-muted-foreground">Last turn</span>
            <span className="text-sm tabular-nums">{lastTurn}</span>
          </div>
        )}
      </div>
    </aside>
  );
}

function StateIcon({ state }: { state: StepState }) {
  const cls = "mt-0.5 size-4 shrink-0";
  if (state === "done") return <CircleCheckIcon className={cn(cls, "text-success")} aria-label="Done" />;
  if (state === "waiting") return <CircleDotIcon className={cn(cls, "text-brand")} aria-label="Waiting" />;
  if (state === "declined") return <CircleSlashIcon className={cn(cls, "text-muted-foreground")} aria-label="Declined" />;
  return <CircleDashedIcon className={cn(cls, "text-subtle-foreground")} aria-label="Not started" />;
}
