import type { ComponentMeta } from "@/components/meta";

export const selectMeta: ComponentMeta = {
  name: "Select",
  category: "atom",
  description:
    "One value from a closed list of 4+ options. The only single-pick dropdown: a raw <select> is banned. Selected item has a brand check; the list floats with shadow-card.",
  variants: {
    "SelectTrigger size=default": "h-8: forms and filter popovers.",
    "SelectTrigger size=sm": "h-7: table footers (Rows per page), card headers, dense toolbars.",
    "SelectContent position=item-aligned (default)": "Form fields.",
    "SelectContent position=popper": "Inside a Popover or filter (FilterSelect): the list opens under the trigger.",
    "SelectLabel / SelectSeparator": "Group heads; set an 'All' / 'Any …' item apart from the options.",
  },
  relationships: {
    usedIn: ["FilterSelect", "TableFrame / DataTable Rows per page", "Forms (sender, campaign, country)"],
    preferInstead: {
      "2–3 options, pick one": "RadioGroup (FilterRadioList in filters): every option visible",
      "2–3 options that switch a view or scope at once": "ToggleGroup chips or TabsList variant=default",
      "options that each carry a price or a line of explanation": "RadioGroup of bordered rows (TopUpDialog packs)",
      "several values": "MultiSelect / FilterMultiSelect",
      "a date or time": "DatePicker / TimePicker",
    },
  },
  tokens: ["--input", "--ring", "--subtle-foreground", "--muted-foreground", "--popover", "--accent", "--brand", "--border", "--shadow-card", "--radius-lg"],
  aiHints: [
    "Always a visible Label (Field / FilterField) or aria-labelledby; the placeholder is not a label.",
    "No value yet reads 'Any …' / 'Select …' in subtle-foreground.",
    "In filters, show '(n)' after each option when the count is known.",
    "w-full in forms and popovers; a fixed narrow width only for short numeric choices (Rows per page w-18).",
  ],
  invalid: [
    "<select> or a hand-built dropdown (lint: saella/no-raw-control).",
    "A Select for 2–3 options in a filter popover (show them inline).",
    "A Select as a view switch that should apply at once with every option visible.",
    "Colours on the trigger outside tokens (hex, gray-*).",
  ],
};
