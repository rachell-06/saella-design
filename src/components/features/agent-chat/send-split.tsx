"use client";

import { useId } from "react";
import Link from "next/link";
import { ArrowRightIcon, ChevronDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type Approval, type SendSplit, TEST_SEND_SIZE, type TestSendResult, splitOf } from "./data";

// Send to a few first (split save buttons). The same choice sits on the chat's
// ApprovalCard and in the approval queue; it is stored on the approval part, so both show what the other picked.
// Approve then sends what the choice says (agent-screen approve); nothing else decides a send.

const n = (v: number) => v.toLocaleString("en-US");

/** "Send to 20 first" or "Send to all N", each with what happens to the rest. Only for canSplit approvals. */
export function SendSplitChoice({
  approval: a,
  onChange,
  disabled,
  className,
}: {
  approval: Approval;
  onChange: (split: SendSplit) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const count = a.audience?.count ?? 0;
  // Side by side only when the card is wide enough (a container query): the side panel can be 320px wide.
  return (
    <div className="@container">
      <RadioGroup
        aria-label="How many to send now"
        value={splitOf(a)}
        onValueChange={(v) => onChange(v as SendSplit)}
        disabled={disabled}
        className={cn("grid gap-2 @sm:grid-cols-2", className)}
      >
        <FieldLabel htmlFor={`${id}-first`}>
          <Field orientation="horizontal" data-disabled={disabled || undefined}>
            <RadioGroupItem value="first" id={`${id}-first`} />
            <FieldContent>
              <FieldTitle>Send to {TEST_SEND_SIZE} first</FieldTitle>
              <FieldDescription>
                See who got it and who bounced. The other {n(count - TEST_SEND_SIZE)} wait until you approve again.
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
        <FieldLabel htmlFor={`${id}-all`}>
          <Field orientation="horizontal" data-disabled={disabled || undefined}>
            <RadioGroupItem value="all" id={`${id}-all`} />
            <FieldContent>
              <FieldTitle>Send to all {n(count)}</FieldTitle>
              <FieldDescription>Everyone {a.audience?.who} starts getting it now.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      </RadioGroup>
    </div>
  );
}

/** What Approve does under the current choice, for the queue's main button. */
export function approveLabel(a: Approval) {
  const split = splitOf(a);
  if (split === "first") return `Send to ${TEST_SEND_SIZE} first`;
  if (split === "all") return `Send to all ${n(a.audience?.count ?? 0)}`;
  return "Approve";
}

/** Delivered and bounced for the first few, the bounces spelled out, everyone on request. */
export function TestSendView({ result: r, href, className }: { result: TestSendResult; href?: string; className?: string }) {
  const delivered = r.recipients.filter((x) => x.status === "delivered").length;
  const bounced = r.recipients.filter((x) => x.status === "bounced");
  const sent = r.recipients.length;
  return (
    <figure className={cn("flex flex-col gap-3 rounded-card border p-4", className)}>
      <figcaption className="text-sm font-medium">
        First {sent} of {n(r.total)} sent · “{r.template}”
      </figcaption>
      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Delivered" value={`${delivered} of ${sent}`} />
        <Stat label="Bounced" value={String(bounced.length)} tone={bounced.length ? "destructive" : undefined} />
        <Stat label="Waiting for you" value={n(r.total - sent)} />
      </dl>
      {bounced.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
          {bounced.map((b) => (
            <li key={b.email}>
              <span className="font-medium">{b.name}</span> · {b.email} · {b.reason}
            </li>
          ))}
        </ul>
      )}
      <Collapsible className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="group/trigger -ml-2">
              Show all {sent}
              <ChevronDownIcon data-icon="inline-end" className="transition-transform group-data-[state=open]/trigger:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          {href && (
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <Link href={href}>
                Open the batch report
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          )}
        </div>
        <CollapsibleContent>
          <div className="overflow-hidden rounded-lg border">
            <Table aria-label={`First ${sent} recipients`} className="text-dense">
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.recipients.map((x) => (
                  <TableRow key={x.email}>
                    <TableCell>
                      <span className="font-medium">{x.name}</span>
                      <span className="block text-xs text-muted-foreground">{x.email}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{x.company}</TableCell>
                    <TableCell>
                      <Badge variant={x.status === "delivered" ? "success" : "destructive"}>
                        {x.status === "delivered" ? "Delivered" : "Bounced"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </figure>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "destructive" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-lg font-medium tabular-nums", tone === "destructive" && "text-destructive")}>{value}</dd>
    </div>
  );
}
