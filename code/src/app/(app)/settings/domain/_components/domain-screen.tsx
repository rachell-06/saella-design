"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  GlobeIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  TrashIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { WORKSPACE_TZ_LABEL } from "@/lib/time";
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog, type ConfirmRequest } from "../../_components/confirm-dialog";
import {
  DOMAIN_RE,
  type DomainRow,
  FREE_MAIL,
  MAX_DOMAINS,
  ORG,
  TODAY,
  VERIFY_WINDOW_H,
  agoShort,
  domainForState,
  domainOf,
  formatDay,
  formatDayTime,
  hoursLeft,
  initialMembers,
  initialSenders,
  newDomainRecords,
  normaliseDomain,
} from "../../_components/data";
import { SectionHeader } from "../../_components/section-header";
import { AddDomainDialog } from "./add-domain-dialog";
import Link from "next/link";
import { HealthRing, configOf, scoreHealth } from "../../_components/health-score";
import { last7Days } from "../../sending/_components/sending-health";
import { DnsInfo, DnsRecordsTable, RecordHealthList } from "./domain-records";

// Settings → Domain: the one place to verify the workspace's domain and check it stays healthy (2026-11-11).
// PRD-02 US-EC-D / US-EC-DV, PRD Master (one domain, monitoring of verified domains, v1.4.2 "Unverified");
// live app EmailDomainsManager.tsx + api/email/domains + lib/email/domain-recheck.ts (Repo origin/development).
// - ONE domain per workspace (MAX_DOMAINS_PER_COMPANY = 1). Whoever verifies it first becomes the admin (BR-ORG-01);
//   before that there is no admin, so anyone can set it up.
// - States as the live app buckets them (SES): Verified; Verification pending (72-hour window, then Expired:
//   remove and add again); Unverified (verified once, then a record went missing: nothing sends until it's back).
// - Opening the page re-checks in the background (AC-EC-D-03); Verify / Check again re-checks now (AC-EC-D-04).
//   Verify is open to everyone; removing the domain is the admin's.
// - The DNS host is detected from nameservers; "couldn't read them" is never shown as "no API" (AC-EC-DV-04).
//   Automatic record writing is off in the live app (AUTO_DNS_ENABLED), so it isn't offered.
// - Removing lists the senders that go with it, "Remove anyway" / "Keep it" (AC-EC-D-06, PATTERNS 9.10).
// Preview with ?state= loading | error | empty | member | unclaimed | pending | expired | unverified
const ADMIN = initialMembers.find((m) => m.role === "admin");

