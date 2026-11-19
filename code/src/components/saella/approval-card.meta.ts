import type { ComponentMeta } from "@/components/meta";

export const approvalCardMeta: ComponentMeta = {
  name: "ApprovalCard",
  category: "organism",
  description:
    "In-chat card for an agent step that needs a yes before it runs: create campaign or template, edit or activate a template, send (PRD-03 AC-AG-G-01..06, PATTERNS.md §9.4). Approve / Always allow this step / No; collapses to one line after a decision.",
  variants: {
    "state=pending": "'Needs your approval' strip (primary-soft), the action, label/value details, one consequence line, the buttons.",
    "state=running": "Approve shows a spinner + 'Working'; everything disabled.",
    "state=approved | declined": "One line: tick + result ('Campaign created as a draft · 1 credit used') or 'You said no. Nothing was changed.'",
    "confirmLabel=": "Live send: a tick naming the exact recipient count; Approve and Always allow stay disabled until ticked (AC-AG-G-06).",
    "cost=": "Billable step: 'Costs 1 credit ($0.09)' beside the buttons before it runs (PATTERNS.md §9.18). Omit for a free step.",
    "note=": "One consequence line, e.g. 'Nothing is sent until you approve.'",
  },
  relationships: {
    usedIn: ["Agent chat (components/features/agent-chat/message-view.tsx)"],
    preferInstead: {
      "a step that ran under Always allow": "the collapsed line + 'Ran without asking · Ask me again' under it",
      "the agent's running tool calls": "AgentSteps",
      "a confirm on a normal screen": "AlertDialog",
    },
  },
  tokens: ["--card", "--card-foreground", "--border", "--primary-soft", "--primary-soft-foreground", "--success-soft", "--success-soft-foreground", "--muted", "--muted-foreground", "--radius-card"],
  aiHints: [
    "Credits are spent on Approve, not when the card appears: price it with cost, then add '· 1 credit used' to the collapsed result.",
    "Sends of 100+ recipients: add the 'first 20 / all N' choice as a detail row and key the card on it, so the tick must be given again for the new number.",
    "Details are what the user decides on (campaign, template, recipients); no IDs, prompts or JSON (PATTERNS.md §9.15).",
    "Short on credits: the step doesn't run; the panel shows 'Not enough credits…' + Top up credits; after paying, Approve again on the same card.",
  ],
  invalid: [
    "A live send without the confirm tick, or a tick that doesn't name the recipient count.",
    "Charging before Approve, or a billable step without its cost.",
    "The full card left open after a decision.",
    "The cost said twice on the card.",
    "Approval chips in the composer (removed 2026-11-12) or 'assistant' in any label.",
  ],
};
