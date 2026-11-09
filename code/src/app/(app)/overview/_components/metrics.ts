import { type ReportBatch, allBatches, findTemplate, senderById } from "@/app/(app)/batches/_components/data";
import { TODAY, campaignStatus } from "@/app/(app)/campaigns/_components/data";
import type { CampaignStatus } from "@/components/saella/status-badge";

// Overview metrics (live app app/dashboard/email/metrics + lib/email/metrics-window.ts + lib/email/ranking.ts),
// computed from the same batches the reports use so every number on Overview adds up to the reports.

export const WINDOWS = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "14", label: "Last 14 days", days: 14 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "180", label: "Last 6 months", days: 180 },
  { value: "year", label: "Last 12 months", days: 365 },
  { value: "range", label: "Custom range", days: 0 },
] as const;
export type WindowKey = (typeof WINDOWS)[number]["value"];

export type Span = { since: string; until: string; days: number; label: string };

const DAY = 86_400_000;
const END_OF_TODAY = new Date(`${TODAY}T23:59:59Z`).getTime();
const iso = (t: number) => new Date(t).toISOString();

/** Bounds of the window, computed from one clock ("today" is fixed in the mock), labelled for humans and agent. */
export function resolveSpan(key: WindowKey, from?: string | null, to?: string | null): Span {
  if (key === "range" && from && to && from <= to) {
    const since = new Date(`${from}T00:00:00Z`).getTime();
    const until = new Date(`${to}T23:59:59Z`).getTime();
    return { since: iso(since), until: iso(until), days: Math.max(1, Math.round((until - since) / DAY)), label: `${from} to ${to}` };
  }
  const w = WINDOWS.find((x) => x.value === key && x.days > 0) ?? WINDOWS[2];
  return { since: iso(END_OF_TODAY - w.days * DAY), until: iso(END_OF_TODAY), days: w.days, label: w.label.toLowerCase() };
}

export function previousSpan(s: Span): Span {
  const since = new Date(s.since).getTime();
  return { since: iso(since - s.days * DAY), until: iso(since - 1), days: s.days, label: "previous period" };
}

export type Totals = {
  batches: number;
  sends: number;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  unsubs: number;
  replies: number;
  lastSentAt?: string;
};

export const emptyTotals = (): Totals => ({ batches: 0, sends: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubs: 0, replies: 0 });

/** Batches that sent something inside the span (by send time), optionally one campaign only. */
export function sentIn(span: Span, campaignId?: string | null): ReportBatch[] {
  return allBatches().filter(
    (b) => b.metrics && b.sentAt && b.sentAt >= span.since && b.sentAt <= span.until && (!campaignId || b.campaignId === campaignId)
  );
}

export function sum(list: ReportBatch[]): Totals {
  const t = emptyTotals();
  for (const b of list) {
    const m = b.metrics!;
    t.batches++;
    t.sends += b.sent;
    t.delivered += m.delivered;
    t.opens += m.opens;
    t.clicks += m.clicks;
    t.bounces += m.bounces;
    t.unsubs += m.unsubs;
    t.replies += m.replies;
    if (!t.lastSentAt || (b.sentAt ?? "") > t.lastSentAt) t.lastSentAt = b.sentAt;
  }
  return t;
}

/** Rate 0..1 or null. Open/click/unsub over delivered, bounce over sent (live app analytics.ts:291-294). */
export const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

// Trend: daily up to a month, weekly up to six months, monthly for a year. Each point carries the counts and the
// rates (0–100, one decimal; null where nothing was sent, so lines skip empty days instead of dropping to 0).
type Bucket = { key: string; label: string; start: number; sent: number; delivered: number; opened: number; clicked: number; replied: number; unsubscribed: number; bounced: number };
const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

