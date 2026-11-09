import { useSyncExternalStore } from "react";
import { FOUNDED, STATUSES, countryLabel, isicLabel } from "./data";

// Filter model + saved searches for Companies (2026-10-29, Competitor.md R11/R12, Apollo A1). A saved search keeps
// the filters, not the rows, so reopening it picks up companies added to the registry since (A-P3).
// The store is in memory like the contacts mock; backend: GET/POST/PATCH/DELETE saved searches per workspace.

export type Quality = "email" | "phone" | "fdi";
export type Filters = {
  country?: string;
  isic: string[];
  status?: string;
  founded?: string;
  quality: Quality[];
};
export type Search = { query: string; filters: Filters };
export type SavedSearch = Search & { id: string; name: string; createdOn: string };

export const QUALITY: { value: Quality; label: string }[] = [
  { value: "email", label: "Has email" },
  { value: "phone", label: "Has phone" },
  { value: "fdi", label: "Foreign-invested only" },
];

export const EMPTY_FILTERS: Filters = { isic: [], quality: [] };

/** One entry per active value, in toolbar order. `key` is what `withoutFilter` removes. */
export function activeFilters({ query, filters: f }: Search) {
  const out: { key: string; label: string; value: string }[] = [];
  if (query.trim()) out.push({ key: "q", label: "Search", value: `“${query.trim()}”` });
  if (f.country) out.push({ key: "country", label: "Country", value: countryLabel(f.country) });
  for (const code of f.isic) out.push({ key: `isic:${code}`, label: "Industry", value: isicLabel(code) });
  if (f.status) out.push({ key: "status", label: "Status", value: STATUSES.find((s) => s.value === f.status)?.label ?? f.status });
  if (f.founded) out.push({ key: "founded", label: "Founded", value: FOUNDED.find((s) => s.value === f.founded)?.label ?? f.founded });
  for (const q of f.quality) out.push({ key: `quality:${q}`, label: "Data", value: QUALITY.find((x) => x.value === q)?.label ?? q });
  return out;
}

export function withoutFilter({ query, filters: f }: Search, key: string): Search {
  const [kind, value] = key.split(":");
  if (kind === "q") return { query: "", filters: f };
  if (kind === "isic") return { query, filters: { ...f, isic: f.isic.filter((x) => x !== value) } };
  if (kind === "quality") return { query, filters: { ...f, quality: f.quality.filter((x) => x !== value) } };
  if (kind === "country" || kind === "status" || kind === "founded") return { query, filters: { ...f, [kind]: undefined } };
  return { query, filters: f };
}

/** "Hotels & resorts · Vietnam · Has email": the saved-search subtitle and the agent prompt. */
export const describeSearch = (s: Search) => activeFilters(s).map((a) => a.value).join(" · ");

const norm = ({ query, filters: f }: Search) =>
  JSON.stringify([query.trim().toLowerCase(), f.country ?? "", [...f.isic].sort(), f.status ?? "", f.founded ?? "", [...f.quality].sort()]);
export const sameSearch = (a: Search, b: Search) => norm(a) === norm(b);

/** The agent page reads ?prompt= and starts a new thread with it (agent screen, see report 2026-10-29). */
export const agentHref = (prompt: string) => `/agent?prompt=${encodeURIComponent(prompt)}`;
export const workSearchPrompt = (s: SavedSearch) =>
  `Work my saved search “${s.name}” (${describeSearch(s)}): find the companies that aren't in my lists yet and suggest who to contact first.`;

// ---------------------------------------------------------------------------------------------------------
// Store

let searches: SavedSearch[] = [
  {
    id: "s1",
    name: "Hotels in Vietnam with email",
    query: "",
    filters: { country: "VN", isic: ["5510"], quality: ["email"] },
    createdOn: "2026-10-12",
  },
  {
    id: "s2",
    name: "Building materials wholesalers – Malaysia",
    query: "",
    filters: { country: "MY", isic: ["4663", "4752"], status: "active", quality: [] },
    createdOn: "2026-10-21",
  },
];

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSavedSearches() {
  return useSyncExternalStore(subscribe, () => searches, () => searches);
}
export const getSavedSearch = (id: string) => searches.find((s) => s.id === id);

export function saveSearch(name: string, search: Search): SavedSearch {
  const saved: SavedSearch = {
    id: `s${Date.now()}`,
    name,
    query: search.query.trim(),
    filters: { ...search.filters, isic: [...search.filters.isic], quality: [...search.filters.quality] },
    createdOn: "2026-10-29",
  };
  searches = [saved, ...searches];
  emit();
  return saved;
}

export function deleteSavedSearch(id: string) {
  searches = searches.filter((s) => s.id !== id);
  emit();
}
