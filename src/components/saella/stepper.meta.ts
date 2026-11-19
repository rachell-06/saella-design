import type { ComponentMeta } from "@/components/meta";

export const stepperMeta: ComponentMeta = {
  name: "Stepper",
  category: "molecule",
  description:
    "Horizontal steps on top of a multi-step form: number → success tick when done, the current step solid primary. Done steps are buttons to go back; later steps open as the form allows (maxReachable).",
  variants: {
    current: "Index of the step on screen.",
    maxReachable: "Highest step the user may jump to; defaults to current (back only).",
    onStepClick: "Makes reached steps clickable; omit for a read-only progress row.",
    "steps[].summary": "One short line under a done step: the choice made ('Spring catalog', '36 companies'). Truncates.",
  },
  relationships: {
    usedIn: ["New batch (batch-wizard.tsx)", "Social › Post builder", "Sending setup, onboarding"],
    preferInstead: {
      "views of one object the user switches freely": "Tabs",
      "a dialog that needs one more step": "a Stepper inside the same dialog, not a second dialog",
    },
  },
  tokens: ["--primary", "--primary-foreground", "--success-soft", "--success-soft-foreground", "--input", "--border", "--muted-foreground"],
  aiHints: [
    "Footer: Back (outline, left), Continue (default, right). The last step is Review: summary + blocking checks before Send.",
    "Going back keeps what was entered; validate on leaving a field.",
    "Labels are 1–2 words naming the decision ('Recipients', 'Schedule').",
  ],
  invalid: [
    "Steps clickable past maxReachable (skipping validation).",
    "The PageHeader description listing the steps.",
    "A summary that repeats the label or runs past one line.",
    "Labels below 14px: they are clickable.",
    "Used as navigation between views of a finished object (use Tabs).",
  ],
};
