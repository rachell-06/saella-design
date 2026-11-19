"use client";

import {
  CircleAlertIcon,
  MailIcon,
  ShuffleIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { detailsFor } from "@/lib/mock/templates";
import { EmailBody, TagText } from "@/components/features/email-body";
import { Hint } from "@/components/saella/hint";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
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
import { Skeleton } from "@/components/ui/skeleton";
import type { Sender } from "@/lib/mock/workspace";
import type { CheckStatus, Handling } from "./recipient-checks";
import {
  type DataIssue,
  type Recipient,
  gapsOf,
  recipientLabel,
  valuesFor,
} from "./recipient-check";

// Preview with a real recipient (R3). Shuffle shows another; the subject and body fill in with their data and the
// fallbacks chosen in the check, so "Hi there," is visible before it is sent.
// The live app needs the server to render one recipient's email (same renderer as the send).

const n = (x: number) => x.toLocaleString("en-US");

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
  action,
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
  /** Header button (Review › Edit template). */
  action?: ReactNode;
}) {
  const details = detailsFor(templateId);
  // Who is still in the batch: "one of N" and Shuffle count only them, like Review's Recipients row. Someone the check
  // leaves out shows only if picked before they were left out (marked below).
  const leftOut = (p: Recipient) =>
    gapsOf(p, issues).some((g) => handling[g.tag] === "skip");
  const inBatch = people.filter((p) => !leftOut(p));
  const person =
    people.find((p) => p.id === selectedId) ?? inBatch[0] ?? people[0];
  const gaps = person ? gapsOf(person, issues) : [];
  const skipped = gaps.some((g) => handling[g.tag] === "skip");
  const others = inBatch.filter((p) => p.id !== person?.id);
  const values = person ? valuesFor(person, sender, fallbacks) : {};
  const label = recipientLabel;

  return (
    // Brand-tinted header so the Preview stands out from Review's other sections.
    <Card className="pt-0 lg:sticky lg:top-4">
      <CardHeader className="items-center border-b bg-peach py-3 [&>[data-slot=card-action]]:row-span-1 [&>[data-slot=card-action]]:self-center">
        <CardTitle>Preview</CardTitle>
        {action && <CardAction>{action}</CardAction>}
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
            {/* Who this preview is for; Shuffle shows another (no picker or ‹ ›: with thousands of recipients a random sample
                beats stepping from the top). */}
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm" aria-live="polite">
                <span className="font-medium">{label(person)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {" "}
                  {skipped ? "· left out" : `· one of ${n(inBatch.length)}`}
                </span>
              </p>
              <Hint label="Show a random recipient">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Show a random recipient"
                  disabled={others.length === 0}
                  onClick={() =>
                    onSelect(
                      others[Math.floor(Math.random() * others.length)].id,
                    )
                  }
                >
                  <ShuffleIcon />
                </Button>
              </Hint>
            </div>

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
              // email-canvas: the email keeps its own light page in dark mode.
              className={
                skipped
                  ? "email-canvas max-h-112 overflow-y-auto rounded-lg border p-4 opacity-60"
                  : "email-canvas max-h-112 overflow-y-auto rounded-lg border p-4"
              }
            >
              <EmailBody
                blocks={details.blocks}
                html={details.html}
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
