"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlertIcon, RotateCwIcon, SparklesIcon, SquareIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type Block, type TemplateKind, newBlockId } from "../data";
import { EmailBody } from "./email-body";
import { type SubjectPreview, WriteSubject } from "./write-subject";

// "Write with AI" (PRD-02 AC-EC-G-01..06, live app EmailTemplateEditor runAiGenerate). The draft streams in
// block by block (G-01) into this panel, never straight into the email (DESIGN.md §9.3): the user picks
// "Use this draft" or "Try again". A fresh letter/design gets the business signature (G-05); refine and
// single block don't. Using a draft only changes the editor; nothing is saved until Save.
// The subject line has its own tab: 3 options to pick from (write-subject.tsx, R4 2026-10-29). Both tabs stay
// mounted, so switching doesn't lose a draft.
// Mock: the text is canned, built from the prompt. ?state=ai-error makes the generator fail midway.
// ?ai=subject opens the Subject tab with options ready; ?ai=subject-writing freezes it while writing.

export type AiMode = "new" | "refine" | "block";

type Phase = "idle" | "streaming" | "done" | "error";
type Target = "body" | "subject";

export function WriteWithAi({
  subject,
  onUseSubject,
  preview,
  ...body
}: React.ComponentProps<typeof BodyWriter> & {
  subject: string;
  onUseSubject: (subject: string) => void;
  /** Value of ?ai= (screenshot states). */
  preview?: string | null;
}) {
  const subjectPreview: SubjectPreview | null = preview === "subject" || preview === "subject-writing" ? preview : null;
  const [target, setTarget] = useState<Target>(subjectPreview ? "subject" : "body");
  const hasBody = body.blocks.some((b) => b.type !== "divider" && b.type !== "image");

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel id="ai-target-label">Write the</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={target}
          onValueChange={(v) => v && setTarget(v as Target)}
          disabled={body.disabled}
          aria-labelledby="ai-target-label"
          className="w-full *:flex-1"
        >
          <ToggleGroupItem value="body">Email body</ToggleGroupItem>
          <ToggleGroupItem value="subject">Subject line</ToggleGroupItem>
        </ToggleGroup>
      </Field>
      <div hidden={target !== "body"}>
        <BodyWriter {...body} />
      </div>
      <div hidden={target !== "subject"}>
        <WriteSubject
          kind={body.kind}
          subject={subject}
          hasBody={hasBody}
          disabled={body.disabled}
          failMidway={body.failMidway}
          preview={subjectPreview}
          onUse={onUseSubject}
        />
      </div>
    </div>
  );
}