export function trend(list: ReportBatch[], span: Span) {
  const unit = span.days <= 31 ? "day" : span.days <= 190 ? "week" : "month";
  const start = new Date(span.since).getTime();
  const end = new Date(span.until).getTime();
  const buckets: Bucket[] = [];
  const zero = { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, unsubscribed: 0, bounced: 0 };
  const fmt = (t: number, opts: Intl.DateTimeFormatOptions) => new Date(t).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  if (unit === "month") {
    const d = new Date(start);
    let cur = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    while (cur <= end) {
      buckets.push({ key: iso(cur), label: fmt(cur, { month: "short" }), start: cur, ...zero });
      const c = new Date(cur);
      cur = Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1);
    }
  } else {
    const step = unit === "day" ? DAY : 7 * DAY;
    for (let cur = end - step + 1; cur >= start - step + 1; cur -= step)
      buckets.unshift({ key: iso(cur), label: fmt(cur, { month: "short", day: "numeric" }), start: cur, ...zero });
  }
  for (const b of list) {
    const t = new Date(b.sentAt!).getTime();
    const bucket = [...buckets].reverse().find((x) => x.start <= t) ?? buckets[0];
    if (!bucket) continue;
    const m = b.metrics!;
    bucket.sent += b.sent;
    bucket.delivered += m.delivered;
    bucket.opened += m.opens;
    bucket.clicked += m.clicks;
    bucket.replied += m.replies;
    bucket.unsubscribed += m.unsubs;
    bucket.bounced += m.bounces;
  }
  return {
    unit,
    points: buckets.map((c) => ({
      key: c.key,
      label: c.label,
      sent: c.sent,
      delivered: c.delivered,
      opened: c.opened,
      clicked: c.clicked,
      replied: c.replied,
      unsubscribed: c.unsubscribed,
      bounced: c.bounced,
      deliveryRate: pctOf(c.delivered, c.sent),
      openRate: pctOf(c.opened, c.delivered),
      clickRate: pctOf(c.clicked, c.delivered),
      replyRate: pctOf(c.replied, c.delivered),
      unsubRate: pctOf(c.unsubscribed, c.delivered),
      bounceRate: pctOf(c.bounced, c.sent),
    })),
  };
}

export type GroupRow = {
  id: string;
  name: string;
  sub?: string;
  href?: string;
  status?: CampaignStatus;
  /** Sender rows: the sending domain, and a flag worth seeing on the row. */
  domain?: string;
  flag?: "shared" | "unconfirmed";
  totals: Totals;
};

