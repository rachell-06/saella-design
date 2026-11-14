import type { ComponentMeta } from "@/components/meta";

export const statusBadgeMeta: ComponentMeta = {
  name: "StatusBadge",
  category: "molecule",
  description: "Status of a campaign, template or batch: a static dot plus a word. Built on Badge.",
  variants: {
    "not-started | active | ended | archived": "Campaign, derived from its period (starts_on / ends_on) or archived. Campaigns have no send status.",
    "template-active | template-inactive": "Template; only active templates can send.",
    "draft | scheduled | sending | sent | paused | failed": "Batch (one send run), status-* tokens. Auto-pause from bounces is paused with label='Auto-paused'.",
    label: "Overrides the word only; the colour still follows status.",
  },
  relationships: {
    usedIn: ["Campaign list", "Template table (always has a Status column)", "Batch lists and report header", "Agent approval queue"],
    preferInstead: {
      "any other tag or tone": "Badge",
    },
  },
  tokens: ["--status-draft", "--status-scheduled", "--status-sending", "--status-sent", "--status-paused", "--status-failed", "--success-soft", "--info-soft", "--muted"],
  aiHints: [
    "Never re-implement a status pill inside a screen; import this one.",
    "Use statusLabel(status) when you need the word without the pill (e.g. a filter menu).",
    "Show a status only when it differs from normal, except the template table.",
  ],
  invalid: [
    "Animated / blinking dot.",
    "Mixing campaign and batch status families on the same object.",
  ],
};
