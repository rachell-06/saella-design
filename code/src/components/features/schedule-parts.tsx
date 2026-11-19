"use client";

import { useState } from "react";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/mock/campaigns";
import { UNLOCK_COST } from "@/lib/mock/unlocks";
import { creditsUsd } from "@/lib/mock/pricing";
import { DatePicker } from "@/components/saella/date-picker";
import { Hint } from "@/components/saella/hint";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type MonthlyLimit,
  type Schedule,
  TIMEZONES,
  WEEKDAYS,
  hhmm,
  planRuns,
  runDays,
  runsCovered,
} from "@/components/features/automation";

// Pieces of the schedule dialog (automate-dialog.tsx; Set schedule and Edit): the "When to send" sentence, Emails per
// run (a slider plus an exact number, up to the sender domain's daily cap) and the run plan under them (how many
// runs, what the next one reaches and may cost).

const HOURS = Array.from({ length: 24 }, (_, h) => h);
/** Slider keys: steps of the round grid each key moves (EmailsPerRun). */
const KEY_STEP: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
const n = (x: number) => x.toLocaleString("en-US");

export type Timing = Pick<
  Schedule,
  "cadence" | "days" | "runOn" | "sendHour" | "timezone"
>;

export function timingErrors(t: {
  cadence: Schedule["cadence"];
  days: string[];
  runOn: string;
}) {
  return {
    daysError:
      t.cadence === "custom" && t.days.length === 0
        ? "Pick at least one day"
        : null,
    dateError:
      t.cadence === "once" && !t.runOn ? "Pick the date it sends on" : null,
  };
}

/** One sentence: "Send [Every day] at [09:00] <time zone>". Once adds its date inside the sentence; On these days
 *  adds the weekday row under it. `children` goes under it (RunPlan). */
