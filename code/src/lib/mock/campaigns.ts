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
  industries: string[];
  templates: Template[];
};

import { CURRENT_USER, TODAY } from "@/lib/mock/constants";
export { CURRENT_USER, TODAY };

// Markets a campaign targets (free text in the live app), not the company-registry COUNTRIES.
export const MARKETS = ["Vietnam", "Thailand", "Indonesia", "Malaysia", "Philippines", "Singapore"];
// ISIC sections, shortened. The live app uses the full ISIC tree.
export const INDUSTRIES = [
  "Accommodation and food service",
  "Wholesale and retail trade",
  "Construction",
  "Manufacturing",
  "Real estate",
  "Transportation and storage",
  "Professional services",
];

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
    industries: ["Accommodation and food service"],
    templates: [
      t({ id: "t1", name: "Intro – ceramics catalog", recipients: 1240, delivered: 1218, opens: 466, clicks: 74, bounces: 22, unsubs: 6, lastSent: "2026-10-26T02:00:00Z" }),
      // Same totals as its only batch b2, still sending (SHARED_METRICS in batches/_components/data.ts), so Campaigns,
      // Templates, the batch report and the agent agree (2026-11-05). Not derived here: batches data imports this file.
      t({ id: "t2", name: "Follow-up 1 – catalog reminder", followUp: { of: "t1", trigger: "no_engagement", delayHours: 72 }, recipients: 412, delivered: 405, opens: 121, clicks: 17, bounces: 5, unsubs: 1, lastSent: "2026-10-27T02:00:00Z" }),
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
    industries: ["Accommodation and food service", "Wholesale and retail trade", "Construction"],
    templates: [
      t({ id: "t4", name: "Nice to meet you at the fair", recipients: 312, delivered: 305, opens: 158, clicks: 41, bounces: 7, unsubs: 2, lastSent: "2026-09-12T01:30:00Z" }),
      t({ id: "t5", name: "Fair samples follow-up", followUp: { of: "t4", trigger: "opened", delayHours: 48 }, recipients: 150, delivered: 149, opens: 66, clicks: 12, bounces: 1, unsubs: 0, lastSent: "2026-09-19T01:30:00Z" }),
    ],
  },
  {
    id: "c3",
    name: "Distributor check-in Q4",
    countries: ["Malaysia", "Indonesia", "Philippines"],
    industries: ["Wholesale and retail trade"],
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
    industries: ["Construction", "Real estate"],
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
    industries: ["Accommodation and food service"],
    templates: [],
  },
];
