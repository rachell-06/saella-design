// Values every mock shares. Define them here only; data modules re-export what they need.

/** Fixed "today" keeps derived statuses and "x days ago" stable in screenshots. */
export const TODAY = "2026-10-27";
/** Fixed "now" for agent runs and send scheduling. */
export const NOW = "2026-10-27T03:00:00Z";

/** Linh Tran, the workspace admin (lib/mock/workspace.ts members). */
export const CURRENT_USER_ID = "u1";
export const CURRENT_USER = "linh@northwind-ceramics.com";

/** Shared sender: 1,000 sends per calendar month (PRD-02 AC-EC-I-03, BR-RULE-EC-05). */
export const SHARED_MONTHLY_CAP = 1000;
export const SHARED_USED_THIS_MONTH = 312;

/** Countries served by the company registry (live app lib/companies/serving.ts COMPANY_COUNTRY_OPTIONS). */
export const COUNTRIES = [
  { code: "SG", label: "Singapore" },
  { code: "VN", label: "Vietnam" },
  { code: "MY", label: "Malaysia" },
  { code: "ID", label: "Indonesia" },
  { code: "PH", label: "Philippines" },
] as const;
export type CountryCode = (typeof COUNTRIES)[number]["code"];
export const countryLabel = (c: string) => COUNTRIES.find((x) => x.code === c)?.label ?? c;
