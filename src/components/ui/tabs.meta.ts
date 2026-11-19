import type { ComponentMeta } from "@/components/meta";

export const tabsMeta: ComponentMeta = {
  name: "Tabs",
  category: "atom",
  description:
    "Switches between views of the same page. TabsList defaults to variant line (brand underline under the active tab); variant default is a muted segmented switch for how the data is shown.",
  variants: {
    "TabsList variant=line (default)": "Sections or views of a page: batch report (Overview / Clicks / Recipients…), Overview views. One underline row per page.",
    "TabsList variant=default": "Small switch of display or scope over the same data: Rates / Counts, notifications All / Unread, Social 'Show'.",
  },
  relationships: {
    usedIn: ["Batch report", "Overview", "Notifications menu", "Template Automation card (Schedule / Follow-up)"],
    preferInstead: {
      "a status filter on a list usually seen whole": "the Status field in FilterPopover",
      "sub-filters with counts (Total / New / Already saved)": "ToggleGroup chips",
      "steps of a form": "Stepper",
      "a value for a form field": "Select, RadioGroup or ToggleGroup (select.meta)",
      "links between pages (Leads › Find companies / Unlocked / Self-upload)": "a <nav> of links with aria-current, styled like line tabs (components/saella/leads-tabs.tsx)",
    },
  },
  tokens: ["--brand", "--muted", "--muted-foreground", "--foreground", "--background", "--ring"],
  aiHints: [
    "In-page tabs: every TabsTrigger has a TabsContent with the same value wrapping its view, so aria-controls points at a real panel (report-screen.tsx, overview-screen.tsx).",
    "Put the tab in the URL (?tab=, ?view=) when the view should be linkable or opened from another screen.",
    "Hide the tabs when every tab would show the same empty state (batch report without results).",
    "Status tabs carry their counts; items under them don't repeat the tab's status.",
    "The component hides the focus ring after a pointer click (data-pointer); don't add focus styles of your own.",
  ],
  invalid: [
    "In-page tabs without TabsContent panels (views swapped by onValueChange alone).",
    "Tabs used to switch routes (role=tab with no panel): use nav links (leads-tabs.tsx).",
    "Two underline tab rows on one page.",
    "variant=default for page sections, or variant=line as a filter chip group.",
    "The same table repeated in several tabs (one table, one tab).",
  ],
};