export function WhenToSend({
  cadence,
  onCadence,
  runOn,
  onRunOn,
  days,
  onDays,
  sendHour,
  onSendHour,
  timezone,
  onTimezone,
  firstDay,
  endsOn,
  disabled,
  showErrors,
  onceBlocked,
  children,
}: {
  cadence: Schedule["cadence"];
  onCadence: (c: Schedule["cadence"]) => void;
  runOn: string;
  onRunOn: (d: string) => void;
  days: string[];
  onDays: (d: string[]) => void;
  sendHour: number;
  onSendHour: (h: number) => void;
  timezone: string;
  onTimezone: (tz: string) => void;
  firstDay: string;
  endsOn?: string;
  disabled: boolean;
  showErrors: boolean;
  /** Why Once is off (more companies than one day's limit), if it is. */
  onceBlocked?: string;
  children?: React.ReactNode;
}) {
  const { daysError, dateError } = timingErrors({ cadence, days, runOn });
  // Send zone (PATTERNS 9.8): defaults to the campaign's country, saved on the schedule.
  const tz = (
    <Select value={timezone} onValueChange={onTimezone} disabled={disabled}>
      <SelectTrigger className="w-56" aria-label="Time zone">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {TIMEZONES.map((z) => (
            <SelectItem key={z.value} value={z.value}>
              {z.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
  return (
    <FieldSet>
      <FieldLegend variant="label">When to send</FieldLegend>
      <Field
        data-invalid={showErrors && (dateError || daysError) ? true : undefined}
      >
        {/* Only the joining words are muted; the picked values keep the normal text colour. */}
        <div className="flex flex-wrap items-center gap-2 text-sm font-normal [&>span]:text-muted-foreground">
          <span>Send</span>
          <Select
            value={cadence}
            onValueChange={(v) => onCadence(v as Schedule["cadence"])}
            disabled={disabled}
          >
            <SelectTrigger className="w-36" aria-label="How often">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="once" disabled={Boolean(onceBlocked)}>
                  Once
                  {onceBlocked && <span className="text-muted-foreground"> · {onceBlocked}</span>}
                </SelectItem>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="custom">On these days</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {cadence === "once" && (
            <>
              <span>on</span>
              <DatePicker
                value={runOn}
                onChange={onRunOn}
                min={firstDay}
                max={endsOn}
                invalid={Boolean(showErrors && dateError)}
                aria-label="Send on"
                className="w-40"
              />
            </>
          )}
          <span>at</span>
          <Select
            value={String(sendHour)}
            onValueChange={(v) => onSendHour(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger className="w-24 tabular-nums" aria-label="Send at">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {hhmm(h)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {tz}
        </div>
        {cadence === "custom" && (
          <ToggleGroup
            type="multiple"
            variant="outline"
            spacing={0}
            value={days}
            onValueChange={onDays}
            disabled={disabled}
            aria-label="Days of the week"
          >
            {WEEKDAYS.map((d) => (
              <ToggleGroupItem
                key={d.value}
                value={String(d.value)}
                className="w-12"
              >
                {d.short}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {showErrors && dateError ? (
          <FieldError>{dateError}</FieldError>
        ) : showErrors && daysError ? (
          <FieldError>{daysError}</FieldError>
        ) : null}
      </Field>
      {children}
    </FieldSet>
  );
}

/** Text of the Companies to send field: a whole number from `min` (1, or what an edited schedule already sent) to the
 *  companies that fit. */
export function perRunError(text: string, fits: number, min = 1) {
  const v = Number(text);
  if (!text.trim() || !Number.isInteger(v) || v < 1)
    return "Type a whole number from 1";
  if (v < min) return `It already sent to ${n(min)}. Pick at least that.`;
  if (v > fits) return `Only ${n(fits)} ${fits === 1 ? "company fits" : "companies fit"}`;
  return null;
}

/** Companies per run: a slider with an exact number on the right. The slider's top is the sender domain's daily
 *  cap. */
export function EmailsPerRun({
  value,
  onChange,
  cap,
  matches,
  min = 1,
  domain,
  disabled,
  showErrors,
}: {
  value: string;
  onChange: (v: string) => void;
  cap: number;
  /** Companies that fit: the bar's top. */
  matches: number;
  /** The lowest it can go: 1, or what an edited schedule already sent (the bar stops there). */
  min?: number;
  domain: string;
  disabled: boolean;
  showErrors: boolean;
}) {
  // Companies to send: the bar runs to every company that fits; past the domain's daily limit Saella splits it into
  // several runs (the plan below says how many). Typing more than fit snaps back on leaving.
  const limit = Math.max(1, matches);
  const floor = Math.min(limit, Math.max(1, min));
  const error = perRunError(value, limit, floor);
  // Thousands separators only once the field is left: formatting while typing moves the caret.
  const [typing, setTyping] = useState(false);
  const shown = Boolean(error) && showErrors;
  const max = limit;
  const step = Math.max(1, Math.round(max / 20));
  // The bar starts at the real floor (1, or what an edited schedule already sent), so it never offers a value the
  // field would refuse. Ticks: the floor, then the round quarters of the top that sit clear of it.
  const span = Math.max(1, max - floor);
  const ticks = [
    ...new Set([floor, ...[0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f)).filter((t) => t - floor > span * 0.12)]),
  ];
  const num = Math.min(max, Math.max(floor, Number(value) || floor));
  // Dragging lands on round steps (600, 1,200…), not floor + k·step (601, 1,201…); the ends stay reachable.
  const snap = (v: number) => (v >= max ? max : v <= floor ? floor : Math.max(floor, Math.round(v / step) * step));
  // Arrow / Page keys step on the same round grid (Radix would step from the floor, and snapping its 601 back to 600
  // would leave the thumb stuck). Home / End stay Radix's.
  function onSliderKey(e: React.KeyboardEvent) {
    const by = KEY_STEP[e.key];
    if (!by) return;
    e.preventDefault();
    const next = by > 0 ? (Math.floor(num / step) + by) * step : (Math.ceil(num / step) + by) * step;
    onChange(String(Math.min(max, Math.max(floor, next))));
  }
  return (
    <Field data-invalid={shown ? true : undefined}>
      {/* "Companies", like the header and the plan (emails vs companies read as two things). */}
      {/* The domain's daily limit sits in a tip by the label; the bar's top shows it too. */}
      <div className="flex items-center gap-1.5">
        <FieldLabel htmlFor="sch-per-run">How many companies should this schedule reach?</FieldLabel>
        <Hint label={`${domain} sends up to ${n(cap)} a day. More goes out over several days.`}>
          <span tabIndex={0} className="inline-flex rounded-sm text-muted-foreground" aria-label={`Daily limit: ${n(cap)} from ${domain}`}>
            <InfoIcon aria-hidden className="size-3.5" />
          </span>
        </Hint>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex min-w-60 flex-1 flex-col gap-2">
          <Slider
            aria-label="Companies this schedule reaches"
            aria-valuetext={`${n(num)} companies`}
            min={floor}
            max={max}
            step={step}
            value={[num]}
            onValueChange={([v]) => onChange(String(snap(v)))}
            onKeyDown={onSliderKey}
            disabled={disabled || floor >= max}
          />
          <div
            className="relative h-4 text-xs text-muted-foreground tabular-nums"
            aria-hidden
          >
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute -translate-x-1/2"
                style={{
                  left: `calc(0.5rem + (100% - 1rem) * ${floor >= max ? 1 : (t - floor) / span})`,
                }}
              >
                {n(t)}
              </span>
            ))}
          </div>
        </div>
        {/* Just the number; the label says it's per run. */}
        <Input
          id="sch-per-run"
          inputMode="numeric"
          autoComplete="off"
          // Thousands separators like the scale beside it ("1,000") once left; the stored value stays digits.
          value={typing || !value ? value : n(Number(value))}
          onFocus={() => setTyping(true)}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={() => {
            setTyping(false);
            if (Number(value) > limit) onChange(String(limit));
            else if (value && Number(value) < floor) onChange(String(floor));
          }}
          aria-invalid={shown ? true : undefined}
          aria-label="Companies this schedule reaches"
          disabled={disabled}
          className="w-24 tabular-nums"
        />
      </div>
      {shown && <FieldError>{error}</FieldError>}
    </Field>
  );
}

/** The run plan under When to send: how many runs reach every match, what the next run reaches and the most it can
 *  cost. Credits are charged per run: a run unlocks the locked companies it reaches, 1 credit each,
 *  so nothing is charged when the schedule is set. Runs reach unlocked companies first (mock). On the shared sender
 *  (`monthly`) runs also stop at its monthly limit and carry on next month (PRD AC-EC-I-03, BR-RULE-EC-05). */
export function RunPlan({
  left,
  unlockedLeft,
  perRun,
  sent = 0,
  cadence,
  days,
  firstDay,
  endsOn,
  balance,
  monthly,
  paused = false,
}: {
  /** Matches not reached yet. */
  left: number;
  /** Of them, already unlocked (free to send to). */
  unlockedLeft: number;
  perRun: number;
  /** Already sent (an edited schedule): the plan counts the runs still to go. */
  sent?: number;
  cadence: Schedule["cadence"];
  days: number[];
  firstDay: string;
  endsOn?: string;
  balance: number;
  /** Shared sender only: sends left this month and the monthly limit. */
  monthly?: MonthlyLimit;
  /** An edited schedule set to Paused: no run day until it's resumed, so no end date. */
  paused?: boolean;
}) {
  if (left <= 0 && sent > 0) {
    // Edit with the total lowered to what went out already: nothing is left, so saving completes it.
    return (
      <p className="rounded-lg border p-4 text-sm text-muted-foreground tabular-nums">
        All {n(sent)} sent. Saving completes this schedule.
      </p>
    );
  }
  if (left <= 0 || perRun <= 0) return null;
  // The same walk as the schedule card and its run list (automation.ts runDays): each run day sends up to perRun, and
  // on the shared sender no more than what's left of that month's limit.
  const walk = runDays(left, perRun, { cadence, days, firstDay, monthly });
  const placed = walk.reduce((a, r) => a + r.size, 0);
  const next = walk[0]?.size ?? 0;
  // Each run priced as the card prices it (planRuns: unlocked companies first, then 1 credit per locked one).
  // Runs go out whole and in order: the first run the balance can't pay for in full waits, and the rest wait behind
  // it (scheduleState "waiting", top-up dialog runsCovered).
  const runs = planRuns(walk, unlockedLeft);
  const covered = runsCovered(
    runs.map((r) => r.credits),
    balance,
  );
  const waiting = runs.slice(covered);
  // Numbered as the card's run list: an edited schedule's runs already sent come first (scheduleProgress).
  const first = Math.ceil(sent / perRun) + covered + 1;
  const last = Math.ceil(sent / perRun) + runs.length;
  const waitingCompanies = waiting.reduce((a, r) => a + r.size, 0);
  const finish = cadence === "once" ? (walk[0]?.date ?? firstDay) : placed < left ? null : (walk.at(-1)?.date ?? null);
  // A plan into next year (the shared sender's monthly limit can stretch it) says the year.
  const finishLabel = finish ? formatDate(finish, finish.slice(0, 4) !== firstDay.slice(0, 4)) : "–";
  const lateFor = !paused && cadence !== "once" && finish && endsOn && finish > endsOn;
  const monthShort = monthly && (cadence === "once" ? Math.min(perRun, left) : left) > monthly.left;
  // The bill: the companies already unlocked (free), the ones to unlock (1 credit each), then one answer — covered, or
  // what to top up and which run waits for it.
  const target = runs.reduce((a, r) => a + r.size, 0);
  const fresh = runs.reduce((a, r) => a + r.credits, 0);
  const free = target - fresh / UNLOCK_COST;
  const topUp = Math.max(0, fresh - balance);
  const row = "flex items-baseline justify-between gap-4";
  const more = sent > 0 ? "more " : "";
  const credits = (c: number) => `${n(c)} ${c === 1 ? "credit" : "credits"} (${creditsUsd(c)})`;
  const companies = (c: number) => `${n(c)} ${c === 1 ? "company" : "companies"}`;
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4 text-sm tabular-nums">
      <div className={row}>
        <span className="flex items-center gap-1.5 font-medium">
          Credits
          <Hint label="1 credit per locked company, charged when its run goes out. Nothing is charged now.">
            <span tabIndex={0} className="inline-flex rounded-sm text-muted-foreground" aria-label="How credits are charged">
              <InfoIcon aria-hidden className="size-3.5" />
            </span>
          </Hint>
        </span>
        <span className="text-muted-foreground">Balance {n(balance)}</span>
      </div>
      <dl className="flex flex-col gap-1.5 text-muted-foreground">
        {free > 0 && (
          <div className={row}>
            <dt>{n(free)} already unlocked</dt>
            <dd>free</dd>
          </div>
        )}
        {fresh > 0 && (
          <div className={row}>
            <dt>{n(fresh / UNLOCK_COST)} to unlock</dt>
            <dd>{credits(fresh)}</dd>
          </div>
        )}
      </dl>
      <div className={cn(row, "border-t pt-2 font-medium")}>
        {topUp > 0 ? (
          <>
            <span>To top up</span>
            <span className="text-primary-soft-foreground">{credits(topUp)}</span>
          </>
        ) : (
          <span>{fresh > 0 ? "Your balance covers it" : "No credits needed"}</span>
        )}
      </div>
      {waiting.length > 0 && (
        <p className="text-warning-soft-foreground">
          {waiting.length === 1
            ? `Run ${n(first)} waits until you top up`
            : `Runs ${n(first)}–${n(last)} wait until you top up`}{" "}
          · {companies(waitingCompanies)}
        </p>
      )}
      <p className="text-muted-foreground">
        {cadence === "once"
          ? `One run${finish ? `, ${finishLabel}` : ""}${next < left ? ` · the other ${n(left - next)} won't get it` : ""}`
          : `${paused ? "Once resumed" : `Done by ${finishLabel}${waiting.length > 0 ? " once topped up" : ""}`} · ${runs.length === 1 ? `1 ${more}run` : `${n(runs.length)} ${more}runs of up to ${n(perRun)}`}`}
      </p>
      {monthly && monthShort && (
        <p className="text-warning-soft-foreground">
          The shared sender has {n(monthly.left)} of {n(monthly.cap)} sends left this month. The rest {cadence === "once" ? "won't go out" : "go out next month"}.
        </p>
      )}
      {lateFor && (
        <p className="text-destructive">
          The campaign ends {formatDate(endsOn!)}, before this finishes. Pick fewer companies or more days.
        </p>
      )}
    </div>
  );
}
