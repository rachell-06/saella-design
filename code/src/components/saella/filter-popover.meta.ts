import type { ComponentMeta } from "@/components/meta";

export const filterPopoverMeta: ComponentMeta = {
  name: "FilterPopover / FilterChips",
  category: "molecule",
  description:
    "The Filter button + popover and the chips row under the toolbar, one spec for every list (PATTERNS.md §9.1 'Bộ lọc gọn'). Fields: FilterSelect (one of 4+), FilterMultiSelect (several of many), FilterCheckList / FilterRadioList (2–3 options inline), FilterSearchList, FilterField (label over any control).",
  variants: {
    "size=default": "Page toolbar: h-8, like the search box beside it.",
    "size=sm": "Card header: h-7. Text stays 14px.",
    count: "Badge on the button: values that differ from the screen's defaults.",
    disabled: "Options still loading (PATTERNS.md §9.17).",
    "FilterSelect allLabel": "'Any country' / 'All': the no-filter choice, in subtle-foreground.",
    "FilterChips action=": "A reset that goes elsewhere ('Reset to campaign', New batch) in place of Clear all.",
    "FilterChip more=": "Several values of one filter: first value + '+N', the rest in a Hint.",
  },
  relationships: {
    usedIn: ["Campaigns", "Templates", "Template recipients", "Leads › Find companies / Unlocked / Self-upload", "New batch › Recipients"],
    preferInstead: {
      "statuses users switch between and want counts for": "Tabs (PATTERNS.md §9.1 'Trạng thái: tab hay Filter')",
      "sub-filters with counts above a table (Total / New / Already saved)": "ToggleGroup chips",
      "a date period": "PeriodPicker",
    },
  },
  tokens: ["--primary-subtle", "--primary-soft", "--muted-foreground", "--subtle-foreground", "--border", "--radius-md"],
  aiHints: [
    "Filters live in the URL (router.replace, scroll: false) so the agent and notifications can link to a filtered list; filter the data before the table.",
    "A default other than All is silent: Leads starts on Status Active with no chip and no count. 'Any status' shows as chip 'Status: Any' and counts; removing the Status chip returns to Active (searches.ts DEFAULT_STATUS).",
    "Clear all (popover footer and chips row) returns to the screen's defaults, not to empty.",
    "One chip per value that differs from the default; the search box is never a chip.",
    "Order: status first, other single choices, multi-selects, inline checklists last. Options show '(n)' when the count is known.",
  ],
  invalid: [
    "A screen styling its own Filter button, popover or chips.",
    "A checkbox list of 4+ options spread in the popover (one Select or MultiSelect).",
    "A chip for the silent default or for the search text.",
    "Clear all that also drops the default (Status Active).",
    "Filter state held only in component state on a linkable list.",
    "One status filter as Tabs and in the popover on the same screen.",
  ],
};
