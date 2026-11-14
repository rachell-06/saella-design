import { workspaceParts } from "@/lib/time";
import { type Campaign, type Template, TODAY, sampleCampaigns } from "@/lib/mock/campaigns";
import { type Batch, type Sender, batches, members, senders } from "@/lib/mock/workspace";
import type { Contact } from "@/lib/mock/contacts";
import { templateStore } from "@/lib/mock/template-store";

// Sending + reports data. The shared `batches` mock carries status and counts; everything a report
// needs on top (engagement, links, domains, recipients) is defined or derived here, deterministically so
// screenshots are stable. All names are fictional, all numbers illustrative.
// Rules come from the live app (Repo) and PRD-02; each constant says where.

/** Hard ceiling per batch: live app `api/email/batches/route.ts:44` MAX_RECIPIENTS_PER_BATCH = 5000 (= PRD-02
 *  AC-EC-B-03 / BR-RULE-EC-06). An old product brief said 2,000; the repo enforces 5,000. */
export const BATCH_CAP = 5000;
export { SHARED_MONTHLY_CAP, SHARED_USED_THIS_MONTH } from "@/lib/mock/constants";
/** Worker drip rate: 600 emails/hour (PRD-02 key numbers; live app sendRatePerHour). */
export const SEND_PER_HOUR = 600;
/** Today's safe volume (live app send-governor tier "up to 5,000 → 750/day"). Over it the batch spreads over
 *  several days (BR-RULE-EC-07: defer, never fail). */
export const DAILY_ALLOWANCE = 750;
/** Already sent today: batch b2 is still sending. */
export const SENT_TODAY = 412;
/** Rates below this many sends are not meaningful (BR-RULE-EC-21). */
export const LOW_SAMPLE = 20;
/** Workspace auto-pause level (BR-RULE-EC-18): 10% bounces over 7 days with ≥ 200 sends. */
export const PAUSE_BOUNCE = 0.1;

import { CURRENT_USER_ID } from "@/lib/mock/constants";
export { CURRENT_USER_ID };

export const allTemplates = sampleCampaigns.flatMap((c) => c.templates.map((t) => ({ template: t, campaign: c })));

/** Seed templates, then ones made this session (copies, created in the editor; lib/mock/template-store.ts). */
export function findTemplate(id: string | null | undefined): { template: Template; campaign: Campaign } | undefined {
  const seed = allTemplates.find((x) => x.template.id === id);
  if (seed || !id) return seed;
  const s = templateStore();
  const made = s.copies.find((x) => x.template.id === id);
  if (!made || s.deleted.includes(id)) return undefined;
  return { template: { ...made.template, ...s.patch[id] }, campaign: { ...made.campaign, templates: [] } };
}

// Subject lines are not in the shared template mock.
export const SUBJECTS: Record<string, string> = {
  t1: "Ceramics for {{company_name}}: our 2026 hotel catalog",
  t2: "Did the catalog reach you, {{recipient_first_name}}?",
  t3: "Holiday pricing for your 2027 orders",
  t4: "Great meeting you in Bangkok",
  t5: "The samples you asked for at the fair",
  t6: "Time to plan your Q4 reorder",
  t7: "New tile range: the lookbook",
  t8: "New tile range: poster edition",
  t9: "A first look at our spring catalog",
};

export const senderById = (id: string) => senders.find((s) => s.id === id);
export const memberById = (id: string) => members.find((m) => m.id === id);

// ---------------------------------------------------------------------------------------------------------------
// Report batches
// ---------------------------------------------------------------------------------------------------------------

export type BatchMetrics = {
  delivered: number;
  /** Unique human opens and clicks; machine traffic already removed (AC-EC-K-03..07). */
  opens: number;
  clicks: number;
  bounces: number;
  unsubs: number;
  /** Replies tracked through the reply-to inbox (live app `replied`; rate over delivered). */
  replies: number;
  complaints: number;
  /** Removed as machine traffic (scanners, prefetch, < 10 s after send). Shown so people trust the rates. */
  botOpens: number;
  botClicks: number;
  totalOpens: number;
  totalClicks: number;
  forwarded: number;
};

