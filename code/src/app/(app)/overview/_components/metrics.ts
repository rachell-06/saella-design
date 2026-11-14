import { type ReportBatch, allBatches, findTemplate, recipientRows, senderById } from "@/lib/mock/batches";
import { campaignStatus, sampleCampaigns } from "@/lib/mock/campaigns";
import { withReplies } from "@/lib/mock/replies";
import type { CampaignStatus } from "@/components/saella/status-badge";

// Overview metrics, ported from the live app (Repo origin/development, 2026-11-05):
// app/dashboard/email/metrics/page.tsx (aggregation, trend buckets, boards, deliverability) and
// components/email/EmailMetricsDashboard.tsx (ranking, template means, sender aggregates).
// Computed from the same batches the reports use, so every number on Overview adds up to the reports.
// Saella number logic stays (DESIGN §2): a rate with nothing under it is null (blank or "–"), never 0.

export { WINDOWS, resolveSpan, type Span, type WindowKey } from "@/lib/period";
import type { Span } from "@/lib/period";

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString();

export type Totals = {
  batches: number;
  recipients: number;
  sends: number;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  unsubs: number;
  replies: number;
  lastSentAt?: string;
};

export const emptyTotals = (): Totals => ({ batches: 0, recipients: 0, sends: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubs: 0, replies: 0 });

/** Batches that sent something inside the span, optionally one campaign only (live app: window + campaign filter). */
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
    t.recipients += b.recipients;
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

/** Rate 0..1 or null when nothing is under it. Engagement over delivered, bounce and delivery over sent. */
export const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

// ---------------------------------------------------------------------------------------------------------------
// Send volume trend (live app buildTrend): COUNTS per bucket, bucket size per window. Buckets with no sends are 0:
// nothing was sent, so 0 is the true count (PATTERNS 9.7; user decision 2026-11-12, as the live app).
//   7 / 14 → 1 day · 30 → 3 days · 90 → 7 days · 180 → 14 days · year → 12 calendar months
//   range → 1 day up to 31 days, 7 days up to 120, else 30 days
// ---------------------------------------------------------------------------------------------------------------

/** Counts per bucket; 0 where nothing was sent, so the lines stay continuous (PATTERNS 9.7). */
export type TrendPoint = { key: string; label: string; sends: number; delivered: number; opens: number; clicks: number; replies: number };

