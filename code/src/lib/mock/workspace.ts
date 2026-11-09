import type { BatchStatus } from "@/components/saella/status-badge";

// Shared mock data for the product screens (2026-10-28). Read-only for screen code: a screen that needs more
// fields defines them locally next to itself. Campaigns and templates live in
// `src/app/(app)/campaigns/_components/data.ts` (ids c1..c6, t1..t9); everything here points at those ids.
// All names are fictional; numbers are illustrative. "Today" is 2026-10-27 (same as campaigns/data.ts).

export const WORKSPACE = {
  company: "Northwind Ceramics",
  domain: "northwind-ceramics.com",
  /** Bounce auto-pause is workspace-wide (PRD-02). Preview with ?state=paused on screens that show it. */
  sendingPaused: false,
  /** Monthly credit wallet (PRD-05); charging is built but off. */
  credits: { balance: 1200, monthlyGrant: 1500, chargingOn: false },
};

export type Member = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "pending";
  joinedOn?: string;
};

export const members: Member[] = [
  { id: "u1", name: "Linh Tran", email: "linh@northwind-ceramics.com", role: "admin", status: "active", joinedOn: "2026-03-02" },
  { id: "u2", name: "Minh Pham", email: "minh@northwind-ceramics.com", role: "member", status: "active", joinedOn: "2026-04-18" },
  { id: "u3", name: "An Vo", email: "an@northwind-ceramics.com", role: "member", status: "active", joinedOn: "2026-07-09" },
  { id: "u4", name: "Bao Nguyen", email: "bao@northwind-ceramics.com", role: "member", status: "pending" },
];

export type DnsRecord = { type: "TXT" | "CNAME" | "MX"; host: string; value: string; purpose: "DKIM" | "SPF" | "DMARC" | "Return-Path"; ok: boolean };

export type SendingDomain = {
  domain: string;
  status: "verified" | "pending" | "failed";
  addedOn: string;
  records: DnsRecord[];
};