export type ReportBatch = Batch & {
  /** Optional label; without it the batch is called by its code, e.g. #1026-0900 (live app). */
  name?: string;
  /** Who pressed Send (BR-RULE-EC-44: the report shows operator and send-as). */
  operatorId: string;
  metrics?: BatchMetrics;
};

const m = (p: Partial<BatchMetrics> & Pick<BatchMetrics, "delivered" | "opens" | "clicks" | "bounces">): BatchMetrics => ({
  unsubs: 0,
  // About one reply per 12 human opens, illustrative.
  replies: Math.round(p.opens / 12),
  complaints: 0,
  botOpens: Math.round(p.opens * 0.18),
  botClicks: Math.round(p.clicks * 0.3),
  totalOpens: Math.round(p.opens * 1.6),
  totalClicks: Math.round(p.clicks * 1.4),
  forwarded: 0,
  ...p,
});

// Engagement of the shared batches, consistent with the template totals in campaigns/data.ts where they match.
const SHARED_METRICS: Record<string, BatchMetrics> = {
  b1: m({ delivered: 1218, opens: 466, clicks: 74, bounces: 22, unsubs: 6, complaints: 1, forwarded: 3 }),
  b2: m({ delivered: 405, opens: 121, clicks: 17, bounces: 5, unsubs: 1 }),
  b3: m({ delivered: 2790, opens: 1163, clicks: 205, bounces: 85, unsubs: 14, complaints: 2, forwarded: 5 }),
  b4: m({ delivered: 244, opens: 98, clicks: 21, bounces: 4, unsubs: 1 }),
  b6: m({ delivered: 305, opens: 158, clicks: 41, bounces: 7, unsubs: 2, forwarded: 1 }),
};

