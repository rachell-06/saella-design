import { type ReportBatch, allBatches, recipientRows, senderById } from "@/lib/mock/batches";
import { type Campaign, campaignStatus } from "@/lib/mock/campaigns";
import { withReplies } from "@/lib/mock/replies";
import { WORKSPACE_TZ } from "@/lib/time";
import type { CampaignStatus } from "@/components/saella/status-badge";

// Overview metrics, ported from the live app: app/dashboard/email/metrics/page.tsx (aggregation, trend buckets,
// boards, deliverability) and
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

/**
 * Batches as Overview counts them, over the campaigns as of now (currentCampaigns / useCurrentCampaigns): each one in
 * the campaign its template sits in now (a moved template takes its sends along), and none of a deleted template or
 * campaign (live app metrics page: batches of soft-deleted templates leave every KPI and board; a campaign delete
 * cascades to its templates). Archived campaigns keep their sends.
 */
export function liveBatches(campaigns: Campaign[]): ReportBatch[] {
  const home = new Map(campaigns.flatMap((c) => c.templates.map((t) => [t.id, c.id] as const)));
  return allBatches().flatMap((b) => {
    const campaignId = home.get(b.templateId);
    return campaignId ? [{ ...b, campaignId }] : [];
  });
}

/** Batches that sent something inside the span, optionally one campaign only (live app: window + campaign filter). */
export function sentIn(campaigns: Campaign[], span: Span, campaignId?: string | null): ReportBatch[] {
  return liveBatches(campaigns).filter(
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
// Send volume trend: COUNTS per bucket. Buckets with no sends are 0: nothing was sent, so 0 is the true count
// (as the live app). Bucket size by the length of the period (// not the live app's 3- and 14-day buckets): up to 31 days one per day, up to 120 one per week (Mon–Sun), longer one
// per calendar month. Days are workspace days (GMT+7, lib/time.ts): a batch counts on the day it went out there.
// ---------------------------------------------------------------------------------------------------------------

/** Counts per bucket; 0 where nothing was sent, so the lines stay continuous. `label` is the axis
 *  tick (day number, month only on the first column and the 1st), `tip` the bucket in full for the tooltip. */
export type TrendPoint = { key: string; label: string; tip: string; sends: number; delivered: number; opens: number; clicks: number; replies: number };

/** Calendar day "YYYY-MM-DD" as a day count, and back (UTC arithmetic on dates only, no clock time). */
const dayNum = (ymd: string) => Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10))) / DAY;
const dayStr = (d: number) => iso(d * DAY).slice(0, 10);
/** The workspace day a moment falls on. */
const workspaceDay = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: WORKSPACE_TZ });
const fmtDay = (d: number, opts: Intl.DateTimeFormatOptions) => new Date(d * DAY).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

