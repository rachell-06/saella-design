"use client";

import { useState } from "react";
import { CalendarIcon, ClockIcon } from "lucide-react";
import type { DateRange, Matcher } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Date and time pickers built from shadcn Popover + Calendar and Select (2026-10-28). Native
// <input type="date|time"> renders the browser's own picker, which can't take Saella tokens and differs per
// browser, so screens use these instead. Values are ISO strings: "YYYY-MM-DD" for dates, "HH:mm" for times.
// The calendar closes once the pick is done (designer 2026-11-13): after the day, or after a range's second day.

const toDate = (iso?: string) => (iso ? new Date(`${iso}T00:00:00`) : undefined);
const toIso = (d?: Date) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
// Days outside [min, max] can't be picked.
function bounds(min?: string, max?: string): Matcher[] {
  const out: Matcher[] = [];
  if (min) out.push({ before: toDate(min)! });
  if (max) out.push({ after: toDate(max)! });
  return out;
}
const label = (iso?: string) =>
  iso ? toDate(iso)!.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined;

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  invalid,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  /** Earliest and latest selectable day, "YYYY-MM-DD". */
  min?: string;
  max?: string;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const disabled = bounds(min, max);
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          className={cn("justify-start font-normal", !value && "text-subtle-foreground", className)}
        >
          <CalendarIcon data-icon="inline-start" />
          {label(value) ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={toDate(value)}
          onSelect={(d) => {
            if (!d) return;
            onChange(toIso(d));
            setOpen(false);
          }}
          defaultMonth={toDate(value) ?? toDate(max) ?? toDate(min)}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * A date range in a popover, the same as Overview's custom range (designer 2026-11-13: every range picker alike):
 * two months without repeated days, a draft with its "Sep 9 – Sep 17" line and Apply; Clear when the range is optional.
 * Values are Dates (DateRange), as the campaign forms keep them.
 */
export function DateRangePicker({
  id,
  value,
  onChange,
  min,
  max,
  endMin,
  optional,
  placeholder = "Pick dates",
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  /** Earliest / latest pickable day. */
  min?: Date;
  max?: Date;
  /** Earliest end day, while the start can be earlier (editing a running campaign: its end can't be in the past). */
  endMin?: Date;
  /** Shows Clear, for an optional range. */
  optional?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const fmt = (d: Date) => label(toIso(d))!;
  const text = value?.from ? `${fmt(value.from)} – ${value.to ? fmt(value.to) : "…"}` : placeholder;
  const ready = !!draft?.from && !!draft?.to;
  const disabled: Matcher[] = [
    ...(min ? [{ before: min }] : []),
    ...(max ? [{ after: max }] : []),
    ...(endMin && draft?.from && !draft.to ? [{ before: endMin }] : []),
  ];
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(value?.from ? value : undefined);
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-label={ariaLabel}
          className={cn("justify-start font-normal", !value?.from && "text-subtle-foreground", className)}
        >
          <CalendarIcon data-icon="inline-start" />
          {text}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto gap-0 p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          resetOnSelect
          selected={draft}
          onSelect={setDraft}
          // Two months side by side must not repeat days (the range would be drawn twice); fixed weeks keep both
          // grids the same height.
          showOutsideDays={false}
          fixedWeeks
          defaultMonth={draft?.from ?? min ?? (max ? new Date(max.getFullYear(), max.getMonth() - 1, 1) : undefined)}
          disabled={disabled}
          className="px-3"
        />
        <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
          <span className={cn("text-sm tabular-nums", !ready && "text-muted-foreground")} aria-live="polite">
            {draft?.from ? `${fmt(draft.from)} – ${draft.to ? fmt(draft.to) : "…"}` : "Pick a start date"}
          </span>
          <span className="flex gap-2">
            {optional && value?.from && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
            )}
            <Button
              size="sm"
              disabled={!ready}
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Every half hour, 00:00–23:30.
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

export function TimePicker({
  id,
  value,
  onChange,
  invalid,
  className,
}: {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  className?: string;
}) {
  // A value off the half-hour grid (e.g. from the URL) stays selectable.
  const options = value && !TIMES.includes(value) ? [...TIMES, value].sort() : TIMES;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-invalid={invalid || undefined} className={cn("w-full", className)}>
        <ClockIcon data-icon="inline-start" className="text-muted-foreground" />
        <SelectValue placeholder="Pick a time" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectGroup>
          {options.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
