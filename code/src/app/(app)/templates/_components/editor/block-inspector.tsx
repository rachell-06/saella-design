"use client";

import { useRef } from "react";
import { ArrowDownIcon, ArrowUpIcon, BracesIcon, CopyIcon, ImageUpIcon, MousePointerClickIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BLOCK_LABEL, type Block, type HeroTone, MERGE_TAGS } from "../data";

// Properties of the selected block (DESIGN.md §9.3, right panel). Text fields take merge tags; they are typed
// as {{tag}} or inserted from the Merge tag menu at the cursor (live app TagsButton).

export function BlockInspector({
  block,
  index,
  count,
  disabled,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  block: Block | null;
  index: number;
  count: number;
  disabled: boolean;
  onChange: (b: Block) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  if (!block)
    return (
      <Empty className="p-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MousePointerClickIcon />
          </EmptyMedia>
          <EmptyTitle>No block selected</EmptyTitle>
          <EmptyDescription>Click a block in the email to change it.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{BLOCK_LABEL[block.type]}</p>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
            <ArrowUpIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={disabled || index === count - 1} onClick={() => onMove(1)}>
            <ArrowDownIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Duplicate block" disabled={disabled} onClick={onDuplicate}>
            <CopyIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Delete block" disabled={disabled} onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2Icon />
          </Button>
        </div>
      </div>
      <fieldset disabled={disabled} className="contents">
        <FieldGroup className="gap-4">
          {block.type === "heading" && (
            <TagField id="bi-text" label="Text" value={block.text} onChange={(text) => onChange({ ...block, text })} disabled={disabled} />
          )}
          {block.type === "paragraph" && (
            <TagField id="bi-text" label="Text" multiline value={block.text} onChange={(text) => onChange({ ...block, text })} disabled={disabled} />
          )}
          {block.type === "hero" && (
            <>
              <TagField id="bi-headline" label="Headline" value={block.headline} onChange={(headline) => onChange({ ...block, headline })} disabled={disabled} />
              <TagField id="bi-subline" label="Line below" value={block.subline} onChange={(subline) => onChange({ ...block, subline })} disabled={disabled} />
              <Field>
                <FieldLabel id="bi-tone">Background</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  spacing={0}
                  value={block.tone}
                  onValueChange={(v) => v && onChange({ ...block, tone: v as HeroTone })}
                  aria-labelledby="bi-tone"
                  disabled={disabled}
                >
                  <ToggleGroupItem value="soft">Warm</ToggleGroupItem>
                  <ToggleGroupItem value="muted">Light</ToggleGroupItem>
                  <ToggleGroupItem value="ink">Dark</ToggleGroupItem>
                </ToggleGroup>
              </Field>
            </>
          )}
          {block.type === "image" && (
            <>
              <Field>
                <FieldLabel>Image</FieldLabel>
                <Button
                  variant="outline"
                  className="justify-start font-normal"
                  disabled={disabled}
                  onClick={() => {
                    onChange({ ...block, file: block.file ?? "uploaded-image.jpg" });
                    toast.success("Image added", { description: "In the app this opens a file picker." });
                  }}
                >
                  <ImageUpIcon data-icon="inline-start" />
                  {block.file ? `Replace ${block.file}` : "Upload image"}
                </Button>
                <FieldDescription>PNG, JPEG, GIF or WebP, up to 5 MB.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="bi-alt">Alt text</FieldLabel>
                <Textarea
                  id="bi-alt"
                  value={block.alt}
                  onChange={(e) => onChange({ ...block, alt: e.target.value })}
                  placeholder="Describe the image for people who can't see it"
                  className="min-h-16"
                />
                <FieldDescription>Shown when images are blocked, and read aloud by screen readers.</FieldDescription>
              </Field>
            </>
          )}
          {block.type === "button" && (
            <>
              <Field>
                <FieldLabel htmlFor="bi-label">Label</FieldLabel>
                <Input id="bi-label" value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="bi-url">Link</FieldLabel>
                <Input id="bi-url" type="url" value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://" />
                <FieldDescription>Clicks on it are counted per link.</FieldDescription>
              </Field>
            </>
          )}
          {block.type === "divider" && <p className="text-sm text-muted-foreground">A thin line between sections. Nothing to set.</p>}
        </FieldGroup>
      </fieldset>
    </div>
  );
}

/** Text input with a merge-tag menu that inserts at the cursor. Shared by subject and preheader. */
export function TagField({
  id,
  label,
  value,
  onChange,
  multiline,
  disabled,
  placeholder,
  invalid,
  description,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
  description?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
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
    <Field data-invalid={invalid || undefined}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="xs" disabled={disabled} className="text-muted-foreground">
              <BracesIcon data-icon="inline-start" />
              Merge tag
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              {MERGE_TAGS.map((m) => (
                <DropdownMenuItem key={m.tag} onSelect={() => insert(m.tag)}>
                  <span className="flex-1">{m.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{m.example}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {multiline ? (
        <Textarea
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-32"
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
        />
      ) : (
        <Input
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
        />
      )}
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}
