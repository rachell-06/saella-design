"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Lists longer than this get a search box at the top (find a country or industry fast). */
const SEARCH_FROM = 7;
/** Option rows sized like a Select item (28px, rounded-md), so every filter dropdown lists the same way. */
const OPTION_ROW = "rounded-md px-1.5 py-1";

// Form multi-select (countries, industry sections): shadcn Popover + Command, the multi-pick combobox pattern.
// The list stays open while picking; the trigger summarises the choice. Empty means "any", stated by the placeholder.
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Search",
  className,
}: {
  id?: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Shown when nothing is picked, e.g. "Any country". */
  placeholder: string;
  /** Placeholder of the search box, e.g. "Search countries". */
  searchPlaceholder?: string;
  className?: string;
}) {
  // As many picks as fit, then "+N" for the rest (was first pick + count only, leaving the bar
  // half empty). Measured from hidden copies of each pick; the first one always shows and truncates if it must.
  const boxRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState(Math.max(1, value.length));
  const key = value.join("\u0000");
  useLayoutEffect(() => {
    const box = boxRef.current;
    const measure = measureRef.current;
    if (!box || !measure) return;
    const compute = () => {
      const items = [...measure.querySelectorAll<HTMLElement>("[data-item]")].map((el) => el.offsetWidth);
      const badge = measure.querySelector<HTMLElement>("[data-badge]")?.offsetWidth ?? 0;
      const room = box.clientWidth;
      let k = items.length;
      while (k > 1) {
        const used = items.slice(0, k).reduce((a, b) => a + b, 0) + (k < items.length ? badge + 6 : 0);
        if (used <= room) break;
        k -= 1;
      }
      setFit(Math.max(1, k));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(box);
    return () => ro.disconnect();
  }, [key]);
  const shown = value.slice(0, fit);
  const extra = value.length - shown.length;
  const toggle = (option: string) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  // A click on the field's label closes the list (outside click) and the label then forwards a click to the trigger,
  // which would open it again; that one forwarded click is ignored.
  const [open, setOpen] = useState(false);
  const skipReopen = useRef(false);
  const onPointerDownOutside = (e: CustomEvent<{ originalEvent: PointerEvent }>) => {
    const target = e.detail.originalEvent.target;
    const label = target instanceof Element ? target.closest("label") : null;
    skipReopen.current = Boolean(id && label?.htmlFor === id);
    // The forwarded click follows at once; never let the flag outlive it.
    if (skipReopen.current) window.setTimeout(() => (skipReopen.current = false), 400);
  };
  const onOpenChange = (next: boolean) => {
    if (next && skipReopen.current) {
      skipReopen.current = false;
      return;
    }
    setOpen(next);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between font-normal", value.length === 0 && "text-subtle-foreground", className)}
        >
          <span ref={boxRef} className="relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {/* Hidden copies to measure each pick ("name, ") and the badge; never seen or read. */}
            <span ref={measureRef} aria-hidden className="pointer-events-none invisible absolute flex whitespace-pre">
              {value.map((v, i) => (
                <span key={v} data-item>
                  {i < value.length - 1 ? `${v}, ` : v}
                </span>
              ))}
              <Badge data-badge variant="brand" className="h-5 px-1.5 tabular-nums">
                +{value.length}
              </Badge>
            </span>
            <span className="truncate">{value.length === 0 ? placeholder : shown.join(", ")}</span>
            {extra > 0 && (
              <Badge variant="brand" className="h-5 shrink-0 px-1.5 tabular-nums" aria-label={`and ${extra} more`}>
                +{extra}
              </Badge>
            )}
          </span>
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 p-0"
        onPointerDownOutside={(e) => onPointerDownOutside(e)}
      >
        {/* Plain substring match: cmdk's default fuzzy match lists "Manufacturing" for "ac". */}
        <Command filter={(item, search) => (item.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}>
          {options.length > SEARCH_FROM && <CommandInput placeholder={searchPlaceholder} />}
          <CommandList>
            <CommandEmpty>No match</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const on = value.includes(option);
                return (
                  <CommandItem key={option} value={option} data-checked={on} onSelect={() => toggle(option)} className={OPTION_ROW}>
                    {option}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {value.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem value="__clear" onSelect={() => onChange([])} className={OPTION_ROW}>
                    Clear
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
