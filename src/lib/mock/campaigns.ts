import { WORKSPACE_TZ } from "@/lib/time";
import type { CampaignStatus } from "@/components/saella/status-badge";

// Campaign = container of templates (PRD-02 AC-EC-C-01/04, live app EmailCampaignBoard).
// Sends, metrics and ownership live on templates; campaigns only carry targeting and a period.
// All data below is illustrative: fictional names, made-up numbers.

export type Template = {
  id: string;
  name: string;
  owner: string; // email
  /** Owner shared it with the current user (BR-RULE-EC-41). */
  shared?: boolean;
  status: "active" | "inactive";
  /** Sent as the follow-up step of another template's automation (live app: email_automation_steps, step_order 1). */
  followUp?: FollowUp;
  recipients: number;
  delivered: number;
  opens: number; // bot/prefetch traffic already excluded (AC-EC-K-03..07)
  clicks: number;
  bounces: number;
  unsubs: number;
  lastSent?: string; // ISO date-time
};

// Live app: the step's trigger and delay_hours (default 72).
export type FollowUp = { of: string; trigger: "no_engagement" | "opened" | "clicked"; delayHours: number };

export type Campaign = {
  id: string;
  name: string;
  description?: string;
  startsOn?: string; // ISO date
  endsOn?: string;
  countries: string[];
  /** ISIC classes (4-digit, live target_industry_codes); show with industryLabels(). Empty = any industry. */
  industries: string[];
  templates: Template[];
};

import { CURRENT_USER, TODAY, type CountryCode } from "@/lib/mock/constants";
import { ISIC, type IsicGroup } from "@/lib/mock/companies";
export { CURRENT_USER, TODAY };

// Markets a campaign targets (free text in the live app), not the company-registry COUNTRIES.
export const MARKETS = ["Vietnam", "Thailand", "Indonesia", "Malaysia", "Philippines", "Singapore"];
// Campaign industries (live app EmailCampaignBoard "Industry": a TreeSelect over isic_ref, SHOW_CHILD).
// A campaign stores ISIC classes (4-digit codes, live target_industry_codes); checking a section checks all its classes.
// The tree has all 21 ISIC sections (live ISIC_SECTION_LABELS), sorted by label, classes sorted by label (live
// isicOptions). Each section mocks a few real classes; the sections the company registry mock covers (ISIC in
// companies.ts) include every registry class, so targeting maps 1:1 onto registry companies. Classes the registry
// has no companies for simply match none.
const SECTION_CLASSES: { value: string; label: string; options: [string, string][] }[] = [
  { value: "A", label: "Agriculture, forestry & fishing", options: [["0111", "Cereals & oilseeds"], ["0127", "Beverage crops (coffee, tea)"], ["0141", "Cattle raising"], ["0210", "Forestry & logging"], ["0321", "Marine aquaculture"]] },
  { value: "B", label: "Mining & quarrying", options: [["0510", "Coal mining"], ["0610", "Crude petroleum"], ["0810", "Stone, sand & clay quarrying"]] },
  { value: "C", label: "Manufacturing", options: [["1010", "Meat processing"], ["1610", "Sawmilling & wood"], ["3100", "Furniture"]] },
  { value: "D", label: "Electricity & gas supply", options: [["3510", "Electric power"], ["3520", "Gas distribution"]] },
  { value: "E", label: "Water, sewerage & waste", options: [["3600", "Water supply"], ["3700", "Sewerage"], ["3821", "Waste treatment & disposal"]] },
  { value: "F", label: "Construction", options: [["4210", "Roads & railways"], ["4321", "Electrical installation"]] },
  { value: "G", label: "Wholesale & retail trade", options: [["4510", "Sale of motor vehicles"], ["4711", "Retail in supermarkets"]] },
  { value: "H", label: "Transportation & storage", options: [["4923", "Road freight"], ["5012", "Sea freight"], ["5120", "Air freight"]] },
  { value: "I", label: "Accommodation & food service", options: [["5520", "Camping grounds"], ["5621", "Event catering"], ["5630", "Bars & beverage serving"]] },
  { value: "J", label: "Information & communication", options: [["5811", "Book publishing"], ["6110", "Wired telecommunications"], ["6311", "Data processing & hosting"]] },
  { value: "K", label: "Financial & insurance", options: [["6419", "Banking"], ["6511", "Life insurance"], ["6612", "Securities brokerage"]] },
  { value: "L", label: "Real estate", options: [["6820", "Real estate agencies"]] },
  { value: "M", label: "Professional, scientific & technical", options: [["6910", "Legal services"], ["6920", "Accounting & tax"], ["7310", "Advertising"]] },
  { value: "N", label: "Administrative & support services", options: [["7710", "Car rental"], ["7810", "Employment agencies"], ["7911", "Travel agencies"], ["8121", "Building cleaning"]] },
  { value: "O", label: "Public administration & defence", options: [["8411", "General public administration"], ["8422", "Defence"]] },
  { value: "P", label: "Education", options: [["8510", "Pre-primary & primary education"], ["8530", "Higher education"], ["8549", "Training centres"]] },
  { value: "Q", label: "Human health & social work", options: [["8610", "Hospitals"], ["8620", "Medical & dental practice"], ["8730", "Residential care for the elderly"]] },
  { value: "R", label: "Arts, entertainment & recreation", options: [["9000", "Creative arts & entertainment"], ["9311", "Sports facilities"], ["9321", "Amusement & theme parks"]] },
  { value: "S", label: "Other services", options: [["9411", "Business & employer associations"], ["9511", "Computer repair"], ["9602", "Hairdressing & beauty"]] },
  { value: "T", label: "Household activities", options: [["9700", "Households as employers"], ["9810", "Goods for own use"]] },
  { value: "U", label: "Extraterritorial organizations", options: [["9900", "Extraterritorial organizations"]] },
];