export const sendingDomains: SendingDomain[] = [
  {
    domain: "northwind-ceramics.com",
    status: "verified",
    addedOn: "2026-03-03",
    records: [
      { type: "TXT", host: "saella._domainkey", value: "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ…", purpose: "DKIM", ok: true },
      { type: "TXT", host: "@", value: "v=spf1 include:send.saella.ai ~all", purpose: "SPF", ok: true },
      { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none; rua=mailto:dmarc@northwind-ceramics.com", purpose: "DMARC", ok: true },
      { type: "CNAME", host: "bounce", value: "bounce.send.saella.ai", purpose: "Return-Path", ok: true },
    ],
  },
  {
    domain: "northwind-tiles.vn",
    status: "pending",
    addedOn: "2026-10-25",
    records: [
      { type: "TXT", host: "saella._domainkey", value: "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ…", purpose: "DKIM", ok: false },
      { type: "TXT", host: "@", value: "v=spf1 include:send.saella.ai ~all", purpose: "SPF", ok: true },
      { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none", purpose: "DMARC", ok: false },
      { type: "CNAME", host: "bounce", value: "bounce.send.saella.ai", purpose: "Return-Path", ok: false },
    ],
  },
];

export type Sender = {
  id: string;
  name: string;
  email: string;
  status: "confirmed" | "unconfirmed";
  /** Shared sender lets a workspace start before it owns a domain. */
  shared?: boolean;
  ownerId?: string;
};

export const senders: Sender[] = [
  { id: "s1", name: "Linh Tran", email: "linh@northwind-ceramics.com", status: "confirmed", ownerId: "u1" },
  { id: "s2", name: "Minh Pham", email: "minh@northwind-ceramics.com", status: "confirmed", ownerId: "u2" },
  { id: "s3", name: "Northwind Sales", email: "sales@northwind-ceramics.com", status: "unconfirmed" },
  { id: "s0", name: "Northwind Ceramics via Saella", email: "northwind@shared.saella.ai", status: "confirmed", shared: true },
];

export type ContactList = {
  id: string;
  name: string;
  source: "upload" | "companies" | "agent";
  contacts: number;
  unreachable: number;
  tags: string[];
  createdOn: string;
  ownerId: string;
};

export const contactLists: ContactList[] = [
  { id: "l1", name: "Hotel purchasing – Vietnam", source: "companies", contacts: 1240, unreachable: 22, tags: ["hotel", "vietnam"], createdOn: "2026-09-28", ownerId: "u1" },
  { id: "l2", name: "Bangkok fair leads", source: "upload", contacts: 312, unreachable: 7, tags: ["fair", "thailand"], createdOn: "2026-09-02", ownerId: "u1" },
  { id: "l3", name: "Distributors – Malaysia, Indonesia, Philippines", source: "companies", contacts: 2875, unreachable: 85, tags: ["distributor"], createdOn: "2026-08-14", ownerId: "u2" },
  { id: "l4", name: "Architects Singapore", source: "agent", contacts: 248, unreachable: 3, tags: ["architect", "singapore"], createdOn: "2026-10-20", ownerId: "u1" },
];

export type Batch = {
  id: string;
  templateId: string;
  campaignId: string;
  senderId: string;
  listIds: string[];
  status: BatchStatus;
  recipients: number;
  /** Sent so far; equals recipients when done. */
  sent: number;
  createdOn: string;
  scheduledFor?: string;
  sentAt?: string;
  /** Why it failed or paused. */
  reason?: string;
};

export const batches: Batch[] = [
  { id: "b1", templateId: "t1", campaignId: "c1", senderId: "s1", listIds: ["l1"], status: "sent", recipients: 1240, sent: 1240, createdOn: "2026-10-26", sentAt: "2026-10-26T02:00:00Z" },
  { id: "b2", templateId: "t2", campaignId: "c1", senderId: "s1", listIds: ["l1"], status: "sending", recipients: 640, sent: 412, createdOn: "2026-10-27", sentAt: "2026-10-27T02:00:00Z" },
  { id: "b3", templateId: "t6", campaignId: "c3", senderId: "s2", listIds: ["l3"], status: "sent", recipients: 2875, sent: 2875, createdOn: "2026-10-21", sentAt: "2026-10-21T00:00:00Z" },
  { id: "b4", templateId: "t7", campaignId: "c4", senderId: "s1", listIds: ["l4"], status: "sent", recipients: 248, sent: 248, createdOn: "2026-10-24", sentAt: "2026-10-24T03:00:00Z" },
  { id: "b5", templateId: "t1", campaignId: "c1", senderId: "s1", listIds: ["l1"], status: "scheduled", recipients: 600, sent: 0, createdOn: "2026-10-27", scheduledFor: "2026-10-30T02:00:00Z" },
  { id: "b6", templateId: "t4", campaignId: "c2", senderId: "s1", listIds: ["l2"], status: "sent", recipients: 312, sent: 312, createdOn: "2026-09-12", sentAt: "2026-09-12T01:30:00Z" },
  { id: "b7", templateId: "t6", campaignId: "c3", senderId: "s2", listIds: ["l3"], status: "failed", recipients: 500, sent: 0, createdOn: "2026-10-15", reason: "Sender minh@northwind-ceramics.com was not confirmed at send time" },
  { id: "b8", templateId: "t5", campaignId: "c2", senderId: "s1", listIds: ["l2"], status: "draft", recipients: 150, sent: 0, createdOn: "2026-09-18" },
];

export type AppNotification = {
  id: string;
  kind: "batch" | "campaign" | "member" | "domain" | "share";
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
};

export const notifications: AppNotification[] = [
  { id: "n1", kind: "batch", title: "Batch finished", body: "“Intro – ceramics catalog” reached 1,240 recipients.", at: "2026-10-26T02:42:00Z", read: false, href: "/batches/b1/report" },
  { id: "n2", kind: "member", title: "Bao Nguyen wants to join", body: "Approve or decline in Organization.", at: "2026-10-25T20:10:00Z", read: false, href: "/settings/organization" },
  { id: "n3", kind: "domain", title: "northwind-tiles.vn is not verified yet", body: "DKIM and DMARC records are missing.", at: "2026-10-25T04:00:00Z", read: true, href: "/settings/sending" },
  { id: "n4", kind: "share", title: "Minh shared a template with you", body: "“Lookbook – poster version” in Architects and designers.", at: "2026-10-22T01:00:00Z", read: true, href: "/templates/t8" },
  { id: "n5", kind: "campaign", title: "Trade fair Bangkok 2026 ended", body: "Its schedules completed and active templates were set to inactive.", at: "2026-09-30T17:05:00Z", read: true, href: "/campaigns" },
];
