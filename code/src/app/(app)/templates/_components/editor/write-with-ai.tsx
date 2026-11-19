"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlertIcon, ImageIcon, MailIcon, SparklesIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { AttachmentGroup } from "@/components/ui/attachment";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { FileAttachment } from "@/components/features/agent-chat/file-attachment";
import type { SentFile } from "@/components/features/agent-chat/data";
import { Spinner } from "@/components/ui/spinner";
import { Hint } from "@/components/saella/hint";
import { EmailBody } from "@/components/features/email-body";
import { type Block, SAMPLE_VALUES, type TemplateKind, newBlockId, resolveTags } from "@/lib/mock/templates";

// "Write with Saella" (PRD-02 AC-EC-G-01..06), as the live app's Agent modal (EmailTemplateEditor "Write with AI"):
// a button on the editor toolbar opens a dialog; the brief on the left, the draft on the right; nothing reaches the
// editor until "Use this draft", and nothing is saved until Save.
// - Empty/new email: write a fresh one (subject, preheader and email; the name too while it's "Untitled …").
// - Email with text: change it ("Make it shorter"…), keeping the subject, or write a new one.
// - Once a draft is shown: Try again (from the brief), change one thing (refine the draft), Use this draft, Discard.
// A fresh letter/design gets the business signature (G-05). An optional style reference image goes with the brief
// (G-03; live app: png/jpeg/gif/webp, 4 MB). A website in the brief brings the company logo into a design (G-04).
// Saella never invents a photo: images it can't supply are empty placeholders to upload (EC-EC-29).
// Mock: canned text built from the prompt, after a short wait (the live app streams it, G-01); ?state=ai-error fails.

/** One-click changes: to the email as it is, or to the draft on screen. */
const REFINES = ["Make it shorter", "Make it friendlier", "Make it more formal", "End with a clear question"];
/** Starting points for an empty email: they fill the brief, for the user to finish. */
const STARTERS = [
  "Introduce our products to purchasing managers",
  "Offer free samples, no strings attached",
  "Invite them to our trade fair booth",
];

const REFERENCE_MAX = 4 * 1024 * 1024;
const REFERENCE_TYPES = "image/png,image/jpeg,image/gif,image/webp";
const mentionsWebsite = (prompt: string) => /(https?:\/\/|www\.)\S+|\b[\w-]+\.(com|vn|net|org|io|co)\b/i.test(prompt);

const hasText = (blocks: Block[]) => blocks.some((b) => b.type === "paragraph" || b.type === "heading");

/** `name` is only a suggestion: the editor uses it when the template has no name of its own yet. */
export type Draft = { name?: string; subject?: string; preheader?: string; blocks: Block[] };

/** A short template name from the brief: its first words, capitalised. Real naming comes from the generator. */
function nameFrom(prompt: string) {
  const words = prompt.trim().replace(/[.,!?]+$/, "").split(/\s+/).slice(0, 6).join(" ");
  return words ? words[0].toUpperCase() + words.slice(1) : "New email";
}

/** ✨ beside a field Saella filled, until it's edited or undone. */
export function AiMark() {
  return (
    <Hint label="Written by Saella. Check it before you save.">
      <span tabIndex={0} className="inline-flex text-brand">
        <SparklesIcon className="size-3.5" aria-label="Written by Saella" />
      </span>
    </Hint>
  );
}

