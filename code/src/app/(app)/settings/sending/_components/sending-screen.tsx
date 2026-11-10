"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CircleAlertIcon,
  GlobeIcon,
  InfoIcon,
  MailCheckIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  SendIcon,
  StarIcon,
  TrashIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";
import { WORKSPACE } from "@/lib/mock/workspace";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog, type ConfirmRequest } from "../../_components/confirm-dialog";
import {
  DOMAIN_RE,
  type DomainRow,
  MAX_DOMAINS,
  MAX_SENDERS_PER_DOMAIN,
  SHARED_MONTHLY_CAP,
  SHARED_USED_THIS_MONTH,
  type SenderRow,
  TODAY,
  domainOf,
  initialDomains,
  initialSenders,
  newDomainRecords,
  normaliseDomain,
} from "../../_components/data";
import { SectionHeader } from "../../_components/section-header";
import { DomainCard } from "./domain-card";
import { type HealthTotals, PREVIEW_HEALTH, SendingHealth, last7Days } from "./sending-health";
import { AddDomainDialog, AddSenderDialog, type NewSender, SharedSenderDialog } from "./sending-dialogs";
import { Item } from "@/components/ui/item";

// Settings → Sending: domains and senders (PRD-02 US-EC-D, US-EC-DV, US-EC-S, US-EC-I; live app
// EmailDomainsManager.tsx + EmailSendersSection.tsx).
// - Only the admin adds or removes domains and senders; members see what the workspace sends from
//   (live app dm2.membernote).
// - Removing a domain removes its senders; if one was the default, another confirmed sender is promoted
//   (AC-EC-D-06). Only confirmed senders can be default, exactly one per workspace (AC-EC-S-04). The default
//   follows the admin's default send-as in Organization (BR-RULE-EC-02, CHANGED).
// - A pending sender can resend its confirmation (AC-EC-S-06); "Check confirmations" stands in for the live
//   app's 5-second auto-check.
// - Mock propagation: each Verify finds one more missing record; when all are found the domain verifies.
// - Sending health (R16, 2026-10-29): 7-day rates against the auto-pause limits, first on the page because it
//   decides whether anything sends at all.
// Preview with ?state= loading | error | empty | member | expired | no-shared | near-limit | paused
const SHARED_DOMAIN = "shared.saella.ai";

