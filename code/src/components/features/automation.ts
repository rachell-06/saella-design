"use client";

import { useSyncExternalStore } from "react";
import { type FollowUp, TODAY, sampleCampaigns } from "@/lib/mock/campaigns";
import { SHARED_MONTHLY_CAP, SHARED_USED_THIS_MONTH } from "@/lib/mock/constants";
import { DEFAULT_SENDER_ID, senderById, withBatchTotals } from "@/lib/mock/templates";
import { UNLOCK_COST } from "@/lib/mock/unlocks";
import { WORKSPACE_TZ } from "@/lib/time";

// Automations of a template, modelled on the live app (Repo supabase/migrations/20260714000001_email_automations.sql,
// 20260720000002_automation_flows.sql; TemplateAutomateModal, ScheduleConfigModal, FlowConfigModal).
// Mock store kept in memory for the session, so a change in the Automate dialog shows on every template screen.

export type ScheduleStatus = "active" | "paused" | "completed";

export type Schedule = {
  id: string;
  templateId: string;
  status: ScheduleStatus;
  /** Live app ScheduleConfigModal: once on a date, every day, or picked weekdays ("custom"). */
  cadence: "once" | "daily" | "custom";
  /** 0 = Sunday … 6 = Saturday; custom only. */
  days: number[];
  /** once only: the local date it sends on, "YYYY-MM-DD". */
  runOn?: string;
  sendHour: number;
  timezone: string;
  /** Sender id; empty = the business default sender (live app sender_id null). */
  senderId?: string;
  /**
   * Emails per run (live app per_run_cap; PRD AC-EC-A-03), at most the sender domain's daily cap
   * (lib/mock/batches.ts dailyCapFor). Each run sends to this many of the campaign's matches not reached yet.
   */
  perRunCap: number;
  /**
   * What the schedule could reach when it was set: the campaign's matches, unlocked + locked, Ceased left out
   * (lib/mock/company-audience.ts campaignReach). Shown as "~N": the registry keeps changing. Mock
   * order: runs reach unlocked companies first (free), then locked ones, unlocking each for a credit as it is reached.
   */
  reach: { total: number; unlocked: number };
  sentCount: number;
  /** target_reached: every match was reached; campaign_ended: the campaign's end date passed (AC-EC-A-05). */
  completedReason?: "campaign_ended" | "target_reached";
  completedOn?: string;
};

/**
 * Follow-up flow attached to a template (PRD-02 AC-EC-F-01): an ordered chain of 1 to 10 steps, each a condition,
 * a wait and a template (AC-EC-F-02/03, BR-RULE-EC-33). A condition is checked against the email just before it
 * in the chain (AC-EC-F-04). The live app's FlowConfigModal now saves one step only; Saella keeps the PRD's chain
 * (decisions.md).
 */
export type FlowTrigger = "no_open" | "no_click" | "opened_no_click" | "clicked" | "no_reply";

export type FlowStep = { templateId: string; trigger: FlowTrigger; delayHours: number };

export type Flow = {
  id: string;
  /** The template that starts the chain. */
  templateId: string;
  steps: FlowStep[];
  status: "active" | "paused";
  /** Follow-up emails sent by the whole flow (live app flow table "Sent"; no per-step count in PRD or live). */
  sent: number;
};

export const FLOW_STEPS_MAX = 10;

/** AC-EC-F-02 conditions, worded as the live app's FlowConfigModal (flow.trig.*), shortened for tables. */
export const FLOW_TRIGGERS: { value: FlowTrigger; label: string }[] = [
  { value: "no_open", label: "Didn't open" },
  { value: "no_click", label: "Didn't click" },
  { value: "opened_no_click", label: "Opened, didn't click" },
  { value: "clicked", label: "Clicked" },
  { value: "no_reply", label: "Didn't reply" },
];
export const flowTriggerLabel = (t: FlowTrigger) => FLOW_TRIGGERS.find((x) => x.value === t)?.label ?? t;

/** Older one-rule values in the Campaigns mock, mapped as the live app maps its pre-sequence buckets. */
const LEGACY_TRIGGER: Record<FollowUp["trigger"], FlowTrigger> = {
  no_engagement: "no_open",
  opened: "clicked",
  clicked: "clicked",
};

export const DELAY_MIN = 1;
export const DELAY_MAX = 1440; // AC-EC-F-03

