"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleXIcon,
  GlobeIcon,
  InfoIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { CopyButton } from "@/components/saella/copy-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type DomainRow, VERIFY_WINDOW_H, agoShort, formatDay, hoursLeft } from "../../_components/data";

// One sending domain (PRD-02 US-EC-D / US-EC-DV; live app EmailDomainsManager.tsx).
// - Records are copyable with a status per record (AC-EC-D-02, PATTERNS.md §9.2). DKIM first: it proves ownership.
// - "Verify" re-checks now and reports the result (AC-EC-D-04); the list also re-checks on open (AC-EC-D-03).
// - The DNS host is detected from nameservers; "couldn't read nameservers" is never shown as "no API"
//   (AC-EC-DV-04). Automatic record writing (AC-EC-DV-02) is behind a flag in the live app, so it isn't offered.
// - 72-hour verification window, then the domain expires and must be added again (live app dom.window.*).
export function DomainCard({
  domain: d,
  canManage,
  checking,
  onVerify,
  onRemove,
}: {
  domain: DomainRow;
  canManage: boolean;
  checking: boolean;
  onVerify: () => void;
  onRemove: () => void;
}) {
  const verified = d.status === "verified";
  const left = hoursLeft(d.addedOn);
  const expired = !verified && left <= 0;
  const [open, setOpen] = useState(!verified);
  const missing = d.records.filter((r) => !r.ok).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-card border">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <GlobeIcon className="size-4 text-muted-foreground" aria-hidden />
        <span className="font-medium">{d.domain}</span>
        {verified ? (
          <Badge variant="success">
            <CircleCheckIcon data-icon="inline-start" />
            Verified
          </Badge>
        ) : expired ? (
          <Badge variant="destructive">Expired</Badge>
        ) : (
          <Badge variant="warning">Waiting for DNS</Badge>
        )}
        <span className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
          {checking ? (
            <>
              <Spinner className="size-3.5" />
              Checking…
            </>
          ) : (
            <span className="tabular-nums">Checked {agoShort(d.checkedAt)}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {canManage && !expired && (
            <Button
              variant={verified ? "ghost" : "default"}
              onClick={onVerify}
              disabled={checking}
              aria-busy={checking || undefined}
            >
              {checking ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
              {verified ? "Re-check" : "Verify"}
            </Button>
          )}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" aria-label={open ? "Hide DNS records" : "Show DNS records"}>
              DNS records
              <ChevronDownIcon data-icon="inline-end" className={cn("transition-transform", open && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`More for ${d.domain}`}>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                    <TrashIcon />
                    Remove domain
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {!verified && !open && (
        <p className="border-t px-4 py-2.5 text-sm text-muted-foreground">
          {expired ? "Verification window closed." : `${missing} of ${d.records.length} records still missing.`}
        </p>
      )}

      <CollapsibleContent>
        <div className="flex flex-col gap-4 border-t px-4 py-4">
          {verified ? (
            <p className="text-sm text-muted-foreground">
              Sending from @{d.domain} is enabled. Added {formatDay(d.addedOn, true)}.
            </p>
          ) : expired ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>The {VERIFY_WINDOW_H}-hour verification window has closed</AlertTitle>
              <AlertDescription>Remove this domain and add it again to start a new window.</AlertDescription>
            </Alert>
          ) : (
            // One sentence; the rest of the how-to sits behind ⓘ (DESIGN §2, 2026-11-05).
            <p className="flex flex-wrap items-center gap-x-1 text-sm">
              {d.dnsHost ? (
                <>
                  Copy the records below into your <span className="font-medium">{d.dnsHost}</span> DNS settings, then
                  press Verify ({left} h left).
                </>
              ) : (
                <>Add the records below at your DNS host, then press Verify ({left} h left).</>
              )}
              <DnsInfo hostKnown={Boolean(d.dnsHost)} />
            </p>
          )}

          <Table className="text-dense">
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Record</TableHead>
                <TableHead className="w-20">Type</TableHead>
                <TableHead className="w-48">Name / Host</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.records.map((r) => (
                <TableRow key={r.purpose}>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {r.ok ? (
                        <CircleCheckIcon className="size-4 text-success-soft-foreground" aria-hidden />
                      ) : (
                        <CircleXIcon className="size-4 text-destructive-soft-foreground" aria-hidden />
                      )}
                      {r.purpose}
                      <span className="sr-only">{r.ok ? "found" : "missing"}</span>
                      {r.purpose === "DMARC" && <DmarcInfo />}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">{r.type}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <code className="font-mono">{r.host}</code>
                      <CopyButton value={r.host} label={`Copy ${r.purpose} host`} />
                    </span>
                  </TableCell>
                  <TableCell className="max-w-0">
                    <span className="flex items-center gap-1">
                      <code className="truncate font-mono" title={r.value}>
                        {r.value}
                      </code>
                      <CopyButton value={r.value} label={`Copy ${r.purpose} value`} />
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// How-to for the DNS step, behind ⓘ next to the one-line instruction.
function DnsInfo({ hostKnown }: { hostKnown: boolean }) {
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="How to add the DNS records" className="text-muted-foreground">
          <InfoIcon />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="flex w-80 flex-col gap-2 text-sm text-muted-foreground">
        <p>
          Add DKIM first: it proves the domain is yours. If your DNS host adds the domain itself, enter only the prefix
          (<code className="font-mono">saella._domainkey</code>).
        </p>
        <p>
          {hostKnown ? "" : "We couldn't read the nameservers, which is normal for new domains. "}Saella keeps
          checking for {VERIFY_WINDOW_H} hours and verifies the domain on its own.
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}

// Secondary explanation behind ⓘ (style rule 4).
function DmarcInfo() {
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="About the DMARC record" className="text-muted-foreground">
          <InfoIcon />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80 text-sm text-muted-foreground">
        Gmail and Outlook now require DMARC on sending domains. The record starts at <code>p=none</code> (monitor
        only); tighten it to quarantine once your sending is stable.
      </HoverCardContent>
    </HoverCard>
  );
}
