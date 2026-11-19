import type { ComponentMeta } from "@/components/meta";

export const unlockDialogMeta: ComponentMeta = {
  name: "UnlockDialog / UnlockAsk",
  category: "organism",
  description:
    "The credit dialogs of an unlock (PATTERNS.md §9.18, live app useCompanyUnlock #116): 'confirm' prices several companies before spending; 'short' says the balance doesn't cover it and tops up in place, then comes back as the confirm. Built on AlertDialog; shared by Leads and New batch.",
  variants: {
    "kind='confirm'": "Title 'Unlock N companies?'; description: what is included, how many are free (alreadyUnlocked) or skipped (noEmail); one Cost row 'N credits · $X' (creditsUsd); confirm 'Unlock for N credits' (variant default).",
    "title / confirmLabel": "The step does more than unlock, e.g. New batch Send now: 'Unlock 3 and send to 20 companies?' / 'Unlock and send'.",
    "kind='short'": "'Not enough credits': needs N, you have M. Top up credits opens TopUpDialog with need = cost − balance. Nothing is unlocked (all or nothing).",
    "short + then": "The confirm to return to once a top-up covers the cost. Without it, paying ends the flow (the top-up toast reports it).",
    "ask=null": "Closed.",
  },
  relationships: {
    usedIn: ["Leads › Find companies (SelectionBar 'Unlock · N credits')", "New batch › Recipients (Locked matches, Send now)"],
    preferInstead: {
      "one company": "no dialog: the control carries the price ('Unlock · 1 credit') and runs at once (PATTERNS.md §9.18)",
      "buying credits with nothing waiting": "TopUpDialog alone",
      "the agent spending credits": "ApprovalCard cost",
    },
  },
  tokens: ["--border", "--muted-foreground", "--radius-lg"],
  aiHints: [
    "Price the ask on the screen: cost leaves out already-unlocked and no-email companies. Pass the balance the screen shows so a ?state= preview and the dialog agree.",
    "onConfirm reads the live balance: a top-up may have changed it since the ask was made.",
    "On success spend from the one balance (lib/mock/credits.ts) so the sidebar drops at once; toast 'N companies unlocked · X credits left'.",
    "Nothing left to buy: don't open it; lock the control with LockedTip naming why (PATTERNS.md §9.12).",
  ],
  invalid: [
    "A 'Balance after' row in the confirm (cost only, designer 2026-11-14).",
    "A price in credits without its $ worth, or in 12px (decision info, DESIGN.md §5).",
    "Unlocking the part the balance covers when short.",
    "Sending the user to Settings › Billing to buy, or dropping the ask when Top up opens.",
    "variant=destructive on the confirm: spending credits isn't destructive.",
    "This dialog and TopUpDialog visible at the same time.",
  ],
};