export function WriteWithSaellaDialog({
  open,
  onOpenChange,
  kind,
  current,
  fresh,
  failMidway,
  onUse,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: TemplateKind;
  /** The email as it is in the editor. With text, the dialog changes it instead of writing anew. */
  current: Block[];
  /** A new template whose body is still the starter: write a new email, don't change the starter. */
  fresh?: boolean;
  failMidway?: boolean;
  onUse: (draft: Draft) => void;
}) {
  const editing = !fresh && hasText(current);
  const [prompt, setPrompt] = useState("");
  const [change, setChange] = useState("");
  const [phase, setPhase] = useState<"idle" | "writing" | "error">("idle");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [reference, setReference] = useState<SentFile | null>(null);
  /** The brief box is open over a draft (Edit) or instead of changing the email ("Write a new email instead"). */
  const [briefOpen, setBriefOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const writing = phase === "writing";

  /** fresh: a new email from the brief. Otherwise a change to the draft on screen, or to the email as it is. */
  function write(fresh: boolean) {
    setPhase("writing");
    timer.current = setTimeout(() => {
      if (failMidway) return setPhase("error");
      setPhase("idle");
      setChange("");
      setBriefOpen(false);
      if (fresh)
        setDraft({ name: nameFrom(prompt), subject: SUBJECT_FOR[kind], preheader: PREHEADER_FOR[kind], blocks: newEmail(kind, prompt) });
      else setDraft((d) => (d ? { ...d, blocks: refine(d.blocks) } : { blocks: refine(current) }));
    }, 1400);
  }

  function close(next: boolean) {
    if (writing) return;
    onOpenChange(next);
    if (!next) {
      setDraft(null);
      setPhase("idle");
      setChange("");
      setBriefOpen(false);
    }
  }

  // One box at a time. "brief" = live app aiPrompt: writes a fresh draft. "change" = live app
  // "Refine — describe one change" (aiRefinePrompt): edits the draft on screen, or the email as it is when the
  // template already has text. With a draft, the brief folds to one line with Edit.
  const box: "brief" | "change" = briefOpen || (!draft && !editing) ? "brief" : "change";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-5xl" showCloseButton={!writing}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-brand" aria-hidden />
            Write with Saella · {kind === "design" ? "Design" : "Letter"}
          </DialogTitle>
          <DialogDescription>
            {box === "change"
              ? draft
                ? "Change one thing at a time, or use the draft as it is."
                : "Say what to change, or pick a quick fix. Your subject stays as it is."
              : "Say who it's for and what you offer. Saella writes the subject and the email; you check it before it goes in."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* Left: one box at a time */}
          <div className="flex min-w-0 flex-col gap-4">
            {box === "brief" ? (
              <>
                <Composer
                  id="ws-brief"
                  label="What should the email say?"
                  value={prompt}
                  onChange={setPrompt}
                  placeholder={
                    kind === "design"
                      ? "e.g. A poster for our new celadon tile range, aimed at hotel designers"
                      : "e.g. Introduce our hotel tableware to purchasing managers in Vietnam, friendly and short"
                  }
                  disabled={writing}
                  reference={reference}
                  onReference={setReference}
                />
                <div className="flex flex-wrap gap-1.5" aria-label="Suggestions">
                  {STARTERS.map((s) => (
                    <Button key={s} type="button" size="sm" variant="outline" disabled={writing} onClick={() => setPrompt(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* The brief behind the draft, folded to one line. */}
                {draft && prompt.trim() && (
                  <p className="flex min-w-0 items-center gap-1.5 text-sm">
                    <span className="shrink-0 text-muted-foreground">Brief:</span>
                    <span className="min-w-0 truncate" title={prompt.trim()}>
                      {prompt.trim()}
                    </span>
                    <span aria-hidden className="text-subtle-foreground">
                      ·
                    </span>
                    <Button variant="link" className="h-auto shrink-0 border-0 p-0" onClick={() => setBriefOpen(true)} disabled={writing}>
                      Edit
                    </Button>
                  </p>
                )}
                <Composer
                  id="ws-change"
                  label={draft ? "Change one thing" : "What should change?"}
                  value={change}
                  onChange={setChange}
                  placeholder={draft ? "e.g. Shorten the intro, or mention free samples" : "e.g. Shorter and warmer, and mention free samples"}
                  disabled={writing}
                  reference={reference}
                  onReference={setReference}
                />
                <div className="flex flex-wrap gap-1.5" aria-label="Quick changes">
                  {REFINES.map((r) => (
                    <Button key={r} type="button" size="sm" variant="outline" disabled={writing} onClick={() => write(false)}>
                      {r}
                    </Button>
                  ))}
                </div>
              </>
            )}

            {phase === "error" && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>Saella stopped before finishing</AlertTitle>
                <AlertDescription>Nothing changed. Try again in a moment.</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right: what Saella wrote, as the recipient sees it */}
          <div className="flex min-h-80 min-w-0 flex-col gap-3 rounded-card border p-4" aria-live="polite" aria-busy={writing}>
            {writing ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                Writing your email…
              </div>
            ) : draft ? (
              <>
                <div className="flex flex-col gap-1 border-b pb-3">
                  <p className="truncate text-sm font-medium">{resolveTags(draft.subject ?? "", SAMPLE_VALUES) || "Subject stays as it is"}</p>
                  {draft.preheader && <p className="truncate text-sm text-muted-foreground">{resolveTags(draft.preheader, SAMPLE_VALUES)}</p>}
                </div>
                <div className="email-canvas max-h-[28rem] overflow-y-auto rounded-lg border p-6">
                  <EmailBody blocks={draft.blocks} kind={kind} mode="preview" values={SAMPLE_VALUES} />
                </div>
              </>
            ) : (
              <Empty className="flex-1">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MailIcon />
                  </EmptyMedia>
                  <EmptyTitle>Your draft shows here</EmptyTitle>
                  <EmptyDescription>Nothing goes into the email until you use it.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </div>

        <DialogFooter>
          {box === "brief" ? (
            <>
              {/* Back to the box that was there before: the draft's change box, or changing the email as it is. */}
              {(draft || editing) && (
                <Button variant="ghost" className="sm:mr-auto" onClick={() => setBriefOpen(false)} disabled={writing}>
                  {draft ? "Back to the draft" : "Change this email instead"}
                </Button>
              )}
              <Button variant="outline" onClick={() => close(false)} disabled={writing}>
                Cancel
              </Button>
              {/* An AI action: variant ai, never solid (button.meta.ts). */}
              <Button variant="ai" onClick={() => write(true)} disabled={writing || !prompt.trim()}>
                <SparklesIcon data-icon="inline-start" />
                {draft ? "Write it again" : "Write the email"}
              </Button>
            </>
          ) : draft ? (
            <>
              <Button variant="ghost" className="sm:mr-auto" onClick={() => setDraft(null)} disabled={writing}>
                Discard
              </Button>
              {prompt.trim() && (
                <Button variant="outline" onClick={() => write(true)} disabled={writing}>
                  Try again
                </Button>
              )}
              {change.trim() && (
                <Button variant="outline" onClick={() => write(false)} disabled={writing}>
                  Change it
                </Button>
              )}
              <Button
                onClick={() => {
                  onUse(draft);
                  close(false);
                }}
                disabled={writing}
              >
                Use this draft
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="sm:mr-auto" onClick={() => setBriefOpen(true)} disabled={writing}>
                Write a new email instead
              </Button>
              <Button variant="outline" onClick={() => close(false)} disabled={writing}>
                Cancel
              </Button>
              <Button variant="ai" onClick={() => write(false)} disabled={writing || !change.trim()}>
                <SparklesIcon data-icon="inline-start" />
                Change the email
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The brief / change box, chat-composer style (same parts as the agent's ChatComposer): the
 * text on top, the style reference inside the box (pick with the image button, paste ⌘/Ctrl+V, or drop it on the box,
 * as the live app's "attach or paste an image"), and one reference shared by both boxes.
 */
function Composer({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  reference,
  onReference,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled: boolean;
  reference: SentFile | null;
  onReference: (f: SentFile | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function take(f: File | undefined) {
    if (!f || disabled) return;
    if (!REFERENCE_TYPES.split(",").includes(f.type)) return setError(`${f.name} isn't a PNG, JPEG, GIF or WebP image.`);
    if (f.size > REFERENCE_MAX) return setError(`${f.name} is over 4 MB. Use a smaller image.`);
    setError(null);
    if (reference?.url) URL.revokeObjectURL(reference.url);
    onReference({ name: f.name, kind: "image", bytes: f.size, url: URL.createObjectURL(f) });
  }

  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup
        data-dragging={dragging || undefined}
        className="data-[dragging]:border-ring data-[dragging]:ring-2 data-[dragging]:ring-ring"
        onDragOver={(e) => {
          if (disabled || ![...e.dataTransfer.items].some((i) => i.kind === "file")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragging(false);
          take([...e.dataTransfer.files].find((f) => f.type.startsWith("image/")) ?? e.dataTransfer.files[0]);
        }}
      >
        {/* Hidden file input opened by the image button (DESIGN.md §2 Control). */}
        <input
          ref={fileRef}
          type="file"
          accept={REFERENCE_TYPES}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            take(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {reference && (
          <InputGroupAddon align="block-start" className="min-w-0">
            <AttachmentGroup className="max-w-full">
              <FileAttachment
                file={reference}
                className="max-w-72"
                onRemove={
                  disabled
                    ? undefined
                    : () => {
                        if (reference.url) URL.revokeObjectURL(reference.url);
                        onReference(null);
                      }
                }
              />
            </AttachmentGroup>
          </InputGroupAddon>
        )}
        <InputGroupTextarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus
          aria-invalid={Boolean(error) || undefined}
          // A pasted image becomes the style reference, as in the live app and the agent composer.
          onPaste={(e) => {
            const img = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
            if (!img) return;
            e.preventDefault();
            take(img);
          }}
          className="max-h-48 min-h-24"
        />
        <InputGroupAddon align="block-end">
          <Hint label="Add a style reference: Saella matches its look. Or paste or drop an image here.">
            <InputGroupButton size="icon-sm" aria-label="Add a style reference image" disabled={disabled} onClick={() => fileRef.current?.click()}>
              <ImageIcon />
            </InputGroupButton>
          </Hint>
          {!reference && <InputGroupText className="text-xs text-muted-foreground">PNG, JPEG, GIF or WebP, up to 4 MB</InputGroupText>}
        </InputGroupAddon>
      </InputGroup>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

const SUBJECT_FOR: Record<TemplateKind, string> = {
  letter: "{{recipient_first_name}}, samples for {{company_name}}?",
  design: "New celadon tiles for {{company_name}}",
};
const PREHEADER_FOR: Record<TemplateKind, string> = {
  letter: "A few pieces to try, sent free, no follow-up calls",
  design: "Eight glazes, samples at your door in five days",
};

// Canned drafts. Real output comes from the generator and honours saved agent instructions (AC-EC-G-06).
function newEmail(kind: TemplateKind, prompt: string): Block[] {
  const topic = prompt.trim().replace(/\.$/, "");
  const p = (text: string): Block => ({ id: newBlockId(), type: "paragraph", text });
  const signature = p("Best regards,\nLinh Tran\nNorthwind Ceramics · northwind-ceramics.com");
  if (kind === "design")
    return [
      // The logo comes from the website named in the brief (G-04); a photo is left for the user to upload (EC-EC-29).
      ...(mentionsWebsite(prompt) ? [{ id: newBlockId(), type: "image" as const, file: "logo.png", alt: "Northwind Ceramics logo" }] : []),
      { id: newBlockId(), type: "hero", headline: "Made for {{company_name}}", subline: topic || "Hand-glazed in Bat Trang", tone: "soft" },
      { id: newBlockId(), type: "image", alt: "Close-up of hand-glazed tiles in soft green" },
      p("Eight glazes, three formats, and samples at your door in five days."),
      { id: newBlockId(), type: "button", label: "See the range", url: "https://northwind-ceramics.com" },
      signature,
    ];
  return [
    p("Hi {{recipient_first_name}},"),
    p(`I'm Linh from Northwind Ceramics. ${topic ? `You came to mind because of ${topic.toLowerCase()}.` : ""} We make glazed tableware for hotels and restaurants, in small batches.`),
    p("Would it help if I sent a few samples to {{company_name}} next week? No cost, and no follow-up calls unless you ask."),
    { id: newBlockId(), type: "button", label: "Pick your samples", url: "https://northwind-ceramics.com/samples" },
    signature,
  ];
}

function refine(current: Block[]): Block[] {
  return current.map((b) =>
    b.type === "paragraph" && !b.text.startsWith("Best regards") && !b.text.startsWith("Hi ")
      ? { ...b, id: newBlockId(), text: shorten(b.text) }
      : { ...b, id: newBlockId() }
  );
}

function shorten(text: string) {
  const first = text.split(/(?<=[.!?])\s+/)[0];
  return first.length < text.length ? first : text;
}
