import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Horizontal stepper for multi-step forms (PATTERNS.md §9.2, 2026-10-28): number → tick (success) when done, the
// current step in brand. Finished steps are buttons so people can go back; later steps are not clickable until
// the ones before them are done (the form decides via `maxReachable`).
export type StepperStep = { id: string; label: string; /** One short line under the label, e.g. the choice made. */ summary?: string };

export function Stepper({
  steps,
  current,
  maxReachable = current,
  onStepClick,
  className,
}: {
  steps: StepperStep[];
  /** Index of the step on screen. */
  current: number;
  /** Highest index the user may jump to. */
  maxReachable?: number;
  onStepClick?: (index: number) => void;
  className?: string;
}) {
  return (
    <ol aria-label="Steps" className={cn("flex items-start gap-2", className)}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = i <= maxReachable && i !== current;
        const content = (
          <>
            <span
              aria-hidden
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                done && "border-transparent bg-success-soft text-success-soft-foreground",
                active && "border-transparent bg-primary text-primary-foreground",
                !done && !active && "border-input text-muted-foreground"
              )}
            >
              {done ? <CheckIcon className="size-3.5" /> : i + 1}
            </span>
            <span className="flex min-w-0 flex-col text-left">
              <span className={cn("text-sm font-medium", !active && !done && "text-muted-foreground")}>{step.label}</span>
              {step.summary && <span className="truncate text-sm text-muted-foreground">{step.summary}</span>}
            </span>
          </>
        );
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-start gap-2" aria-current={active ? "step" : undefined}>
            {reachable && onStepClick ? (
              <button
                type="button"
                onClick={() => onStepClick(i)}
                className="-m-1 flex min-w-0 items-start gap-2 rounded-md p-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {content}
              </button>
            ) : (
              <div className="flex min-w-0 items-start gap-2">{content}</div>
            )}
            {i < steps.length - 1 && <span aria-hidden className="mt-3 h-px min-w-4 flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