export function groupBy(list: ReportBatch[], by: "campaign" | "template" | "sender"): GroupRow[] {
  const map = new Map<string, ReportBatch[]>();
  for (const b of list) {
    const k = by === "campaign" ? b.campaignId : by === "template" ? b.templateId : b.senderId;
    map.set(k, [...(map.get(k) ?? []), b]);
  }
  return [...map.entries()].map(([id, bs]) => {
    if (by === "campaign") {
      const c = findTemplate(bs[0].templateId)?.campaign;
      // Row click filters Overview to the campaign (live app: setCampaign).
      return {
        id,
        name: c?.name ?? "Deleted campaign",
        href: `/overview?campaign=${id}`,
        status: c ? campaignStatus(c) : undefined,
        totals: sum(bs),
      };
    }
    if (by === "template") {
      const t = findTemplate(id);
      return { id, name: t?.template.name ?? "Deleted template", sub: t?.campaign.name, href: `/templates/${id}`, totals: sum(bs) };
    }
    const s = senderById(id);
    return {
      id,
      name: s?.name ?? "Removed sender",
      sub: s?.email,
      domain: s?.email.split("@")[1],
      flag: s?.shared ? "shared" : s?.status === "unconfirmed" ? "unconfirmed" : undefined,
      totals: sum(bs),
    };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Ranking (port of live app lib/email/ranking.ts). A rate is only ranked once its own denominator reaches 100;
// inside the gate rows are ordered by the Wilson 95% interval (lower bound for "highest", upper for "lowest").
// When fewer than 3 rows clear the gate it is lowered to the third-largest sample and the UI says so.
// ---------------------------------------------------------------------------------------------------------------

export const MIN_SAMPLE = 100;
const Z = 1.96;

function wilson(successes: number, trials: number) {
  if (trials <= 0) return { lower: 0, upper: 0 };
  const p = successes / trials;
  const z2 = Z * Z;
  const denom = 1 + z2 / trials;
  const centre = p + z2 / (2 * trials);
  const margin = Z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials));
  return { lower: Math.max(0, (centre - margin) / denom), upper: Math.min(1, (centre + margin) / denom) };
}

// Same five choices as the live app's board picker.
export type RankMetric = "open" | "click" | "reply" | "unsub" | "bounce";
export type RankMode = "top" | "lowest";

/** Live app measureLeader: engagement over delivered (sends when nothing was delivered), bounce over sent. */
export function measure(t: Totals, metric: RankMetric) {
  if (metric === "bounce") return { successes: t.bounces, denominator: t.sends };
  const engaged = t.delivered || t.sends;
  const successes = metric === "open" ? t.opens : metric === "click" ? t.clicks : metric === "reply" ? t.replies : t.unsubs;
  return { successes, denominator: engaged };
}

/** Which count the gate is measured in, for the ⓘ line. */
export const gateUnit = (metric: RankMetric) => (metric === "bounce" ? "sent" : "delivered");

export function rank<T extends { totals: Totals }>(
  rows: T[],
  metric: RankMetric,
  mode: RankMode,
  { limit = Infinity, replyIsCount = false }: { limit?: number; replyIsCount?: boolean } = {}
) {
  // Live app rankCampaigns: on the campaign board "Replies" is a COUNT with no denominator to gate on; a big
  // campaign earning more replies is a fact, not an artefact, so it is ranked plainly.
  if (metric === "reply" && replyIsCount) {
    const ranked = [...rows].sort((a, b) =>
      mode === "top" ? b.totals.replies - a.totals.replies : a.totals.replies - b.totals.replies
    );
    return { ranked: ranked.slice(0, limit), belowGate: [] as T[], gate: 0, lowered: false };
  }
  const den = (r: T) => measure(r.totals, metric).denominator;
  let gate = MIN_SAMPLE;
  let lowered = false;
  if (rows.filter((r) => den(r) >= gate).length < 3 && rows.length > 0) {
    const ds = rows.map(den).filter((d) => d > 0).sort((a, b) => b - a);
    if (ds.length > 0) {
      const fallback = ds[Math.min(2, ds.length - 1)];
      if (fallback < gate) {
        gate = Math.max(1, fallback);
        lowered = true;
      }
    }
  }
  const score = (r: T) => {
    const { successes, denominator } = measure(r.totals, metric);
    const w = wilson(successes, denominator);
    return mode === "top" ? w.lower : w.upper;
  };
  const ranked = rows
    .filter((r) => den(r) >= gate)
    .sort((a, b) => (mode === "top" ? score(b) - score(a) : score(a) - score(b)) || den(b) - den(a));
  return { ranked: ranked.slice(0, limit), belowGate: rows.filter((r) => den(r) < gate), gate, lowered };
}

/** Every batch for the "Recent batches" list: sent, sending, scheduled, failed, drafts. */
// Batches that went out (or tried to): sending, sent, paused, failed. Scheduled and draft batches haven't been
// sent yet, so they stay out of "Recent batches" (user request 2026-10-28).
const WENT_OUT = new Set(["sending", "sent", "paused", "failed"]);

export function recentBatches(campaignId?: string | null, limit = 6) {
  const when = (b: ReportBatch) => b.sentAt ?? `${b.createdOn}T00:00:00Z`;
  return allBatches()
    .filter((b) => WENT_OUT.has(b.status) && (!campaignId || b.campaignId === campaignId))
    .sort((a, b) => when(b).localeCompare(when(a)))
    .slice(0, limit);
}
