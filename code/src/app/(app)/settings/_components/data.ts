import { WORKSPACE_TZ } from "@/lib/time";
import { PACK_RATE, type Tier } from "@/lib/mock/pricing";
import {
  type DnsRecord,
  type Member,
  type Sender,
  type SendingDomain,
  WORKSPACE,
  members,
  senders,
  sendingDomains,
} from "@/lib/mock/workspace";

// Settings-only mock on top of lib/mock/workspace. Names fictional, numbers illustrative.
import { CURRENT_USER_ID, SHARED_MONTHLY_CAP, SHARED_USED_THIS_MONTH, TODAY } from "@/lib/mock/constants";
export { CURRENT_USER_ID, SHARED_MONTHLY_CAP, SHARED_USED_THIS_MONTH, TODAY };

// Limits as the live app enforces them:
// - ONE sending domain per workspace (api/email/domains MAX_DOMAINS_PER_COMPANY = 1; PRD Master v1.1.7). The admin
//   role and the domain claim assume exactly one. PRD-02 AC-EC-D-05 still says 3.
// - 10 senders per domain (api/email/senders, BR-RULE-EC-04).
// - 10 seats per workspace, a seat being an active or invited member (lib/org/membership.ts MAX_MEMBERS_PER_ORG).
export const MAX_DOMAINS = 1;
export const MAX_SENDERS_PER_DOMAIN = 10;
export const MAX_SEATS = 10;
// The live app gives a new domain 72 hours to verify, then it expires (Repo messages.ts dom.window.*).
export const VERIFY_WINDOW_H = 72;

// ---- Sending ---------------------------------------------------------------------------------------------

/** A DNS record as the live app lists it: the ownership TXT (`_saella-verify`) comes first and decides who owns the domain. */
export type DomainRecord = Omit<DnsRecord, "purpose"> & { purpose: DnsRecord["purpose"] | "Ownership" };

export type DomainRow = Omit<SendingDomain, "records"> & {
  records: DomainRecord[];
  /** DNS host detected from nameservers (AC-EC-DV-01). null = nameservers could not be read. */
  dnsHost: string | null;
  checkedAt: string;
};

const ownership = (domain: string, ok: boolean): DomainRecord => ({
  type: "TXT",
  host: "_saella-verify",
  value: `saella-verify=${domain.replace(/[^a-z]/g, "").slice(0, 6)}7f3a91c2`,
  purpose: "Ownership",
  ok,
});

const toRow = (d: SendingDomain): DomainRow => ({
  ...d,
  records: [ownership(d.domain, d.status === "verified"), ...d.records],
  dnsHost: d.domain.endsWith(".vn") ? "PA Vietnam" : "Cloudflare",
  checkedAt: d.status === "verified" ? "2026-10-27T02:40:00Z" : "2026-10-27T04:52:00Z",
});

// One domain per workspace: the verified one by default. The shared mock still has a second, unverified domain;
// its records give the workspace domain a not-yet-verified look for the ?state=pending | expired previews.
export const initialDomains: DomainRow[] = sendingDomains.slice(0, 1).map(toRow);
export const pendingDomain: DomainRow = toRow({ ...(sendingDomains[1] ?? sendingDomains[0]), domain: WORKSPACE.domain });

/**
 * The workspace domain for a `?state=` preview, so Domain, Sending and the settings nav agree on it.
 * null = no domain yet. `unverified` = verified once, then a record went missing (here DKIM).
 */
export function domainForState(state: string): DomainRow | null {
  if (state === "empty") return null;
  if (state === "pending" || state === "unclaimed") return pendingDomain;
  if (state === "expired") return { ...pendingDomain, addedOn: "2026-10-23" };
  if (state === "unverified") {
    const d = initialDomains[0];
    return { ...d, status: "failed", records: d.records.map((r) => (r.purpose === "DKIM" ? { ...r, ok: false } : r)) };
  }
  return initialDomains[0] ?? null;
}

