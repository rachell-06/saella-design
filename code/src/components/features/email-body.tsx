"use client";

import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Block, KNOWN_TAGS, type TemplateKind, splitTags } from "@/lib/mock/templates";
import { Hint } from "@/components/saella/hint";

// Renders a template body as the recipient sees it (preview) or as editable blocks (edit). Wrap it in
// `.email-canvas` (tokens.css) so it keeps the light email palette in dark mode; not Saella brand colours, except the button (PATTERNS.md §9.3: template colours are separate
// from UI colours; a first build has no per-template palette yet, so buttons use `primary`).
// Images are placeholders (no upload storage in the mock).

export function EmailBody({
  blocks,
  kind,
  mode,
  values,
  selectedId,
  onSelect,
  issueIds,
  footer = true,
}: {
  blocks: Block[];
  kind: TemplateKind;
  mode: "edit" | "preview";
  /** Sample recipient values; preview replaces merge tags with them. */
  values?: Record<string, string>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Blocks with a content-check error or warning get a marker in edit mode. */
  issueIds?: Set<string>;
  /** The unsubscribe footer Saella appends when the body has none (Repo src/lib/email/render.ts:153). */
  footer?: boolean;
}) {
  const poster = kind === "design";
  const hasUnsub = blocks.some((b) => JSON.stringify(b).includes("{{unsubscribe_url}}"));
  return (
    <div className={cn("flex flex-col gap-1 text-sm leading-relaxed", poster && "text-center")}>
      {blocks.map((b) => {
        const content = <BlockView block={b} poster={poster} mode={mode} values={values} />;
        if (mode === "preview" || !onSelect) return <div key={b.id}>{content}</div>;
        const selected = selectedId === b.id;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b.id)}
            aria-pressed={selected}
            aria-label={`${b.type} block${issueIds?.has(b.id) ? ", has a content check note" : ""}`}
            className={cn(
              "relative -mx-2 rounded-md px-2 py-1 text-left outline-none transition-shadow",
              poster && "text-center",
              "hover:ring-1 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring",
              selected && "ring-2 ring-brand hover:ring-2 hover:ring-brand"
            )}
          >
            {issueIds?.has(b.id) && (
              <Hint label="See Check"><span aria-hidden className="absolute top-1 right-1 size-2 rounded-full bg-warning" /></Hint>
            )}
            {content}
          </button>
        );
      })}
      {blocks.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">Add a block with the buttons below, or ask Write with AI for a first draft.</p>
      )}
      {footer && !hasUnsub && (
        <p className="mt-4 border-t pt-3 text-center text-xs text-subtle-foreground">
          You received this email from Northwind Ceramics.{" "}
          <span className="underline">Unsubscribe</span>
          {mode === "edit" && " · added automatically"}
        </p>
      )}
    </div>
  );
}

function BlockView({
  block: b,
  poster,
  mode,
  values,
}: {
  block: Block;
  poster: boolean;
  mode: "edit" | "preview";
  values?: Record<string, string>;
}) {
  const T = (text: string) => <TagText text={text} mode={mode} values={values} />;
  switch (b.type) {
    case "heading":
      return (
        <h2 className="pt-2 text-lg font-semibold tracking-title">
          {T(b.text)}
        </h2>
      );
    case "paragraph":
      return (
        <p className="whitespace-pre-line">
          {T(b.text)}
        </p>
      );
    case "image":
      return (
        <div
          role="img"
          aria-label={b.alt || "Image without alt text"}
          className={cn(
            "my-1 flex h-40 w-full flex-col items-center justify-center gap-1 rounded-md bg-muted text-muted-foreground",
            !b.file && "border border-dashed border-input"
          )}
        >
          <ImageIcon aria-hidden className="size-6" />
          <span className="text-xs">{b.file ?? "No image yet"}</span>
        </div>
      );
    case "button":
      return (
        <div className={cn("py-2", poster && "flex justify-center")}>
          <span className="inline-flex h-9 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground">
            {b.label || "Button"}
          </span>
        </div>
      );
    case "divider":
      return <hr className="my-2 border-border" />;
    case "hero":
      return (
        <div
          className={cn(
            "my-1 flex flex-col gap-1 rounded-md px-6 py-10",
            b.tone === "soft" && "bg-primary-soft text-primary-soft-foreground",
            b.tone === "muted" && "bg-muted text-foreground",
            b.tone === "ink" && "bg-foreground text-background"
          )}
        >
          <p className="text-3xl font-semibold tracking-display">
            {T(b.headline)}
          </p>
          {b.subline && (
            <p className="text-base opacity-90">
              {T(b.subline)}
            </p>
          )}
        </div>
      );
  }
}

/** Text with merge tags: chips in edit mode (unknown tags outlined red), sample values in preview. */
export function TagText({ text, mode, values }: { text: string; mode: "edit" | "preview"; values?: Record<string, string> }) {
  return (
    <>
      {splitTags(text).map((p, i) => {
        if (!p.tag) return <span key={i}>{p.text}</span>;
        const known = KNOWN_TAGS.has(p.tag);
        if (mode === "preview" && known) return <span key={i}>{values?.[p.tag] ?? p.text}</span>;
        return (
          <Hint key={i} label={known ? `Merge tag: ${p.tag}` : `Unknown merge tag: ${p.tag}`}>
            <span
              className={cn(
                "mx-0.5 inline-flex items-center rounded-sm px-1 align-baseline font-mono text-xs leading-5",
                known ? "bg-primary-subtle text-foreground" : "border border-destructive bg-destructive-soft text-destructive-soft-foreground"
              )}
            >
              {p.tag}
            </span>
          </Hint>
        );
      })}
    </>
  );
}