export function SendingScreen() {
  const params = useSearchParams();
  const preview = params.get("state") ?? "";
  const canManage = preview !== "member";

  const [loading, setLoading] = useState(preview === "loading");
  const [loadError, setLoadError] = useState(preview === "error");
  const [domains, setDomains] = useState<DomainRow[]>(() =>
    preview === "empty"
      ? []
      : initialDomains.map((d) => (preview === "expired" && d.status !== "verified" ? { ...d, addedOn: "2026-10-23" } : d))
  );
  const [senders, setSenders] = useState<SenderRow[]>(() =>
    preview === "empty" ? [] : preview === "no-shared" ? initialSenders.filter((s) => !s.shared) : initialSenders
  );
  const [checking, setChecking] = useState<Set<string>>(new Set());
  // Domains being re-checked in the background because the list was opened.
  const [autoChecking, setAutoChecking] = useState<string[]>(() =>
    preview === "loading" || preview === "error"
      ? []
      : initialDomains.filter((d) => d.status !== "verified").map((d) => d.domain)
  );
  const [addingDomain, setAddingDomain] = useState(false);
  const [addingSender, setAddingSender] = useState(false);
  const [sharedOpen, setSharedOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [checkingSenders, setCheckingSenders] = useState(false);
  const [health] = useState<HealthTotals>(() =>
    preview === "empty"
      ? { sent: 0, delivered: 0, bounces: 0, complaints: 0 }
      : preview === "near-limit" || preview === "paused"
        ? PREVIEW_HEALTH[preview]
        : last7Days()
  );
  const [paused, setPaused] = useState(preview === "paused");

  // Opening the list re-checks unverified domains in the background, never blocking it (AC-EC-D-03).
  const autoList = autoChecking.join(",");
  useEffect(() => {
    if (!autoList) return;
    const pending = autoList.split(",");
    const t = setTimeout(() => {
      setAutoChecking([]);
      setDomains((list) =>
        list.map((d) => (pending.includes(d.domain) ? { ...d, checkedAt: `${TODAY}T11:59:00Z` } : d))
      );
    }, 1200);
    return () => clearTimeout(t);
  }, [autoList]);

  const verifiedDomains = domains.filter((d) => d.status === "verified").map((d) => d.domain);
  const ownSenders = senders.filter((s) => !s.shared);
  const shared = senders.find((s) => s.shared);
  const pendingSenders = ownSenders.filter((s) => s.status === "unconfirmed");
  // Deterministic per workspace (AC-EC-I-02).
  const sharedAddress = `${WORKSPACE.domain.split(".")[0].split("-")[0]}@${SHARED_DOMAIN}`;

  function verify(domain: string) {
    setChecking((s) => new Set(s).add(domain));
    setTimeout(() => {
      setChecking((s) => {
        const n = new Set(s);
        n.delete(domain);
        return n;
      });
      const d = domains.find((x) => x.domain === domain);
      if (!d) return;
      if (d.status === "verified") {
        toast.success(`${domain} is still verified`, { description: "All four records are in place." });
        setDomains((list) => list.map((x) => (x.domain === domain ? { ...x, checkedAt: `${TODAY}T05:00:00Z` } : x)));
        return;
      }
      const idx = d.records.findIndex((r) => !r.ok);
      const records = d.records.map((r, i) => (i === idx ? { ...r, ok: true } : r));
      const missing = records.filter((r) => !r.ok).length;
      setDomains((list) =>
        list.map((x) =>
          x.domain === domain
            ? { ...x, records, status: missing === 0 ? "verified" : x.status, checkedAt: `${TODAY}T05:00:00Z` }
            : x
        )
      );
      if (missing === 0) toast.success(`${domain} is verified`, { description: "Sending from it is enabled." });
      else
        toast("Not verified yet", {
          description: `${missing} record${missing > 1 ? "s" : ""} still missing. DNS changes can take a few minutes to a few hours; try again shortly.`,
        });
    }, 900);
  }

  function validateDomain(raw: string) {
    const d = normaliseDomain(raw);
    if (!d) return "Enter a domain.";
    if (!DOMAIN_RE.test(d)) return "That doesn't look like a domain. Try something like yourcompany.com.";
    if (["gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "icloud.com"].includes(d))
      return "You can't send from a personal email provider. Use a domain your company owns.";
    if (domains.some((x) => x.domain === d)) return `${d} is already in this workspace.`;
    if (domains.length >= MAX_DOMAINS) return `Up to ${MAX_DOMAINS} domains. Remove one to add another.`;
    return null;
  }

  function addDomain(raw: string) {
    const d = normaliseDomain(raw);
    setDomains((list) => [
      ...list,
      {
        domain: d,
        status: "pending",
        addedOn: TODAY,
        records: newDomainRecords(),
        dnsHost: d.endsWith(".vn") ? "PA Vietnam" : d.endsWith(".com") ? "Cloudflare" : null,
        checkedAt: `${TODAY}T05:00:00Z`,
      },
    ]);
    toast.success(`${d} added`, { description: "Add the DNS records shown, then press Verify." });
  }

  function removeDomain(d: DomainRow) {
    const onIt = ownSenders.filter((s) => domainOf(s.email) === d.domain);
    setConfirm({
      title: `Remove ${d.domain}?`,
      description:
        onIt.length > 0
          ? `Its ${onIt.length} sender${onIt.length > 1 ? "s are" : " is"} removed too. Batches that used them keep their history.`
          : "You can add it again later; it will need new DNS records.",
      confirmLabel: "Remove domain",
      destructive: true,
      onConfirm: () => {
        setDomains((list) => list.filter((x) => x.domain !== d.domain));
        setSenders((list) => promoteDefault(list.filter((s) => s.shared || domainOf(s.email) !== d.domain)));
        toast(`Removed ${d.domain}`, {
          description: onIt.length ? `With ${onIt.length} sender${onIt.length > 1 ? "s" : ""} on it.` : undefined,
        });
      },
    });
  }

  function validateSender(s: NewSender) {
    const errs: Partial<Record<keyof NewSender, string>> = {};
    if (!s.name.trim()) errs.name = "Give the sender a name.";
    const local = s.local.trim().toLowerCase();
    if (!/^[a-z0-9._+-]+$/.test(local)) errs.local = "Use letters, numbers, dots or dashes before the @.";
    else if (senders.some((x) => x.email === `${local}@${s.domain}`)) errs.local = `${local}@${s.domain} is already a sender.`;
    else if (ownSenders.filter((x) => domainOf(x.email) === s.domain).length >= MAX_SENDERS_PER_DOMAIN)
      errs.local = `You can add up to ${MAX_SENDERS_PER_DOMAIN} senders on ${s.domain}. Remove one first.`;
    if (s.replyTo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.replyTo.trim())) errs.replyTo = "Enter a full email address.";
    return errs;
  }

  function addSender(s: NewSender) {
    const email = `${s.local.trim().toLowerCase()}@${s.domain}`;
    setSenders((list) => [
      ...list,
      { id: `s-${Date.now()}`, name: s.name.trim(), email, status: "unconfirmed", replyTo: s.replyTo.trim() || undefined },
    ]);
    toast.success(`Confirmation sent to ${email}`, { description: "Click the link in that inbox to activate it." });
  }

  function checkConfirmations() {
    setCheckingSenders(true);
    setTimeout(() => {
      setCheckingSenders(false);
      if (pendingSenders.length === 0) return toast("No new confirmations");
      setSenders((list) => promoteDefault(list.map((s) => (s.status === "unconfirmed" ? { ...s, status: "confirmed" } : s))));
      pendingSenders.forEach((s) => toast.success(`${s.email} confirmed`, { description: "You can now send from it." }));
    }, 900);
  }

  function setDefault(s: SenderRow) {
    setSenders((list) => list.map((x) => ({ ...x, isDefault: x.id === s.id })));
    toast.success(`${s.email} is now the default sender`, {
      description: "Templates use it unless a batch picks another.",
    });
  }

  function removeSender(s: SenderRow) {
    setConfirm({
      title: "Remove this sender?",
      description: s.isDefault
        ? `${s.email} is the default. Another confirmed sender becomes the default.`
        : `${s.email} can no longer be picked for new batches. Sent batches keep their history.`,
      confirmLabel: "Remove sender",
      destructive: true,
      onConfirm: () => {
        setSenders((list) => promoteDefault(list.filter((x) => x.id !== s.id)));
        toast(`Removed ${s.email}`);
      },
    });
  }

  function createShared() {
    // The address is fixed per workspace, so a second press creates nothing new (AC-EC-I-02).
    if (shared) return toast("You're already set up to send from the shared domain.");
    setSenders((list) =>
      promoteDefault([
        ...list,
        { id: "s0", name: `${WORKSPACE.company} via Saella`, email: sharedAddress, status: "confirmed", shared: true },
      ])
    );
    toast.success(`Ready to send from ${sharedAddress}`, { description: "Replies go to your own inbox." });
  }

  function resume() {
    setConfirm({
      title: "Resume sending?",
      description:
        "Queued and scheduled batches start sending again. If bounces or complaints stay over the limit, sending pauses again.",
      confirmLabel: "Resume sending",
      onConfirm: () => {
        setPaused(false);
        toast.success("Sending resumed", { description: "The queue sends the rest at the usual pace." });
      },
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <span className="sr-only">Loading sending settings</span>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-16 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Couldn&apos;t load your domains</AlertTitle>
        <AlertDescription>Your settings are safe. Check your connection and try again.</AlertDescription>
        <AlertAction>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoadError(false);
              setLoading(true);
              setTimeout(() => setLoading(false), 700);
            }}
          >
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  const atDomainCap = domains.length >= MAX_DOMAINS;
  const addDomainButton = (solid: boolean) => (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* span keeps the tooltip working while the button is disabled */}
        <span tabIndex={atDomainCap ? 0 : undefined}>
          <Button variant={solid ? "default" : "outline"} onClick={() => setAddingDomain(true)} disabled={atDomainCap}>
            <PlusIcon data-icon="inline-start" />
            Add domain
            {!solid && (
              <span className="text-muted-foreground tabular-nums">
                {domains.length}/{MAX_DOMAINS}
              </span>
            )}
          </Button>
        </span>
      </TooltipTrigger>
      {atDomainCap && <TooltipContent>Up to {MAX_DOMAINS} domains. Remove one to add another.</TooltipContent>}
    </Tooltip>
  );

  return (
    <>
      {!canManage && (
        <Alert variant="info">
          <InfoIcon />
          <AlertTitle>Sending is managed by Linh Tran</AlertTitle>
          <AlertDescription>
            You can see what the workspace sends from. Adding or removing a domain or sender is the admin&apos;s to do.
          </AlertDescription>
        </Alert>
      )}

      <SendingHealth totals={health} paused={paused} canManage={canManage} onResume={resume} />

      <section className="flex flex-col gap-4" aria-labelledby="domains-title">
        <SectionHeader
          id="domains-title"
          title="Sending domains"
          description="Verify a domain you own so campaigns send from your own address."
          actions={canManage && domains.length > 0 ? addDomainButton(false) : undefined}
        />
        {domains.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GlobeIcon />
              </EmptyMedia>
              <EmptyTitle>No sending domains yet</EmptyTitle>
              <EmptyDescription>
                Add your company&apos;s domain to send from your own address. Until then you can send from the shared
                domain below.
              </EmptyDescription>
            </EmptyHeader>
            {canManage && <EmptyContent>{addDomainButton(true)}</EmptyContent>}
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {domains.map((d) => (
              <DomainCard
                key={d.domain}
                domain={d}
                canManage={canManage}
                checking={checking.has(d.domain) || autoChecking.includes(d.domain)}
                onVerify={() => verify(d.domain)}
                onRemove={() => removeDomain(d)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="senders-title">
        <SectionHeader
          id="senders-title"
          title="Senders"
          // Studio pass 2026-10-28: the limit was a footnote under the table; it belongs with the heading. The
          // "addresses shared in Organization → Send-as" half is dropped here: Organization explains it behind ⓘ.
          description={`The from-addresses your campaigns send with, up to ${MAX_SENDERS_PER_DOMAIN} per verified domain.`}
          actions={
            canManage && verifiedDomains.length > 0 ? (
              <>
                {pendingSenders.length > 0 && (
                  <Button variant="ghost" onClick={checkConfirmations} disabled={checkingSenders}>
                    {checkingSenders ? <Spinner data-icon="inline-start" /> : <MailCheckIcon data-icon="inline-start" />}
                    Check confirmations
                  </Button>
                )}
                <Button variant="outline" onClick={() => setAddingSender(true)}>
                  <PlusIcon data-icon="inline-start" />
                  Add sender
                </Button>
              </>
            ) : undefined
          }
        />
        {verifiedDomains.length === 0 ? (
          <Item variant="outline" className="block rounded-card px-4 py-3 text-muted-foreground text-[length:inherit]" asChild><p>
            Verify a domain above first. Then you can add the addresses you send from.
          </p></Item>
        ) : ownSenders.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SendIcon />
              </EmptyMedia>
              <EmptyTitle>No senders yet</EmptyTitle>
              <EmptyDescription>Add an address such as sales@ or hello@ on a verified domain.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="rounded-card border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sender</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead className="w-48">Status</TableHead>
                  <TableHead className="w-28">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ownSenders.map((s) => {
                  const pending = s.status === "unconfirmed";
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {s.email}
                            {s.replyTo && ` · reply-to ${s.replyTo}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{domainOf(s.email)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {s.isDefault && (
                            <Badge variant="brand">
                              <StarIcon data-icon="inline-start" />
                              Default
                            </Badge>
                          )}
                          {pending && <Badge variant="warning">Pending confirmation</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1">
                            {pending && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  toast.success(`Confirmation sent to ${s.email}`, {
                                    description: "A fresh link; the old one stops working.",
                                  })
                                }
                              >
                                <RefreshCwIcon data-icon="inline-start" />
                                Resend
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" aria-label={`More for ${s.email}`}>
                                  <MoreHorizontalIcon />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem disabled={pending || s.isDefault} onSelect={() => setDefault(s)}>
                                    <StarIcon />
                                    {pending ? "Set as default (confirm first)" : "Set as default"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem variant="destructive" onSelect={() => removeSender(s)}>
                                    <TrashIcon />
                                    Remove sender
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="shared-title">
        <SectionHeader
          id="shared-title"
          title="Shared sender"
          description="Send before your own domain is ready. No DNS, no confirmation email."
          info={`Its reputation is shared with other workspaces and capped at ${SHARED_MONTHLY_CAP.toLocaleString("en-US")} sends a calendar month. Your own domain isn't affected by the cap.`}
        />
        {shared ? (
          <Item variant="outline" className="flex-col items-stretch gap-3 rounded-card px-4 py-3 text-[length:inherit]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <ZapIcon className="size-4 text-muted-foreground" aria-hidden />
              <span className="font-medium">{shared.email}</span>
              <span className="text-sm text-muted-foreground">{shared.name}</span>
              {shared.isDefault && (
                <Badge variant="brand">
                  <StarIcon data-icon="inline-start" />
                  Default
                </Badge>
              )}
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto"
                  aria-label="Remove shared sender"
                  onClick={() => removeSender(shared)}
                >
                  <TrashIcon />
                </Button>
              )}
            </div>
            <div className="flex max-w-md flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sent this month</span>
                <span className="tabular-nums">
                  {SHARED_USED_THIS_MONTH.toLocaleString("en-US")} of {SHARED_MONTHLY_CAP.toLocaleString("en-US")}
                </span>
              </div>
              <Progress
                value={(SHARED_USED_THIS_MONTH / SHARED_MONTHLY_CAP) * 100}
                aria-label={`${SHARED_USED_THIS_MONTH} of ${SHARED_MONTHLY_CAP} shared sends used this month`}
                className="*:data-[slot=progress-indicator]:bg-muted-foreground"
              />
            </div>
          </Item>
        ) : (
          <Item variant="outline" className="justify-between gap-3 rounded-card px-4 py-3 text-[length:inherit]">
            <p className="text-muted-foreground">
              Send immediately from Saella&apos;s shared domain. Switch to your own domain any time.
            </p>
            {canManage && (
              <Button variant="outline" onClick={() => setSharedOpen(true)}>
                <ZapIcon data-icon="inline-start" />
                Start sending now
              </Button>
            )}
          </Item>
        )}
      </section>

      <AddDomainDialog open={addingDomain} onOpenChange={setAddingDomain} validate={validateDomain} onAdd={addDomain} />
      <AddSenderDialog
        open={addingSender}
        onOpenChange={setAddingSender}
        domains={verifiedDomains}
        validate={validateSender}
        onAdd={addSender}
      />
      <SharedSenderDialog
        open={sharedOpen}
        onOpenChange={setSharedOpen}
        address={sharedAddress}
        replyTo="your own address"
        onCreate={createShared}
      />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

// Exactly one default among confirmed senders (AC-EC-S-04, AC-EC-D-06); own domain preferred over shared.
function promoteDefault(list: SenderRow[]): SenderRow[] {
  if (list.some((s) => s.isDefault && s.status === "confirmed")) return list;
  const next = list.find((s) => s.status === "confirmed" && !s.shared) ?? list.find((s) => s.status === "confirmed");
  return list.map((s) => ({ ...s, isDefault: s.id === next?.id }));
}
