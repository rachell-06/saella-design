"use client";

import { useSyncExternalStore } from "react";
import { type FollowUp, TODAY, sampleCampaigns } from "@/app/(app)/campaigns/_components/data";
import { withBatchTotals } from "./data";

// Automations of a template, modelled on the live app (Repo supabase/migrations/20260714000001_email_automations.sql,
// 20260720000002_automation_flows.sql; TemplateAutomateModal, ScheduleConfigModal, FlowConfigModal).
// Mock store kept in memory for the session, so a change in the Automate dialog shows on every template screen.

export type ScheduleStatus = "active" | "paused" | "completed";

export type Schedule = {
  id: string;
  templateId: string;
  status: ScheduleStatus;
  /** AC-EC-A-02. The live app calls weekly "custom" (a send hour per picked weekday). */
  cadence: "daily" | "weekly";
  /** 0 = Sunday … 6 = Saturday; weekly only. */
  days: number[];
  sendHour: number;
  timezone: string;
  /** AC-EC-A-03: 1–100,000, default 200. */
  perRunCap: number;
  /** AC-EC-A-03: 0 = unlimited ("continuous"). */
  targetTotal: number;
  sentCount: number;
  completedReason?: "campaign_ended" | "target_reached";
  completedOn?: string;
};

/** One follow-up rule per template (live app FlowConfigModal: one If / Wait / Send step). */
export type Flow = {
  id: string;
  templateId: string;
  stepTemplateId: string;
  trigger: FollowUp["trigger"];
  delayHours: number;
  status: "active" | "paused";
  sent: number;
};

export const PER_RUN_DEFAULT = 200;
export const PER_RUN_MAX = 100_000;
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

/** "Every day · 09:00" or "Tue, Thu · 09:00" (live app scheduleWhen). */
export function scheduleWhen(s: Pick<Schedule, "cadence" | "days" | "sendHour">) {
  if (s.cadence === "daily") return `Every day · ${hhmm(s.sendHour)}`;
  if (s.days.length === 0) return "No days picked";
  const names = WEEKDAYS.filter((d) => s.days.includes(d.value)).map((d) => d.short);
  return `${names.join(", ")} · ${hhmm(s.sendHour)}`;
}

/** Next run from the fixed "today" (morning, local time). Runs at or after today's hour count today. */
export function nextRun(s: Pick<Schedule, "cadence" | "days" | "sendHour" | "status">, startsOn?: string) {
  if (s.status !== "active") return null;
  const from = startsOn && startsOn > TODAY ? startsOn : TODAY;
  const base = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < 8; i++) {
    const d = new Date(base.getTime() + i * 86_400_000);
    if (s.cadence === "daily" || s.days.includes(d.getUTCDay())) {
      const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
      return `${date}, ${hhmm(s.sendHour)}`;
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

// Follow-ups already in the Campaigns mock become flows, so both screens tell the same story.
const initialFlows: Flow[] = sampleCampaigns
  .flatMap((c) => c.templates)
  .filter((t) => t.followUp)
  .map((t) => ({
    id: `f-${t.id}`,
    templateId: t.followUp!.of,
    stepTemplateId: t.id,
    trigger: t.followUp!.trigger,
    delayHours: t.followUp!.delayHours,
    status: "active",
    sent: withBatchTotals(t).recipients,
  }));

let state: State = {
  schedules: [
    // Next run Fri Oct 30, 09:00 GMT+7 is the queued batch b5 (600 recipients) on the Batches screen.
    { id: "s-t1", templateId: "t1", status: "active", cadence: "weekly", days: [5], sendHour: 9, timezone: "Asia/Ho_Chi_Minh", perRunCap: 600, targetTotal: 0, sentCount: 0 },
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
  saveFlow(f: Flow) {
    const others = state.flows.filter((x) => x.templateId !== f.templateId);
    set({ ...state, flows: [...others, f] });
  },
  deleteFlow(id: string) {
    set({ ...state, flows: state.flows.filter((x) => x.id !== id) });
  },
};
