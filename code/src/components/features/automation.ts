"use client";

import { useSyncExternalStore } from "react";
import { type FollowUp, TODAY, sampleCampaigns } from "@/lib/mock/campaigns";
import { withBatchTotals } from "@/lib/mock/templates";

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
   * Who each run sends to (designer 2026-11-13): unlocked registry companies matching filters (prefilled from the
   * campaign's targeting), or Self-upload contacts by tag. Absent = the campaign's targeting, unlocked companies.
   * Live app + PRD AC-EC-A-01: always the campaign's registry filters (decisions.md).
   */
  audience?:
    | { source: "companies"; countries: string[]; isic: string[] }
    | { source: "contacts"; tags: string[]; excludeTags: string[] };
  /**
   * @deprecated The live app no longer asks for a per-run cap or a total: the engine splits the workspace's daily
   * allowance between the schedules running that day. Kept only so older readers still compile; the dialog
   * no longer sets it.
   */
  perRunCap: number;
  /** @deprecated See perRunCap. 0 = no total. */
  targetTotal: number;
  sentCount: number;
  completedReason?: "campaign_ended" | "target_reached";
  completedOn?: string;
};

/**
 * Follow-up flow attached to a template (PRD-02 AC-EC-F-01): an ordered chain of 1 to 10 steps, each a condition,
 * a wait and a template (AC-EC-F-02/03, BR-RULE-EC-33). A condition is checked against the email just before it
 * in the chain (AC-EC-F-04). The live app's FlowConfigModal now saves one step only; Saella keeps the PRD's chain
 * (designer 2026-11-13, decisions.md).
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

export const TRIGGERS: { value: FollowUp["trigger"]; label: string }[] = [
  { value: "no_engagement", label: "Didn't open or click" },
  { value: "opened", label: "Opened" },
  { value: "clicked", label: "Clicked a link" },
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

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** "Every day · 09:00", "Tue, Thu · 09:00" or "On Fri, Oct 30 · 09:00" (live app scheduleWhen). */
export function scheduleWhen(s: Pick<Schedule, "cadence" | "days" | "sendHour" | "runOn">) {
  if (s.cadence === "daily") return `Every day · ${hhmm(s.sendHour)}`;
  if (s.cadence === "once") return s.runOn ? `On ${dayLabel(s.runOn)} · ${hhmm(s.sendHour)}` : "No date picked";
  if (s.days.length === 0) return "No days picked";
  const names = WEEKDAYS.filter((d) => s.days.includes(d.value)).map((d) => d.short);
  return `${names.join(", ")} · ${hhmm(s.sendHour)}`;
}

/** Next run from the fixed "today" (morning, local time). Runs at or after today's hour count today. */
export function nextRun(s: Pick<Schedule, "cadence" | "days" | "sendHour" | "status" | "runOn">, startsOn?: string) {
  if (s.status !== "active") return null;
  const from = startsOn && startsOn > TODAY ? startsOn : TODAY;
  if (s.cadence === "once") return s.runOn && s.runOn >= from ? `${dayLabel(s.runOn)}, ${hhmm(s.sendHour)}` : null;
  const base = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < 8; i++) {
    const d = new Date(base.getTime() + i * 86_400_000);
    if (s.cadence === "daily" || s.days.includes(d.getUTCDay())) {
      return `${dayLabel(d.toISOString().slice(0, 10))}, ${hhmm(s.sendHour)}`;
    }
  }
  return null;
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
    // Next run Fri Oct 30, 09:00 GMT+7 is the queued batch b5 (600 recipients) on the Batches screen.
    { id: "s-t1", templateId: "t1", status: "active", cadence: "custom", days: [5], sendHour: 9, timezone: "Asia/Ho_Chi_Minh", perRunCap: 600, targetTotal: 0, sentCount: 0 },
    // Trade fair Bangkok ended on Sep 30: its schedule completed on the next run (EC-EC-23).
    { id: "s-t4", templateId: "t4", status: "completed", cadence: "daily", days: [], sendHour: 8, timezone: "Asia/Bangkok", perRunCap: 100, targetTotal: 0, sentCount: 312, completedReason: "campaign_ended", completedOn: "2026-10-01" },
    { id: "s-t6", templateId: "t6", status: "paused", cadence: "daily", days: [], sendHour: 8, timezone: "Asia/Kuala_Lumpur", perRunCap: 300, targetTotal: 3000, sentCount: 2875 },
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
  /** One flow per starting template (live app: "a flow belongs to exactly one template"). */
  saveFlow(f: Flow) {
    const others = state.flows.filter((x) => x.templateId !== f.templateId);
    set({ ...state, flows: [...others, f] });
  },
  deleteFlow(id: string) {
    set({ ...state, flows: state.flows.filter((x) => x.id !== id) });
  },
};