// Deterministic pseudo-random numbers (mulberry32) so generated data never changes between renders.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Older sends so the Overview has a year of history. Fictional, placed inside each campaign's period; the first
// months went out from the shared sender, before the workspace verified its own domain.
type HistorySpec = { templateId: string; date: string; recipients: number; senderId: string; tags: string[] };
const HISTORY: HistorySpec[] = [
  { templateId: "t6", date: "2025-11-18T00:00:00Z", recipients: 420, senderId: "s0", tags: ["distributor"] },
  { templateId: "t6", date: "2025-12-16T00:00:00Z", recipients: 380, senderId: "s0", tags: ["distributor"] },
  { templateId: "t6", date: "2026-01-20T00:00:00Z", recipients: 450, senderId: "s0", tags: ["distributor"] },
  { templateId: "t6", date: "2026-02-17T00:00:00Z", recipients: 520, senderId: "s0", tags: ["distributor"] },
  { templateId: "t6", date: "2026-03-17T00:00:00Z", recipients: 880, senderId: "s2", tags: ["distributor"] },
  { templateId: "t6", date: "2026-04-21T00:00:00Z", recipients: 1150, senderId: "s2", tags: ["distributor"] },
  { templateId: "t6", date: "2026-05-19T00:00:00Z", recipients: 1320, senderId: "s2", tags: ["distributor"] },
  { templateId: "t6", date: "2026-06-16T00:00:00Z", recipients: 1480, senderId: "s2", tags: ["distributor"] },
  { templateId: "t6", date: "2026-07-21T00:00:00Z", recipients: 1610, senderId: "s2", tags: ["distributor"] },
  { templateId: "t6", date: "2026-08-18T00:00:00Z", recipients: 1900, senderId: "s2", tags: ["distributor"] },
  { templateId: "t6", date: "2026-09-15T00:00:00Z", recipients: 2210, senderId: "s2", tags: ["distributor"] },
  { templateId: "t4", date: "2026-08-20T01:30:00Z", recipients: 140, senderId: "s1", tags: ["fair"] },
  { templateId: "t4", date: "2026-09-03T01:30:00Z", recipients: 180, senderId: "s1", tags: ["fair"] },
  { templateId: "t5", date: "2026-09-19T01:30:00Z", recipients: 150, senderId: "s1", tags: ["fair"] },
  { templateId: "t1", date: "2026-10-06T02:00:00Z", recipients: 300, senderId: "s1", tags: ["hotel"] },
  // Through the shared sender before Linh's own address was used again (mock, shows the "Shared" sender row).
  { templateId: "t2", date: "2026-10-09T02:00:00Z", recipients: 240, senderId: "s0", tags: ["hotel"] },
  { templateId: "t1", date: "2026-10-13T02:00:00Z", recipients: 420, senderId: "s1", tags: ["hotel"] },
  { templateId: "t2", date: "2026-10-16T02:00:00Z", recipients: 210, senderId: "s1", tags: ["hotel"] },
  { templateId: "t1", date: "2026-10-20T02:00:00Z", recipients: 380, senderId: "s1", tags: ["hotel"] },
  { templateId: "t2", date: "2026-10-23T02:00:00Z", recipients: 260, senderId: "s1", tags: ["hotel"] },
  // Filler for the 30 days before, so the Overview's dashed "previous period" lines have data too.
  { templateId: "t6", date: "2026-08-29T02:00:00Z", recipients: 240, senderId: "s2", tags: ["distributor"] },
  { templateId: "t1", date: "2026-08-31T02:00:00Z", recipients: 200, senderId: "s1", tags: ["hotel"] },
  { templateId: "t5", date: "2026-09-05T01:30:00Z", recipients: 160, senderId: "s1", tags: ["fair"] },
  { templateId: "t6", date: "2026-09-08T02:00:00Z", recipients: 260, senderId: "s2", tags: ["distributor"] },
  { templateId: "t2", date: "2026-09-10T02:00:00Z", recipients: 180, senderId: "s1", tags: ["hotel"] },
  { templateId: "t4", date: "2026-09-12T01:30:00Z", recipients: 140, senderId: "s1", tags: ["fair"] },
  { templateId: "t1", date: "2026-09-17T02:00:00Z", recipients: 210, senderId: "s1", tags: ["hotel"] },
  { templateId: "t6", date: "2026-09-22T02:00:00Z", recipients: 230, senderId: "s2", tags: ["distributor"] },
  { templateId: "t2", date: "2026-09-24T02:00:00Z", recipients: 190, senderId: "s1", tags: ["hotel"] },
  // Filler so the Overview trend has a send every few days across the last 30 (fake data
  // that shows the chart well). Mixed templates, so the rates move the way real sends do.
  { templateId: "t6", date: "2026-09-27T02:00:00Z", recipients: 260, senderId: "s2", tags: ["distributor"] },
  { templateId: "t4", date: "2026-09-29T01:30:00Z", recipients: 150, senderId: "s1", tags: ["fair"] },
  { templateId: "t1", date: "2026-10-01T02:00:00Z", recipients: 220, senderId: "s1", tags: ["hotel"] },
  { templateId: "t5", date: "2026-10-03T01:30:00Z", recipients: 170, senderId: "s1", tags: ["fair"] },
  { templateId: "t6", date: "2026-10-07T02:00:00Z", recipients: 310, senderId: "s2", tags: ["distributor"] },
  { templateId: "t4", date: "2026-10-10T01:30:00Z", recipients: 160, senderId: "s1", tags: ["fair"] },
  { templateId: "t6", date: "2026-10-14T02:00:00Z", recipients: 280, senderId: "s2", tags: ["distributor"] },
  { templateId: "t5", date: "2026-10-17T01:30:00Z", recipients: 190, senderId: "s1", tags: ["fair"] },
  { templateId: "t6", date: "2026-10-18T02:00:00Z", recipients: 240, senderId: "s2", tags: ["distributor"] },
  { templateId: "t1", date: "2026-10-21T02:00:00Z", recipients: 230, senderId: "s1", tags: ["hotel"] },
  { templateId: "t4", date: "2026-10-25T01:30:00Z", recipients: 140, senderId: "s1", tags: ["fair"] },
];

// Base rates per template (open and click over delivered, bounce over recipients).
const BASE: Record<string, { open: number; click: number; bounce: number }> = {
  t1: { open: 0.38, click: 0.06, bounce: 0.018 },
  t2: { open: 0.31, click: 0.048, bounce: 0.013 },
  t4: { open: 0.51, click: 0.13, bounce: 0.022 },
  t5: { open: 0.44, click: 0.08, bounce: 0.007 },
  t6: { open: 0.41, click: 0.072, bounce: 0.03 },
  t7: { open: 0.55, click: 0.2, bounce: 0 },
};

