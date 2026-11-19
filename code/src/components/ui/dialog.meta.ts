import type { ComponentMeta } from "@/components/meta";

export const dialogMeta: ComponentMeta = {
  name: "Dialog",
  category: "atom",
  description:
    "Modal for a short task with a clear end: create or edit a few fields, import with a preview, pick a template, share, automate, export, top up (PATTERNS.md §9.9). Parts: DialogHeader, DialogTitle, DialogDescription, DialogFooter (sticky; the body scrolls on short screens, §9.10).",
  variants: {
    "showCloseButton (default true)": "The × in the corner. Turn it off while a job runs (import saving) so it can't be closed mid-way.",
    "className=sm:max-w-*": "Width only: default 384px, md for a form, 3xl–4xl for a table preview. Height is already capped at 100dvh − 2rem.",
    DialogFooter: "Cancel (outline) then the main action, right-aligned. 3+ buttons: Cancel alone on the left (sm:mr-auto), actions right, strongest last (PATTERNS.md §9.10).",
    "DialogDescription className=sr-only": "The trigger already gives the context (e.g. a template's follow-up): keep the accessible description, drop the visible line.",
  },
  relationships: {
    usedIn: ["ImportDialog", "TopUpDialog", "AutomateDialog / ScheduleDialog", "FollowUpDialog", "New campaign / New template", "Export (Leads › Unlocked)", "Write with Saella"],
    preferInstead: {
      "confirm before something hard to undo, or a credit spend": "AlertDialog",
      "quick look at one row without leaving the list": "Sheet (company, contact)",
      "an object with several parts, tabs or a shareable link; a long flow": "its own page (PATTERNS.md §9.9)",
      "a small choice tied to one button": "Popover / DropdownMenu",
      "leaving a page with unsaved work": "UnsavedDialog",
    },
  },
  tokens: ["--popover", "--popover-foreground", "--deep", "--border", "--muted", "--muted-foreground", "--radius-card", "--shadow-float"],
  aiHints: [
    "Focus on open: a form focuses its first field (mark it data-first-field, focus it in onOpenAutoFocus: follow-up-dialog.tsx). Nothing to type: preventDefault and focus the content (tabIndex={-1}) so no button shows a ring and no Hint opens by itself.",
    "Opened from anything but a DialogTrigger (menu item, a button elsewhere): spread useFocusReturn() (lib/use-focus-return.ts) on DialogContent so focus returns to what opened it.",
    "Esc and the backdrop close it like Cancel (PATTERNS.md §9.10), so closing never changes data. While a job runs, block both (onEscapeKeyDown / onInteractOutside → preventDefault) and hide the × (import-dialog.tsx, §9.14).",
    "One dialog at a time: hand over by hiding the first and keeping its state, as UnlockDialog does with TopUpDialog. 'No dialog over dialog' is still ĐX (decisions.md 'Chưa chốt'); for more steps use a Stepper inside the same dialog or a page.",
    "Title says what the dialog does ('Top up credits', 'New follow-up'); description one line or none, never the title again (PATTERNS.md §9.15).",
  ],
  invalid: [
    "A Dialog for a delete / archive confirmation: use AlertDialog.",
    "A Dialog opened on top of another visible Dialog.",
    "First focus landing on a button wrapped in Hint, so its tooltip pops open with the dialog.",
    "A focus ring on a footer button nobody picked.",
    "Closing (Esc, backdrop, ×) that saves, sends or discards anything.",
    "Two solid buttons in the footer, or an AI action (sparkle) in solid default instead of variant=ai.",
    "A hand-built overlay, footer or max-height.",
  ],
};
