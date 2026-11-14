"use client";

// Period filter (Overview, Billing › Usage): one trigger, one popover (live app EmailMetricsDashboard, Repo
// origin/development "Window + custom range combined into ONE dropdown").
// Redone the popover is a short list like a menu (presets with a check on the active one, then
// "Custom range…"). Presets apply at once and close. The calendar shows only after "Custom range…": a 2-month range
// Calendar, a draft applied on Apply, and Back to the list. Days after today can't
// be picked. Reopening while a custom range is active opens straight on the calendar.

import { useState } from "react";
import { CalendarIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { formatDate } from "@/lib/mock/campaigns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type PeriodPreset = { value: string; label: string };

// ISO "YYYY-MM-DD" <-> local Date for the Calendar; values stay ISO strings in state and URL.
const toDate = (iso?: string | null) => (iso ? new Date(`${iso}T00:00:00`) : undefined);
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function PeriodPicker({
  presets,
  value,
  from,
  to,
  label,
  today,
  onPreset,
  onRange,
  className,
}: {
  presets: readonly PeriodPreset[];
  /** Active preset value, or "range" for a custom range. */
  value: string;
  from?: string | null;
  to?: string | null;
  /** Trigger text: the preset label or "Oct 1 – Oct 27". */
  label: string;
  /** Last pickable day, "YYYY-MM-DD". */
  today: string;
  onPreset: (value: string) => void;
  onRange: (from: string, to: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const last = toDate(today)!;
  const ready = !!draft?.from && !!draft?.to;
  const isRange = value === "range";

  function onOpenChange(next: boolean) {
    if (next) {
      // Seed the draft from the active custom range (live app), and open on the calendar when one is active.
      setDraft(isRange && from && to ? { from: toDate(from), to: toDate(to) } : undefined);
      setCustom(isRange);
    }
    setOpen(next);
  }

  const draftText = draft?.from
    ? `${formatDate(toIso(draft.from))} – ${draft.to ? formatDate(toIso(draft.to)) : "…"}`
    : "Pick a start date";

  const item = "w-full justify-between font-normal";

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Period: ${label}`} className={cn("justify-between font-normal", className)}>
          <span className="flex items-center gap-1.5">
            <CalendarIcon data-icon="inline-start" className="text-muted-foreground" />
            {label}
          </span>
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className={cn("gap-0 p-0", custom ? "w-auto" : "w-48")}>
        {!custom ? (
          <div className="flex flex-col gap-0.5 p-1" role="group" aria-label="Period">
            {presets.map((p) => {
              const active = value === p.value;
              return (
                <Button
                  key={p.value}
                  variant="ghost"
                  size="sm"
                  aria-pressed={active}
                  className={cn(item, active && "bg-accent")}
                  onClick={() => {
                    onPreset(p.value);
                    setOpen(false);
                  }}
                >
                  {p.label}
                  {active && <CheckIcon data-icon="inline-end" />}
                </Button>
              );
            })}
            <Separator className="my-1" />
            <Button variant="ghost" size="sm" aria-pressed={isRange} className={cn(item, isRange && "bg-accent")} onClick={() => setCustom(true)}>
              Custom range…
              {isRange ? <CheckIcon data-icon="inline-end" /> : <ChevronRightIcon data-icon="inline-end" className="text-muted-foreground" />}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center px-2 pt-2">
              <Button variant="ghost" size="sm" className="font-normal text-muted-foreground" onClick={() => setCustom(false)}>
                <ChevronLeftIcon data-icon="inline-start" />
                Back
              </Button>
            </div>
            <Calendar
              mode="range"
              numberOfMonths={2}
              resetOnSelect
              selected={draft}
              onSelect={setDraft}
              defaultMonth={draft?.from ?? new Date(last.getFullYear(), last.getMonth() - 1, 1)}
              endMonth={last}
              disabled={{ after: last }}
              // Two months side by side: no outside days, or days repeat across the grids; fixed weeks keep both
              // grids the same height.
              showOutsideDays={false}
              fixedWeeks
              className="px-3"
            />
            <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
              <span className={cn("text-sm tabular-nums", !ready && "text-muted-foreground")} aria-live="polite">
                {draftText}
              </span>
              <Button
                size="sm"
                disabled={!ready}
                onClick={() => {
                  if (!draft?.from || !draft.to) return;
                  onRange(toIso(draft.from), toIso(draft.to));
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