const historyBatches: ReportBatch[] = HISTORY.map((h, i) => {
  const r = rng(1000 + i);
  const base = BASE[h.templateId];
  // The shared sender's early sends bounced more (unchecked addresses, no domain of its own yet).
  const bounceRate = base.bounce * (h.senderId === "s0" ? 1.6 : 1) * (0.8 + r() * 0.4);
  const bounces = Math.round(h.recipients * bounceRate);
  const delivered = h.recipients - bounces;
  const opens = Math.round(delivered * base.open * (0.85 + r() * 0.3));
  const clicks = Math.round(delivered * base.click * (0.8 + r() * 0.4));
  const tpl = findTemplate(h.templateId);
  return {
    id: `h${i + 1}`,
    templateId: h.templateId,
    campaignId: tpl?.campaign.id ?? "",
    senderId: h.senderId,
    tags: h.tags,
    status: "sent",
    recipients: h.recipients,
    sent: h.recipients,
    createdOn: h.date.slice(0, 10),
    sentAt: h.date,
    operatorId: senderById(h.senderId)?.ownerId ?? CURRENT_USER_ID,
    metrics: m({
      delivered,
      opens,
      clicks,
      bounces,
      unsubs: Math.round(delivered * 0.004 * (0.5 + r())),
      complaints: r() > 0.8 ? 1 : 0,
      forwarded: Math.round(r() * 3),
    }),
  };
});

const sharedBatches: ReportBatch[] = batches.map((b) => ({
  ...b,
  operatorId: senderById(b.senderId)?.ownerId ?? CURRENT_USER_ID,
  metrics: SHARED_METRICS[b.id],
  name: b.id === "b1" ? "Hotel buyers – first wave" : undefined,
}));

// Batches created in this browser session by the wizard. Module state survives client navigation, which is
// all the mock needs; a reload forgets them (the report then says the batch is not found).
const created: ReportBatch[] = [];

export function addCreatedBatch(b: ReportBatch) {
  created.unshift(b);
}

export function updateCreatedBatch(id: string, patch: Partial<ReportBatch>) {
  const i = created.findIndex((b) => b.id === id);
  if (i >= 0) created[i] = { ...created[i], ...patch };
}

export function allBatches(): ReportBatch[] {
  return [...created, ...sharedBatches, ...historyBatches];
}

export function getBatch(id: string): ReportBatch | undefined {
  return allBatches().find((b) => b.id === id);
}

/** Live app fallback label: #MMDD-HHmm of the send (or creation) time, UTC. */
export function batchCode(b: Pick<Batch, "sentAt" | "scheduledFor" | "createdOn">) {
  const iso = b.sentAt ?? b.scheduledFor ?? `${b.createdOn}T00:00:00Z`;
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  const t = workspaceParts(d);
  return `#${p(t.month)}${p(t.day)}-${p(t.hour)}${p(t.minute)}`;
}

export function batchTitle(b: ReportBatch) {
  return b.name?.trim() || batchCode(b);
}

// ---------------------------------------------------------------------------------------------------------------
// Audience for a new batch (live app POST /api/email/batches: suppression, one-copy-per-mailbox, deliverability
// gate, cap), person by person over the contact book. The audience is everyone carrying any picked tag (the live
// app's contact picker filters the book by tag, EmailBatchWizard; PRD-02 BAT-CREATE-001 "Pick contacts from the
// contact book"). People are removed in the order the live app removes them.
// ---------------------------------------------------------------------------------------------------------------

export type AudienceSummary = {
  tags: string[];
  /** Contacts carrying any picked tag, each counted once. */
  contacts: number;
  /** A second contact with the same mailbox: the live app sends one copy per inbox. */
  duplicates: number;
  /** Unsubscribed, bounced before or undeliverable (bad syntax, typo domain, no MX): AC-EC-B-04/05. */
  unreachable: number;
  /** Carry a "Don't send to" tag. */
  excluded: number;
  /** Mailboxes this template already reached: the live app sends one copy per inbox per template. */
  alreadyReceived: number;
  /** After every exclusion, before the cap. */
  eligible: number;
  /** What the batch will send to (eligible capped at BATCH_CAP). */
  recipients: number;
  truncated: number;
  /** Who gets it, in book order (length = recipients). */
  people: Contact[];
  unreachablePeople: Contact[];
  excludedPeople: Contact[];
};

