"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  CircleAlertIcon,
  InfoIcon,
  MailCheckIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  SendIcon,
  StarIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Hint } from "@/components/saella/hint";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog, type ConfirmRequest } from "../../_components/confirm-dialog";
import {
  MAX_SENDERS_PER_DOMAIN,
  type SenderRow,
  domainForState,
  domainOf,
  initialMembers,
  initialSenders,
} from "../../_components/data";
import { SectionHeader } from "../../_components/section-header";
import { configOf } from "../../_components/health-score";
import { type HealthTotals, PREVIEW_HEALTH, SendingHealth, last7Days } from "./sending-health";
import { AddSenderDialog, type NewSender } from "./sending-dialogs";

// Settings → Sending: sending health and senders (PRD-02 US-EC-S, R16; live app EmailSendersSection.tsx +
// api/email/senders, Repo 2026-11-03). The domain itself lives in Settings → Domain (2026-11-11).
// - Only the admin adds or removes senders and picks the default; members see what the workspace sends from.
//   Resend is open to everyone, as in the live app.
// - Senders: up to 10 per verified domain (BR-RULE-EC-04); display name and reply-to optional; start pending until
//   the confirmation link is clicked; only confirmed senders can be the default, exactly one (AC-EC-S-04).
//   With no verified domain there is nothing to add a sender on: point to Domain.
// - Shared-domain "Start sending now" is switched off in the live app (SHOW_INSTANT_START = false), so it isn't
//   offered; a workspace that already has a shared sender still sees it in the list, marked.
// - Sending health (R16, decisions.md "Settings"): first on the page because it decides whether anything sends.
// Preview with ?state= loading | error | empty | member | unclaimed | pending | expired | unverified | near-limit | paused
const ADMIN = initialMembers.find((m) => m.role === "admin");

