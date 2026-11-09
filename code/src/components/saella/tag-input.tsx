"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Free-text tags typed by the user (Contacts: "Trade show Q3", "Partners – Jakarta"), 2026-10-28.
// Enter or comma adds a tag, Backspace on an empty input removes the last one. Suggestions are existing
// tags shown as one-click chips. Normalising (trim, dedupe, caps) is the caller's job via `onChange`.
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder = "Type a tag and press Enter",
  invalid,
  disabled,
  className,
}: {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  /** Existing tags offered as chips under the input. */
  suggestions?: string[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const has = (t: string) => value.some((v) => v.toLowerCase() === t.toLowerCase());
  const add = (raw: string) => {
    const t = raw.trim();
    if (t && !has(t)) onChange([...value, t]);
    setDraft("");
  };
  const remaining = suggestions.filter((s) => !has(s)).slice(0, 8);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        aria-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        className={cn(
          "flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-1.5 py-1 transition-colors",
          "focus-within:border-foreground focus-within:ring-2 focus-within:ring-ring",
          "aria-invalid:border-destructive data-disabled:cursor-not-allowed data-disabled:opacity-50"
        )}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="h-6 gap-1 pr-0.5 text-foreground">
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              disabled={disabled}
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          id={id}
          value={draft}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v.slice(0, -1));
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-subtle-foreground disabled:cursor-not-allowed"
        />
      </div>
      {remaining.length > 0 && !disabled && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Existing:</span>
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-input hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