function hashId(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

export function summarizeAudience(
  book: Contact[],
  tags: string[],
  excludeTags: string[],
  templateId: string | undefined,
  /** Contacts picked one by one (New batch › Self-upload table): used instead of the tag match. */
  ids?: ReadonlySet<string>
): AudienceSummary {
  const lower = (xs: string[]) => new Set(xs.map((t) => t.toLowerCase()));
  const picked = lower(tags);
  const left = lower(excludeTags);
  // Tags this template already went to (sent or sending batches).
  const reached = lower(
    allBatches()
      .filter((b) => b.templateId === templateId && (b.status === "sent" || b.status === "sending"))
      .flatMap((b) => b.tags)
  );
  const has = (c: Contact, set: Set<string>) => c.tags.some((t) => set.has(t.toLowerCase()));
  const matched = ids ? book.filter((c) => ids.has(c.id)) : picked.size ? book.filter((c) => has(c, picked)) : [];
  const seen = new Set<string>();
  const unreachablePeople: Contact[] = [];
  const excludedPeople: Contact[] = [];
  const eligiblePeople: Contact[] = [];
  let duplicates = 0;
  let alreadyReceived = 0;
  for (const c of matched) {
    const mailbox = c.email.trim().toLowerCase();
    if (c.unreachable) unreachablePeople.push(c);
    else if (seen.has(mailbox)) duplicates += 1;
    else if (has(c, left)) excludedPeople.push(c);
    // Nearly everyone with a reached tag got it; a few joined the tag after that send.
    else if (has(c, reached) && hashId(c.id) % 25 !== 0) alreadyReceived += 1;
    else eligiblePeople.push(c);
    seen.add(mailbox);
  }
  const eligible = eligiblePeople.length;
  const recipients = Math.min(eligible, BATCH_CAP);
  return {
    tags,
    contacts: matched.length,
    duplicates,
    unreachable: unreachablePeople.length,
    excluded: excludedPeople.length,
    alreadyReceived,
    eligible,
    recipients,
    truncated: eligible - recipients,
    people: eligiblePeople.slice(0, recipients),
    unreachablePeople,
    excludedPeople,
  };
}

/** Senders this user may send as (BR-RULE-EC-42): their own confirmed sender, admin-marked identities, the
 *  workspace's shared sender. Others are shown disabled with the reason. */
export function senderAvailability(s: Sender): { ok: true } | { ok: false; reason: string } {
  if (s.status !== "confirmed") return { ok: false, reason: "Waiting for confirmation. Open the link we emailed to this address." };
  if (s.ownerId && s.ownerId !== CURRENT_USER_ID) {
    const owner = memberById(s.ownerId)?.name.split(" ")[0] ?? "its owner";
    return { ok: false, reason: `${owner}’s sender. An admin can mark it as a send-as identity for everyone.` };
  }
  return { ok: true };
}

/** Sticky send-as default (BR-RULE-EC-43): the sender last used with this template, else the first allowed. */
export function defaultSenderFor(templateId: string | undefined, pool: Sender[]) {
  const last = allBatches()
    .filter((b) => b.templateId === templateId && b.sentAt)
    .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))[0];
  const allowed = pool.filter((s) => senderAvailability(s).ok);
  return allowed.find((s) => s.id === last?.senderId) ?? allowed.find((s) => !s.shared) ?? allowed[0];
}

/** Honest send-time estimate (live app EmailBatchWizard): the drip rate while it fits today's allowance, whole
 *  days once it spills over. */
export function sendEstimate(recipients: number, sentToday = SENT_TODAY) {
  const leftToday = Math.max(0, DAILY_ALLOWANCE - sentToday);
  const overflow = Math.max(0, recipients - leftToday);
  if (recipients <= 0) return { label: "–", days: 0, leftToday, overflow: 0 };
  if (overflow > 0) {
    const days = (leftToday > 0 ? 1 : 0) + Math.ceil(overflow / DAILY_ALLOWANCE);
    return { label: `About ${days} days`, days, leftToday, overflow };
  }
  const minutes = Math.ceil(recipients / (SEND_PER_HOUR / 60));
  return { label: minutes < 60 ? `About ${minutes} min` : `About ${(minutes / 60).toFixed(1)} hours`, days: 0, leftToday, overflow };
}

