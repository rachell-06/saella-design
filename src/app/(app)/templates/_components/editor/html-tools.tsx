"use client";

import { useRef, useState } from "react";
import { CodeIcon, EyeIcon, ImageIcon, PencilIcon, PlusIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChipRemove } from "@/components/saella/chip-remove";
import { Hint } from "@/components/saella/hint";
import { Badge } from "@/components/ui/badge";
import { sanitizeHtml } from "@/lib/mock/templates-html";
import { cn } from "@/lib/utils";

// The live editor's HTML tools (EmailTemplateEditor, PosterCanvasEditor; restored):
// - Visual | HTML: see and edit the email's raw HTML. What comes back is sanitised (AC-EC-T-05: script, iframe,
//   object, embed, form, style and link are removed). An .html file can be dropped onto the HTML view.
// - A Letter's HTML block: a designed block below the text, sent as an image (live "HTML block — sent as an
//   image"). Added by pasting HTML, dropping an .html file, or generating it with AI from a prompt and an optional
//   design reference image (mock: canned HTML).

/** The editor toolbar's Visual | HTML switch. */
export function SourceToggle({ source, onChange, disabled }: { source: boolean; onChange: (source: boolean) => void; disabled?: boolean }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={source ? "html" : "visual"}
      onValueChange={(v) => v && onChange(v === "html")}
      aria-label="Editing view"
      disabled={disabled}
      className="shrink-0"
    >
      <ToggleGroupItem value="visual" aria-label="Visual">
        <EyeIcon />
        Visual
      </ToggleGroupItem>
      <ToggleGroupItem value="html" aria-label="HTML">
        <CodeIcon />
        HTML
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/** Read an .html file dropped on a box. */
function readHtmlFile(f: File, onText: (t: string) => void, onError: (m: string) => void) {
  if (!/\.html?$/i.test(f.name) && f.type !== "text/html") return onError(`${f.name} isn't an .html file.`);
  const r = new FileReader();
  r.onload = () => onText(String(r.result ?? ""));
  r.onerror = () => onError(`Couldn't read ${f.name}.`);
  r.readAsText(f);
}

/** The HTML view: the email's HTML in a monospace box; drop an .html file to load it. */
export function HtmlSource({ value, onChange, disabled, hint }: { value: string; onChange: (v: string) => void; disabled?: boolean; hint: string }) {
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor="ed-html" className="sr-only">
        Email HTML
      </FieldLabel>
      <Textarea
        id="ed-html"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
        onDragOver={(e) => {
          if (![...e.dataTransfer.items].some((i) => i.kind === "file")) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          const f = e.dataTransfer.files[0];
          if (!f) return;
          e.preventDefault();
          setOver(false);
          readHtmlFile(
            f,
            (t) => {
              setError(null);
              onChange(t);
            },
            setError
          );
        }}
        className={cn("min-h-96 font-mono text-xs leading-relaxed", over && "border-ring ring-2 ring-ring")}
      />
      {error ? <FieldError>{error}</FieldError> : <FieldDescription>{hint}</FieldDescription>}
    </Field>
  );
}

