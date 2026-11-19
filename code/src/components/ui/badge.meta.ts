import type { ComponentMeta } from "@/components/meta";

export const badgeMeta: ComponentMeta = {
  name: "Badge",
  category: "atom",
  description: "Small pill label (12px, weight 500, DESIGN.md §8.1) for a tag, count or tone. Not for statuses: those use StatusBadge.",
  variants: {
    secondary: "Neutral tag or count, e.g. contact tags, 'Default' sender.",
    brand: "Saella-specific marker, e.g. 'Agent', 'New'.",
    success: "Positive fact that is not a status, e.g. 'Verified'.",
    warning: "Needs attention soon, e.g. 'Expiring'.",
    info: "Neutral notice, e.g. 'Beta'.",
    destructive: "Problem the user must fix, e.g. 'DNS error'.",
    outline: "Low-emphasis label on a busy surface.",
    default: "Solid orange. Avoid: competes with the page's one primary button.",
  },
  relationships: {
    usedIn: ["DataTable cells", "Sheet headers", "Settings rows"],
    preferInstead: {
      "campaign / template / batch status": "StatusBadge (components/saella/status-badge)",
      "email rate (Open, Bounce…)": "RateCell / RateValue (components/saella/rate-meter) — rates are plain numbers, never badges",
    },
  },
  tokens: ["--muted", "--muted-foreground", "--primary-soft", "--primary-soft-foreground", "--success-soft", "--warning-soft", "--info-soft", "--destructive-soft"],
  aiHints: [
    "Tone must also be readable from the word: never rely on colour alone (DESIGN.md §2 Không nên).",
    "One column shows one kind of display: don't mix badges and plain text in the same column (DESIGN.md §2 Bảng).",
    "Only show a label when the value differs from normal; don't badge every row with 'OK'.",
  ],
  invalid: [
    "Badge used for campaign/template/batch status instead of StatusBadge.",
    "Badge with a hand-picked colour via className.",
  ],
};