// ---------------------------------------------------------------------------------------------------------------
// Report details: links, recipients, domains, 24-hour snapshot
// ---------------------------------------------------------------------------------------------------------------

const LINKS: Record<string, { url: string; share: number }[]> = {
  t1: [
    { url: "https://northwind-ceramics.com/catalog/hotels-2026", share: 0.62 },
    { url: "https://northwind-ceramics.com/samples/request", share: 0.24 },
    { url: "https://northwind-ceramics.com/projects/riverside-hotel", share: 0.1 },
    { url: "https://northwind-ceramics.com/contact", share: 0.04 },
  ],
  t2: [
    { url: "https://northwind-ceramics.com/catalog/hotels-2026", share: 0.71 },
    { url: "https://northwind-ceramics.com/meetings/book", share: 0.29 },
  ],
  t4: [
    { url: "https://northwind-ceramics.com/fair/bangkok-2026", share: 0.55 },
    { url: "https://northwind-ceramics.com/catalog", share: 0.35 },
    { url: "https://northwind-ceramics.com/contact", share: 0.1 },
  ],
  t5: [{ url: "https://northwind-ceramics.com/samples/track", share: 1 }],
  t6: [
    { url: "https://northwind-ceramics.com/distributors/reorder", share: 0.68 },
    { url: "https://northwind-ceramics.com/distributors/price-list-q4", share: 0.27 },
    { url: "https://northwind-ceramics.com/contact", share: 0.05 },
  ],
  t7: [
    { url: "https://northwind-ceramics.com/lookbook/tiles-2026", share: 0.8 },
    { url: "https://northwind-ceramics.com/specifiers", share: 0.2 },
  ],
};

export type LinkStat = { url: string; uniqueClicks: number; totalClicks: number };

export function linkStats(b: ReportBatch): LinkStat[] {
  const links = LINKS[b.templateId] ?? [];
  const met = b.metrics;
  return links.map((l) => ({
    url: l.url,
    uniqueClicks: met ? Math.round(met.clicks * l.share) : 0,
    totalClicks: met ? Math.round(met.totalClicks * l.share) : 0,
  }));
}

export type RecipientEvent = "pending" | "delivered" | "opened" | "clicked" | "bounced" | "unsubscribed" | "complained";

export type RecipientRow = {
  id: string;
  name: string;
  company: string;
  email: string;
  domain: string;
  /** Furthest event reached, for the Status column. */
  status: RecipientEvent;
  delivered: boolean;
  opened: boolean;
  clicked: boolean;
  bounced: boolean;
  unsubscribed: boolean;
  complained: boolean;
  opens: number;
  clicks: number;
  lastActivity?: string;
};

const FIRST = ["Anh", "Bich", "Chau", "Dung", "Giang", "Hai", "Hoa", "Khanh", "Lan", "Long", "Mai", "Nam", "Ngoc", "Phuong", "Quang", "Son", "Thao", "Trung", "Tuan", "Vy", "Somchai", "Niran", "Aisyah", "Rizal", "Mei", "Jun"];
const LAST = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Dang", "Bui", "Do", "Ngo", "Srisuk", "Wongsa", "Rahman", "Santos", "Lim", "Tan"];
const COMPANIES: { name: string; domain: string }[] = [
  { name: "Lotus Bay Hotels", domain: "lotusbay-hotels.vn" },
  { name: "Seabreeze Resorts", domain: "seabreeze-resorts.com" },
  { name: "Old Quarter Suites", domain: "oldquarter-suites.vn" },
  { name: "Riverside Hospitality", domain: "riverside-hospitality.com" },
  { name: "Saffron Group", domain: "saffron-group.asia" },
  { name: "Harbor Lights Inn", domain: "harborlights.vn" },
  { name: "Mekong Supply Co.", domain: "mekongsupply.com" },
  { name: "Kinabalu Trading", domain: "kinabalu-trading.my" },
  { name: "Java Home Interiors", domain: "javahome.co.id" },
  { name: "Manila Build Depot", domain: "manilabuild.ph" },
  { name: "Orchid Tile House", domain: "orchidtile.sg" },
  { name: "Golden Lantern Hotels", domain: "goldenlantern.vn" },
];
const MAILBOX = ["gmail.com", "outlook.com", "yahoo.com"];