export const INDUSTRY_TREE: IsicGroup[] = SECTION_CLASSES.map((s) => ({
  value: s.value,
  label: s.label,
  options: [
    ...(ISIC.find((g) => g.value === s.value)?.options ?? []),
    ...s.options.map(([value, label]) => ({ value, label })),
  ].sort((a, b) => a.label.localeCompare(b.label)),
})).sort((a, b) => a.label.localeCompare(b.label));

const KNOWN_CLASSES = new Set(INDUSTRY_TREE.flatMap((g) => g.options.map((o) => o.value)));

/** Every class of these ISIC sections (seed campaigns, and targeting given by section). */
export function industryClasses(...sections: string[]) {
  return INDUSTRY_TREE.filter((g) => sections.includes(g.value)).flatMap((g) => g.options.map((o) => o.value));
}

/** Sections a campaign's classes touch, fully or partly (Campaigns › Filter › Industry, New schedule). */
export function industrySections(codes: string[]) {
  const set = new Set(codes);
  return INDUSTRY_TREE.filter((g) => g.options.some((o) => set.has(o.value))).map((g) => g.value);
}

/** Names to show for a campaign's classes: a fully checked section reads as the section, other classes by name;
 *  every class checked (live "Select all") reads "All industries". Empty = any industry (callers say so). */
export function industryLabels(codes: string[]) {
  if (codes.length === 0) return [];
  const set = new Set(codes);
  if ([...KNOWN_CLASSES].every((c) => set.has(c))) return ["All industries"];
  return INDUSTRY_TREE.flatMap((g) =>
    g.options.every((o) => set.has(o.value)) ? [g.label] : g.options.filter((o) => set.has(o.value)).map((o) => o.label)
  ).concat(codes.filter((c) => !KNOWN_CLASSES.has(c)));
}

// Campaign targeting as company-registry filters: a batch to Saella companies starts from the campaign's
// countries and industries (live app EmailBatchWizard seeds its audience filter from target_countries +
// target_industry_codes). MARKETS stay the labels every screen shows; MARKET_CODE maps them to the registry's ISO-2
// codes. A market the registry doesn't serve (Thailand) has no code and drops out. Industries are ISIC classes already.
const MARKET_CODE: Record<string, CountryCode | undefined> = {
  Vietnam: "VN",
  Indonesia: "ID",
  Malaysia: "MY",
  Philippines: "PH",
  Singapore: "SG",
};

/** Registry filters for a campaign's targeting: country codes and ISIC classes. Empty = any. */
export function campaignTargeting(c: Pick<Campaign, "countries" | "industries">) {
  const countries = c.countries.map((m) => MARKET_CODE[m]).filter((x): x is CountryCode => x !== undefined);
  return { countries, isic: [...c.industries] };
}

export function campaignStatus(c: Pick<Campaign, "startsOn" | "endsOn">, today = TODAY): CampaignStatus {
  if (c.startsOn && c.startsOn > today) return "not-started";
  if (c.endsOn && c.endsOn < today) return "ended";
  return "active"; // no dates = active (live app)
}

// Rates follow the live app tooltips: open/click/unsub over delivered, bounce over recipients.
export type Rate = { text: string; lowSample: boolean } | null;

export function rate(part: number, whole: number): Rate {
  if (whole === 0) return null;
  // Below 20 sends a rate is not meaningful (BR-RULE-EC-21).
  return { text: `${((part / whole) * 100).toFixed(1)}%`, lowSample: whole < 20 };
}

export function totals(c: Campaign) {
  const sum = (k: "recipients" | "delivered" | "opens" | "clicks" | "bounces" | "unsubs") =>
    c.templates.reduce((n, t) => n + t[k], 0);
  const lastSent = c.templates.map((t) => t.lastSent).filter(Boolean).sort().at(-1);
  return {
    recipients: sum("recipients"),
    delivered: sum("delivered"),
    opens: sum("opens"),
    clicks: sum("clicks"),
    bounces: sum("bounces"),
    unsubs: sum("unsubs"),
    lastSent,
  };
}

const TRIGGER_LABEL: Record<FollowUp["trigger"], string> = {
  no_engagement: "if no open/click",
  opened: "if opened",
  clicked: "if clicked",
};