export function DomainScreen() {
  const preview = useSearchParams().get("state") ?? "";
  const unclaimed = preview === "unclaimed";
  const canManage = preview !== "member";
  const adminOnly = `Only the admin${ADMIN ? ` (${ADMIN.name})` : ""} can change this.`;

  const [loading, setLoading] = useState(preview === "loading");
  const [loadError, setLoadError] = useState(preview === "error");
  const [domain, setDomain] = useState<DomainRow | null>(() => domainForState(preview));
  const [checking, setChecking] = useState(false);
  // Opening the page re-checks in the background: always when not verified, and when verified but last checked
  // more than 30 minutes ago (AC-EC-D-03). Never blocks the page.
  // An expired domain isn't re-checked: SES stops after the 72-hour window (live app domain-recheck.ts).
  const [autoChecking, setAutoChecking] = useState(
    () =>
      preview !== "loading" &&
      preview !== "error" &&
      domain !== null &&
      !(domain.status === "pending" && hoursLeft(domain.addedOn) <= 0)
  );
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [confirmList, setConfirmList] = useState<string[]>([]);

  useEffect(() => {
    if (!autoChecking) return;
    const t = setTimeout(() => {
      setAutoChecking(false);
      setDomain((d) => (d ? { ...d, checkedAt: `${TODAY}T04:59:00Z` } : d));
    }, 1200);
    return () => clearTimeout(t);
  }, [autoChecking]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <span className="sr-only">Loading domain</span>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-16 w-full rounded-card" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Couldn&apos;t load your domain</AlertTitle>
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

  function check(d: DomainRow) {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      // Mock propagation: each check finds one more missing record.
      const idx = d.records.findIndex((r) => !r.ok);
      const records = d.records.map((r, i) => (i === idx ? { ...r, ok: true } : r));
      const missing = records.filter((r) => !r.ok).length;
      const wasVerified = d.status === "verified";
      setDomain({ ...d, records, status: missing === 0 ? "verified" : d.status, checkedAt: `${TODAY}T05:00:00Z` });
      if (wasVerified) toast("All records in place", { description: `${d.domain} can send.` });
      else if (missing === 0)
        toast.success(`${d.domain} is verified`, {
          description: unclaimed ? "Sending is on, and you're now the workspace admin." : "Sending from it is on.",
        });
      else
        toast("Not verified yet", {
          description: `${missing} record${missing > 1 ? "s" : ""} still missing. DNS changes can take minutes to hours.`,
        });
    }, 900);
  }

  function validateDomain(raw: string) {
    const d = normaliseDomain(raw);
    if (!d) return "Enter a domain.";
    if (!DOMAIN_RE.test(d)) return "That doesn't look like a domain. Try something like yourcompany.com.";
    if (FREE_MAIL.includes(d)) return "You can't send from a personal email provider. Use a domain your company owns.";
    if ((domain ? 1 : 0) >= MAX_DOMAINS) return "A workspace has one domain. Remove it to add another.";
    return null;
  }

  function addDomain(raw: string) {
    const d = normaliseDomain(raw);
    setDomain({
      domain: d,
      status: "pending",
      addedOn: TODAY,
      records: newDomainRecords(d),
      dnsHost: d.endsWith(".vn") ? "PA Vietnam" : d.endsWith(".com") ? "Cloudflare" : null,
      checkedAt: `${TODAY}T05:00:00Z`,
    });
    toast.success(`${d} added`, { description: "Add the DNS records, then press Verify." });
  }

  function removeDomain(d: DomainRow) {
    const onIt = initialSenders.filter((s) => !s.shared && domainOf(s.email) === d.domain);
    setConfirmList(onIt.map((s) => s.email));
    setConfirm({
      title: `Remove ${d.domain}?`,
      description:
        onIt.length > 0
          ? `Nothing can send from it any more, and ${onIt.length === 1 ? "its sender is" : `its ${onIt.length} senders are`} removed with it. Sent batches keep their history.`
          : "Nothing can send from it any more. Adding it again needs new DNS records.",
      confirmLabel: "Remove anyway",
      cancelLabel: "Keep it",
      destructive: true,
      onConfirm: () => {
        setDomain(null);
        toast(`Removed ${d.domain}`, {
          description: onIt.length ? `With ${onIt.length} sender${onIt.length > 1 ? "s" : ""} on it.` : undefined,
        });
      },
    });
  }

  const addHint = canManage ? undefined : adminOnly;

  if (!domain) {
    return (
      <section className="flex flex-col gap-4" aria-labelledby="domain-title">
        <SectionHeader id="domain-title" title="Domain" info={<DomainRule />} />
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GlobeIcon />
            </EmptyMedia>
            <EmptyTitle>No domain yet</EmptyTitle>
            <EmptyDescription>Add your company&apos;s domain to send from your own address.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Hint label={addHint}>
              {/* span keeps the hint working while the button is disabled (PATTERNS 9.12) */}
              <span tabIndex={addHint ? 0 : undefined}>
                <Button onClick={() => setAdding(true)} disabled={!canManage}>
                  <PlusIcon data-icon="inline-start" />
                  Add domain
                </Button>
              </span>
            </Hint>
          </EmptyContent>
        </Empty>
        <AddDomainDialog open={adding} onOpenChange={setAdding} validate={validateDomain} onAdd={addDomain} />
      </section>
    );
  }

  const d = domain;
  const verified = d.status === "verified";
  // Same score as Settings › Sending (live app HealthCircle): the last 7 days of sends plus this domain's DNS records.
  const t7 = last7Days();
  const health = scoreHealth({ sends: t7.sent, delivered: t7.delivered, bounced: t7.bounces, complained: t7.complaints }, configOf(d));
  const lost = d.status === "failed";
  const left = hoursLeft(d.addedOn);
  const expired = d.status === "pending" && left <= 0;
  const pending = d.status === "pending" && !expired;
  const missing = d.records.filter((r) => !r.ok).length;
  const busy = checking || autoChecking;
  const deadline = new Date(Date.parse(`${d.addedOn}T12:00:00Z`) + VERIFY_WINDOW_H * 3600_000).toISOString();

  return (
    <>
      <section className="flex flex-col gap-4" aria-labelledby="domain-title">
        <SectionHeader id="domain-title" title="Domain" info={<DomainRule />} />

        <Item variant="outline" className="gap-x-3 rounded-card px-4 py-3 text-[length:inherit]">
          {verified ? (
            <HealthRing report={health} />
          ) : (
            <ItemMedia variant="icon" className="text-muted-foreground">
              <GlobeIcon />
            </ItemMedia>
          )}
          <ItemContent className="min-w-0">
            <ItemTitle className="text-base">
              {d.domain}
              {verified ? (
                <Badge variant="success">
                  <CircleCheckIcon data-icon="inline-start" />
                  Verified
                </Badge>
              ) : lost ? (
                <Badge variant="destructive">Unverified</Badge>
              ) : expired ? (
                <Badge variant="destructive">Expired</Badge>
              ) : (
                <Badge variant="warning">Verification pending</Badge>
              )}
            </ItemTitle>
            <ItemDescription className="tabular-nums">
              {unclaimed ? (
                <span className="text-warning-soft-foreground">No admin yet</span>
              ) : (
                <>
                  Claimed · Admin {ADMIN?.name ?? "none"} · since {formatDay(ORG.claimedOn, true)}
                </>
              )}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {busy ? (
                <>
                  <Spinner className="size-3.5" />
                  Checking…
                </>
              ) : (
                <>
                  {`Checked ${agoShort(d.checkedAt)}`}
                  {verified && (
                    <>
                      {" · "}
                      <Link href="/settings/sending" className="text-foreground underline-offset-4 hover:underline">
                        View health
                      </Link>
                    </>
                  )}
                </>
              )}
            </span>
            {/* Only while the domain isn't verified; a verified one re-checks from the ⋯ menu (records can change later). */}
            {!expired && !verified && (
              <Button
                variant="default"
                onClick={() => check(d)}
                disabled={checking}
                aria-busy={checking || undefined}
              >
                {checking ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
                Verify
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`More for ${d.domain}`}>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {!canManage && <DropdownMenuLabel className="font-normal">{adminOnly}</DropdownMenuLabel>}
                <DropdownMenuGroup>
                  {verified && (
                    <DropdownMenuItem disabled={checking} onSelect={() => check(d)}>
                      <RefreshCwIcon />
                      Check DNS again
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" disabled={!canManage} onSelect={() => removeDomain(d)}>
                    <TrashIcon />
                    Remove domain
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </ItemActions>
        </Item>

        {pending && (
          <Alert variant="warning">
            <TriangleAlertIcon />
            <AlertTitle className="tabular-nums">
              Verify by {formatDayTime(deadline)} {WORKSPACE_TZ_LABEL} ({left} h left)
            </AlertTitle>
            <AlertDescription>
              <ol className="list-decimal pl-4">
                <li>
                  Copy the records below into {d.dnsHost ? `your ${d.dnsHost} DNS settings` : "your DNS host"}, Ownership
                  first.
                </li>
                <li>Press Verify{unclaimed ? " to become the workspace admin" : ""}. Nothing sends until it passes.</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {expired && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>The {VERIFY_WINDOW_H}-hour window has closed</AlertTitle>
            <AlertDescription>Remove the domain and add it again to get new records.</AlertDescription>
            <AlertAction>
              <Hint label={addHint}>
                <span tabIndex={addHint ? 0 : undefined}>
                  <Button variant="outline" size="sm" disabled={!canManage} onClick={() => removeDomain(d)}>
                    Remove domain
                  </Button>
                </span>
              </Hint>
            </AlertAction>
          </Alert>
        )}

        {lost && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>
              {missing} record{missing > 1 ? "s" : ""} missing: sending is off
            </AlertTitle>
            <AlertDescription>
              Add {missing > 1 ? "them" : "it"} again at your DNS host, then press Verify.
            </AlertDescription>
          </Alert>
        )}
      </section>

      {!expired && (
        <section className="flex flex-col gap-4" aria-labelledby="records-title">
          {verified || lost ? (
            <SectionHeader id="records-title" title="Records" />
          ) : (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <h2 id="records-title" className="font-heading text-lg font-medium tracking-title">
                  DNS records
                </h2>
                <DnsInfo />
              </div>
              <p className="text-muted-foreground tabular-nums">
                {missing} of {d.records.length} missing
                {d.dnsHost ? "" : ". We couldn't read the nameservers, so add them at your DNS host."}
              </p>
            </div>
          )}
          {verified || lost ? (
            <RecordHealthList records={d.records} domain={d.domain} />
          ) : (
            <DnsRecordsTable records={d.records} />
          )}
        </section>
      )}

      <AddDomainDialog open={adding} onOpenChange={setAdding} validate={validateDomain} onAdd={addDomain} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)}>
        {confirmList.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-lg border px-3 py-2 font-mono text-sm">
            {confirmList.map((email) => (
              <li key={email}>{email}</li>
            ))}
          </ul>
        )}
      </ConfirmDialog>
    </>
  );
}

function DomainRule() {
  return <>One domain per workspace. Whoever verifies it first becomes the admin.</>;
}