export function newDomainRecords(domain: string): DomainRecord[] {
  return [
    ownership(domain, false),
    { type: "TXT", host: "saella._domainkey", value: "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ…", purpose: "DKIM", ok: false },
    { type: "TXT", host: "@", value: "v=spf1 include:send.saella.ai ~all", purpose: "SPF", ok: false },
    { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none", purpose: "DMARC", ok: false },
    { type: "CNAME", host: "bounce", value: "bounce.send.saella.ai", purpose: "Return-Path", ok: false },
  ];
}

export type SenderRow = Sender & { replyTo?: string; isDefault?: boolean };

// Default sender follows the admin's default send-as member (BR-RULE-EC-02, CHANGED): Linh.
export const initialSenders: SenderRow[] = senders.map((s) => ({ ...s, isDefault: s.id === "s1" }));

export const domainOf = (email: string) => email.split("@")[1] ?? "";

/** Hours left in the verification window, negative when expired. */
export function hoursLeft(addedOn: string, now = `${TODAY}T05:00:00Z`) {
  const end = Date.parse(`${addedOn}T05:00:00Z`) + VERIFY_WINDOW_H * 3600_000;
  return Math.round((end - Date.parse(now)) / 3600_000);
}

export function normaliseDomain(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
}

export const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/** Free-mail providers: not a sending domain, not an invite address (live app email policy, sign-up rule). */
export const FREE_MAIL = ["gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "icloud.com"];

// ---- Organization ----------------------------------------------------------------------------------------

export type MemberStatus = "invited" | "requested" | "active" | "disabled";

export type OrgMember = Omit<Member, "status"> & {
  status: MemberStatus;
  requestedOn?: string;
  invitedOn?: string;
  /** Admin-marked global send-as identity (BR-RULE-ORG-07). */
  sendAs: boolean;
  defaultSendAs: boolean;
  templates: number;
};

// Shared members plus two local ones so every status shows: an invite and a disabled account.
export const initialMembers: OrgMember[] = [
  ...members.map((m) => ({
    ...m,
    status: (m.status === "pending" ? "requested" : "active") as MemberStatus,
    requestedOn: m.status === "pending" ? "2026-10-26" : undefined,
    sendAs: m.id === "u1" || m.id === "u2",
    defaultSendAs: m.id === "u1",
    templates: m.id === "u1" ? 6 : m.id === "u2" ? 3 : 0,
  })),
  {
    id: "u5",
    name: "Thu Le",
    email: "thu@northwind-ceramics.com",
    role: "member",
    status: "disabled",
    joinedOn: "2026-05-11",
    sendAs: false,
    defaultSendAs: false,
    templates: 2,
  },
  {
    id: "u6",
    name: "",
    email: "quang@northwind-ceramics.com",
    role: "member",
    status: "invited",
    invitedOn: "2026-10-24",
    sendAs: false,
    defaultSendAs: false,
    templates: 0,
  },
];

/** Send-as needs a confirmed sender on a verified org domain (BR-RULE-ORG-07, BR-RULE-EC-45). */
export function canSendAs(m: OrgMember) {
  const verified = new Set(sendingDomains.filter((d) => d.status === "verified").map((d) => d.domain));
  return senders.some((s) => s.ownerId === m.id && s.status === "confirmed" && verified.has(domainOf(s.email)));
}

export const ORG = { name: WORKSPACE.company, domain: WORKSPACE.domain, claimedOn: "2026-03-03" };

// ---- Profile, Workspace, Agent ---------------------------------------------------------------------------

/** The signed-in person (live app MyProfileSection: name and email come from sign-in, only the photo changes). */
export const ME = { name: "Linh Tran", email: "linh@northwind-ceramics.com" };

/** Company profile (live app CompanyProfileSection, api/email/company). Field limits are the API's. */
export type CompanyProfile = {
  name: string;
  logo: string | null;
  countries: string[];
  industries: string[];
  phone: string;
  slogan: string;
  address: string;
};

export const COMPANY_LIMITS = { name: 120, phone: 60, slogan: 160, address: 200 };

export const initialCompany: CompanyProfile = {
  name: WORKSPACE.company,
  logo: null,
  countries: ["Vietnam", "Singapore"],
  industries: ["Construction", "Accommodation & food service"],
  phone: "+84 28 3910 2240",
  slogan: "",
  address: "18 Nguyen Van Huong, Thao Dien, Thu Duc City, Ho Chi Minh City",
};

/** The 21 ISIC sections, the live app's industry options (lib/companies/industry-dict.ts ISIC_SECTION_LABELS). */
export const ISIC_SECTIONS = [
  "Agriculture, forestry & fishing",
  "Mining & quarrying",
  "Manufacturing",
  "Electricity & gas supply",
  "Water, sewerage & waste",
  "Construction",
  "Wholesale & retail trade",
  "Transportation & storage",
  "Accommodation & food service",
  "Information & communication",
  "Financial & insurance",
  "Real estate",
  "Professional, scientific & technical",
  "Administrative & support services",
  "Public administration & defence",
  "Education",
  "Human health & social work",
  "Arts, entertainment & recreation",
  "Other services",
  "Household activities",
  "Extraterritorial organizations",
];

/** Standing instructions for the agent, stored on the workspace (AC-AG-I-01: 4,000 characters, never cut). */
export const AGENT_INSTRUCTIONS_MAX = 4000;
export const initialInstructions =
  "We make glazed ceramic tiles and sanitaryware in Binh Duong and sell to hotel groups, architects and distributors in Southeast Asia.\n\nTone: warm, plain business English; Vietnamese for Vietnamese contacts. Mention our 10-year glaze warranty and free samples for projects over 500 m².\n\nNever promise delivery dates or quote prices in an email.";

/** Canned results for the mock "Generate by AI" and "Import file". */
export const DRAFTED_CONTEXT =
  "Northwind Ceramics makes glazed ceramic tiles for hotels, resorts and commercial projects. Customers: hotel groups, architects, interior designers and building-material distributors in Vietnam, Singapore and Malaysia. Strengths: in-house glaze lab, 10-year warranty, project samples within a week.";

/**
 * What "Fill from your website" drafts for the workspace's own site (mock; live app api/email/agent-context/generate
 * drafts the instructions, onboarding drafts name, countries and industries). The logo is never drafted.
 * Name, phone and address match what's saved, so only countries, industries, slogan and instructions show as drafts.
 */
export const WEBSITE_DRAFT: Omit<CompanyProfile, "logo"> & { instructions: string } = {
  name: initialCompany.name,
  countries: ["Vietnam", "Singapore", "Malaysia"],
  industries: ["Construction", "Accommodation & food service", "Wholesale & retail trade"],
  phone: initialCompany.phone,
  slogan: "Glazed tiles made to last",
  address: initialCompany.address,
  instructions: DRAFTED_CONTEXT,
};

// ---- Billing ---------------------------------------------------------------------------------------------

// Plans: live app lib/credits/plans.ts = PRD-05. Packs: PRD-05 = live app lib/credits/pricing.ts
// PACK_SIZES (four packs, nothing in between). The workspace starts on Starter (decisions.md "Credits"); the session's
// plan is usePlanTier() in lib/mock/pricing.ts, shared with the Top up dialog.
export type { Tier };
// Packs live in lib/mock/pricing.ts (shared with the Top up dialog).
export { PACK_SIZES, packsForTier } from "@/lib/mock/pricing";
/** Plan credits a month (TIER_CREDITS) and price (live app lib/credits/plans.ts PLAN_PRICE_USD = PRD-05).
 *  Enterprise is not in PRD-05 nor a paid tier in the live app, so it isn't offered. */
export const PLANS: { tier: Tier; name: string; credits: number | null; price: string }[] = [
  { tier: "free", name: "Free", credits: 10, price: "$0" },
  { tier: "starter", name: "Starter", credits: 600, price: "$25" },
  { tier: "business", name: "Business", credits: 2_500, price: "$50" },
  { tier: "expansion", name: "Expansion", credits: 12_000, price: "$100" },
];
/** PRD-05 pack price a credit, by plan (PACK_RATE in lib/mock/pricing.ts); the same for every pack size. */
export function packPrice(tier: Tier, credits: number) {
  return Math.round(credits * PACK_RATE[tier] * 100) / 100;
}
/** What uses credits (live app meter.ts CREDIT_COST, PRD-05 unified): 1 credit each. Sending email is free. */
export const CREDIT_COST = { agentAction: 1, unlock: 1, exportPerRecord: 1 };

// ---- Shared formatting -----------------------------------------------------------------------------------

export function formatDay(iso: string, withYear = false) {
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: WORKSPACE_TZ,
  });
}

/** "Oct 28, 2:00 PM" in workspace time (PATTERNS 9.13). */
export function formatDayTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: WORKSPACE_TZ,
  });
}

export function agoShort(iso: string, now = `${TODAY}T05:00:00Z`) {
  const mins = Math.max(1, Math.round((Date.parse(now) - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : formatDay(iso);
}