/** One row per recipient, consistent with the batch counts (same seed → same rows). */
export function recipientRows(b: ReportBatch): RecipientRow[] {
  const n = b.recipients;
  const met = b.metrics;
  const sent = b.status === "sending" ? b.sent : b.status === "sent" ? n : 0;
  // Spread events over a permutation so bounces, opens and clicks are not the first rows of the table.
  let step = 7919;
  const gcd = (a: number, c: number): number => (c === 0 ? a : gcd(c, a % c));
  while (n > 1 && gcd(step, n) !== 1) step += 2;
  const base = new Date(b.sentAt ?? `${b.createdOn}T02:00:00Z`).getTime();
  const rows: RecipientRow[] = [];
  for (let i = 0; i < n; i++) {
    const r = rng(i * 31 + b.id.length * 7 + b.id.charCodeAt(b.id.length - 1));
    const first = FIRST[Math.floor(r() * FIRST.length)];
    const last = LAST[Math.floor(r() * LAST.length)];
    const company = COMPANIES[Math.floor(r() * COMPANIES.length)];
    const personal = r() < 0.45;
    const domain = personal ? MAILBOX[Math.floor(r() * 2.4)] : company.domain;
    const email = `${first}.${last}${i % 97}@${domain}`.toLowerCase();
    const k = (i * step) % Math.max(1, n); // rank in the permutation
    const isSent = i < sent;
    const bounced = isSent && !!met && k < met.bounces;
    const delivered = isSent && !bounced;
    const e = k - (met?.bounces ?? 0); // rank among delivered
    const opened = delivered && !!met && e < met.opens;
    const clicked = opened && !!met && e < met.clicks;
    const unsubscribed = opened && !!met && e >= met.opens - met.unsubs;
    const complained = opened && !!met && e >= met.opens - met.complaints - met.unsubs && e < met.opens - met.unsubs;
    const status: RecipientEvent = !isSent
      ? "pending"
      : bounced
        ? "bounced"
        : complained
          ? "complained"
          : unsubscribed
            ? "unsubscribed"
            : clicked
              ? "clicked"
              : opened
                ? "opened"
                : "delivered";
    const minutes = Math.round(5 + r() * 60 * 30);
    rows.push({
      id: `${b.id}-r${i}`,
      name: `${first} ${last}`,
      company: company.name,
      email,
      domain,
      status,
      delivered,
      opened,
      clicked,
      bounced,
      unsubscribed,
      complained,
      opens: opened ? 1 + Math.floor(r() * 3) : 0,
      clicks: clicked ? 1 + Math.floor(r() * 2) : 0,
      lastActivity: isSent ? new Date(base + (opened ? minutes : i) * 60_000).toISOString() : undefined,
    });
  }
  return rows;
}

export type DomainStat = { domain: string; sends: number; delivered: number; bounced: number; opened: number; clicked: number; unsubscribed: number };

/** Results by recipient domain (AC-EC-O-06), aggregated from the recipient rows. */
export function domainStats(rows: RecipientRow[]): DomainStat[] {
  const map = new Map<string, DomainStat>();
  for (const r of rows) {
    if (r.status === "pending") continue;
    const s = map.get(r.domain) ?? { domain: r.domain, sends: 0, delivered: 0, bounced: 0, opened: 0, clicked: 0, unsubscribed: 0 };
    s.sends++;
    if (r.delivered) s.delivered++;
    if (r.bounced) s.bounced++;
    if (r.opened) s.opened++;
    if (r.clicked) s.clicked++;
    if (r.unsubscribed) s.unsubscribed++;
    map.set(r.domain, s);
  }
  return [...map.values()].sort((a, b) => b.sends - a.sends);
}

/** 24-hour snapshot (AC-EC-O-03): opens and clicks per hour after the send, decaying from the first hours. */
export function hourlySnapshot(b: ReportBatch) {
  const met = b.metrics;
  const weights = Array.from({ length: 24 }, (_, h) => Math.exp(-h / 3.5) * (h === 0 ? 0.7 : 1));
  const total = weights.reduce((a, w) => a + w, 0);
  return weights.map((w, h) => ({
    hour: `${h}h`,
    opens: met ? Math.round(((met.opens * 0.9) * w) / total) : 0,
    clicks: met ? Math.round(((met.clicks * 0.9) * w) / total) : 0,
  }));
}

export { TODAY };
