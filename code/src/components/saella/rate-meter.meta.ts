import type { ComponentMeta } from "@/components/meta";

export const rateMeterMeta: ComponentMeta = {
  name: "RateCell / RateValue / rateKpi",
  category: "molecule",
  description:
    "The only way to show an email rate (delivery, open, click, reply, unsub, bounce): '38.3% (466)', denominator in a tooltip, threshold colour only for Bounce and Delivery (DESIGN.md §2 Số liệu, §9.7).",
  variants: {
    RateCell: "One rate in a table: a right-aligned TableCell, one column per rate.",
    RateValue: "One rate inline in text or a list row.",
    "rateKpi()": "Props for a KpiStripItem: value, note ('2,349 of 5,968 delivered'), tone and tooltip in one call.",
    "kind=bounce | delivery": "Coloured from RATE_BANDS with an icon: bounce warning ≥ 5%, danger ≥ 10%; delivery warning < 90%.",
    "kind=open | click | reply | unsub": "Never coloured: no threshold in the live app or the PRD.",
  },
  relationships: {
    usedIn: ["KpiStrip (via rateKpi)", "Batch report Deliverability table", "Template detail Batches table"],
    preferInstead: {
      "a plain count (sent, recipients)": "a right-aligned TableCell with tabular-nums",
      "share of a total, e.g. link clicks": "a Progress bar equal to the exact share, with the % printed (DESIGN.md §9.7)",
    },
  },
  tokens: ["--foreground", "--muted-foreground", "--subtle-foreground", "--warning-soft-foreground", "--destructive-soft-foreground", "--ring"],
  aiHints: [
    "Pass the raw counts (part, whole), never a precomputed %: the component handles rounding, low samples and the tooltip.",
    "Denominator follows the live app: delivery and bounce over sent; open, click, reply and unsub over delivered.",
    "Under 20 sends the number turns grey and is never flagged ('too few to judge').",
    "whole = 0 renders nothing: an empty cell, not '0%' or '–' (DESIGN.md §2 Bảng).",
    "Thresholds live only in RATE_BANDS. To change one, edit RATE_BANDS, not the screen.",
  ],
  invalid: [
    "A local RateCell or rate formatter inside a screen's _components/.",
    "Colouring open, click, reply or unsub by any threshold.",
    "A warning or danger colour without the icon (colour alone).",
    "Native title= for the denominator; it goes in the shadcn Tooltip.",
    "A rate drawn as a bar compared with the best row or a target.",
  ],
};
