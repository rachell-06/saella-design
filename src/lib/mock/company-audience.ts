import { type Campaign, campaignTargeting, industryClasses, industrySections } from "@/lib/mock/campaigns";
import { type CountryCode, ISIC, companies } from "@/lib/mock/companies";

// Company audience by registry filters, shared by any screen that sends to unlocked companies. Pure helpers, no
// screen code. Same rules as the batch wizard's company picker
// (batches/_components/company-audience.ts): only UNLOCKED companies with an email can be sent to; matches that are
// still locked are only counted, with a way to unlock them in Leads.

export type CompanyFilters = { countries: CountryCode[]; isic: string[] };

export const NO_COMPANY_FILTERS: CompanyFilters = { countries: [], isic: [] };

export function filtersFromCampaign(c: Pick<Campaign, "countries" | "industries"> | undefined): CompanyFilters {
  return c ? campaignTargeting(c) : NO_COMPANY_FILTERS;
}

/** ISIC sections (industries) fully or partly covered by these codes. Read against the campaign industry tree (all
 *  21 sections), so a campaign aimed at a section the registry mock has no companies in (e.g. Education)
 *  keeps that section instead of falling back to "any industry". */
export function sectionsOf(isic: string[]) {
  return industrySections(isic);
}

/** Every ISIC class of these sections (campaign tree; a superset of the registry's classes for the same section). */
export function isicOfSections(sections: string[]) {
  return industryClasses(...sections);
}

const REGISTRY_ISIC = new Set(ISIC.flatMap((g) => g.options.map((o) => o.value)));

/** Find companies with the same filters (it reads one ?country= and a comma list of ?isic=). */
export function leadsHref(f: CompanyFilters) {
  const q = new URLSearchParams();
  if (f.countries.length === 1) q.set("country", f.countries[0]);
  // Leads only knows the registry's classes: pass those (all of them if none is known, so the filter stays narrow).
  const known = f.isic.filter((c) => REGISTRY_ISIC.has(c));
  if (f.isic.length) q.set("isic", (known.length ? known : f.isic).join(","));
  const s = q.toString();
  return s ? `/companies?${s}` : "/companies";
}

/** Registry companies with an email matching the filters: how many are unlocked (sendable) and how many still locked. */
const matchingCompanies = (f: CompanyFilters) =>
  companies.filter(
    (c) =>
      c.email &&
      (f.countries.length === 0 || f.countries.includes(c.country)) &&
      (f.isic.length === 0 || f.isic.includes(c.isic))
  );

export function countCompanies(f: CompanyFilters, unlocked: ReadonlySet<string>) {
  const matching = matchingCompanies(f);
  const open = matching.filter((c) => unlocked.has(c.id)).length;
  return { unlocked: open, locked: matching.length - open };
}

/** The matching companies (with an email) still locked: what "Unlock N" in a Send to block would buy. */
export function lockedCompanies(f: CompanyFilters, unlocked: ReadonlySet<string>) {
  return matchingCompanies(f).filter((c) => !unlocked.has(c.id));
}

/** What a schedule can reach for this campaign: every matching company with an email, unlocked
 *  or not, minus Ceased ones (no credits spent on a business that has closed). Locked ones are unlocked by the run
 *  that reaches them. */
export function campaignReach(c: Pick<Campaign, "countries" | "industries"> | undefined, unlocked: ReadonlySet<string>) {
  const open = matchingCompanies(filtersFromCampaign(c)).filter((x) => x.status !== "ceased");
  const u = open.filter((x) => unlocked.has(x.id)).length;
  return { total: open.length, unlocked: u, locked: open.length - u };
}
