"use client";

import { useState } from "react";
import { ChevronDownIcon, CircleCheckIcon, CircleXIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import { CopyButton } from "@/components/saella/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DomainRecord } from "../../_components/data";

// DNS records of the workspace domain (PRD-02 US-EC-D / US-EC-DV; live app EmailDomainsManager.tsx).
// - Not verified: every record copyable, with whether DNS has it (AC-EC-D-02). The ownership TXT (_saella-verify)
//   comes first and is marked: it decides who owns the domain and becomes the admin.
// - Verified: a health list, one line per record the domain sends with. The ownership TXT is left out once the
//   domain is claimed (PRD Master). A missing record blocks sending until it's back (PRD Master v1.4.2); DMARC at
//   p=none is flagged as a warning with how to tighten it (live app dm4.dmarcbody).
// - Plain language first: a one-line summary, each record named by what it does with the technical name muted
//   beside it, the raw record behind "Show DNS record" (open by default only when the record is missing).

/** DMARC policy p=none: monitor only (live app shows the how-to under every verified domain). */
export const isMonitorOnly = (r: DomainRecord) => r.purpose === "DMARC" && /\bp=none\b/i.test(r.value);

export function DnsRecordsTable({ records }: { records: DomainRecord[] }) {
  return (
    <div className="rounded-card border">
      <Table className="text-dense">
        <TableHeader>
          <TableRow>
            <TableHead className="w-44">Record</TableHead>
            <TableHead className="w-20">Type</TableHead>
            <TableHead className="w-60">Name / Host</TableHead>
            <TableHead>Value</TableHead>
            <TableHead className="w-28">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.purpose}>
              <TableCell>{r.purpose}</TableCell>
              <TableCell className="font-mono">{r.type}</TableCell>
              <TableCell className="max-w-0">
                <CopyValue value={r.host} label={`Copy ${r.purpose} host`} />
              </TableCell>
              <TableCell className="max-w-0">
                <CopyValue value={r.value} label={`Copy ${r.purpose} value`} />
              </TableCell>
              <TableCell>
                {/* Status in its own column on every row (PATTERNS 9.1); Ownership is the one to add first. */}
                {r.ok ? (
                  <Badge variant="success">Found</Badge>
                ) : r.purpose === "Ownership" ? (
                  <Badge variant="warning">Add first</Badge>
                ) : (
                  // Same words as the verified list.
                  <Badge variant="destructive">Not found yet</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Plain-language names, the raw record on demand (PATTERNS 9.15). Order and wording follow the live app's records.
const PLAIN: Record<string, string> = {
  DKIM: "Signs your emails",
  SPF: "Lets Saella send for you",
  DMARC: "Protects against fakes",
  "Return-Path": "Handles bounced emails",
};

export function RecordHealthList({
  records,
  summary = true,
}: {
  records: DomainRecord[];
  domain: string;
  /** The one-line conclusion; off when an Alert above already says it (Unverified). */
  summary?: boolean;
}) {
  const rows = records.filter((r) => r.purpose !== "Ownership");
  const missing = rows.filter((r) => !r.ok).length;
  const weak = rows.some((r) => r.ok && isMonitorOnly(r));
  const [Icon, tone, text] =
    missing > 0
      ? [CircleXIcon, "text-destructive-soft-foreground", `Not ready yet. ${missing} record${missing === 1 ? " is" : "s are"} still missing.`]
      : weak
        ? [TriangleAlertIcon, "text-warning-soft-foreground", "Sending works. One setting can make it stronger."]
        : [CircleCheckIcon, "text-success-soft-foreground", "Ready to send. Inboxes can tell your emails are really from you."];
  return (
    <div className="flex flex-col gap-3">
      {summary && (
        <p className="flex items-center gap-2 font-medium">
          <Icon className={cn("size-4 shrink-0", tone)} aria-hidden />
          {text}
        </p>
      )}
      <ul className="flex flex-col divide-y rounded-card border">
        {rows.map((r) => (
          <RecordRow key={r.purpose} record={r} />
        ))}
      </ul>
    </div>
  );
}

function RecordRow({ record: r }: { record: DomainRecord }) {
  const weak = r.ok && isMonitorOnly(r);
  const [showRecord, setShowRecord] = useState(!r.ok);
  const [showFix, setShowFix] = useState(false);
  const stronger = r.value.replace(/p=none/i, "p=quarantine");
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {weak ? (
          <TriangleAlertIcon className="size-4 shrink-0 text-warning-soft-foreground" aria-hidden />
        ) : (
          <RecordIcon ok={r.ok} />
        )}
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="font-medium">{PLAIN[r.purpose] ?? r.purpose}</span>
          <span className="text-sm text-muted-foreground">{r.purpose}</span>
        </span>
        <span className="flex items-center gap-2 text-sm">
          {!r.ok ? (
            // The DNS wait is said once on the screen, in the Alert.
            <Badge variant="destructive">Not found yet</Badge>
          ) : weak ? (
            <>
              <Badge variant="warning">Works</Badge>
              <Button variant="link" size="sm" className="h-auto p-0" aria-expanded={showFix} onClick={() => setShowFix((o) => !o)}>
                Make it stronger
              </Button>
            </>
          ) : (
            <Badge variant="success">Done</Badge>
          )}
        </span>
      </div>
      {weak && showFix && (
        <div className="ml-7 flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <p className="text-muted-foreground">
            In your DNS, change <code className="font-mono">p=none</code> to <code className="font-mono">p=quarantine</code>. Fake emails then go to spam.
          </p>
          <CopyValue value={stronger} label="Copy the stronger DMARC value" />
        </div>
      )}
      <div className="ml-7 flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          aria-expanded={showRecord}
          onClick={() => setShowRecord((o) => !o)}
        >
          <ChevronDownIcon data-icon="inline-start" className={cn("transition-transform", showRecord && "rotate-180")} />
          {showRecord ? "Hide DNS record" : "Show DNS record"}
        </Button>
        {showRecord && (
          <dl className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 text-sm">
            <dt className="text-muted-foreground">Type</dt>
            <dd>
              <CopyValue value={r.type} label={`Copy ${r.purpose} type`} />
            </dd>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="min-w-0">
              <CopyValue value={r.host} label={`Copy ${r.purpose} name`} />
            </dd>
            <dt className="text-muted-foreground">Value</dt>
            <dd className="min-w-0">
              <CopyValue value={r.value} label={`Copy ${r.purpose} value`} />
            </dd>
          </dl>
        )}
      </div>
    </li>
  );
}

function RecordIcon({ ok, className }: { ok: boolean; className?: string }) {
  return ok ? (
    <CircleCheckIcon className={cn("size-4 text-success-soft-foreground", className)} aria-hidden />
  ) : (
    <CircleXIcon className={cn("size-4 text-destructive-soft-foreground", className)} aria-hidden />
  );
}

function CopyValue({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <code className="truncate font-mono" title={value}>
        {value}
      </code>
      <CopyButton value={value} label={label} />
    </span>
  );
}

// How-to for the DNS step, behind ⓘ (live app dm4.helpbody).
export function DnsInfo() {
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="How to add the DNS records" className="text-muted-foreground">
          <InfoIcon />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="flex w-80 flex-col gap-2 text-sm text-muted-foreground">
        <p>Enter only the prefix if your host adds the domain.</p>
      </HoverCardContent>
    </HoverCard>
  );
}