export function trend(list: ReportBatch[], span: Span): TrendPoint[] {
  const fmt = (t: number, opts: Intl.DateTimeFormatOptions) => new Date(t).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  const day = (t: number) => fmt(t, { month: "short", day: "numeric" });
  const buckets: { start: number; end: number; label: string }[] = [];
  const now = new Date(span.until).getTime();
  if (span.key === "year") {
    const base = new Date(now);
    for (let i = 11; i >= 0; i--) {
      const s = Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1);
      const e = Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i + 1, 1);
      buckets.push({ start: s, end: e, label: fmt(s, { month: "short" }) });
    }
  } else if (span.key === "range") {
    const start0 = new Date(span.since).getTime();
    const days = Math.max(1, Math.ceil((now - start0) / DAY));
    const step = days <= 31 ? 1 : days <= 120 ? 7 : 30;
    for (let i = 0; i < Math.ceil(days / step); i++) {
      const s = start0 + i * step * DAY;
      buckets.push({ start: s, end: Math.min(s + step * DAY, now + 1), label: day(s) });
    }
  } else {
    const step = span.key === "180" ? 14 : span.key === "90" ? 7 : span.key === "30" ? 3 : 1;
    const count = Math.ceil(span.days / step);
    for (let i = count - 1; i >= 0; i--) {
      const e = now + 1 - i * step * DAY;
      const s = e - step * DAY;
      buckets.push({ start: s, end: e, label: day(s) });
    }
  }
  const acc = buckets.map(() => ({ batches: 0, sends: 0, delivered: 0, opens: 0, clicks: 0, replies: 0 }));
  for (const b of list) {
    const t = new Date(b.sentAt!).getTime();
    const i = buckets.findIndex((x) => t >= x.start && t < x.end);
    if (i < 0) continue;
    const m = b.metrics!;
    acc[i].batches++;
    acc[i].sends += b.sent;
    acc[i].delivered += m.delivered;
    acc[i].opens += m.opens;
    acc[i].clicks += m.clicks;
    acc[i].replies += m.replies;
  }
  return buckets.map((b, i) => {
    const a = acc[i];
    return { key: iso(b.start), label: b.label, sends: a.sends, delivered: a.delivered, opens: a.opens, clicks: a.clicks, replies: a.replies };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Boards: one row per campaign, template or sender (live app campAgg / tplAgg / senderAgg).
// ---------------------------------------------------------------------------------------------------------------

export type GroupRow = {
  id: string;
  name: string;
  /** Template rows: the campaign. Sender rows: the address. */
  sub?: string;
  href?: string;
  status?: CampaignStatus;
  /** Template rows: active now (live app "Active templates"). */
  active?: boolean;
  /** Sender rows: the sending domain. */
  domain?: string;
  totals: Totals;
};

export function groupBy(list: ReportBatch[], by: "campaign" | "template" | "sender"): GroupRow[] {
  const map = new Map<string, ReportBatch[]>();
  for (const b of list) {
    const k = by === "campaign" ? b.campaignId : by === "template" ? b.templateId : b.senderId;
    map.set(k, [...(map.get(k) ?? []), b]);
  }
  const rows = [...map.entries()].map(([id, bs]): GroupRow => {
    if (by === "campaign") {
      const c = sampleCampaigns.find((x) => x.id === id);
      return { id, name: c?.name ?? "Deleted campaign", status: c ? campaignStatus(c) : undefined, totals: sum(bs) };
    }
    if (by === "template") {
      const t = findTemplate(id);
      return {
        id,
        name: t?.template.name ?? "Deleted template",
        sub: t?.campaign.name,
        href: `/templates/${id}`,
        active: t?.template.status === "active",
        totals: sum(bs),
      };
    }
    const s = senderById(id);
    return { id, name: s?.name || s?.email || "Removed sender", sub: s?.email, domain: s?.email.split("@")[1], totals: sum(bs) };
  });
  // Live app: templates and senders most emails first; campaigns are ordered by the board's ranking.
  return rows.sort((a, b) => b.totals.sends - a.totals.sends);
}

/** Workspace counts for "See more" (live app totalCampaigns / activeCampaigns / totalTemplates / activeTemplates). */
export function workspaceCounts(templateRows: GroupRow[]) {
  return {
    totalCampaigns: sampleCampaigns.length,
    // A campaign is active once it has at least one active template (live app).
    activeCampaigns: sampleCampaigns.filter((c) => c.templates.some((t) => t.status === "active")).length,
    // Both template counts follow the period and campaign filters (live app fix 2026-10-26).
    totalTemplates: templateRows.length,
    activeTemplates: templateRows.filter((r) => r.active).length,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Ranking (gate ported from live app lib/email/ranking.ts). A rate is only ranked once its own denominator reaches
// 100; when fewer than 3 rows clear the gate it is lowered to the third-largest sample. Inside the gate rows are
// ordered by the plain rate shown in the column (user decision 2026-11-12: the highlighted column must read in order;
// the live app sorts by the Wilson interval), larger sample first on a tie.
// ---------------------------------------------------------------------------------------------------------------

export const MIN_SAMPLE = 100;
export type RankMetric = "open" | "click" | "reply" | "unsub" | "bounce";
export type RankMode = "top" | "lowest";

/** Live app measureLeader: engagement over delivered (sends when nothing was delivered), bounce over sent. */
export function measure(t: Totals, metric: RankMetric) {
  if (metric === "bounce") return { successes: t.bounces, denominator: t.sends };
  const engaged = t.delivered || t.sends;
  const successes = metric === "open" ? t.opens : metric === "click" ? t.clicks : metric === "reply" ? t.replies : t.unsubs;
  return { successes, denominator: engaged };
}

export function rank<T extends { totals: Totals }>(
  rows: T[],
  metric: RankMetric,
  mode: RankMode,
  { limit = 5, replyIsCount = false }: { limit?: number; replyIsCount?: boolean } = {}
) {
  // Live app rankCampaigns: on the campaign board "Replies" is a COUNT with no denominator to gate on.
  if (metric === "reply" && replyIsCount) {
    const ranked = [...rows].sort((a, b) => (mode === "top" ? b.totals.replies - a.totals.replies : a.totals.replies - b.totals.replies));
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
    return denominator > 0 ? successes / denominator : 0;
  };
  const ranked = rows
    .filter((r) => den(r) >= gate)
    .sort((a, b) => (mode === "top" ? score(b) - score(a) : score(a) - score(b)) || den(b) - den(a));
  return { ranked: ranked.slice(0, limit), belowGate: rows.filter((r) => den(r) < gate), gate, lowered };
}


// ---------------------------------------------------------------------------------------------------------------
// Deliverability by recipient domain (live app: top 8 domains, the rest folded into "Others" so the table adds up
// to the KPIs).
// ---------------------------------------------------------------------------------------------------------------

export type DomainRow = { id: string; name: string; others?: number; totals: Totals };

export function byRecipientDomain(list: ReportBatch[], top = 8): DomainRow[] {
  const map = new Map<string, Totals>();
  for (const b of list) {
    for (const r of withReplies(b, recipientRows(b))) {
      if (r.status === "pending") continue;
      const t = map.get(r.domain) ?? emptyTotals();
      t.sends++;
      t.recipients++;
      if (r.delivered) t.delivered++;
      if (r.bounced) t.bounces++;
      if (r.opened) t.opens++;
      if (r.clicked) t.clicks++;
      if (r.unsubscribed) t.unsubs++;
      if (r.reply) t.replies++;
      map.set(r.domain, t);
    }
  }
  const rows = [...map.entries()].map(([d, totals]) => ({ id: d, name: d, totals })).sort((a, b) => b.totals.sends - a.totals.sends);
  if (rows.length <= top) return rows;
  const rest = rows.slice(top);
  const others = emptyTotals();
  for (const r of rest) {
    for (const k of ["recipients", "sends", "delivered", "opens", "clicks", "bounces", "unsubs", "replies"] as const) others[k] += r.totals[k];
  }
  return [...rows.slice(0, top), { id: "others", name: "Others", others: rest.length, totals: others }];
}
