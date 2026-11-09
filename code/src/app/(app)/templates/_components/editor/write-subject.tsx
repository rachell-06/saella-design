"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlertIcon, RotateCwIcon, SparklesIcon, SquareIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { type TemplateKind } from "../data";

// Subject line in Write with AI (Competitor.md R4, after Apollo A4 + Mailchimp F1), 2026-10-29.
// The agent suggests 3 subjects, written from the email body plus an optional prompt. They stream in one by
// one; the user picks one (radio) and presses "Use this subject". The subject field never changes on its own
// (DESIGN.md §9.3). Each option has thumbs up/down: feedback only, it doesn't pick or hide anything.
// Mock: options are canned and rotate on Try again. ?state=ai-error fails after the first option.

type Phase = "idle" | "streaming" | "done" | "error";
type Option = { id: string; text: string };
type Rating = "up" | "down";

const COUNT = 3;

export type SubjectPreview = "subject" | "subject-writing";

export function WriteSubject({
  kind,
  subject,
  hasBody,
  disabled,
  failMidway,
  preview,
  onUse,
}: {
  kind: TemplateKind;
  /** The subject in the envelope now, shown for comparison. */
  subject: string;
  hasBody: boolean;
  disabled: boolean;
  failMidway?: boolean;
  /** Screenshot states: options ready, or frozen while writing. */
  preview?: SubjectPreview | null;
  onUse: (subject: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>(() =>
    preview === "subject" ? (failMidway ? "error" : "done") : preview === "subject-writing" ? "streaming" : "idle"
  );
  const [options, setOptions] = useState<Option[]>(() =>
    preview === "subject" && !failMidway ? subjectsFor(kind, 0) : preview === "subject-writing" ? subjectsFor(kind, 0).slice(0, 1) : []
  );
  const [chosen, setChosen] = useState<string>("");
  const [usedId, setUsedId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const round = useRef(preview ? 1 : 0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => stop, []);

  function generate() {
    stop();
    const full = subjectsFor(kind, round.current++);
    setOptions([]);
    setChosen("");
    setUsedId(null);
    setRatings({});
    setPhase("streaming");
    full.forEach((o, i) => {
      timers.current.push(
        setTimeout(() => {
          if (failMidway && i === 1) {
            stop();
            setOptions([]);
            setPhase("error");
            return;
          }
          setOptions((s) => [...s, o]);
          if (i === full.length - 1) setPhase("done");
        }, 450 * (i + 1))
      );
    });
  }

  function discard() {
    stop();
    setPhase("idle");
    setOptions([]);
    setChosen("");
    setUsedId(null);
  }

  const picked = options.find((o) => o.id === chosen);
  const busy = phase === "streaming";

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="ai-subject-prompt">Tell the agent (optional)</FieldLabel>
        <Textarea
          id="ai-subject-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Curious, under 50 characters, mention free samples"
          className="min-h-20"
          disabled={disabled || busy}
        />
        <FieldDescription>Written from your email body. Your subject stays as it is until you pick one.</FieldDescription>
      </Field>

      {busy ? (
        <Button variant="outline" onClick={() => { stop(); setPhase(options.length ? "done" : "idle"); }}>
          <SquareIcon data-icon="inline-start" />
          Stop
        </Button>
      ) : (
        <Button variant="secondary" onClick={generate} disabled={disabled || (!hasBody && !prompt.trim())}>
          <SparklesIcon data-icon="inline-start" />
          {phase === "done" || phase === "error" ? "Suggest again" : `Suggest ${COUNT} subjects`}
        </Button>
      )}

      {phase === "error" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The agent stopped before finishing</AlertTitle>
          <AlertDescription>Your subject didn&apos;t change. Try again in a moment.</AlertDescription>
        </Alert>
      )}

      {(phase === "streaming" || phase === "done") && (
        <section aria-label="Suggested subjects" aria-live="polite" className="flex flex-col gap-3 rounded-lg border p-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {busy ? (
              <>
                <Spinner className="size-4" />
                Writing…
              </>
            ) : (
              "Pick one. Your subject changes only when you use it."
            )}
          </p>
          <p className="truncate text-sm">
            <span className="text-muted-foreground">Now: </span>
            {subject || <span className="text-muted-foreground">No subject yet</span>}
          </p>

          <RadioGroup value={chosen} onValueChange={setChosen} aria-label="Suggested subjects" className="gap-2">
            {options.map((o) => {
              const rating = ratings[o.id];
              const rate = (r: Rating) => (pressed: boolean) =>
                setRatings((all) => {
                  const next = { ...all };
                  if (pressed) next[o.id] = r;
                  else delete next[o.id];
                  return next;
                });
              return (
                <div
                  key={o.id}
                  className="flex items-start gap-2 rounded-lg border p-2.5 has-data-checked:border-primary has-data-checked:bg-primary-subtle not-has-data-checked:hover:bg-muted/50"
                >
                  <RadioGroupItem id={`ai-subject-${o.id}`} value={o.id} className="mt-0.5" />
                  <Label htmlFor={`ai-subject-${o.id}`} className="min-w-0 flex-1 flex-col items-start gap-1 font-normal leading-snug">
                    <span className="break-words">{o.text}</span>
                    <span className="flex items-center gap-2 text-muted-foreground tabular-nums">
                      {o.text.length} characters
                      {usedId === o.id && <Badge variant="secondary">In use</Badge>}
                    </span>
                  </Label>
                  <div className="-my-0.5 flex shrink-0 gap-0.5">
                    <Toggle size="sm" pressed={rating === "up"} onPressedChange={rate("up")} aria-label="Good suggestion" title="Good suggestion">
                      <ThumbsUpIcon />
                    </Toggle>
                    <Toggle size="sm" pressed={rating === "down"} onPressedChange={rate("down")} aria-label="Bad suggestion" title="Bad suggestion">
                      <ThumbsDownIcon />
                    </Toggle>
                  </div>
                </div>
              );
            })}
            {busy &&
              Array.from({ length: COUNT - options.length }, (_, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border p-2.5" aria-hidden>
                  <Skeleton className="mt-0.5 size-4 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                </div>
              ))}
          </RadioGroup>

          {phase === "done" && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!picked || picked.id === usedId}
                onClick={() => {
                  if (!picked) return;
                  onUse(picked.text);
                  setUsedId(picked.id);
                }}
              >
                Use this subject
              </Button>
              <Button size="sm" variant="ghost" onClick={generate}>
                <RotateCwIcon data-icon="inline-start" />
                Try again
              </Button>
              <Button size="sm" variant="ghost" onClick={discard}>
                Discard
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// Canned subjects. Real output comes from the generator, written from the body and prompt, and honours saved
// agent instructions (AC-EC-G-06).
const SUBJECTS: Record<TemplateKind, string[][]> = {
  letter: [
    ["{{recipient_first_name}}, samples for {{company_name}}?", "Hotel tableware, glazed in small batches", "A quick question about your tableware"],
    ["Free samples for {{company_name}}, no strings", "Tableware your guests will notice", "{{recipient_first_name}}, five glazes worth a look"],
  ],
  design: [
    ["New celadon tiles for {{company_name}}", "Eight glazes, samples in five days", "Hand-glazed in Bat Trang, made for hotels"],
    ["{{recipient_first_name}}, our new tile range is here", "Celadon, ash and cobalt: the 2026 glazes", "Samples at your door in five days"],
  ],
};

function subjectsFor(kind: TemplateKind, round: number): Option[] {
  const set = SUBJECTS[kind][round % SUBJECTS[kind].length];
  return set.slice(0, COUNT).map((text, i) => ({ id: `${round}-${i}`, text }));
}
