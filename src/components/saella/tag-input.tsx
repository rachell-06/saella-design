"use client";

import { useId, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChipRemove } from "@/components/saella/chip-remove";

// Free-text tags typed by the user (Contacts: "Trade show Q3", "Partners – Jakarta").
// Existing tags open as a dropdown under the field on click or typing, not on focus alone: a dialog that
// autofocuses the field must not open a list over its own buttons (no wall of
// suggestion chips). Typing filters the list; arrows move, Enter picks the highlighted tag or adds the typed one,
// comma also adds. Backspace on an empty input removes the last tag. ARIA combobox + listbox; not cmdk, whose
// input overrides `id` and would unhook the field's <label>. Normalising is the caller's job via `onChange`.
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder = "Add tags",
  invalid,
  disabled,
  className,
  listSide = "bottom",
}: {
  /** Where the list opens. "top" when a button sits right under the field (e.g. a bulk popover), so the list never covers it. */
  listSide?: "top" | "bottom";
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  /** Existing tags offered in the dropdown. */
  suggestions?: string[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const listId = useId();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const has = (t: string) => value.some((v) => v.toLowerCase() === t.toLowerCase());
  const add = (raw: string) => {
    const t = raw.trim();
    if (t && !has(t)) onChange([...value, t]);
    setDraft("");
    setActive(0);
  };
  const q = draft.trim().toLowerCase();
  const matches = suggestions.filter((s) => !has(s) && s.toLowerCase().includes(q));
  const canCreate = q !== "" && !has(draft) && !suggestions.some((s) => s.toLowerCase() === q);
  // Options in display order: the typed tag first when it is new, then matching existing tags.
  const options: { key: string; label: React.ReactNode; tag: string }[] = [
    ...(canCreate ? [{ key: "__new", label: <>Add &ldquo;{draft.trim()}&rdquo;</>, tag: draft }] : []),
    ...matches.map((m) => ({ key: m, label: m, tag: m })),
  ];
  const showList = open && !disabled && options.length > 0;
  const current = Math.min(active, options.length - 1);
  const optionId = (i: number) => `${listId}-o${i}`;

  return (
    <Popover open={showList}>
      <PopoverAnchor asChild>
        <div
          aria-invalid={invalid || undefined}
          data-disabled={disabled || undefined}
          className={cn(
            "flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-1.5 py-1 transition-colors",
            "focus-within:border-foreground focus-within:ring-2 focus-within:ring-ring",
            "aria-invalid:border-destructive data-disabled:cursor-not-allowed data-disabled:opacity-50",
            className
          )}
        >
          {value.map((tag) => (
            <Badge key={tag} variant="brand" className="h-6 gap-1 pr-0.5">
              {tag}
              <ChipRemove label={`Remove tag ${tag}`} className="text-primary-soft-foreground/70 hover:text-primary-soft-foreground" disabled={disabled} onClick={() => onChange(value.filter((v) => v !== tag))} />
            </Badge>
          ))}
          <Input
            id={id}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList ? optionId(current) : undefined}
            autoComplete="off"
            value={draft}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value;
              if (v.endsWith(",")) add(v.slice(0, -1));
              else setDraft(v);
              setActive(0);
              setOpen(true);
            }}
            onClick={() => setOpen(true)}
            onBlur={() => {
              setOpen(false);
              if (draft) add(draft);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setOpen(true);
                if (options.length) setActive((current + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                add(showList ? options[current].tag : draft);
              } else if (e.key === "Escape") {
                setOpen(false);
              } else if (e.key === "Backspace" && !draft && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            placeholder={value.length ? "" : placeholder}
            className="h-6 min-w-24 flex-1 rounded-none border-0 bg-transparent px-1 text-sm shadow-none placeholder:text-subtle-foreground focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        side={listSide}
        className="max-h-60 w-(--radix-popper-anchor-width) min-w-56 overflow-y-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div id={listId} role="listbox" aria-label="Tags">
          {options.map((o, i) => (
            <div
              key={o.key}
              id={optionId(i)}
              role="option"
              aria-selected={i === current}
              // Keep focus in the input: pick on mousedown, before the input would blur.
              onMouseDown={(e) => {
                e.preventDefault();
                add(o.tag);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none",
                i === current && "bg-muted text-foreground"
              )}
            >
              {o.key === "__new" && <PlusIcon className="size-4 text-muted-foreground" aria-hidden />}
              {o.label}
            </div>
          ))}
        </div>
        {/* New tags are made by typing (the "Add …" option above appears then). Say so while the list only shows
            existing tags, or it reads as pick-only (designer 2026-11-13). */}
        {!canCreate && (
          <p className="sticky bottom-0 -mx-1 -mb-1 flex items-center gap-2 border-t bg-popover px-3 py-2 text-xs text-muted-foreground">
            <PlusIcon className="size-3.5" aria-hidden />
            Type a name to make a new tag
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
