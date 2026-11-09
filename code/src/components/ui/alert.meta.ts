import type { ComponentMeta } from "@/components/meta";

export const alertMeta: ComponentMeta = {
  name: "Alert",
  category: "atom",
  description: "Message that stays on the page until its cause is gone. Parts: AlertTitle, AlertDescription, AlertAction.",
  variants: {
    default: "Neutral notice on a card surface.",
    info: "Helpful context, e.g. 'Sending is limited while the domain warms up'.",
    success: "Lasting good state, e.g. 'Domain verified'. For a one-off confirmation use a toast.",
    warning: "Something will go wrong if ignored, e.g. bounce rate near the auto-pause limit.",
    destructive: "Something failed or is blocked, e.g. load error with Retry, sending paused.",
  },
  relationships: {
    usedIn: ["Top of a screen under PageHeader", "Wizard steps", "Settings sections", "Dialogs"],
    preferInstead: {
      "short confirmation after an action ('Saved')": "toast (sonner)",
      "nothing to show yet": "Empty (components/ui/empty)",
      "extra explanation": "ⓘ Tooltip (DESIGN.md §2 Nội dung)",
    },
  },
  tokens: ["--card", "--info-soft", "--success-soft", "--warning-soft", "--destructive-soft", "--radius-lg"],
  aiHints: [
    "Start with a lucide icon that matches the tone; the title says what happened, the description says how to fix it.",
    "Put the fix as an AlertAction button (outline or ghost, never a second primary).",
    "Load errors: variant=destructive + 'Retry' (DESIGN.md §9.1).",
    "At most one Alert per area; stack the most severe first.",
  ],
  invalid: [
    "Alert for a transient confirmation (use a toast).",
    "Alert holding methodology / footnote text (DESIGN.md §2 Nội dung).",
  ],
};
