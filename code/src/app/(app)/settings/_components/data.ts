import { WORKSPACE_TZ } from "@/lib/time";
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

// Settings-only mock on top of lib/mock/workspace (2026-10-28). Names fictional, numbers illustrative.
export const TODAY = "2026-10-27";
export const CURRENT_USER_ID = "u1"; // Linh Tran, the workspace admin

// Limits (PRD-02): 3 domains per workspace (AC-EC-D-05); 10 senders per domain (BR-RULE-EC-04, CHANGED; AC-EC-S-05
// still says 3); shared sender 1,000 sends a calendar month (BR-RULE-EC-05). Seats: 10 per org (PRD-05).
export const MAX_DOMAINS = 3;
export const MAX_SENDERS_PER_DOMAIN = 10;
export const SHARED_MONTHLY_CAP = 1000;
export const SHARED_USED_THIS_MONTH = 312;
export const MAX_SEATS = 10;
// The live app gives a new domain 72 hours to verify, then it expires (Repo messages.ts dom.window.*).
export const VERIFY_WINDOW_H = 72;

// ---- Sending ---------------------------------------------------------------------------------------------

export type DomainRow = SendingDomain & {
  /** DNS host detected from nameservers (AC-EC-DV-01). null = nameservers could not be read. */
  dnsHost: string | null;
  checkedAt: string;
};

export const initialDomains: DomainRow[] = sendingDomains.map((d) => ({
  ...d,
  dnsHost: d.domain.endsWith(".vn") ? "PA Vietnam" : "Cloudflare",
  checkedAt: d.status === "verified" ? "2026-10-27T02:40:00Z" : "2026-10-27T04:52:00Z",
}));

export function newDomainRecords(): DnsRecord[] {
  return [
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
  const end = Date.parse(`${addedOn}T12:00:00Z`) + VERIFY_WINDOW_H * 3600_000;
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

// ---- Shared formatting -----------------------------------------------------------------------------------

export function formatDay(iso: string, withYear = false) {
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: WORKSPACE_TZ,
  });
}

export function agoShort(iso: string, now = `${TODAY}T05:00:00Z`) {
  const mins = Math.max(1, Math.round((Date.parse(now) - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : formatDay(iso);
}
