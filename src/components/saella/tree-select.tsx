"use client";

import { SCROLL_POPOVER_LIST } from "@/lib/scroll";
import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Two-level multi-select in a popover, for the ISIC industry tree on Companies and anywhere an audience is built by
// industry. Checking a group selects every option under it (live app: CompaniesFilters
// TreeSelect, SHOW_CHILD); a partly checked group shows the dash. Search matches group and option labels and
// opens the matching groups. `value` holds option values only.
export type TreeGroup = { value: string; label: string; options: { value: string; label: string }[] };

export function TreeSelect({
  id,
  label,
  groups,
  value,
  onChange,
  searchPlaceholder = "Search",
  emptyText = "Nothing matches",
  more,
  selectAll = false,
  className,
}: {
  /** For a Label's htmlFor. */
  id?: string;
  /** Button text: the first pick, or "Any industry" when nothing is picked. Further picks show as "+N" (same as MultiSelect). */
  label: string;
  groups: TreeGroup[];
  value: string[];
  onChange: (value: string[]) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  /** "+N" after the label; default: one per further option picked. Campaigns count a fully checked group as one. */
  more?: number;
  /** Footer "Select all" (live campaign Industry picker): checks every option. Off by default. */
  selectAll?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const selected = useMemo(() => new Set(value), [value]);
  const extra = more ?? value.length - 1;
  const allValues = useMemo(() => groups.flatMap((g) => g.options.map((o) => o.value)), [groups]);
  const everything = allValues.every((v) => selected.has(v));

  const q = query.trim().toLowerCase();
  const shown = groups
    .map((g) => {
      if (!q || g.label.toLowerCase().includes(q)) return g;
      return { ...g, options: g.options.filter((o) => o.label.toLowerCase().includes(q) || o.value.includes(q)) };
    })
    .filter((g) => g.options.length > 0);

  const setGroup = (g: TreeGroup, on: boolean) => {
    const ids = g.options.map((o) => o.value);
    onChange(on ? [...new Set([...value, ...ids])] : value.filter((v) => !ids.includes(v)));
  };
  const setOption = (v: string, on: boolean) => onChange(on ? [...value, v] : value.filter((x) => x !== v));

  return (
    <Popover onOpenChange={(o) => !o && setQuery("")}>
      <PopoverTrigger asChild>
        {/* Same trigger as MultiSelect: h-8, "Any …" in subtle-foreground, first pick + "+N", chevron at the end. */}
        <Button
          id={id}
          variant="outline"
          className={cn("w-full justify-between font-normal", value.length === 0 && "text-subtle-foreground", className)}
        >
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="truncate">{label}</span>
            {value.length > 0 && extra > 0 && (
              <Badge variant="brand" className="h-5 shrink-0 px-1.5 tabular-nums" aria-label={`and ${extra} more`}>
                +{extra}
              </Badge>
            )}
          </span>
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-80 flex-col gap-2 p-2">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
        </InputGroup>
        <div role="tree" aria-label={label} aria-multiselectable className={cn("flex flex-col", SCROLL_POPOVER_LIST)}>
          {shown.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>}
          {shown.map((g) => {
            const all = g.options.every((o) => selected.has(o.value));
            const some = g.options.some((o) => selected.has(o.value));
            const expanded = Boolean(q) || open[g.value];
            return (
              <div key={g.value} role="treeitem" aria-expanded={expanded} aria-selected={all}>
                <div className="flex items-center gap-1 rounded-md px-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={expanded ? `Collapse ${g.label}` : `Expand ${g.label}`}
                    onClick={() => setOpen((s) => ({ ...s, [g.value]: !expanded }))}
                  >
                    {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  </Button>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-sm font-medium">
                    <Checkbox checked={all ? true : some ? "indeterminate" : false} onCheckedChange={(v) => setGroup(g, v === true)} />
                    <span className="truncate">{g.label}</span>
                  </label>
                </div>
                {expanded && (
                  <div role="group" className="flex flex-col">
                    {g.options.map((o) => (
                      <label
                        key={o.value}
                        role="treeitem"
                        aria-selected={selected.has(o.value)}
                        className={cn("flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 pl-9 text-sm")}
                      >
                        <Checkbox checked={selected.has(o.value)} onCheckedChange={(v) => setOption(o.value, v === true)} />
                        <span className="min-w-0 flex-1 truncate">{o.label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{o.value}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {(value.length > 0 || selectAll) && (
          <div className="flex items-center justify-between border-t px-1 pt-2">
            {/* Counts what the trigger shows (a full section = 1 when `more` is passed), so "+N" and "N selected" agree. */}
            <span className="text-sm text-muted-foreground tabular-nums">{value.length > 0 && `${more !== undefined ? more + 1 : value.length} selected`}</span>
            <span className="flex items-center gap-3">
              {selectAll && !everything && (
                <Button variant="link" size="sm" onClick={() => onChange(allValues)}>
                  Select all
                </Button>
              )}
              {value.length > 0 && (
                <Button variant="link" size="sm" onClick={() => onChange([])}>
                  Clear
                </Button>
              )}
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
