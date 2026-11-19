import type { ComponentMeta } from "@/components/meta";

export const statusBadgeMeta: ComponentMeta = {
  name: "StatusBadge",
  category: "molecule",
  description: "Status of a campaign, template or batch: a static dot plus a word. Built on Badge.",
  variants: {
    "not-started | active | ended | archived": "Campaign, derived from its period (starts_on / ends_on) or archived. Campaigns have no send status.",
    "template-active | template-inactive": "Template; only active templates can send.",
    "draft | scheduled | sending | sent | paused | failed": "Batch (one send run), status-* tokens (DESIGN.md §4.2). Auto-pause from bounces is paused with label='Auto-paused'.",
    "schedule-running | schedule-waiting | schedule-paused | schedule-completed":
      "Schedule card (Automate › Schedule, designer 2026-11-17): success / warning / paused / neutral tones.",
    "recipient-queued | recipient-delivered | recipient-opened | recipient-clicked | recipient-bounced | recipient-unsubscribed | recipient-complained":
      "One recipient of a batch (report › Recipients, a badge on every row, designer 2026-11-18). Queued/Delivered neutral; held by an auto-pause: recipient-queued with label='Waiting'.",
    label: "Overrides the word only; the colour still follows status.",
  },
  relationships: {
    usedIn: ["Campaign list", "Template table (always has a Status column)", "Batch lists and report header", "Schedule cards", "Agent approval queue", "Batch report › Recipients (every row)"],
    preferInstead: {
      "any other tag or tone": "Badge",
    },
  },
  tokens: ["--status-draft", "--status-scheduled", "--status-sending", "--status-sent", "--status-paused", "--status-failed", "--success-soft", "--info-soft", "--muted"],
  aiHints: [
    "Never re-implement a status pill inside a screen; import this one.",
    "Use statusLabel(status) when you need the word without the pill (e.g. a filter menu).",
    "Show a status only when it differs from normal, except the template table and the batch report's Recipients (DESIGN.md §2 Bảng).",
  ],
  invalid: [
    "Animated / blinking dot.",
    "Mixing campaign and batch status families on the same object.",
  ],
};
