import type { ComponentMeta } from "@/components/meta";

export const topUpDialogMeta: ComponentMeta = {
  name: "TopUpDialog",
  category: "organism",
  description:
    "The one way to buy credits, opened where they ran short: a pack (PRD-05 500 / 1,000 / 2,000 / 5,000 at the plan's price) × quantity up to 10, paid through Stripe, then back to what the user was doing.",
  variants: {
    "no need / runCosts": "Plain top-up (sidebar credits block, Settings › Billing): the second pack is preselected.",
    "need=": "Credits short for one action (unlock, export): 'Balance M · you need N more', the smallest covering pack preselected, quantity raised when even the biggest pack is short, 'Still N short' until it covers.",
    "runCosts=": "A schedule waiting for credits (Buy credits on its card): each pack says how many runs it covers; 'Enough for the whole schedule' link.",
    "balance=": "The balance the asking screen showed (a ?state= preview), so the numbers match.",
    "onPaid(credits)": "Runs before closing: the caller resumes (UnlockDialog shows its confirm again; Export keeps its row count).",
  },
  relationships: {
    usedIn: ["UnlockDialog (short)", "Export (Leads › Unlocked)", "Automation schedule card (Buy credits)", "Sidebar credits block", "Settings › Billing", "Agent panel 'Not enough credits'"],
    preferInstead: {
      "changing plan, the Stripe portal, credit history": "Settings › Billing (plan changes admin only)",
    },
  },
  tokens: ["--border", "--primary", "--primary-subtle", "--muted-foreground", "--radius-lg"],
  aiHints: [
    "Any signed-in member can buy (PRD-05 BILL-SEQ-003): never lock it by role.",
    "Prices come from usePlanTier / packsForTier / creditsUsd (lib/mock/pricing.ts), Billing's source; never hard-code one.",
    "Open it in place of the short dialog (hide that one, keep its state); Cancel goes back to 'Not enough credits'.",
    "Focus already returns to the opener (useFocusReturn), even from a menu item.",
    "'Credits never expire' and Stripe are said once, in the dialog; the toast only says how many were added.",
  ],
  invalid: [
    "A second buying UI (slider, pack picker) on Billing or elsewhere (one dialog, designer 2026-11-18).",
    "Navigating to Billing to buy and back.",
    "Pack prices or 'you need N more' in 12px.",
    "A Pay button that doesn't state the amount.",
    "A total box repeating the one selected pack's price (only for quantity > 1 or while still short).",
  ],
};