export function followUpRule(f: FollowUp) {
  const wait = f.delayHours % 24 === 0 ? `${f.delayHours / 24} days` : `${f.delayHours} hours`;
  return `After ${wait} ${TRIGGER_LABEL[f.trigger]}`;
}

/**
 * Templates in display order: each template followed by its follow-ups (one level, as in the live app).
 * A follow-up whose template sits in another campaign stays a top-level row.
 */
export function withFollowUps(templates: Template[]) {
  const ids = new Set(templates.map((t) => t.id));
  const rows: { template: Template; isChild: boolean; hasChildren: boolean }[] = [];
  for (const t of templates) {
    if (t.followUp && ids.has(t.followUp.of)) continue;
    const children = templates.filter((x) => x.followUp?.of === t.id);
    rows.push({ template: t, isChild: false, hasChildren: children.length > 0 });
    for (const child of children) rows.push({ template: child, isChild: true, hasChildren: false });
  }
  return rows;
}

export function formatDate(iso: string, withYear = false) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: WORKSPACE_TZ,
  });
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${formatDate(iso)}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: WORKSPACE_TZ })}`;
}

const t = (p: Partial<Template> & Pick<Template, "id" | "name">): Template => ({
  owner: CURRENT_USER,
  status: "active",
  recipients: 0,
  delivered: 0,
  opens: 0,
  clicks: 0,
  bounces: 0,
  unsubs: 0,
  ...p,
});

export const sampleCampaigns: Campaign[] = [
  {
    id: "c1",
    name: "Hotel buyers – Vietnam",
    description: "Intro our ceramics catalog to hotel purchasing teams.",
    startsOn: "2026-10-01",
    endsOn: "2026-12-31",
    countries: ["Vietnam"],
    industries: industryClasses("I"),
    templates: [
      t({ id: "t1", name: "Intro – ceramics catalog", recipients: 1240, delivered: 1218, opens: 466, clicks: 74, bounces: 22, unsubs: 6, lastSent: "2026-10-26T02:00:00Z" }),
      // Seed only: every screen reads it through applyTemplateStore, which takes the numbers from its batches (b2 still
      // sending, 412 sent: 407 delivered + 5 bounced; lib/mock/batches.ts). Kept equal to them; not derived here because
      // batches.ts imports this file.
      t({ id: "t2", name: "Follow-up 1 – catalog reminder", followUp: { of: "t1", trigger: "no_engagement", delayHours: 72 }, recipients: 412, delivered: 407, opens: 121, clicks: 17, bounces: 5, unsubs: 1, lastSent: "2026-10-27T02:00:00Z" }),
      t({ id: "t3", name: "Holiday pricing note", status: "inactive" }),
    ],
  },
  {
    id: "c2",
    name: "Trade fair Bangkok 2026",
    description: "Leads met at the September fair.",
    startsOn: "2026-08-01",
    endsOn: "2026-09-30",
    countries: ["Thailand", "Vietnam"],
    industries: industryClasses("I", "G", "F"),
    templates: [
      t({ id: "t4", name: "Nice to meet you at the fair", recipients: 312, delivered: 305, opens: 158, clicks: 41, bounces: 7, unsubs: 2, lastSent: "2026-09-12T01:30:00Z" }),
      t({ id: "t5", name: "Fair samples follow-up", followUp: { of: "t4", trigger: "opened", delayHours: 48 }, recipients: 150, delivered: 149, opens: 66, clicks: 12, bounces: 1, unsubs: 0, lastSent: "2026-09-19T01:30:00Z" }),
    ],
  },
  {
    id: "c3",
    name: "Distributor check-in Q4",
    countries: ["Malaysia", "Indonesia", "Philippines"],
    industries: industryClasses("G"),
    templates: [
      t({ id: "t6", name: "Q4 reorder reminder", owner: "minh@northwind-ceramics.com", recipients: 2875, delivered: 2790, opens: 1163, clicks: 205, bounces: 85, unsubs: 14, lastSent: "2026-10-21T00:00:00Z" }),
    ],
  },
  {
    id: "c4",
    name: "Architects and designers",
    description: "Specifier outreach for the new tile range.",
    startsOn: "2026-10-15",
    countries: ["Singapore"],
    industries: industryClasses("F", "L"),
    templates: [
      t({ id: "t7", name: "New tile range lookbook", recipients: 248, delivered: 244, opens: 98, clicks: 21, bounces: 4, unsubs: 1, lastSent: "2026-10-24T03:00:00Z" }),
      t({ id: "t8", name: "Lookbook – poster version", owner: "minh@northwind-ceramics.com", shared: true, status: "inactive" }),
    ],
  },
  {
    id: "c5",
    name: "Spring catalog 2027",
    startsOn: "2027-02-01",
    endsOn: "2027-04-30",
    countries: ["Vietnam"],
    industries: [],
    templates: [t({ id: "t9", name: "Spring catalog preview", status: "inactive" })],
  },
  {
    id: "c6",
    name: "Restaurant groups – Hanoi",
    countries: ["Vietnam"],
    industries: industryClasses("I"),
    templates: [],
  },
];