function BodyWriter({
  kind,
  blocks,
  selectedId,
  disabled,
  failMidway,
  onUse,
}: {
  kind: TemplateKind;
  blocks: Block[];
  selectedId: string | null;
  disabled: boolean;
  failMidway?: boolean;
  /** Replace the body (new, refine) or insert one block after the selection (block). */
  onUse: (mode: AiMode, result: Block[]) => void;
}) {
  const [mode, setMode] = useState<AiMode>(blocks.length > 0 ? "refine" : "new");
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState<Block[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => stop, []);

  function generate() {
    stop();
    const full = draftFor(mode, kind, prompt, blocks);
    setShown([]);
    setPhase("streaming");
    full.forEach((b, i) => {
      timers.current.push(
        setTimeout(() => {
          if (failMidway && i === 1) {
            stop();
            setPhase("error");
            return;
          }
          setShown((s) => [...s, b]);
          if (i === full.length - 1) setPhase("done");
        }, 450 * (i + 1))
      );
    });
  }

  const placeholder =
    mode === "new"
      ? kind === "design"
        ? "e.g. A poster for our new celadon tile range, aimed at hotel designers"
        : "e.g. Introduce our hotel tableware to purchasing managers in Vietnam, friendly and short"
      : mode === "refine"
        ? "e.g. Make it shorter and warmer, and end with a question"
        : "e.g. A paragraph about our 3-week lead time";

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel id="ai-mode-label">What to write</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={mode}
            onValueChange={(v) => v && setMode(v as AiMode)}
            disabled={disabled || phase === "streaming"}
            aria-labelledby="ai-mode-label"
            className="w-full *:flex-1"
          >
            <ToggleGroupItem value="new">New {kind === "design" ? "design" : "letter"}</ToggleGroupItem>
            <ToggleGroupItem value="refine" disabled={blocks.length === 0}>
              Refine
            </ToggleGroupItem>
            <ToggleGroupItem value="block">One block</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="ai-prompt">Tell the agent</FieldLabel>
          <Textarea
            id="ai-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            className="min-h-24"
            disabled={disabled || phase === "streaming"}
          />
          <FieldDescription>
            {mode === "new"
              ? "Replaces the body. Your signature is added at the end."
              : mode === "refine"
                ? "Rewrites the current body; merge tags are kept."
                : selectedId
                  ? "Inserted below the selected block."
                  : "Added at the end of the email."}
          </FieldDescription>
        </Field>
      </FieldGroup>

      {phase === "streaming" ? (
        <Button variant="outline" onClick={() => { stop(); setPhase(shown.length ? "done" : "idle"); }}>
          <SquareIcon data-icon="inline-start" />
          Stop
        </Button>
      ) : (
        <Button variant="secondary" onClick={generate} disabled={disabled || !prompt.trim()}>
          <SparklesIcon data-icon="inline-start" />
          {phase === "done" || phase === "error" ? "Generate again" : "Generate"}
        </Button>
      )}

      {phase === "error" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The agent stopped before finishing</AlertTitle>
          <AlertDescription>Nothing in your email changed. Try again in a moment.</AlertDescription>
        </Alert>
      )}

      {(phase === "streaming" || phase === "done") && (
        <section aria-label="Generated draft" aria-live="polite" className="flex flex-col gap-3 rounded-lg border p-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {phase === "streaming" ? (
              <>
                <Spinner className="size-4" />
                Writing…
              </>
            ) : (
              "Draft ready. Review it before you use it."
            )}
          </p>
          <EmailBody blocks={shown} kind={kind} mode="edit" footer={false} />
          {phase === "done" && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { onUse(mode, shown); setPhase("idle"); setShown([]); }}>
                Use this draft
              </Button>
              <Button size="sm" variant="ghost" onClick={generate}>
                <RotateCwIcon data-icon="inline-start" />
                Try again
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setPhase("idle"); setShown([]); }}>
                Discard
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// Canned drafts. Real output comes from the generator and honours saved agent instructions (AC-EC-G-06).
function draftFor(mode: AiMode, kind: TemplateKind, prompt: string, current: Block[]): Block[] {
  const topic = prompt.trim().replace(/\.$/, "");
  const p = (text: string): Block => ({ id: newBlockId(), type: "paragraph", text });
  const signature = p("Best regards,\nLinh Tran\nNorthwind Ceramics · northwind-ceramics.com");
  if (mode === "block") return [p(`A short note on ${topic.toLowerCase()}: we keep it simple, and {{company_name}} gets one contact for every order.`)];
  if (mode === "refine")
    return current.map((b) =>
      b.type === "paragraph" && !b.text.startsWith("Best regards") && !b.text.startsWith("Hi ")
        ? { ...b, id: newBlockId(), text: shorten(b.text) }
        : { ...b, id: newBlockId() }
    );
  if (kind === "design")
    return [
      { id: newBlockId(), type: "hero", headline: "Made for {{company_name}}", subline: topic || "Hand-glazed in Bat Trang", tone: "soft" },
      { id: newBlockId(), type: "image", file: "generated-hero.jpg", alt: "Close-up of hand-glazed tiles in soft green" },
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

function shorten(text: string) {
  const first = text.split(/(?<=[.!?])\s+/)[0];
  return first.length < text.length ? first : text;
}