export function trend(list: ReportBatch[], span: Span): TrendPoint[] {
  // The period's calendar days (period.ts writes them as UTC bounds: since is the last moment before the first day).
  const first = dayNum(iso(new Date(span.since).getTime() + 1000).slice(0, 10));
  const last = dayNum(span.until.slice(0, 10));
  const days = last - first + 1;
  const buckets: { start: number; end: number; label: string; tip: string }[] = [];
  if (days <= 31) {
    for (let d = first; d <= last; d++) {
      const dom = Number(dayStr(d).slice(8, 10));
      buckets.push({
        start: d,
        end: d,
        label: d === first || dom === 1 ? fmtDay(d, { month: "short", day: "numeric" }) : String(dom),
        tip: fmtDay(d, { weekday: "short", month: "short", day: "numeric" }),
      });
    }
  } else if (days <= 120) {
    // Weeks run Monday to Sunday; the first and last may be cut by the period.
    const monday = first - ((new Date(first * DAY).getUTCDay() + 6) % 7);
    for (let w = monday; w <= last; w += 7) {
      const s = Math.max(w, first);
      const e = Math.min(w + 6, last);
      const short = (d: number) => fmtDay(d, { month: "short", day: "numeric" });
      buckets.push({ start: s, end: e, label: short(s), tip: s === e ? short(s) : `${short(s)} – ${short(e)}` });
    }
  } else {
    const f = new Date(first * DAY);
    let y = f.getUTCFullYear();
    let m = f.getUTCMonth();
    while (Date.UTC(y, m, 1) / DAY <= last) {
      const s = Math.max(Date.UTC(y, m, 1) / DAY, first);
      const e = Math.min(Date.UTC(y, m + 1, 1) / DAY - 1, last);
      const isFirst = buckets.length === 0;
      buckets.push({
        start: s,
        end: e,
        label: fmtDay(s, isFirst || m === 0 ? { month: "short", year: "numeric" } : { month: "short" }),
        tip: fmtDay(s, { month: "long", year: "numeric" }),
      });
      m += 1;
      if (m === 12) {
        m = 0;
        y += 1;
      }
    }
  }
  const acc = buckets.map(() => ({ sends: 0, delivered: 0, opens: 0, clicks: 0, replies: 0 }));
  for (const b of list) {
    const d = dayNum(workspaceDay(new Date(b.sentAt!).getTime()));
    const i = buckets.findIndex((x) => d >= x.start && d <= x.end);
    if (i < 0) continue;
    const m = b.metrics!;
    acc[i].sends += b.sent;
    acc[i].delivered += m.delivered;
    acc[i].opens += m.opens;
    acc[i].clicks += m.clicks;
    acc[i].replies += m.replies;
  }
  return buckets.map((b, i) => ({ key: dayStr(b.start), label: b.label, tip: b.tip, ...acc[i] }));
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

/** `campaigns`: as of now, archived ones included (`archived` lists them); names, status and active come from it. */
export function groupBy(
  list: ReportBatch[],
  by: "campaign" | "template" | "sender",
  campaigns: Campaign[],
  archived: readonly string[] = []
): GroupRow[] {
  const map = new Map<string, ReportBatch[]>();
  for (const b of list) {
    const k = by === "campaign" ? b.campaignId : by === "template" ? b.templateId : b.senderId;
    map.set(k, [...(map.get(k) ?? []), b]);
  }
  const rows = [...map.entries()].map(([id, bs]): GroupRow => {
    if (by === "campaign") {
      const c = campaigns.find((x) => x.id === id);
      return { id, name: c?.name ?? "Deleted campaign", status: c ? campaignRowStatus(c, archived) : undefined, totals: sum(bs) };
    }
    if (by === "template") {
      const c = campaigns.find((x) => x.templates.some((t) => t.id === id));
      const t = c?.templates.find((x) => x.id === id);
      return {
        id,
        name: t?.name ?? "Deleted template",
        sub: c?.name,
        href: `/templates/${id}`,
        // Status as of now: Mark active / inactive this session, and inactive once the campaign has ended.
        active: t?.status === "active",
        totals: sum(bs),
      };
    }
    const s = senderById(id);
    return { id, name: s?.name || s?.email || "Removed sender", sub: s?.email, domain: s?.email.split("@")[1], totals: sum(bs) };
  });
  // Live app: templates and senders most emails first; campaigns are ordered by the board's ranking.
  return rows.sort((a, b) => b.totals.sends - a.totals.sends);
}

/** A campaign's badge on the boards: Archived over its dates (live app metrics page). */
export const campaignRowStatus = (c: Campaign, archived: readonly string[]): CampaignStatus =>
  archived.includes(c.id) ? "archived" : campaignStatus(c);

/** Workspace counts for "See more" (live app totalCampaigns / activeCampaigns / totalTemplates / activeTemplates).
 *  `campaigns`: the ones Overview lists (as of now, archived left out). */
export function workspaceCounts(templateRows: GroupRow[], campaigns: Campaign[]) {
  return {
    totalCampaigns: campaigns.length,
    // A campaign is active once it has at least one active template (live app).
    activeCampaigns: campaigns.filter((c) => c.templates.some((t) => t.status === "active")).length,
    // Both template counts follow the period and campaign filters.
    totalTemplates: templateRows.length,
    activeTemplates: templateRows.filter((r) => r.active).length,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Ranking (gate ported from live app lib/email/ranking.ts). A rate is only ranked once its own denominator reaches
// 100; when fewer than 3 rows clear the gate it is lowered to the third-largest sample. Inside the gate rows are
// ordered by the plain rate shown in the column (so the highlighted column reads in order; the live app sorts by the
// Wilson interval), larger sample first on a tie.
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
  { limit = 5 }: { limit?: number } = {}
) {
  // Replies rank as a rate on every board (the live app's campaign board ranks the count).
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
