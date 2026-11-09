"use client";

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
  return (
    <Popover>
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
          onSelect={(d) => d && onChange(toIso(d))}
          defaultMonth={toDate(value) ?? toDate(max) ?? toDate(min)}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}

export function DateRangePicker({
  from,
  to,
  onChange,
  min,
  max,
  placeholder = "Pick dates",
  className,
  "aria-label": ariaLabel,
}: {
  from?: string;
  to?: string;
  onChange: (range: { from: string; to: string }) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const selected: DateRange | undefined = from ? { from: toDate(from), to: toDate(to) } : undefined;
  const disabled = bounds(min, max);
  const text = from ? `${label(from)} – ${to ? label(to) : "…"}` : placeholder;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={ariaLabel}
          className={cn("justify-start font-normal", !from && "text-subtle-foreground", className)}
        >
          <CalendarIcon data-icon="inline-start" />
          {text}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selected}
          onSelect={(r) => onChange({ from: toIso(r?.from), to: toIso(r?.to) })}
          defaultMonth={toDate(from) ?? (max ? new Date(toDate(max)!.getFullYear(), toDate(max)!.getMonth() - 1, 1) : undefined)}
          disabled={disabled}
        />
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
