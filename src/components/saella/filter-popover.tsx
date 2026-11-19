"use client";

import { SCROLL_POPOVER_LIST } from "@/lib/scroll";
import { useId, useMemo, useState } from "react";
import { ListFilterIcon, SearchIcon } from "lucide-react";
import { ChipRemove } from "@/components/saella/chip-remove";
import { Hint } from "@/components/saella/hint";
import { MultiSelect } from "@/components/saella/multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// The Filter button, its popover and the chips row under the toolbar, shared by every list screen (Campaigns,
// Templates, template recipients, Find companies, Self-upload, New batch). One spec:
// - Trigger: outline "Filter" + ListFilterIcon + count badge; h-8 in page toolbars, h-7 in card headers (matches the
//   search box beside it); text 14px either way.
// - Popover: w-80, body p-4 with gap-4 between sections, footer Clear all (ghost) left / Done (outline) right, both sm.
// - Section: label above (Label, 14px/500), gap-2, then one control. Every control is h-8, 14px, and an empty pick
//   reads "Any …" in subtle-foreground (FilterSelect, FilterMultiSelect, TreeSelect look the same).
// - 2–3 options sit inline: FilterCheckList (several) or FilterRadioList (one).
// - Order: status-like choice first, then other single choices, then multi-selects, inline checklists last.
// - Chips: FilterChips, brand-tint "Label: value ×" + Clear all (ghost sm).

export type FilterOption = { value: string; label: string; count?: number };

const n = (x: number) => x.toLocaleString("en-US");

