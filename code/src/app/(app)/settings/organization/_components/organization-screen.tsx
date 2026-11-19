"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRightLeftIcon,
  CircleAlertIcon,
  InfoIcon,
  LockIcon,
  MoreHorizontalIcon,
  UserCheckIcon,
  UserPlusIcon,
  TriangleAlertIcon,
  UserXIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Hint } from "@/components/saella/hint";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog, type ConfirmRequest } from "../../_components/confirm-dialog";
import {
  CURRENT_USER_ID,
  FREE_MAIL,
  MAX_SEATS,
  ORG,
  type OrgMember,
  canSendAs,
  formatDay,
  initialMembers,
} from "../../_components/data";
import { SectionHeader } from "../../_components/section-header";
import { Item } from "@/components/ui/item";

// Settings → Organization (PRD Organization & Roles; read; live app components/email/UsersSection.tsx).
// - One org per email domain; the first account to verify the domain becomes its admin (BR-ORG-01,
//   BR-RULE-ORG-01, AC-ORG-A-01). Colleagues on the domain ask to join (BR-ORG-02).
// - Members list is admin-only (AC-ORG-U-01); statuses Invited, Requested, Active, Disabled.
// - Joins are approved, never automatic; approval permanently deletes the requester's own workspace and moves
//   purchased credits across, and the dialog says so (BR-RULE-ORG-04/05, AC-ORG-U-03, AC-ORG-J-05).
// - Invite by email; shows as Invited until first sign-in; an invite can be withdrawn (AC-ORG-U-02, live app).
// - Disable is reversible and keeps history; their automations pause; the admin reassigns their templates
//   (AC-ORG-U-04, BR-RULE-ORG-06, ORG-SEQ-004). The admin can't be disabled (EC-ORG-05).
// - Send-as: only members with a confirmed sender on a verified org domain; the member is notified (BR-RULE-ORG-07,
//   AC-ORG-U-05). The default sender is chosen in one place only, Settings › Sending › Senders.
// - One admin; transfer only to an Active member, with a type-to-confirm step (BR-RULE-ORG-03, AC-ORG-U-06).
// - Seats: 10 per org, a seat being an active or invited member (PRD Master v1.1.7; live app lib/org/membership.ts
//   MAX_MEMBERS_PER_ORG). Invite, Approve and Enable take a seat, so all three stop at 10 (live app checks invite and
//   approve; Enable too here), locked with the reason.
// - Unclaimed (nobody verified the domain): no admin, so the decisions that need one (approve, reject, invite, disable,
//   send-as, transfer) are shown locked with the reason, under the "Verify your domain" alert.
// - Invites keep refusing personal addresses, although sign-up takes any email: decisions.md.
// - Several join requests: only the first Approve is the page's solid button (DESIGN §2).
// Preview with ?state= loading | error | member | unclaimed | no-requests | full
type Preview = "loading" | "error" | "member" | "unclaimed" | "no-requests" | "full" | "";

/** ?state=full: six more active members (10 seats with Linh, Minh, An and the invite) and a second join request. */
const FULL_EXTRA: OrgMember[] = [
  ["u7", "Hanh Do", "hanh"],
  ["u8", "Khoa Bui", "khoa"],
  ["u9", "Mai Dang", "mai"],
  ["u10", "Nam Ho", "nam"],
  ["u11", "Phuong Ly", "phuong"],
  ["u12", "Son Trinh", "son"],
].map(([id, name, local]) => ({
  id,
  name,
  email: `${local}@${ORG.domain}`,
  role: "member" as const,
  status: "active" as const,
  joinedOn: "2026-09-15",
  sendAs: false,
  defaultSendAs: false,
  templates: 0,
}));
const FULL_REQUEST: OrgMember = {
  id: "u13",
  name: "Tam Vu",
  email: `tam@${ORG.domain}`,
  role: "member",
  status: "requested",
  requestedOn: "2026-10-27",
  sendAs: false,
  defaultSendAs: false,
  templates: 0,
};

function startMembers(preview: Preview): OrgMember[] {
  if (preview === "no-requests") return initialMembers.filter((m) => m.status !== "requested");
  if (preview === "full") return [...initialMembers, ...FULL_EXTRA, FULL_REQUEST];
  // Nobody has verified the domain yet, so nobody is admin.
  if (preview === "unclaimed") return initialMembers.map((m) => ({ ...m, role: "member" as const }));
  return initialMembers;
}

const STATUS_VARIANT: Record<OrgMember["status"], "success" | "secondary" | "info" | "warning"> = {
  invited: "info",
  requested: "warning",
  active: "success",
  disabled: "secondary",
};

