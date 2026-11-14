import type { ComponentMeta } from "@/components/meta";

export const pageHeaderMeta: ComponentMeta = {
  name: "PageHeader",
  category: "organism",
  description:
    "Top of every product screen inside AppShell: optional breadcrumb, the page title, one line of context, and the page's main actions on the right.",
  variants: {
    "title only": "List screens: Campaigns, Templates, Leads.",
    "breadcrumbs=": "Detail and nested screens; list the parents, the current page comes from title.",
    "description=": "One short line of context. Longer help goes in an ⓘ tooltip, not here.",
    "children": "Extra line under the title, e.g. a StatusBadge + sent time on a batch report.",
    "actions=": "Buttons on the right, all size=\"sm\": outline ones first, the one solid orange (variant default) last, an overflow ⋯ menu after it.",
  },
  relationships: {
    usedIn: ["Every page.tsx under app/(app)/"],
    preferInstead: {
      "a heading inside a card or section": "CardTitle or the screen's own h2",
      "settings sections": "settings/_components/section-header",
    },
  },
  tokens: ["--foreground", "--muted-foreground", "--tracking-title"],
  aiHints: [
    "Exactly one PageHeader per page, first child of the page.",
    "The orange primary action of the page usually lives here; check the rest of the page has no second one.",
    "Overflow actions (duplicate, archive, delete) go in a ghost icon Button with a DropdownMenu at the end of actions.",
    "Status of the object (Active, Sent) goes in children as a StatusBadge, not in the title text.",
  ],
  invalid: [
    "A hand-made <h1> or title row instead of PageHeader.",
    "Two variant=default buttons in actions, or one here plus another elsewhere on the page.",
    "Limiting the width of the header bar itself; only AppShell's inner content is capped at 1536px.",
  ],
};