export function FilterPopover({
  count,
  onClearAll,
  disabled = false,
  size = "sm",
  children,
}: {
  /** Active values, shown as a badge on the button. */
  count: number;
  onClearAll: () => void;
  /** While the options load. */
  disabled?: boolean;
  /** Match the search box beside it: "sm" (h-7) in card headers, "default" (h-8) in page toolbars. Text stays 14px. */
  size?: "sm" | "default";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size={size} className="font-normal" disabled={disabled}>
          <ListFilterIcon data-icon="inline-start" />
          Filter
          {count > 0 && (
            <Badge variant="brand" className="tabular-nums">
              {count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex max-h-(--radix-popover-content-available-height) w-80 flex-col gap-0 p-0">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">{children}</div>
        <Separator />
        <div className="flex items-center justify-between p-2">
          <Button variant="ghost" size="sm" disabled={count === 0} onClick={onClearAll}>
            Clear all
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** One section: its label above one control. `children` gets the id to put on the control. */
export function FilterField({ label, children }: { label: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
    </div>
  );
}

// Section label of an inline group (fieldset): the same look as Label; legend sits outside the flex gap, so mb-2.
const LEGEND = "mb-2 text-sm leading-none font-medium";

function OptionText({ option }: { option: FilterOption }) {
  return (
    <>
      {option.label}
      {option.count !== undefined && <span className="text-muted-foreground tabular-nums">({n(option.count)})</span>}
    </>
  );
}

/** One choice from a list (4+ options), "All" first. */
export function FilterSelect({
  label,
  allLabel,
  allCount,
  value,
  options,
  onChange,
}: {
  label: string;
  /** The no-filter choice, e.g. "Any country" or "All". */
  allLabel: string;
  /** Shown as a muted "(n)" after allLabel, like each option's count. */
  allCount?: number;
  value?: string;
  options: readonly FilterOption[];
  onChange: (value?: string) => void;
}) {
  return (
    <FilterField label={label}>
      {(id) => (
        <Select value={value ?? "__all"} onValueChange={(v) => onChange(v === "__all" ? undefined : v)}>
          <SelectTrigger id={id} className={cn("w-full", value === undefined && "text-subtle-foreground")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              <SelectItem value="__all">
                <OptionText option={{ value: "__all", label: allLabel, count: allCount }} />
              </SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  <OptionText option={o} />
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </FilterField>
  );
}

/** Several choices from a long list: one MultiSelect row ("Any …", first pick + "+N"). */
export function FilterMultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  /** "Any country". */
  placeholder: string;
  searchPlaceholder?: string;
}) {
  return (
    <FilterField label={label}>
      {(id) => (
        <MultiSelect
          id={id}
          options={options}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
        />
      )}
    </FilterField>
  );
}

/** Several choices from a short list, as checkboxes. */
export function FilterCheckList({
  label,
  options,
  value,
  onChange,
  inline = options.length <= 3,
}: {
  label: string;
  options: readonly FilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** 2–3 options sit side by side; longer lists stack. Defaults by option count. */
  inline?: boolean;
}) {
  return (
    <fieldset className={cn("flex gap-2", inline ? "flex-row flex-wrap gap-x-5" : "flex-col")}>
      <legend className={LEGEND}>{label}</legend>
      {options.map((o) => (
        <CheckRow
          key={o.value}
          option={o}
          checked={value.includes(o.value)}
          onCheckedChange={(on) => onChange(on ? [...value, o.value] : value.filter((x) => x !== o.value))}
        />
      ))}
    </fieldset>
  );
}

/** One choice from 2–3 options, inline: the radio twin of FilterCheckList. */
export function FilterRadioList({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col">
      <legend className={LEGEND}>{label}</legend>
      <RadioGroup value={value} onValueChange={onChange} className="flex flex-row flex-wrap gap-x-5 gap-y-2">
        {options.map((o) => (
          <div key={o.value} className="flex items-center gap-2">
            <RadioGroupItem value={o.value} id={`${id}-${o.value}`} />
            <Label htmlFor={`${id}-${o.value}`} className="font-normal">
              <OptionText option={o} />
            </Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

/** Several choices from a long list: a search box over a short scrolling checklist, chosen ones first. */
export function FilterSearchList({
  label,
  options,
  value,
  onChange,
  placeholder,
  emptyText = "Nothing matches",
  limit = 50,
}: {
  label: string;
  options: readonly FilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  emptyText?: string;
  /** Rows drawn at once; typing narrows the rest. */
  limit?: number;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const picked = options.filter((o) => value.includes(o.value));
    const rest = options.filter((o) => !value.includes(o.value) && (!q || o.label.toLowerCase().includes(q)));
    return [...picked, ...rest].slice(0, Math.max(limit, picked.length));
  }, [options, value, query, limit]);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={LEGEND}>{label}</legend>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </InputGroup>
      <div className={cn("flex flex-col gap-2 py-1", SCROLL_POPOVER_LIST)}>
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          shown.map((o) => (
            <CheckRow
              key={o.value}
              option={o}
              checked={value.includes(o.value)}
              onCheckedChange={(on) => onChange(on ? [...value, o.value] : value.filter((x) => x !== o.value))}
            />
          ))
        )}
      </div>
    </fieldset>
  );
}

function CheckRow({ option, checked, onCheckedChange }: { option: FilterOption; checked: boolean; onCheckedChange: (on: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
      <Label htmlFor={id} className="min-w-0 truncate font-normal">
        <OptionText option={option} />
      </Label>
    </div>
  );
}

export type FilterChip = {
  key: string;
  label: string;
  /** Omitted for a filter that is its own value ("Already sent"). */
  value?: string;
  /** Further values of the same filter: "+N", the names in a tooltip. */
  more?: string[];
  onRemove: () => void;
};

/**
 * The active filters under the toolbar: one brand-tint chip per value ("Label: value ×"; several values of one filter
 * share the label: "Tag: [fair ×] [hotel ×]"), then Clear all.
 * `action` replaces Clear all where the reset goes somewhere else ("Reset to campaign"); it gets the same look.
 */
export function FilterChips({
  chips,
  onClearAll,
  action,
  className,
}: {
  chips: FilterChip[];
  onClearAll?: () => void;
  action?: { label: string; onClick: () => void };
  /** Placement only (padding, border) where the row sits inside a card. */
  className?: string;
}) {
  if (chips.length === 0 && !action) return null;
  // Several values of one filter read "Tag: [fair ×] [hotel ×]": the label once, then a chip per value. One value keeps
  // "Label: value ×".
  const groups: { label: string; chips: FilterChip[] }[] = [];
  chips.forEach((chip) => {
    const g = groups.find((x) => x.label === chip.label && chip.value !== undefined);
    if (g) g.chips.push(chip);
    else groups.push({ label: chip.label, chips: [chip] });
  });
  const chipClass = "h-6 max-w-80 gap-1 rounded-md border-primary-soft bg-primary-subtle pr-0.5 font-medium text-foreground";
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {groups
        .filter((g) => g.chips.length > 1)
        .map((g) => (
          <span key={`group:${g.label}`} className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-muted-foreground">{g.label}:</span>
            {g.chips.map((chip) => (
              <Badge key={chip.key} variant="outline" className={chipClass}>
                <span className="truncate">{chip.value}</span>
                <ChipRemove label={`Remove ${chip.label.toLowerCase()} ${chip.value}`} onClick={chip.onRemove} className="hover:bg-primary-soft" />
              </Badge>
            ))}
          </span>
        ))}
      {groups
        .filter((g) => g.chips.length === 1)
        .map((g) => g.chips[0])
        .map((chip) => (
        <Badge
          key={chip.key}
          variant="outline"
          className={chipClass}
        >
          {chip.value !== undefined ? (
            <>
              <span className="text-muted-foreground">{chip.label}:</span>
              <span className="truncate">{chip.value}</span>
              {chip.more && chip.more.length > 0 && (
                <Hint label={chip.more.join(", ")}>
                  <span tabIndex={0} className="text-muted-foreground tabular-nums">
                    +{chip.more.length}
                  </span>
                </Hint>
              )}
            </>
          ) : (
            chip.label
          )}
          <ChipRemove
            label={`Remove ${chip.label.toLowerCase()}${chip.value !== undefined ? ` ${chip.value}` : ""}`}
            onClick={chip.onRemove}
            className="hover:bg-primary-soft"
          />
        </Badge>
      ))}
      {action ? (
        <Button variant="ghost" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : (
        chips.length > 0 &&
        onClearAll && (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            Clear all
          </Button>
        )
      )}
    </div>
  );
}
