import { CircleAlertIcon, CircleCheckIcon, CircleDashedIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";

// Live step list for one agent turn (PRD-03 AC-AG-S-02/S-03): spinner while running,
// tick when done with its duration, error in destructive. Steps with `detail` expand.
export type AgentStep = {
  title: string;
  status: "done" | "running" | "error" | "pending";
  /** Formatted duration for finished steps, e.g. "1.2s". */
  duration?: string;
  detail?: React.ReactNode;
};

function StepIcon({ status }: { status: AgentStep["status"] }) {
  if (status === "running") return <Spinner />;
  if (status === "error") return <CircleAlertIcon />;
  if (status === "pending") return <CircleDashedIcon />;
  return <CircleCheckIcon className="text-success" />;
}

function StepLine({ step }: { step: AgentStep }) {
  return (
    <TraceLine status={step.status === "done" ? undefined : step.status}>
      <TraceIcon>
        <StepIcon status={step.status} />
      </TraceIcon>
      <TraceTitle>{step.title}</TraceTitle>
      {step.duration && <TraceDescription>{step.duration}</TraceDescription>}
    </TraceLine>
  );
}

export function AgentSteps({ steps, label = "Agent steps" }: { steps: AgentStep[]; label?: string }) {
  return (
    <Trace aria-label={label}>
      {steps.map((step) =>
        step.detail ? (
          <TraceCollapsible key={step.title}>
            <TraceCollapsibleTrigger>
              <StepLine step={step} />
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent>{step.detail}</TraceCollapsibleContent>
          </TraceCollapsible>
        ) : (
          <div key={step.title}>
            <StepLine step={step} />
          </div>
        )
      )}
    </Trace>
  );
}
