import { TODAY, formatDate } from "@/lib/mock/campaigns";

// Reporting windows and their bounds, shared by Overview and Settings › Billing › Usage (moved from overview/metrics
// 2026-11-12). One clock: "today" is fixed in the mock.

export const WINDOWS = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "14", label: "Last 14 days", days: 14 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 3 months", days: 90 },
  { value: "180", label: "Last 6 months", days: 180 },
  { value: "year", label: "Last year", days: 365 },
  { value: "range", label: "Custom range", days: 0 },
] as const;
export type WindowKey = (typeof WINDOWS)[number]["value"];

export type Span = { key: WindowKey; since: string; until: string; days: number; label: string };

const DAY = 86_400_000;
const END_OF_TODAY = new Date(`${TODAY}T23:59:59Z`).getTime();
const iso = (t: number) => new Date(t).toISOString();

/** Bounds of the window from one clock ("today" is fixed in the mock). Label as the live app words it in titles. */
export function resolveSpan(key: WindowKey, from?: string | null, to?: string | null): Span {
  if (key === "range" && from && to && from <= to) {
    const since = new Date(`${from}T00:00:00Z`).getTime();
    const until = new Date(`${to}T23:59:59Z`).getTime();
    return {
      key,
      since: iso(since),
      until: iso(until),
      days: Math.max(1, Math.round((until - since) / DAY)),
      label: `${formatDate(from)} – ${formatDate(to)}`,
    };
  }
  const w = WINDOWS.find((x) => x.value === key && x.days > 0) ?? WINDOWS[2];
  return { key: w.value, since: iso(END_OF_TODAY - w.days * DAY), until: iso(END_OF_TODAY), days: w.days, label: w.label.toLowerCase() };
}
