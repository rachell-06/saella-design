import { FOUNDED, STATUSES, countryLabel, isicLabel } from "@/lib/mock/companies";

// Filter model for Leads › Find companies and Unlocked.

export type Quality = "email" | "phone" | "fdi";
export type Filters = {
  country?: string;
  isic: string[];
  status?: string;
  founded?: string;
  quality: Quality[];
};
export type Search = { query: string; filters: Filters };

export const QUALITY: { value: Quality; label: string }[] = [
  { value: "email", label: "Has email" },
  { value: "phone", label: "Has phone" },
  { value: "fdi", label: "Foreign-invested only" },
];

export const EMPTY_FILTERS: Filters = { isic: [], quality: [] };
/** Leads › Find companies and Unlocked start on Active companies. It is the default, so it shows no chip and
 *  doesn't count on the Filter button; Clear all and removing the Status chip come back to it.
 *  "Any status" (status undefined, ?status=any) lists them all and shows as "Status: Any", counted like any filter. */
export const DEFAULT_STATUS = "active";
export const DEFAULT_FILTERS: Filters = { ...EMPTY_FILTERS, status: DEFAULT_STATUS };

/** One chip per active filter value, in toolbar order. `key` is what `withoutFilter` removes. The search is no chip:
 *  the search box shows it. */
export function activeFilters({ filters: f }: Search) {
  const out: { key: string; label: string; value: string }[] = [];
  if (f.country) out.push({ key: "country", label: "Country", value: countryLabel(f.country) });
  for (const code of f.isic) out.push({ key: `isic:${code}`, label: "Industry", value: isicLabel(code) });
  if (f.status !== DEFAULT_STATUS)
    out.push({ key: "status", label: "Status", value: f.status ? (STATUSES.find((s) => s.value === f.status)?.label ?? f.status) : "Any" });
  if (f.founded) out.push({ key: "founded", label: "Founded", value: FOUNDED.find((s) => s.value === f.founded)?.label ?? f.founded });
  for (const q of f.quality) out.push({ key: `quality:${q}`, label: "Data", value: QUALITY.find((x) => x.value === q)?.label ?? q });
  return out;
}

export function withoutFilter({ query, filters: f }: Search, key: string): Search {
  const [kind, value] = key.split(":");
  if (kind === "isic") return { query, filters: { ...f, isic: f.isic.filter((x) => x !== value) } };
  if (kind === "quality") return { query, filters: { ...f, quality: f.quality.filter((x) => x !== value) } };
  if (kind === "status") return { query, filters: { ...f, status: DEFAULT_STATUS } };
  if (kind === "country" || kind === "founded") return { query, filters: { ...f, [kind]: undefined } };
  return { query, filters: f };
}
