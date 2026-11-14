"use client";

import { useMemo } from "react";
import { TODAY } from "@/lib/mock/constants";
import { FilterCheckList, FilterMultiSelect, FilterPopover, FilterSelect } from "@/components/saella/filter-popover";
import { type BookContact, isInvalid } from "./contact-book";

// Self-upload's filters in the same Filter popover as Find companies: Tag and Company
// (several, with search), Email status (Valid / Invalid) and Last sent. A contact must match every filter and any
// value within one. All of it lives in the URL (?tag=&status=&sent=&company=) so the agent can link to it.
// Compact: Tag and Company (long lists) are one MultiSelect row each, Last sent (4) a
// Select, Email status (2) inline checkboxes.

export type EmailStatus = "valid" | "invalid";
export type SentWindow = "never" | "7d" | "30d" | "older";

export type ContactFilters = { tags: string[]; status: EmailStatus[]; sent?: SentWindow; companies: string[] };

export const NO_CONTACT_FILTERS: ContactFilters = { tags: [], status: [], companies: [] };

export const EMAIL_STATUSES: { value: EmailStatus; label: string }[] = [
  { value: "valid", label: "Valid" },
  { value: "invalid", label: "Invalid" },
];

export const SENT_WINDOWS: { value: SentWindow; label: string }[] = [
  { value: "never", label: "Never sent" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "older", label: "Over 30 days ago" },
];

const DAY = 864e5;
const daysAgo = (iso: string) => (new Date(`${TODAY}T00:00:00`).getTime() - new Date(`${iso}T00:00:00`).getTime()) / DAY;

export function filterCount(f: ContactFilters) {
  return f.tags.length + f.status.length + (f.sent ? 1 : 0) + f.companies.length;
}

export function matchesFilters(c: BookContact, f: ContactFilters) {
  const lower = (xs: string[]) => xs.map((x) => x.toLowerCase());
  const tags = lower(f.tags);
  // Every picked tag (more tags narrow the list; it used to match any of them).
  const own = lower(c.tags);
  if (tags.length && !tags.every((t) => own.includes(t))) return false;
  if (f.status.length && !f.status.includes(isInvalid(c) ? "invalid" : "valid")) return false;
  if (f.companies.length && !lower(f.companies).includes(c.company.toLowerCase())) return false;
  if (f.sent) {
    const age = c.lastSent ? daysAgo(c.lastSent.on) : undefined;
    if (f.sent === "never" && age !== undefined) return false;
    if (f.sent === "7d" && !(age !== undefined && age <= 7)) return false;
    if (f.sent === "30d" && !(age !== undefined && age <= 30)) return false;
    if (f.sent === "older" && !(age !== undefined && age > 30)) return false;
  }
  return true;
}

export function filtersFromParams(p: URLSearchParams): ContactFilters {
  const sent = SENT_WINDOWS.find((w) => w.value === p.get("sent"))?.value;
  return {
    tags: p.getAll("tag"),
    status: p.getAll("status").filter((s): s is EmailStatus => s === "valid" || s === "invalid"),
    sent,
    companies: p.getAll("company"),
  };
}

export function filtersToParams(f: ContactFilters) {
  const q = new URLSearchParams();
  f.tags.forEach((t) => q.append("tag", t));
  f.status.forEach((s) => q.append("status", s));
  if (f.sent) q.set("sent", f.sent);
  f.companies.forEach((c) => q.append("company", c));
  return q;
}

/** One chip per value, for the row under the card header. */
export function activeChips(f: ContactFilters): { key: string; label: string; value: string; remove: ContactFilters }[] {
  return [
    ...f.tags.map((t) => ({ key: `tag:${t}`, label: "Tag", value: t, remove: { ...f, tags: f.tags.filter((x) => x !== t) } })),
    ...f.status.map((s) => ({
      key: `status:${s}`,
      label: "Email status",
      value: EMAIL_STATUSES.find((x) => x.value === s)?.label ?? s,
      remove: { ...f, status: f.status.filter((x) => x !== s) },
    })),
    ...(f.sent
      ? [{ key: "sent", label: "Last sent", value: SENT_WINDOWS.find((w) => w.value === f.sent)?.label ?? f.sent, remove: { ...f, sent: undefined } }]
      : []),
    ...f.companies.map((c) => ({
      key: `company:${c}`,
      label: "Company",
      value: c,
      remove: { ...f, companies: f.companies.filter((x) => x !== c) },
    })),
  ];
}

export function ContactFiltersPopover({
  contacts,
  tags,
  value,
  onChange,
  disabled,
}: {
  disabled?: boolean;
  contacts: BookContact[];
  /** Every tag in the book, sorted. */
  tags: string[];
  value: ContactFilters;
  onChange: (next: ContactFilters) => void;
}) {
  const companyOptions = useMemo(
    () => [...new Set(contacts.map((c) => c.company).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [contacts]
  );
  return (
    <FilterPopover count={filterCount(value)} onClearAll={() => onChange(NO_CONTACT_FILTERS)} disabled={disabled}>
      {/* Order: status first, then the single choice, then the multi-selects. */}
      <FilterCheckList
        label="Email status"
        options={EMAIL_STATUSES}
        value={value.status}
        onChange={(s) => onChange({ ...value, status: s as EmailStatus[] })}
      />
      <FilterSelect
        label="Last sent"
        allLabel="Any time"
        value={value.sent}
        options={SENT_WINDOWS}
        onChange={(sent) => onChange({ ...value, sent: sent as SentWindow | undefined })}
      />
      <FilterMultiSelect
        label="Tag"
        options={tags}
        value={value.tags}
        onChange={(t) => onChange({ ...value, tags: t })}
        placeholder="Any tag"
        searchPlaceholder="Search tags"
      />
      <FilterMultiSelect
        label="Company"
        options={companyOptions}
        value={value.companies}
        onChange={(c) => onChange({ ...value, companies: c })}
        placeholder="Any company"
        searchPlaceholder="Search companies"
      />
    </FilterPopover>
  );
}
