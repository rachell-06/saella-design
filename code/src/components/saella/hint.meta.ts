import type { ComponentMeta } from "@/components/meta";

export const hintMeta: ComponentMeta = {
  name: "Hint / LockedTip",
  category: "molecule",
  description:
    "Hint: a short tooltip on hover or keyboard focus, on the shadcn Tooltip; replaces native title= (PATTERNS.md §9.13). LockedTip (components/saella/locked-tip.tsx): the reason on a disabled control, through a focusable span because a disabled button gets no pointer events (PATTERNS.md §9.12).",
  variants: {
    "Hint label=": "One sentence, ~12 words max. No label renders the child alone, so pass undefined when there is nothing to say.",
    "Hint side=": "Only when the default (top) would cover what the user is reading.",
    "Hint on a non-interactive element": "Give the child tabIndex={0} when the hint carries information the user needs (e.g. the 'Email on file' icon).",
    "LockedTip reason=": "Wrap the disabled control; no reason renders the child alone, so one markup serves both states.",
  },
  relationships: {
    usedIn: ["Icon-only buttons (with aria-label)", "RateValue denominators", "FilterChips '+N'", "Locked Mark active / Schedule / Resend / Set schedule", "Agent turn credits line"],
    preferInstead: {
      "2–3 short lines of help beside a label": "ⓘ popover: max 3 bullets, ~20 words (PATTERNS.md §9.13)",
      "a lasting condition the user must fix": "Alert",
      "text cut with an ellipsis": "title= repeating the full text (the one allowed use)",
    },
  },
  tokens: ["--foreground", "--background"],
  aiHints: [
    "A lock reason names the cause and who or what unlocks it: 'Only the owner (linh@…) can share', 'All 10 seats are used.', 'Mark it active in the editor to automate it.' Name the real cause, not a neighbouring one (PATTERNS.md §9.12).",
    "Disabled, never hidden: lock the control and explain it with LockedTip; only a whole admin-only area may be hidden.",
    "Hint's child must take a ref and props (an element or a component that forwards them).",
    "Keep hinted buttons from being a dialog's or sheet's first focus, or the tooltip opens by itself (dialog.meta).",
  ],
  invalid: [
    "Native title= anywhere but truncated text (lint: saella/no-native-title).",
    "Hint straight on a disabled Button (never opens): use LockedTip.",
    "A tooltip on every number or cell, or one repeating the visible label.",
    "Paragraphs, lists or headings in a tooltip; anything past ~12 words.",
    "A business rule written as text on the page instead of a locked control + reason (PATTERNS.md §9.15).",
    "A local tooltip wrapper or LockedTip copy inside a screen.",
  ],
};
