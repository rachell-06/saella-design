import { type Company, FOUNDED, ageYears, companies } from "@/lib/mock/companies";
import type { CompanyFilters } from "@/lib/mock/company-audience";
import { BATCH_CAP } from "@/lib/mock/batches";
import type { Recipient } from "./recipient-check";

// A batch to unlocked companies (2026-11-12; PRD-02 AC-EC-B-02 "registry companies matching the campaign filters (or
// an explicit selection)", BAT-CREATE-001 "Companies from the registry"; live app EmailBatchWizard company mode +
// POST /api/email/batches send_mode "company").
// - Designer decision 2026-11-12: only companies the workspace has unlocked can be sent to; credits are spent in one
//   place, Leads › Find companies › Unlock. The live app instead unlocks on send (#116); sending stays free (PRD-05).
// - The audience starts unfiltered (every unlocked company, designer 2026-11-14); the user adds filters.
//   Registry matches that are still locked are only counted, with a way to unlock them in Leads.
// - Only companies with an email are offered; the workspace's unsubscribes never show (live app: emailNotNull, the
//   search excludes unsubscribes).
// - No Not sent / Sent split (designer 2026-11-14): every unlocked company is listed and can be picked. The live app
//   splits by this template and its route drops companies the template already reached.
// Shared filter helpers (CompanyFilters, filtersFromCampaign, leadsHref): @/lib/mock/company-audience.
// Backend: GET /api/companies/search with the filters, unlocked only.

export const sameFilters = (a: CompanyFilters, b: CompanyFilters) =>
  [...a.countries].sort().join() === [...b.countries].sort().join() &&
  [...a.isic].sort().join() === [...b.isic].sort().join();

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** The address can't receive mail (bad syntax, typo domain, no MX): dropped when the batch is created (AC-EC-B-05). */
export const undeliverable = (c: Company) => hash(c.id) % 29 === 0;

/** The Audience filter (2026-11-14, PM proposal approved: back to the live app's audience filter). The live
 *  EmailBatchWizard filter popover has Countries, Industry, Founded (date range), FDI only and Chinese-owned only;
 *  the step opens with none set (designer 2026-11-14). Founded uses Find companies' buckets; Chinese-owned has
 *  no field in the registry mock, so it is not offered yet. */
export type AudienceFilters = CompanyFilters & { founded?: string; fdiOnly: boolean };

export const audienceFilters = (f: CompanyFilters): AudienceFilters => ({ ...f, fdiOnly: false });

/** The step opens with no filter: every unlocked company (designer 2026-11-14, no campaign pre-fill). */
export const NO_AUDIENCE_FILTERS: AudienceFilters = { countries: [], isic: [], fdiOnly: false };

/** Does the company fall inside these filters (empty = any)? */
export const inFilters = (c: Company, f: AudienceFilters) => {
  if (f.countries.length && !f.countries.includes(c.country)) return false;
  if (f.isic.length && !f.isic.includes(c.isic)) return false;
  if (f.fdiOnly && !c.fdi) return false;
  const founded = FOUNDED.find((x) => x.value === f.founded);
  if (founded) {
    const age = ageYears(c.incorporatedOn);
    if (age < founded.min || age >= founded.max) return false;
  }
  return true;
};

/** Unlocked companies with an email that match the filters and search, plus how many registry companies match the
 *  filters but are still locked. */
export function matchCompanies(filters: AudienceFilters, query: string, unlocked: ReadonlySet<string>) {
  const q = query.trim().toLowerCase();
  const matching = companies.filter(
    (c) => c.email && inFilters(c, filters) && (!q || c.name.toLowerCase().includes(q))
  );
  const rows = matching.filter((c) => unlocked.has(c.id));
  return { rows, locked: matching.length - rows.length };
}

/** The picked companies as the batch reaches them: capped, undeliverable ones dropped. */
export function companyAudience(picked: Company[]) {
  const capped = picked.slice(0, BATCH_CAP);
  const reachable = capped.filter((c) => !undeliverable(c));
  return { companies: reachable, undeliverable: capped.length - reachable.length, truncated: picked.length - capped.length };
}

/** One company as a recipient for the per-recipient check and the preview; the representative stands in for the
 *  greeting name. */
export function companyRecipient(c: Company): Recipient {
  return {
    id: c.id,
    tags: [],
    firstName: c.representative ?? "",
    lastName: "",
    email: c.email ?? "",
    company: c.name,
    isCompany: true,
  };
}
