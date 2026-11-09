import type { ComponentMeta } from "@/components/meta";

export const datePickerMeta: ComponentMeta = {
  name: "DatePicker / DateRangePicker / TimePicker",
  category: "molecule",
  description:
    "Date and time inputs built from shadcn Popover + Calendar and Select. They replace the browser's native pickers, which cannot take Saella tokens (DESIGN.md §2 Control).",
  variants: {
    DatePicker: "One day, value 'YYYY-MM-DD'. min / max block days outside the range.",
    DateRangePicker: "From–to range for report and chart filters, values 'YYYY-MM-DD'.",
    TimePicker: "Time of day on a half-hour grid, value 'HH:mm', workspace time (GMT+7).",
    invalid: "Red border for a failed field; pair with a FieldError message.",
  },
  relationships: {
    usedIn: ["Batch wizard (schedule step)", "Overview date filter"],
    preferInstead: {
      "a preset period (last 7 / 30 days)": "ToggleGroup chips or a Select of presets, then DateRangePicker for Custom",
      "relative age (founded 1–5 years ago)": "preset options, as on Companies",
    },
  },
  tokens: ["--input", "--border", "--popover", "--muted-foreground", "--primary", "--ring", "--destructive"],
  aiHints: [
    "Values are plain ISO strings; keep them as strings in state and URL, never Date objects.",
    "Show and store times as GMT+7 (src/lib/time.ts). Label the zone near the field: 'Ho Chi Minh City (GMT+7)'.",
    "Scheduling: pair DatePicker + TimePicker side by side, date first; min = today (TODAY from lib/mock/constants).",
    "Always give a visible Label or aria-label.",
  ],
  invalid: [
    '<input type="date">, <input type="time"> or <input type="datetime-local">.',
    "A raw <select> for hours or minutes.",
    "Times shown in UTC or the viewer's local zone.",
  ],
};
