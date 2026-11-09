"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  MailIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { detailsFor } from "@/app/(app)/templates/_components/data";
import { EmailBody, TagText } from "@/app/(app)/templates/_components/editor/email-body";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Sender } from "@/lib/mock/workspace";
import type { CheckStatus, Handling } from "./recipient-checks";
import {
  type DataIssue,
  type Recipient,
  displayName,
  gapsOf,
  valuesFor,
} from "./recipient-check";

// Preview with a real recipient (R3, 2026-10-29; Clay's lead-by-lead preview, Mailchimp "Preview as"). Pick a
// person, or step through them; the subject and body fill in with their data and the fallbacks chosen in the
// check, so "Hi there," is visible before it is sent. Recipients with gaps are listed first in the picker.
// The live app needs the server to render one recipient's email (same renderer as the send).

const n = (x: number) => x.toLocaleString("en-US");
/** People offered in the picker besides the flagged ones; prev/next reaches everyone. */
const PICKER = 30;

export function RecipientPreview({
  templateId,
  subject,
  sender,
  people,
  issues,
  handling,
  fallbacks,
  selectedId,
  onSelect,
  status,
  onRetry,
}: {
  templateId: string;
  subject: string;
  sender?: Sender;
  /** Everyone the batch goes to, people left out by the check included (they are marked). */
  people: Recipient[];
  issues: DataIssue[];
  handling: Record<string, Handling>;
  fallbacks: Record<string, string>;
  selectedId?: string;
  onSelect: (id: string) => void;
  status: CheckStatus;
  onRetry: () => void;
}) {
  const details = detailsFor(templateId);
  const index = Math.max(
    0,
    people.findIndex((p) => p.id === selectedId),
  );
  const person = people[index];
  const gaps = person ? gapsOf(person, issues) : [];
  const skipped = gaps.some((g) => handling[g.tag] === "skip");
  const values = person ? valuesFor(person, sender, fallbacks) : {};

  const flagged = new Set(
    issues.flatMap((i) => (i.kind === "missing" ? i.people.map((p) => p.id) : [])),
  );
  const flaggedPeople = people.filter((p) => flagged.has(p.id)).slice(0, PICKER);
  const others = people.filter((p) => !flagged.has(p.id)).slice(0, PICKER);
  const offered = new Set([...flaggedPeople, ...others].map((p) => p.id));
  const label = (p: Recipient) => displayName(p) || p.email;

  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>The email one recipient will get.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {status === "checking" ? (
          <div className="flex flex-col gap-3" aria-busy>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : status === "error" ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleAlertIcon />
              </EmptyMedia>
              <EmptyTitle>Preview isn&apos;t ready</EmptyTitle>
              <EmptyDescription>
                It needs the recipient check, which didn&apos;t finish.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={onRetry}>
                Try again
              </Button>
            </EmptyContent>
          </Empty>
        ) : !person ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MailIcon />
              </EmptyMedia>
              <EmptyTitle>No one to preview</EmptyTitle>
              <EmptyDescription>
                Nobody is left in this batch. Change the recipients to see an
                email.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Select value={person.id} onValueChange={onSelect}>
                <SelectTrigger
                  aria-label="Preview as"
                  className="w-full min-w-0 flex-1"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {!offered.has(person.id) && (
                    <SelectGroup>
                      <SelectItem value={person.id}>{label(person)}</SelectItem>
                    </SelectGroup>
                  )}
                  {flaggedPeople.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Missing data</SelectLabel>
                      {flaggedPeople.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {label(p)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  <SelectGroup>
                    <SelectLabel>Recipients</SelectLabel>
                    {others.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {label(p)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous recipient"
                disabled={index === 0}
                onClick={() => onSelect(people[index - 1].id)}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next recipient"
                disabled={index >= people.length - 1}
                onClick={() => onSelect(people[index + 1].id)}
              >
                <ChevronRightIcon />
              </Button>
            </div>
            <p className="-mt-2 text-sm text-muted-foreground tabular-nums">
              Recipient {n(index + 1)} of {n(people.length)}
            </p>

            {gaps.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
                <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  {skipped
                    ? "Left out of this batch: "
                    : "Uses the fallback for: "}
                  {gaps.map((g) => g.field).join(", ")}.
                </span>
              </p>
            )}

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">From</dt>
              <dd className="truncate">
                {sender ? `${sender.name} <${sender.email}>` : ""}
              </dd>
              <dt className="text-muted-foreground">To</dt>
              <dd className="truncate">{person.email}</dd>
              <dt className="text-muted-foreground">Subject</dt>
              <dd className="font-medium">
                <TagText text={subject} mode="preview" values={values} />
              </dd>
            </dl>

            <div
              className={
                skipped
                  ? "max-h-112 overflow-y-auto rounded-lg border p-4 opacity-60"
                  : "max-h-112 overflow-y-auto rounded-lg border p-4"
              }
            >
              <EmailBody
                blocks={details.blocks}
                kind={details.kind}
                mode="preview"
                values={values}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