const BLOCK_SAMPLE = (prompt: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
    <td style="background:#0f3d2e;color:#ffffff;padding:28px 24px;border-radius:10px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:22px;font-weight:bold;">${prompt.trim() ? prompt.trim().replace(/[<>&"]/g, "") : "Hand-glazed for {{company_name}}"}</div>
      <div style="font-size:14px;opacity:0.9;padding-top:6px;">Eight glazes · samples in five days</div>
    </td>
  </tr>
</table>`;

/** A Letter's HTML block: the drop zone, or the block with Edit HTML and Remove; the dialog that edits it. */
export function HtmlBlockArea({ block, onChange, disabled }: { block: string; onChange: (html: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drop = {
    onDragOver: (e: React.DragEvent) => {
      if (disabled || ![...e.dataTransfer.items].some((i) => i.kind === "file")) return;
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      const f = e.dataTransfer.files[0];
      if (!f || disabled) return;
      e.preventDefault();
      setOver(false);
      readHtmlFile(
        f,
        (t) => {
          setError(null);
          onChange(sanitizeHtml(t));
        },
        setError
      );
    },
  };
  return (
    <div {...drop} className={cn("rounded-lg", over && "ring-2 ring-ring")}>
      {block.trim() ? (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">HTML block · sent as an image</span>
            {!disabled && (
              <span className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
                  <PencilIcon data-icon="inline-start" />
                  Edit HTML
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive-soft-foreground hover:text-destructive-soft-foreground" onClick={() => onChange("")}>
                  <Trash2Icon data-icon="inline-start" />
                  Remove
                </Button>
              </span>
            )}
          </div>
          {/* Sanitised on the way in (AC-EC-T-05); the email palette, whatever the app theme. */}
          <div className="email-canvas overflow-hidden rounded-md border" aria-label="HTML block preview" dangerouslySetInnerHTML={{ __html: sanitizeHtml(block) }} />
        </div>
      ) : (
        !disabled && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(true)}
            className="h-auto w-full flex-col gap-1 rounded-lg border border-dashed border-input py-4 whitespace-normal text-muted-foreground"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <PlusIcon className="size-4" />
              {over ? "Drop the HTML file to load it" : "Add HTML block"}
            </span>
            <span className="text-xs">Paste a designed HTML block, generate one, or drop an .html file. It shows below your text and is sent as an image.</span>
          </Button>
        )
      )}
      {error && <p className="pt-1 text-xs text-destructive-soft-foreground">{error}</p>}
      <HtmlBlockDialog open={open} onOpenChange={setOpen} initial={block} onApply={(h) => onChange(sanitizeHtml(h))} />
    </div>
  );
}

function HtmlBlockDialog({ open, onOpenChange, initial, onApply }: { open: boolean; onOpenChange: (o: boolean) => void; initial: string; onApply: (html: string) => void }) {
  const [html, setHtml] = useState(initial);
  const [prompt, setPrompt] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Each opening starts from the block as it is (adjusted during render).
  const [openedWith, setOpenedWith] = useState<string | null>(null);
  if (open && openedWith === null) {
    setOpenedWith(initial);
    setHtml(initial);
  }
  if (!open && openedWith !== null) setOpenedWith(null);

  function generate() {
    setWriting(true);
    setTimeout(() => {
      setHtml(BLOCK_SAMPLE(prompt));
      setWriting(false);
    }, 1200);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !writing && onOpenChange(o)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>HTML block</DialogTitle>
          <DialogDescription>Generate a block with AI, or paste a designed HTML block. It shows below your text and is sent as one image.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="hb-prompt">Describe the block</FieldLabel>
            <Textarea
              id="hb-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPaste={(e) => {
                const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
                if (!f) return;
                e.preventDefault();
                setReference(f.name);
              }}
              placeholder="e.g. A bold banner with our headline, a short line below, and our brand green"
              className="min-h-16"
              disabled={writing}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Hidden file input opened by a Button. */}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) setReference(f.name);
                }}
              />
              {reference ? (
                <Badge variant="secondary" className="gap-1 pr-1">
                  <ImageIcon aria-hidden />
                  <span className="max-w-48 truncate">{reference}</span>
                  <ChipRemove label={`Remove ${reference}`} onClick={() => setReference(null)} disabled={writing} />
                </Badge>
              ) : (
                <Hint label="Attach or paste a design image for the AI to recreate">
                  <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => fileRef.current?.click()} disabled={writing}>
                    <ImageIcon data-icon="inline-start" />
                    Design reference
                  </Button>
                </Hint>
              )}
              <Button variant="outline" size="sm" onClick={generate} disabled={writing || (!prompt.trim() && !reference)}>
                {writing ? <Spinner data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}
                {writing ? "Generating…" : "Generate with AI"}
              </Button>
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="hb-html">HTML</FieldLabel>
            <Textarea
              id="hb-html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<table>…</table>"
              spellCheck={false}
              className="min-h-48 font-mono text-xs"
              disabled={writing}
            />
          </Field>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={writing}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            disabled={writing || !html.trim()}
            onClick={() => {
              onApply(html);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
