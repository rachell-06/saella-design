"use client";

import { useRef } from "react";
import { BracesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MERGE_TAG_MENU_CLASS, MergeTagItems } from "@/components/features/merge-tag-items";
import { cn } from "@/lib/utils";

// The envelope as the live editor shows it (EmailTemplateEditor "email-page-meta": "Template name:", "Email subject:",
// "Preheader:", "Campaign:"): one line per field, label left, value right, a hairline under the row instead of a
// boxed field. The row's line turns brand on focus (the focus indicator) and destructive when invalid.

/** Classes that make a shadcn Input / SelectTrigger sit flat inside an EnvelopeRow. */
export const FLAT_CONTROL = "h-8 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent";

export function EnvelopeRow({
  label,
  htmlFor,
  mark,
  invalid,
  action,
  children,
}: {
  label: string;
  htmlFor: string;
  /** e.g. the ✨ "written by Saella" mark. */
  mark?: React.ReactNode;
  invalid?: boolean;
  /** Right end of the row, e.g. the merge-tag menu. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      data-invalid={invalid || undefined}
      className={cn(
        "grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b py-0.5",
        "focus-within:border-brand data-[invalid]:border-destructive"
      )}
    >
      <Label htmlFor={htmlFor} className="gap-1.5 font-normal text-muted-foreground">
        {label}
        {mark}
      </Label>
      <div className="min-w-0">{children}</div>
      <div className="flex items-center">{action}</div>
    </div>
  );
}

/** A text row that takes merge tags: typed as {{tag}} or picked from the icon menu (live app TagsButton iconOnly). */
export function EnvelopeTagRow({
  id,
  label,
  value,
  onChange,
  placeholder,
  invalid,
  disabled,
  mark,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  mark?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  function insert(tag: string) {
    const el = ref.current;
    const token = `{{${tag}}}`;
    const at = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? at;
    onChange(value.slice(0, at) + token + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  }
  return (
    <EnvelopeRow
      label={label}
      htmlFor={id}
      mark={mark}
      invalid={invalid}
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label={`Insert a merge tag in ${label.toLowerCase()}`} className="text-muted-foreground">
              <BracesIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={MERGE_TAG_MENU_CLASS}>
            <MergeTagItems onPick={insert} />
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <Input
        id={id}
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={FLAT_CONTROL}
      />
    </EnvelopeRow>
  );
}