export function SendingScreen() {
  const preview = useSearchParams().get("state") ?? "";
  // No admin yet → anyone may set sending up (live app may_manage); a member of a claimed workspace can't.
  const canManage = preview !== "member";

  const [loading, setLoading] = useState(preview === "loading");
  const [loadError, setLoadError] = useState(preview === "error");
  const [senders, setSenders] = useState<SenderRow[]>(() => (preview === "empty" ? [] : initialSenders));
  const [addingSender, setAddingSender] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [confirmList, setConfirmList] = useState<SenderRow[]>([]);
  const [checkingSenders, setCheckingSenders] = useState(false);
  const [health] = useState<HealthTotals>(() =>
    preview === "empty"
      ? { sent: 0, delivered: 0, bounces: 0, complaints: 0 }
      : preview === "near-limit" || preview === "paused"
        ? PREVIEW_HEALTH[preview]
        : last7Days()
  );
  const [paused, setPaused] = useState(preview === "paused");

  const domain = domainForState(preview);
  const verifiedDomains = domain?.status === "verified" ? [domain.domain] : [];
  const pendingSenders = senders.filter((s) => s.status === "unconfirmed");
  const adminOnly = `Only the admin${ADMIN ? ` (${ADMIN.name})` : ""} can change this.`;

  function validateSender(s: NewSender) {
    const errs: Partial<Record<keyof NewSender, string>> = {};
    const local = s.local.trim().toLowerCase();
    if (!/^[a-z0-9._+-]+$/.test(local)) errs.local = "Use letters, numbers, dots or dashes before the @.";
    else if (senders.some((x) => x.email === `${local}@${s.domain}`)) errs.local = `${local}@${s.domain} is already a sender.`;
    else if (senders.filter((x) => domainOf(x.email) === s.domain).length >= MAX_SENDERS_PER_DOMAIN)
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

  // Stands in for the live app's 5-second auto-check while a sender is pending.
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
    toast.success(`${s.email} is now the default sender`, { description: "Batches use it unless they pick another." });
  }

  function removeSender(s: SenderRow) {
    setConfirmList([]);
    setConfirm({
      title: "Remove this sender?",
      description: s.isDefault
        ? `${s.email} is the default. Another confirmed sender becomes the default.`
        : `${s.email} can't be picked for new batches. Sent batches keep their history.`,
      confirmLabel: "Remove sender",
      destructive: true,
      onConfirm: () => {
        setSenders((list) => promoteDefault(list.filter((x) => x.id !== s.id)));
        toast(`Removed ${s.email}`);
      },
    });
  }

  function resume() {
    setConfirmList([]);
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
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Couldn&apos;t load sending settings</AlertTitle>
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

  const addSenderHint = !canManage ? adminOnly : verifiedDomains.length === 0 ? "Verify a domain first." : undefined;

  return (
    <>
      {!canManage && (
        <Alert variant="info">
          <InfoIcon />
          <AlertTitle>Sending is managed by {ADMIN?.name ?? "your workspace admin"}</AlertTitle>
          <AlertDescription>You can see who the workspace sends as. Adding or removing a sender is the admin&apos;s to do.</AlertDescription>
        </Alert>
      )}

      <SendingHealth totals={health} paused={paused} canManage={canManage} onResume={resume} config={configOf(domain)} />

      <section className="flex flex-col gap-4" aria-labelledby="senders-title">
        <SectionHeader
          id="senders-title"
          title="Senders"
          description={`The from-addresses your batches send with, up to ${MAX_SENDERS_PER_DOMAIN} on the domain.`}
          actions={
            <>
              {pendingSenders.length > 0 && verifiedDomains.length > 0 && (
                <Button variant="ghost" onClick={checkConfirmations} disabled={checkingSenders} aria-busy={checkingSenders || undefined}>
                  {checkingSenders ? <Spinner data-icon="inline-start" /> : <MailCheckIcon data-icon="inline-start" />}
                  Check confirmations
                </Button>
              )}
              <Hint label={addSenderHint}>
                <span tabIndex={addSenderHint ? 0 : undefined}>
                  <Button variant="outline" onClick={() => setAddingSender(true)} disabled={Boolean(addSenderHint)}>
                    <PlusIcon data-icon="inline-start" />
                    Add sender
                  </Button>
                </span>
              </Hint>
            </>
          }
        />
        {verifiedDomains.length === 0 ? (
          <Item variant="outline" className="rounded-card px-4 py-3 text-[length:inherit]">
            <ItemContent>
              <ItemDescription className="text-[length:inherit]">Verify a domain first. Then add the addresses you send from.</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/domain">
                  Go to Domain
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </ItemActions>
          </Item>
        ) : senders.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SendIcon />
              </EmptyMedia>
              <EmptyTitle>No senders yet</EmptyTitle>
              <EmptyDescription>Add an address such as sales@ or hello@ on your domain.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="rounded-card border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sender</TableHead>
                  <TableHead className="w-56">Status</TableHead>
                  <TableHead className="w-28">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {senders.map((s) => {
                  const pending = s.status === "unconfirmed";
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          {/* Default is a property of the sender, not a status: it sits on the name line. */}
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{s.name || s.email}</span>
                            {s.isDefault && (
                              <Badge variant="brand">
                                <StarIcon data-icon="inline-start" />
                                Default
                              </Badge>
                            )}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {s.name ? s.email : ""}
                            {s.replyTo && `${s.name ? " · " : ""}reply-to ${s.replyTo}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Status only, on every row (PATTERNS 9.1). */}
                        {pending ? (
                          <Badge variant="warning">Pending confirmation</Badge>
                        ) : (
                          <Badge variant="success">Confirmed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
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
                            <DropdownMenuContent align="end" className="w-52">
                              {!canManage && <DropdownMenuLabel>Admin only</DropdownMenuLabel>}
                              <DropdownMenuGroup>
                                <DropdownMenuItem disabled={!canManage || pending || s.isDefault} onSelect={() => setDefault(s)}>
                                  <StarIcon />
                                  {pending ? "Set as default (confirm first)" : "Set as default"}
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" disabled={!canManage} onSelect={() => removeSender(s)}>
                                  <TrashIcon />
                                  Remove sender
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <AddSenderDialog
        open={addingSender}
        onOpenChange={setAddingSender}
        domains={verifiedDomains}
        validate={validateSender}
        onAdd={addSender}
      />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)}>
        {confirmList.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm">
            {confirmList.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <span className="font-mono">{s.email}</span>
                {s.isDefault && <span className="text-muted-foreground">current default</span>}
              </li>
            ))}
          </ul>
        )}
      </ConfirmDialog>
    </>
  );
}

// Exactly one default among confirmed senders (AC-EC-S-04, AC-EC-D-06); own domain preferred over shared.
function promoteDefault(list: SenderRow[]): SenderRow[] {
  if (list.some((s) => s.isDefault && s.status === "confirmed")) return list;
  const next = list.find((s) => s.status === "confirmed" && !s.shared) ?? list.find((s) => s.status === "confirmed");
  return list.map((s) => ({ ...s, isDefault: s.id === next?.id }));
}
