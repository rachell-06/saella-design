import type { ComponentMeta } from "@/components/meta";

export const alertDialogMeta: ComponentMeta = {
  name: "AlertDialog",
  category: "atom",
  description:
    "Asks once before something hard to undo or that spends credits: delete, remove, disable a member, transfer admin, unlock, leave unsaved work. The title is the question with its consequence, never just 'Are you sure?' (PATTERNS.md §9.10).",
  variants: {
    "AlertDialogAction variant=destructive": "Confirm that deletes, removes or cancels a send. Soft red fill.",
    "AlertDialogAction variant=default": "Confirm that spends credits or goes ahead (Unlock for 5 credits, Top up credits): not destructive, so it is the dialog's one solid button (PATTERNS.md §9.18).",
    AlertDialogCancel: "Outline, left of the confirm: 'Cancel', or 'Keep it' when the question reads better that way.",
    "size=sm": "Narrow, two equal buttons in a grid; very short confirms only.",
    "destructive apart (UnsavedDialog)": "Three choices where one loses work: [Discard] alone on the left (ghost, destructive-soft-foreground text, sm:mr-auto), [Keep editing] [Save] together on the right, Save solid.",
  },
  relationships: {
    usedIn: ["Delete flows (contact, template, schedule, flow, campaign)", "UnlockDialog", "UnsavedDialog", "Settings › Organization (disable, transfer admin, approve join)", "Settings › Domain (remove)"],
    preferInstead: {
      "a form or several fields": "Dialog",
      "the result afterwards ('Deleted')": "toast (PATTERNS.md §9.10)",
      "leaving a page with unsaved work": "UnsavedDialog + useLeaveGuard (built on this)",
    },
  },
  tokens: ["--popover", "--popover-foreground", "--deep", "--border", "--muted", "--muted-foreground", "--radius-card", "--shadow-float"],
  aiHints: [
    "Backdrop and Esc close it like Cancel (Saella patch in alert-dialog.tsx; Radix blocks the backdrop by default). While the confirm works, ignore closing in onOpenChange (`!o && !saving && …`, UnsavedDialog).",
    "Radix focuses Cancel on open. For no ring on a button nobody picked, preventDefault in onOpenAutoFocus and focus the content (tabIndex={-1}), as UnsavedDialog does.",
    "Say each consequence once: what is lost or charged, what is skipped and why ('17 have no email and aren't unlocked'). Removing a domain lists the affected senders; transferring admin asks to type the name.",
    "The confirm label is verb + object ('Delete template', 'Remove anyway'), never 'OK' or 'Yes'.",
    "Needs a follow-up dialog (a top-up)? Hide this one while the other is up and come back to it (UnlockDialog), don't stack.",
  ],
  invalid: [
    "variant=destructive on a credit spend, or a solid orange confirm on a delete.",
    "A destructive page button that acts without this dialog (button.meta).",
    "'Are you sure?' with no consequence.",
    "Discard placed between the safe buttons, or as the solid one.",
    "A second dialog visible on top of this one.",
  ],
};