const NO_ADMIN = "No admin yet. Verify the domain to become admin.";
const SEATS_FULL = `All ${MAX_SEATS} seats are used.`;

const STATUS_LABEL: Record<OrgMember["status"], string> = {
  invited: "Invited",
  requested: "Requested",
  active: "Active",
  disabled: "Disabled",
};

export function OrganizationScreen() {
  const preview = (useSearchParams().get("state") ?? "") as Preview;
  const [loading, setLoading] = useState(preview === "loading");
  const [loadError, setLoadError] = useState(preview === "error");
  const [members, setMembers] = useState<OrgMember[]>(() => startMembers(preview));
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [invite, setInvite] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [reassign, setReassign] = useState<{ from: OrgMember; to: string } | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferTyped, setTransferTyped] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);

  const me = members.find((m) => m.id === CURRENT_USER_ID);
  const admin = members.find((m) => m.role === "admin");
  // No admin yet (unclaimed): the list shows, every admin decision is locked with the reason.
  const noAdmin = !admin;
  const isAdmin = preview !== "member" && (me?.role === "admin" || noAdmin);
  const requests = members.filter((m) => m.status === "requested");
  // Requests don't take a seat until approved; disabled members free theirs.
  const seatsUsed = members.filter((m) => m.status === "active" || m.status === "invited").length;
  const full = seatsUsed >= MAX_SEATS;
  const update = (id: string, patch: Partial<OrgMember>) =>
    setMembers((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <span className="sr-only">Loading organization</span>
        <Skeleton className="h-20 w-full rounded-card" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-72 w-full rounded-card" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Couldn&apos;t load members</AlertTitle>
        <AlertDescription>Check your connection and try again.</AlertDescription>
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

  // ---- actions ------------------------------------------------------------------------------------------

  function approve(m: OrgMember) {
    if (full) return void toast.error(SEATS_FULL, { description: "Disable a member or remove an invite first." });
    setConfirm({
      title: `Approve ${m.email}?`,
      // State the fact: a join request comes from an account that has its own workspace.
      description:
        "Their own workspace is permanently deleted. Credits they purchased move to this workspace. This can't be undone.",
      confirmLabel: "Approve",
      onConfirm: () => {
        update(m.id, { status: "active", joinedOn: "2026-10-27", requestedOn: undefined });
        toast.success(`${m.name || m.email} joined the workspace`, { description: "They get a welcome email." });
      },
    });
  }

  function reject(m: OrgMember) {
    setConfirm({
      title: `Reject ${m.email}?`,
      description: "Nothing is deleted. They keep working in their own workspace and get an email saying so.",
      confirmLabel: "Reject",
      destructive: true,
      onConfirm: () => {
        setMembers((list) => list.filter((x) => x.id !== m.id));
        toast(`Rejected ${m.email}`);
      },
    });
  }

  function disable(m: OrgMember) {
    setConfirm({
      title: `Disable ${m.email}?`,
      description: `They can't sign in. Automations on their ${m.templates} template${m.templates === 1 ? "" : "s"} pause; their history stays. You can enable them again.`,
      confirmLabel: "Disable",
      destructive: true,
      onConfirm: () => {
        update(m.id, { status: "disabled", sendAs: false, defaultSendAs: false });
        toast(`Disabled ${m.email}`, { description: "Reassign their templates so the automations can resume." });
      },
    });
  }

  function removeInvite(m: OrgMember) {
    setConfirm({
      title: "Remove this invitation?",
      description: `${m.email} won't be able to join with it. You can invite another address.`,
      confirmLabel: "Remove",
      destructive: true,
      onConfirm: () => {
        setMembers((list) => list.filter((x) => x.id !== m.id));
        toast(`Removed the invitation for ${m.email}`);
      },
    });
  }

  function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = invite.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setInviteError("Enter a full email address.");
    // Same business-email rule as sign-up (live app api/org/members POST).
    if (FREE_MAIL.includes(email.split("@")[1])) return setInviteError("Use their work email address, not a personal one.");
    if (members.some((m) => m.email === email)) return setInviteError(`${email} is already on the list.`);
    if (full) return setInviteError(`${SEATS_FULL} Disable a member or remove an invite first.`);
    setMembers((list) => [
      ...list,
      { id: `u-${Date.now()}`, name: "", email, role: "member", status: "invited", invitedOn: "2026-10-27", sendAs: false, defaultSendAs: false, templates: 0 },
    ]);
    setInvite("");
    toast.success(`Invited ${email}`, { description: "They show as Invited until they first sign in." });
  }

  function toggleSendAs(m: OrgMember, on: boolean) {
    setMembers((list) => {
      let next = list.map((x) => (x.id === m.id ? { ...x, sendAs: on, defaultSendAs: on ? x.defaultSendAs : false } : x));
      // Exactly one default (BR-RULE-ORG-08): if the default was switched off, the first remaining one takes over.
      if (!next.some((x) => x.defaultSendAs)) {
        const first = next.find((x) => x.sendAs);
        if (first) next = next.map((x) => ({ ...x, defaultSendAs: x.id === first.id }));
      }
      return next;
    });
    if (on) toast.success(`Teammates can now send as ${m.name || m.email}`, { description: "We let them know." });
    else toast(`${m.name || m.email} is no longer a shared sender`);
  }

  const activeOthers = members.filter((m) => m.status === "active" && m.role !== "admin");
  const transferTarget = members.find((m) => m.id === transferTo);

  // ---- render -------------------------------------------------------------------------------------------

  // The domain and its claim live in Settings → Domain. Here only the case that blocks members:
  // nobody has verified it, so there is no admin to approve join requests.
  const claim = preview === "unclaimed" && (
    <Alert variant="warning">
      <TriangleAlertIcon />
      <AlertTitle>Verify your domain to become admin</AlertTitle>
      <AlertAction>
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings/domain">Go to Domain</Link>
        </Button>
      </AlertAction>
    </Alert>
  );

  if (!isAdmin) {
    return (
      <>
        {claim}
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LockIcon />
            </EmptyMedia>
            <EmptyTitle>Only the admin manages members</EmptyTitle>
            <EmptyDescription>
              {admin ? `${admin.name} (${admin.email})` : "The workspace admin"} invites people, approves join requests
              and chooses who teammates can send as.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              How templates move between people <OwnershipInfo />
            </span>
          </EmptyContent>
        </Empty>
      </>
    );
  }

  return (
    <>
      {claim}

      {requests.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="requests-title">
          <SectionHeader id="requests-title" title="Join requests" description="They can't use Saella until you decide." />
          <ul className="flex flex-col divide-y rounded-card border">
            {requests.map((m, i) => {
              const approveLock = noAdmin ? NO_ADMIN : full ? `${SEATS_FULL} Free one up first.` : undefined;
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <MemberName m={m} meta={`Asked ${m.requestedOn ? formatDay(m.requestedOn) : "recently"}`} />
                  <div className="ml-auto flex gap-2">
                    <Hint label={noAdmin ? NO_ADMIN : undefined}>
                      <span tabIndex={noAdmin ? 0 : undefined} className="flex">
                        <Button variant="outline" disabled={noAdmin} onClick={() => reject(m)}>
                          <XIcon data-icon="inline-start" />
                          Reject
                        </Button>
                      </span>
                    </Hint>
                    <Hint label={approveLock}>
                      <span tabIndex={approveLock ? 0 : undefined} className="flex">
                        {/* One solid button per page (DESIGN §2): only the first request's Approve, and never a locked one. */}
                        <Button
                          variant={i === 0 && !approveLock ? "default" : "outline"}
                          disabled={Boolean(approveLock)}
                          onClick={() => approve(m)}
                        >
                          <UserCheckIcon data-icon="inline-start" />
                          Approve
                        </Button>
                      </span>
                    </Hint>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="members-title">
        <SectionHeader
          id="members-title"
          title="Members"
          description={
            <span className="inline-flex items-center gap-1">
              Everyone with access to this workspace. <OwnershipInfo />
            </span>
          }
        />
        {/* Invite + seats sit in a toolbar inside the table box (Studio Admin roles), so the form reads as part of the
            list it adds to. */}
        <div className="rounded-card border">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b px-4 py-3">
            <form onSubmit={sendInvite} noValidate className="w-full max-w-md">
              <Field data-invalid={inviteError ? true : undefined}>
                <FieldLabel htmlFor="invite-email" className="sr-only">
                  Invite by email
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder={`colleague@${ORG.domain}`}
                    value={invite}
                    onChange={(e) => {
                      setInvite(e.target.value);
                      setInviteError(null);
                    }}
                    aria-invalid={inviteError ? true : undefined}
                    aria-describedby="invite-help"
                    // Invite is locked (no admin, or every seat used): so is the field.
                    disabled={noAdmin || full}
                  />
                  <Hint label={noAdmin ? NO_ADMIN : full ? SEATS_FULL : undefined}>
                    <span tabIndex={noAdmin || full ? 0 : undefined} className="flex">
                      <Button type="submit" variant="outline" disabled={noAdmin || full}>
                        <UserPlusIcon data-icon="inline-start" />
                        Invite
                      </Button>
                    </span>
                  </Hint>
                </div>
                {inviteError ? (
                  <FieldError id="invite-help">{inviteError}</FieldError>
                ) : (
                  <FieldDescription id="invite-help">They join as a member when they first sign in.</FieldDescription>
                )}
              </Field>
            </form>
            <div className="flex w-48 flex-col gap-1.5 pt-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Seats</span>
                <span className="tabular-nums">
                  {seatsUsed}/{MAX_SEATS}
                </span>
              </div>
              <Progress value={(seatsUsed / MAX_SEATS) * 100} aria-label={`${seatsUsed} of ${MAX_SEATS} seats used`} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                {/* Below 1440 (laptops, DESIGN.md §10) the side columns narrow and Member truncates, so Actions stays in the card
                    at 1280. */}
                <TableHead className="w-32 max-[1440px]:w-24">Role</TableHead>
                <TableHead className="w-28 max-[1440px]:w-24">Status</TableHead>
                <TableHead className="w-44 max-[1440px]:w-24">
                  <span className="flex items-center gap-1">
                    Send-as
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-xs" aria-label="About send-as" className="text-muted-foreground">
                          <InfoIcon />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        Teammates can send as them. Default: Sending › Senders.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </TableHead>
                <TableHead className="w-28 max-[1440px]:w-24">Joined</TableHead>
                <TableHead className="w-14">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members
                .filter((m) => m.status !== "requested")
                .map((m) => {
                  const eligible = !noAdmin && m.status === "active" && canSendAs(m);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="max-[1440px]:max-w-56">
                        <MemberName m={m} />
                      </TableCell>
                      <TableCell>
                        {/* Plain text for both roles: one display type per column (DESIGN §2). */}
                        {m.role === "admin" ? "Admin" : "Member"}
                      </TableCell>
                      <TableCell>
                        {/* Own column, a badge on every row (PATTERNS 9.1). */}
                        <Badge variant={STATUS_VARIANT[m.status]}>{STATUS_LABEL[m.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        {m.status === "active" ? (
                          <div className="flex items-center gap-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={eligible ? undefined : 0}>
                                  <Switch
                                    checked={m.sendAs}
                                    disabled={!eligible}
                                    onCheckedChange={(on) => toggleSendAs(m, on)}
                                    aria-label={`Teammates can send as ${m.name || m.email}`}
                                  />
                                </span>
                              </TooltipTrigger>
                              {!eligible && (
                                <TooltipContent className="max-w-64">
                                  {noAdmin ? NO_ADMIN : "Needs a confirmed sender on a verified domain first."}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {/* Dates only; invited people already carry the Invited badge by their name. */}
                        {m.joinedOn ? formatDay(m.joinedOn, true) : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.role !== "admin" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label={`More for ${m.email}`}>
                                <MoreHorizontalIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {noAdmin ? (
                                <DropdownMenuLabel>No admin yet</DropdownMenuLabel>
                              ) : (
                                m.status === "disabled" && full && <DropdownMenuLabel>{SEATS_FULL}</DropdownMenuLabel>
                              )}
                              <DropdownMenuGroup>
                                {m.status === "active" && (
                                  <DropdownMenuItem variant="destructive" disabled={noAdmin} onSelect={() => disable(m)}>
                                    <UserXIcon />
                                    Disable
                                  </DropdownMenuItem>
                                )}
                                {m.status === "disabled" && (
                                  <>
                                    <DropdownMenuItem
                                      disabled={noAdmin || full}
                                      onSelect={() => {
                                        // Enabling takes a seat back (active), so it stops at the limit too.
                                        if (full) return void toast.error(SEATS_FULL);
                                        update(m.id, { status: "active" });
                                        toast.success(`Enabled ${m.email}`);
                                      }}
                                    >
                                      <UserCheckIcon />
                                      Enable
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={noAdmin || m.templates === 0}
                                      onSelect={() => setReassign({ from: m, to: activeOthers.find((x) => x.id !== m.id)?.id ?? CURRENT_USER_ID })}
                                    >
                                      <ArrowRightLeftIcon />
                                      Reassign templates
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {m.status === "invited" && (
                                  <DropdownMenuItem variant="destructive" disabled={noAdmin} onSelect={() => removeInvite(m)}>
                                    <XIcon />
                                    Remove invitation
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* No admin yet: nothing to transfer, so the section isn't shown. */}
      {!noAdmin && (
      <section className="flex flex-col gap-4" aria-labelledby="danger-title">
        <SectionHeader id="danger-title" title="Transfer the admin role" />
        <Item variant="outline" className="flex-col items-stretch gap-3 rounded-card px-4 py-4 text-base">
          <p className="text-muted-foreground">
            Only an active member can take it over. You become a regular member and can&apos;t undo it yourself.
          </p>
          <div className="flex flex-wrap gap-2">
            <Select value={transferTo} onValueChange={setTransferTo} disabled={activeOthers.length === 0}>
              <SelectTrigger className="w-72" aria-label="Choose the next admin">
                <SelectValue placeholder={activeOthers.length ? "Choose the next admin" : "No other active members yet"} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {activeOthers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} · {m.email}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button variant="destructive" disabled={!transferTarget} onClick={() => setTransferOpen(true)}>
              Transfer admin
            </Button>
          </div>
        </Item>
      </section>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />

      {/* Reassign a disabled member's templates (ORG-SEQ-004). */}
      <ConfirmDialog
        request={
          reassign
            ? {
                // The count lives here, not in the menu label.
                title: `Reassign ${reassign.from.name || reassign.from.email}'s ${reassign.from.templates} template${reassign.from.templates === 1 ? "" : "s"}?`,
                description:
                  "Every template they own moves to the member you pick. Sent history keeps their name; paused automations stay paused until the new owner resumes them.",
                confirmLabel: "Reassign templates",
                onConfirm: () => {
                  const to = members.find((x) => x.id === reassign.to);
                  update(reassign.from.id, { templates: 0 });
                  if (to) update(to.id, { templates: to.templates + reassign.from.templates });
                  toast.success(`Reassigned ${reassign.from.templates} templates to ${to?.name}`, {
                    description: "They get a notification.",
                  });
                },
              }
            : null
        }
        onClose={() => setReassign(null)}
      >
        {reassign && (
          <Field>
            <FieldLabel htmlFor="reassign-to">New owner</FieldLabel>
            <Select value={reassign.to} onValueChange={(v) => setReassign({ ...reassign, to: v })}>
              <SelectTrigger id="reassign-to" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {members
                    .filter((x) => x.status === "active")
                    .map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name} · {x.email}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}
      </ConfirmDialog>

      {/* GitHub-style confirm: type the new admin's email (AC-ORG-U-06). */}
      <ConfirmDialog
        request={
          transferOpen && transferTarget
            ? {
                title: "Transfer the admin role?",
                description: `${transferTarget.email} becomes the workspace admin. You become a regular member and cannot undo this yourself.`,
                confirmLabel: "Transfer admin",
                destructive: true,
                onConfirm: () => {
                  setMembers((list) =>
                    list.map((x) =>
                      x.id === transferTarget.id ? { ...x, role: "admin" } : x.role === "admin" ? { ...x, role: "member" } : x
                    )
                  );
                  setTransferTo("");
                  toast.success(`${transferTarget.email} is now the admin`, { description: "You both get a notification." });
                },
              }
            : null
        }
        onClose={() => {
          setTransferOpen(false);
          setTransferTyped("");
        }}
        confirmDisabled={transferTyped.trim().toLowerCase() !== transferTarget?.email}
      >
        <Field>
          <FieldLabel htmlFor="transfer-confirm">Type {transferTarget?.email} to confirm</FieldLabel>
          <Input
            id="transfer-confirm"
            value={transferTyped}
            onChange={(e) => setTransferTyped(e.target.value)}
            autoComplete="off"
          />
        </Field>
      </ConfirmDialog>
    </>
  );
}

// Name on the first line, email and any extra detail on the second, so a row reads as two aligned lines.
// Status never sits here: it has its own column (PATTERNS 9.1).
function MemberName({ m, meta }: { m: OrgMember; meta?: string }) {
  const initials = (m.name || m.email)
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{m.name || m.email}</span>
        {(m.name || meta) && (
          <span
            className="truncate text-sm text-muted-foreground tabular-nums"
            title={[m.name ? m.email : "", meta].filter(Boolean).join(" · ")}
          >
            {[m.name ? m.email : "", meta].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
}

// Template ownership in one place (PRD-02 sharing rules as the live app states them in its notifications,
// lib/i18n/messages.ts ntf.tpl.*, ntf.shared.*, ntf.revoked.*, ntf.owner.*; ORG-SEQ-004). Behind ⓘ (secondary info,
// DESIGN.md), cut to what decides an action (PATTERNS 9.13).
const OWNERSHIP_RULES = [
  "One owner per template.",
  "Shared people can edit and send.",
  "Disabled member? Reassign to resume automations.",
];

function OwnershipInfo() {
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="How template ownership works" className="text-muted-foreground">
          <InfoIcon />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-auto max-w-none">
        <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm whitespace-nowrap text-muted-foreground marker:text-subtle-foreground">
          {OWNERSHIP_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
