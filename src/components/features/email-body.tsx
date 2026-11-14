"use client";

import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Block, KNOWN_TAGS, type TemplateKind, splitTags } from "@/lib/mock/templates";
import { Hint } from "@/components/saella/hint";
import { blocksToHtml, placeholderImages, renderTags, sanitizeHtml } from "@/lib/mock/templates-html";

// Renders a template body as the recipient sees it (preview) or as editable blocks (edit). Wrap it in
// `.email-canvas` (tokens.css) so it keeps the light email palette in dark mode; not Saella brand colours, except the button (template colours are separate
// from UI colours; a first build has no per-template palette yet, so buttons use `primary`).
// Images are placeholders (no upload storage in the mock).
// A Letter is rich-text HTML (TipTap): pass `html`; without it the letter's blocks are turned
// into HTML. A Design renders its blocks.

/** Typography for a Letter's HTML, shared by the TipTap editor and every read-only view, so they look the same. */
export const EMAIL_PROSE = cn(
  "text-sm leading-relaxed",
  "[&_h1]:pt-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-display",
  "[&_h2]:pt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-title",
  "[&_h3]:pt-1 [&_h3]:text-base [&_h3]:font-semibold",
  "[&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_li_p]:my-0",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_hr]:my-3 [&_hr]:border-border [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md",
  "[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
);

/** Merge-tag chip, as TagText draws it (known tags tinted, unknown ones outlined red). */
export const tagChipClass = (known: boolean) =>
  cn(
    "mx-0.5 inline-flex items-center rounded-sm px-1 align-baseline font-mono text-xs leading-5",
    known ? "bg-primary-subtle text-foreground" : "border border-destructive bg-destructive-soft text-destructive-soft-foreground"
  );

const IMAGE_BOX =
  "my-2 flex h-40 w-full items-center justify-center rounded-md border border-dashed border-input bg-muted text-xs text-muted-foreground";

/** A Letter's HTML, read-only: sanitised (AC-EC-T-05), merge tags filled (preview) or shown as chips (edit). */
export function LetterHtml({ html, mode, values }: { html: string; mode: "edit" | "preview"; values?: Record<string, string> }) {
  const known = values ? Object.fromEntries(Object.entries(values).filter(([k]) => KNOWN_TAGS.has(k))) : undefined;
  const out = placeholderImages(
    renderTags(sanitizeHtml(html), mode === "preview" ? known : undefined, (tag) => tagChipClass(KNOWN_TAGS.has(tag))),
    IMAGE_BOX
  );
  // Sanitised above, and the mock's HTML only comes from this app (TipTap, seeds, Saella's drafts).
  return <div className={EMAIL_PROSE} dangerouslySetInnerHTML={{ __html: out }} />;
}

export function EmailBody({
  blocks,
  html,
  kind,
  mode,
  values,
  selectedId,
  onSelect,
  issueIds,
  footer = true,
}: {
  blocks: Block[];
  /** A Letter's rich-text body; when missing, a letter's blocks are turned into HTML. */
  html?: string;
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
  if (!poster) {
    const body = html ?? blocksToHtml(blocks);
    return (
      <div className="flex flex-col gap-1">
        {body.replace(/<[^>]+>/g, "").trim() || /<img\b/i.test(body) ? (
          <LetterHtml html={body} mode={mode} values={values} />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">The email is empty.</p>
        )}
        {footer && !body.includes("{{unsubscribe_url}}") && <UnsubFooter mode={mode} />}
      </div>
    );
  }
  const hasUnsub = blocks.some((b) => JSON.stringify(b).includes("{{unsubscribe_url}}"));
  return (
    <div className={cn("flex flex-col gap-1 text-sm leading-relaxed", poster && "text-center")}>
      {blocks.map((b) => {
        const content = <BlockView block={b} poster={poster} mode={mode} values={values} />;
        if (mode === "preview" || !onSelect) return <div key={b.id}>{content}</div>;
        const selected = selectedId === b.id;
        return (
          // eslint-disable-next-line saella/no-raw-control -- a selectable block of email content, not a control
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
              <Hint label="See the content check"><span aria-hidden className="absolute top-1 right-1 size-2 rounded-full bg-warning" /></Hint>
            )}
            {content}
          </button>
        );
      })}
      {blocks.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">Add a block with the buttons below, or ask Write with Saella for a first draft.</p>
      )}
      {footer && !hasUnsub && <UnsubFooter mode={mode} />}
    </div>
  );
}

/** The unsubscribe footer Saella appends when the body has none (Repo src/lib/email/render.ts:153). */
function UnsubFooter({ mode }: { mode: "edit" | "preview" }) {
  return (
    <p className="mt-4 border-t pt-3 text-center text-xs text-subtle-foreground">
      You received this email from Northwind Ceramics. <span className="underline">Unsubscribe</span>
      {mode === "edit" && " · added automatically"}
    </p>
  );
}

/** One block as the recipient sees it (preview) or with merge-tag chips (edit). */
export function BlockView({
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