export const TIMEZONES = [
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City (GMT+7)" },
  { value: "Asia/Bangkok", label: "Bangkok (GMT+7)" },
  { value: "Asia/Jakarta", label: "Jakarta (GMT+7)" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (GMT+8)" },
  { value: "Asia/Manila", label: "Manila (GMT+8)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
];

export const DELAYS = [
  { value: 4, label: "4 hours" },
  { value: 24, label: "1 day" },
  { value: 48, label: "2 days" },
  { value: 72, label: "3 days" },
  { value: 120, label: "5 days" },
  { value: 168, label: "1 week" },
  { value: 336, label: "2 weeks" },
];

export const WEEKDAYS = [
  { value: 1, short: "Mon" },
  { value: 2, short: "Tue" },
  { value: 3, short: "Wed" },
  { value: 4, short: "Thu" },
  { value: 5, short: "Fri" },
  { value: 6, short: "Sat" },
  { value: 0, short: "Sun" },
];

export const hhmm = (h: number) => `${String(h).padStart(2, "0")}:00`;
export const tzLabel = (tz: string) => TIMEZONES.find((t) => t.value === tz)?.label ?? tz;

/** A campaign market's zone (TIMEZONES), for the schedule's default. */
const MARKET_TZ: Record<string, string> = {
  Vietnam: "Asia/Ho_Chi_Minh",
  Thailand: "Asia/Bangkok",
  Indonesia: "Asia/Jakarta",
  Malaysia: "Asia/Kuala_Lumpur",
  Philippines: "Asia/Manila",
  Singapore: "Asia/Singapore",
};

/** Default send zone of a new schedule (PATTERNS 9.8): the campaign's country when it targets exactly one, else the
 *  workspace's (WORKSPACE_TZ). The user can pick another; the schedule keeps its own (live app automation `timezone`). */
export function campaignTimezone(c: { countries: string[] }) {
  return (c.countries.length === 1 && MARKET_TZ[c.countries[0]]) || WORKSPACE_TZ;
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** "Every day · 09:00", "Tue, Thu · 09:00" or "On Fri, Oct 30 · 09:00" (live app scheduleWhen). */
export type ScheduleTiming = Pick<Schedule, "cadence" | "days" | "runOn" | "sendHour" | "timezone">;

const WEEK = 7 * 1440;
/** Minutes east of UTC, read from the zone's "(GMT+7)" label. */
function tzOffset(tz: string) {
  const m = TIMEZONES.find((z) => z.value === tz)?.label.match(/GMT([+−-])(\d+)(?::(\d+))?/);
  if (!m) return 0;
  const mins = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === "+" ? mins : -mins;
}
/** When a schedule sends, in UTC: minutes of the week (0 = Sunday 00:00) for a repeating one, one instant for Once. */
function sendSlots(t: ScheduleTiming): { weekly: Set<number> } | { at: number } {
  const off = tzOffset(t.timezone);
  const wrap = (m: number) => ((m % WEEK) + WEEK) % WEEK;
  if (t.cadence === "once") {
    if (!t.runOn) return { weekly: new Set() };
    const [y, mo, d] = t.runOn.split("-").map(Number);
    return { at: Date.UTC(y, mo - 1, d) / 60000 + t.sendHour * 60 - off };
  }
  const days = t.cadence === "daily" ? [0, 1, 2, 3, 4, 5, 6] : t.days;
  return { weekly: new Set(days.map((d) => wrap(d * 1440 + t.sendHour * 60 - off))) };
}
/** Two schedules of one template may run together, but never send at the same day and hour. */
export function scheduleClash(a: ScheduleTiming, b: ScheduleTiming) {
  const sa = sendSlots(a);
  const sb = sendSlots(b);
  // 1970-01-01 was a Thursday: shift so a Once instant lands on the same week grid.
  const weekOf = (at: number) => (((at + 4 * 1440) % WEEK) + WEEK) % WEEK;
  if ("at" in sa && "at" in sb) return sa.at === sb.at;
  if ("at" in sa) return "weekly" in sb && sb.weekly.has(weekOf(sa.at));
  if ("at" in sb) return sa.weekly.has(weekOf(sb.at));
  return [...sa.weekly].some((m) => sb.weekly.has(m));
}

export function scheduleWhen(s: Pick<Schedule, "cadence" | "days" | "sendHour" | "runOn">) {
  if (s.cadence === "daily") return `Every day · ${hhmm(s.sendHour)}`;
  if (s.cadence === "once") return s.runOn ? `On ${dayLabel(s.runOn)} · ${hhmm(s.sendHour)}` : "No date picked";
  if (s.days.length === 0) return "No days picked";
  const names = WEEKDAYS.filter((d) => s.days.includes(d.value)).map((d) => d.short);
  return `${names.join(", ")} · ${hhmm(s.sendHour)}`;
}

/** Shared sender: sends left this calendar month and its monthly limit (PRD AC-EC-I-03, BR-RULE-EC-05). */
export type MonthlyLimit = { left: number; cap: number };

/** Only the shared sender has a monthly limit. Mock: what the workspace sent from it this month is gone
 *  (SHARED_USED_THIS_MONTH); other schedules' planned runs aren't subtracted. */
export function monthlyFor(sender: { shared?: boolean } | undefined): MonthlyLimit | undefined {
  return sender?.shared ? { left: Math.max(0, SHARED_MONTHLY_CAP - SHARED_USED_THIS_MONTH), cap: SHARED_MONTHLY_CAP } : undefined;
}

/** A schedule's sender limit; no sender = the business default sender. */
const scheduleMonthly = (s: Partial<Pick<Schedule, "senderId">>) => monthlyFor(senderById(s.senderId || DEFAULT_SENDER_ID));

/**
 * Run days and sizes from `firstDay`, the one walk behind the card, its run list and the dialog's RunPlan, so they
 * agree. Each run day (daily; custom: the picked weekdays; once: that day only) sends up to `perRun`;
 * on the shared sender (`monthly`) no more than what's left of that month's limit, so the runs past it land next month
 * and their dates say so. Custom with no weekdays has no dates (null). What doesn't fit (once) isn't returned.
 */
export function runDays(
  left: number,
  perRun: number,
  t: { cadence: Schedule["cadence"]; days: number[]; firstDay: string; monthly?: MonthlyLimit },
): { size: number; date: string | null }[] {
  const per = Math.max(1, perRun);
  let rest = Math.max(0, left);
  const out: { size: number; date: string | null }[] = [];
  if (t.cadence === "custom" && t.days.length === 0) {
    for (; rest > 0; rest -= Math.min(per, rest)) out.push({ size: Math.min(per, rest), date: null });
    return out;
  }
  const thisMonth = TODAY.slice(0, 7);
  const d = new Date(`${t.firstDay}T00:00:00Z`);
  let month = "";
  let budget = 0;
  for (let guard = 0; rest > 0 && guard < 3660; guard++) {
    const iso = d.toISOString().slice(0, 10);
    if (iso.slice(0, 7) !== month) {
      month = iso.slice(0, 7);
      budget = !t.monthly ? Infinity : month <= thisMonth ? t.monthly.left : t.monthly.cap;
    }
    if (t.cadence !== "custom" || t.days.includes(d.getUTCDay())) {
      const size = Math.min(per, rest, budget);
      if (size > 0) {
        out.push({ size, date: iso });
        rest -= size;
        budget -= size;
      }
      if (t.cadence === "once") break;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Next run from the fixed "today" (morning, local time). Runs at or after today's hour count today. On the shared
 *  sender with nothing left this month, it's the first run day of next month. */
export function nextRun(
  s: Pick<Schedule, "cadence" | "days" | "sendHour" | "status" | "runOn"> & Partial<Pick<Schedule, "senderId">>,
  startsOn?: string,
) {
  if (s.status !== "active") return null;
  const from = startsOn && startsOn > TODAY ? startsOn : TODAY;
  if (s.cadence === "once" && !(s.runOn && s.runOn >= from)) return null;
  const first = runDays(1, 1, {
    cadence: s.cadence,
    days: s.days,
    firstDay: s.cadence === "once" && s.runOn ? s.runOn : from,
    monthly: scheduleMonthly(s),
  })[0];
  return first?.date ? `${dayLabel(first.date)}, ${hhmm(s.sendHour)}` : null;
}

/** "every day at 09:00", "on Tue, Thu at 09:00" or "once on Fri, Oct 30 at 09:00": the card title's cadence. */
export function cadenceAt(s: Pick<Schedule, "cadence" | "days" | "sendHour" | "runOn">) {
  const at = `at ${hhmm(s.sendHour)}`;
  if (s.cadence === "daily") return `Every day ${at}`;
  if (s.cadence === "once") return s.runOn ? `Once on ${dayLabel(s.runOn)} ${at}` : `Once ${at}`;
  const names = WEEKDAYS.filter((d) => s.days.includes(d.value)).map((d) => d.short);
  return `Every ${names.join(", ")} ${at}`;
}

/** One run of a schedule: companies it sends to, the credits it spends unlocking the locked ones among them, and its
 *  day (runs to go; null when there's none to pick). */
export type Run = { size: number; credits: number; date?: string | null };

/** Prices runs in order, the `unlockedLeft` free companies first (mock order). */
export function planRuns(runs: { size: number; date: string | null }[], unlockedLeft: number): Run[] {
  let free = Math.max(0, unlockedLeft);
  return runs.map((r) => {
    const f = Math.min(r.size, free);
    free -= f;
    return { size: r.size, credits: (r.size - f) * UNLOCK_COST, date: r.date };
  });
}

/** How many runs, in order, a balance pays for. Runs go out whole: the first one it can't pay for in full waits, and
 *  every run after it waits behind it (scheduleState "waiting"). Same maths as the top-up dialog's. */
export function runsCovered(runCosts: number[], credits: number) {
  let left = credits;
  let k = 0;
  for (const c of runCosts) {
    if (c > left) break;
    left -= c;
    k++;
  }
  return k;
}

/**
 * Where a schedule stands, the one source for the card, its run list, the top-up dialog and the Waiting state.
 * Credits are charged per run, not when the schedule is set: a run unlocks the locked companies it
 * reaches, 1 credit each (UNLOCK_COST). Mock order: unlocked first, then locked.
 * Runs already sent (mock, no run log): ceil(sent / per run), all full but the last, which holds the remainder. Runs to
 * go: what's left (total − sent) on the schedule's run days (runDays) from its next run day, in runs of up to per run
 * and, on the shared sender, within its monthly limit; the unlocked companies not reached yet go first. A once
 * schedule's companies that don't fit its day are listed after it, undated.
 */
export function scheduleProgress(
  s: Pick<Schedule, "perRunCap" | "reach" | "sentCount" | "cadence" | "days" | "runOn"> & Partial<Pick<Schedule, "senderId">>,
  /** The campaign's first day: runs don't start before it. */
  startsOn?: string,
) {
  const per = Math.max(1, s.perRunCap);
  const total = Math.max(s.reach.total, s.sentCount);
  const unlocked = Math.min(s.reach.unlocked, total);
  const left = Math.max(0, total - s.sentCount);
  const done: Run[] = Array.from({ length: Math.ceil(s.sentCount / per) }, (_, i) => {
    const size = Math.min(per, s.sentCount - i * per);
    const free = Math.max(0, Math.min(size, unlocked - i * per));
    return { size, credits: (size - free) * UNLOCK_COST };
  });
  const firstDay = s.cadence === "once" && s.runOn ? s.runOn : startsOn && startsOn > TODAY ? startsOn : TODAY;
  const days = runDays(left, per, { cadence: s.cadence, days: s.days, firstDay, monthly: scheduleMonthly(s) });
  for (let rest = left - days.reduce((a, r) => a + r.size, 0); rest > 0; rest -= Math.min(per, rest)) {
    days.push({ size: Math.min(per, rest), date: null });
  }
  const remaining = planRuns(days, Math.max(0, unlocked - s.sentCount));
  const next = remaining[0];
  return { total, left, done, remaining, nextCount: next?.size ?? 0, nextCredits: next?.credits ?? 0 };
}

/** A fresh schedule id (kept out of components: render code must stay pure). */
export const newScheduleId = (templateId: string) => `s-${templateId}-${Date.now()}`;

export type ScheduleState = "running" | "waiting" | "paused" | "completed";

/** Waiting for credits = active, but the balance can't pay for the companies its next run unlocks. It needs no
 *  Resume: once credits are bought it runs at its next run time by itself. */
export function scheduleState(s: Schedule, balance: number, startsOn?: string): ScheduleState {
  if (s.status === "completed") return "completed";
  if (s.status === "paused") return "paused";
  return scheduleProgress(s, startsOn).nextCredits > balance ? "waiting" : "running";
}

export function delayLabel(h: number) {
  const preset = DELAYS.find((d) => d.value === h);
  if (preset) return preset.label;
  return h % 24 === 0 ? `${h / 24} days` : `${h} hours`;
}

// ---------------------------------------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------------------------------------

type State = { schedules: Schedule[]; flows: Flow[] };

// Follow-ups already in the Campaigns mock become flows (one per starting template), so both screens tell the same
// story. Mock: the catalog flow (t1) gets a second step, so a multi-step chain can be seen.
const followUps = sampleCampaigns.flatMap((c) => c.templates).filter((t) => t.followUp);
const initialFlows: Flow[] = [...new Set(followUps.map((t) => t.followUp!.of))].map((start) => {
  const steps = followUps.filter((t) => t.followUp!.of === start);
  return {
    id: `f-${start}`,
    templateId: start,
    steps: [
      ...steps.map((t) => ({ templateId: t.id, trigger: LEGACY_TRIGGER[t.followUp!.trigger], delayHours: t.followUp!.delayHours })),
      ...(start === "t1" ? [{ templateId: "t3", trigger: "opened_no_click" as const, delayHours: 48 }] : []),
    ],
    status: "active" as const,
    sent: steps.reduce((x, t) => x + withBatchTotals(t).recipients, 0),
  };
});

let state: State = {
  schedules: [
    // Seeds show the four card states. Running: next run Fri Oct 30, 09:00 GMT+7 is the queued batch b5 on the Batches
    // screen; its 300 new companies cost 300 credits, within the 820 balance.
    { id: "s-t1", templateId: "t1", status: "active", cadence: "custom", days: [5], sendHour: 9, timezone: "Asia/Ho_Chi_Minh", senderId: "s1", perRunCap: 300, reach: { total: 1200, unlocked: 600 }, sentCount: 600 },
    // Completed: reached every match of the hotels list in September.
    { id: "s-t1-sep", templateId: "t1", status: "completed", cadence: "daily", days: [], sendHour: 9, timezone: "Asia/Ho_Chi_Minh", senderId: "s1", perRunCap: 250, reach: { total: 640, unlocked: 640 }, sentCount: 640, completedReason: "target_reached", completedOn: "2026-09-24" },
    // Trade fair Bangkok ended on Sep 30: its schedule completed on the next run (EC-EC-23).
    { id: "s-t4", templateId: "t4", status: "completed", cadence: "daily", days: [], sendHour: 8, timezone: "Asia/Bangkok", senderId: "s1", perRunCap: 100, reach: { total: 480, unlocked: 312 }, sentCount: 312, completedReason: "campaign_ended", completedOn: "2026-10-01" },
    { id: "s-t6", templateId: "t6", status: "paused", cadence: "daily", days: [], sendHour: 8, timezone: "Asia/Kuala_Lumpur", senderId: "s2", perRunCap: 300, reach: { total: 3000, unlocked: 2875 }, sentCount: 2875 },
    // Waiting for credits: its next run reaches 1,000 locked companies, more than the 820 credits left. Buying credits
    // in Billing lifts it; it runs again at its next run time on its own.
    { id: "s-t7", templateId: "t7", status: "active", cadence: "daily", days: [], sendHour: 10, timezone: "Asia/Ho_Chi_Minh", senderId: "s1", perRunCap: 1000, reach: { total: 2400, unlocked: 248 }, sentCount: 248 },
  ],
  flows: initialFlows,
};

const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAutomation() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** The schedule that "counts": active, else paused. A completed one is history (live app TemplateAutomateModal). */
export function currentSchedule(s: State, templateId: string) {
  const mine = s.schedules.filter((x) => x.templateId === templateId);
  return mine.find((x) => x.status === "active") ?? mine.find((x) => x.status === "paused") ?? null;
}

export const automation = {
  saveSchedule(s: Schedule) {
    const exists = state.schedules.some((x) => x.id === s.id);
    set({ ...state, schedules: exists ? state.schedules.map((x) => (x.id === s.id ? s : x)) : [...state.schedules, s] });
  },
  deleteSchedule(id: string) {
    set({ ...state, schedules: state.schedules.filter((x) => x.id !== id) });
  },
  /** Several flows per template: replaces the flow with the same id, else adds it. */
  saveFlow(f: Flow) {
    const exists = state.flows.some((x) => x.id === f.id);
    set({ ...state, flows: exists ? state.flows.map((x) => (x.id === f.id ? f : x)) : [...state.flows, f] });
  },
  deleteFlow(id: string) {
    set({ ...state, flows: state.flows.filter((x) => x.id !== id) });
  },
};
