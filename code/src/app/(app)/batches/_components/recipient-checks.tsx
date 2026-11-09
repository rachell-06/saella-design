"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  EyeIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import { resolveTags } from "@/app/(app)/templates/_components/data";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listById } from "./data";
import {
  type DataIssue,
  type Recipient,
  type RecipientCheck,
  TAG_LABEL,
} from "./recipient-check";

// Per-recipient check on Review (R2, 2026-10-29). For each merge tag the template uses: who has no value for it,
// what the line would read for them, and a choice: send with a fallback word, or leave them out of this batch.
// A tag Saella doesn't know blocks the send (it would reach every inbox as written). Learned from Clay, where a
// wrong substitution went into the email with no warning; HubSpot shows the "won't be sent" reasons up front.

export type Handling = "fallback" | "skip";
export type CheckStatus = "ready" | "checking" | "error";

const n = (x: number) => x.toLocaleString("en-US");
const SHOWN = 50;
const short = (s: string) => (s.length > 64 ? `${s.slice(0, 63)}…` : s);

export function RecipientChecks({
  check,
  status,
  onRetry,
  recipients,
  templateId,
  handling,
  onHandling,
  fallbacks,
  onFallback,
  onPreview,
}: {
  check: RecipientCheck;
  status: CheckStatus;
  onRetry: () => void;
  /** People checked (before anyone is left out here). */
  recipients: number;
  templateId: string;
  handling: Record<string, Handling>;
  onHandling: (tag: string, h: Handling) => void;
  fallbacks: Record<string, string>;
  onFallback: (tag: string, v: string) => void;
  onPreview: (id: string) => void;
}) {
  const [showing, setShowing] = useState<string | null>(null);
  const open = check.issues.find(
    (i): i is Extract<DataIssue, { kind: "missing" }> =>
      i.kind === "missing" && i.tag === showing,
  );

  return (
    <section
      aria-labelledby="bw-check-title"
      className="flex flex-col gap-3"
      aria-busy={status === "checking" || undefined}
    >
      <div className="flex flex-col gap-1">
        <h3 id="bw-check-title" className="text-sm font-medium">
          Recipient data
        </h3>
        <p className="text-sm text-muted-foreground">
          {check.fields.length > 0
            ? `Each of the ${n(recipients)} recipients checked against the fields this template fills in: ${check.fields.join(", ")}.`
            : "Each recipient checked against the merge tags in this template."}
        </p>
      </div>

      {status === "checking" ? (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
            <Spinner />
            Checking {n(recipients)} recipients…
          </p>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : status === "error" ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Couldn&apos;t check the recipients</AlertTitle>
          <AlertDescription>
            The check didn&apos;t finish, so we can&apos;t tell whether every
            merge tag gets a value. Nothing was sent.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </AlertAction>
        </Alert>
      ) : check.issues.length === 0 ? (
        <p className="flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
          <CircleCheckIcon
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-success"
          />
          {check.fields.length > 0
            ? `Every recipient has a value for ${check.fields.map((f) => f.toLowerCase()).join(" and ")}. No merge tag goes out empty.`
            : "This template has no personal fields, so every recipient gets the same text."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {check.issues.map((issue) =>
            issue.kind === "unknown" ? (
              <li key={issue.tag} className="flex gap-3 px-4 py-3">
                <CircleAlertIcon
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-medium">
                    {`{{${issue.tag}}}`} isn&apos;t a field Saella knows
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All {n(recipients)} recipients would see it as written: “
                    {short(issue.line)}”. Fix the tag in the template, then
                    come back.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/templates/${templateId}/edit`}>
                    Fix the template
                  </Link>
                </Button>
              </li>
            ) : (
              <MissingRow
                key={issue.tag}
                issue={issue}
                handling={handling[issue.tag] ?? "fallback"}
                onHandling={(h) => onHandling(issue.tag, h)}
                fallback={fallbacks[issue.tag] ?? ""}
                onFallback={(v) => onFallback(issue.tag, v)}
                onShow={() => setShowing(issue.tag)}
                onPreview={() => onPreview(issue.people[0].id)}
              />
            ),
          )}
        </ul>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setShowing(null)}>
        {open && (
          <PeopleDialog
            issue={open}
            onPreview={(id) => {
              onPreview(id);
              setShowing(null);
            }}
            onClose={() => setShowing(null)}
          />
        )}
      </Dialog>
    </section>
  );
}

function MissingRow({
  issue,
  handling,
  onHandling,
  fallback,
  onFallback,
  onShow,
  onPreview,
}: {
  issue: Extract<DataIssue, { kind: "missing" }>;
  handling: Handling;
  onHandling: (h: Handling) => void;
  fallback: string;
  onFallback: (v: string) => void;
  onShow: () => void;
  onPreview: () => void;
}) {
  const count = issue.people.length;
  const id = `bw-fb-${issue.tag}`;
  const empty = handling === "fallback" && !fallback.trim();
  const reads = short(resolveTags(issue.line, { [issue.tag]: "" }));
  const withFallback = short(
    resolveTags(issue.line, { [issue.tag]: fallback.trim() }),
  );
  return (
    <li className="flex gap-3 px-4 py-3">
      <TriangleAlertIcon
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-warning-soft-foreground"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-medium tabular-nums">
              {n(count)} {count === 1 ? "recipient has" : "recipients have"} no{" "}
              {issue.field}
            </p>
            <p className="text-sm text-muted-foreground">
              Without a value, “{short(issue.line)}” reads “{reads}”.
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onShow}>
              <UsersIcon data-icon="inline-start" />
              See who
            </Button>
            <Button variant="ghost" size="sm" onClick={onPreview}>
              <EyeIcon data-icon="inline-start" />
              Preview one
            </Button>
          </div>
        </div>

        <RadioGroup
          value={handling}
          onValueChange={(v) => onHandling(v as Handling)}
          aria-label={`What to do with recipients who have no ${issue.field}`}
          className="gap-2"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="fallback" id={`${id}-use`} />
              <FieldLabel htmlFor={`${id}-use`} className="font-normal">
                Send with a fallback
              </FieldLabel>
            </div>
            <Field
              className="w-40"
              data-invalid={empty || undefined}
              data-disabled={handling !== "fallback" || undefined}
            >
              <Input
                id={id}
                value={fallback}
                maxLength={40}
                disabled={handling !== "fallback"}
                aria-label={`Fallback for ${TAG_LABEL[issue.tag]}`}
                aria-invalid={empty || undefined}
                onChange={(e) => onFallback(e.target.value)}
              />
            </Field>
          </div>
          {handling === "fallback" &&
            (empty ? (
              <FieldError className="ps-6">
                Type a word for the fallback, or leave these recipients out.
              </FieldError>
            ) : (
              <FieldDescription className="ps-6">
                They get “{withFallback}”.
              </FieldDescription>
            ))}
          <div className="flex items-center gap-2">
            <RadioGroupItem value="skip" id={`${id}-skip`} />
            <FieldLabel htmlFor={`${id}-skip`} className="font-normal tabular-nums">
              Leave {count === 1 ? "them" : `these ${n(count)}`} out of this
              batch
            </FieldLabel>
          </div>
        </RadioGroup>
      </div>
    </li>
  );
}

function PeopleDialog({
  issue,
  onPreview,
  onClose,
}: {
  issue: Extract<DataIssue, { kind: "missing" }>;
  onPreview: (id: string) => void;
  onClose: () => void;
}) {
  const count = issue.people.length;
  const rows: Recipient[] = issue.people.slice(0, SHOWN);
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="tabular-nums">
          {n(count)} {count === 1 ? "recipient has" : "recipients have"} no{" "}
          {issue.field}
        </DialogTitle>
        <DialogDescription>
          Fill it in on Contacts to send them the personal version next time.
          Preview shows the email one of them gets now.
        </DialogDescription>
      </DialogHeader>
      <div className="-mx-4 max-h-96 overflow-y-auto border-y">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>List</TableHead>
              <TableHead>
                <span className="sr-only">Preview</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{`${r.firstName} ${r.lastName}`.trim()}</TableCell>
                <TableCell className="max-w-56 truncate">{r.email}</TableCell>
                <TableCell className="max-w-48 truncate">{r.company}</TableCell>
                <TableCell className="max-w-40 truncate text-muted-foreground">
                  {listById(r.listId)?.name}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPreview(r.id)}
                    aria-label={`Preview the email to ${r.email}`}
                  >
                    Preview
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {count > SHOWN && (
          <p className="px-4 py-2 text-sm text-muted-foreground tabular-nums">
            and {n(count - SHOWN)} more
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
