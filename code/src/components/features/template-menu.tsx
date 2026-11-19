"use client";

import { SCROLL_SHEET_BODY } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3Icon,
  CalendarClockIcon,
  CopyIcon,
  EyeIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SendIcon,
  Share2Icon,
  Trash2Icon,
  UserRoundCogIcon,
} from "lucide-react";
import { toast } from "sonner";
import { type Campaign, type Template, campaignStatus, formatDateTime } from "@/lib/mock/campaigns";
import { isArchived } from "@/lib/mock/campaign-store";
import { useCampaignStore } from "@/lib/mock/created-campaigns";
import { members } from "@/lib/mock/workspace";
import {
  type Viewer,
  accessFor,
  activityFor,
  canEdit,
  canManage,
  canTransfer,
  detailsFor,
  lockReason,
  ownerName,
} from "@/lib/mock/templates";
import { type ActivityAction, templateActions } from "@/lib/mock/template-store";
import { useTemplateStore } from "@/lib/mock/use-template-store";
import { activateBlockedReason, campaignOffReason, liveStatus } from "@/components/features/activation";
import { currentSchedule, useAutomation } from "@/components/features/automation";
import { LockedTip } from "@/components/saella/locked-tip";
import { Hint } from "@/components/saella/hint";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// The template "⋯" menu, its dialogs and the row buttons, shared by the Templates list, a template's page and the
// Campaigns cards (one menu; one behaviour).
// Permissions are the live app's four tiers (Repo src/lib/email/template-permissions.ts): Send, Automate, Edit and
// Mark active/inactive need canEdit; Share, View log and Delete need canManage; Transfer needs an admin; Copy is
// open to everyone who can see the template (BR-RULE-EC-41). Locked items stay visible, disabled; why is said in
// one line at the bottom of the menu (a disabled menu item can't hold a tooltip, PATTERNS 9.12).
// Every action writes to lib/mock/template-store.ts, so all three screens show the result.

export function sendBlockedReason(template: Template, viewer: Viewer, sendingBlocked?: string) {
  // Everyone's reason first: nobody can send from an ended campaign (live campaign-expiry sweep) or an archived one.
  const off = campaignOffReason(template.id);
  if (off) return off;
  const access = accessFor(template, viewer);
  if (!canEdit(access)) return lockReason.edit(template.owner);
  if (sendingBlocked) return sendingBlocked;
  if (template.status !== "active") return "Mark this template active first to send a batch";
  return undefined;
}

export { activateBlockedReason };

/** Copy a template into a campaign: inactive, owned by the copier; toast with Open (to the editor). */
export function useCopyTemplate(viewer: Viewer) {
  const router = useRouter();
  return (template: Template, campaign: Campaign) => {
    const id = templateActions.copy(template, detailsFor(template.id), campaign, viewer.email);
    toast.success(`Copied to ${campaign.name}`, {
      description: "The copy is inactive and yours.",
      action: { label: "Open", onClick: () => router.push(`/templates/${id}/edit`) },
    });
    return id;
  };
}

type Open = "share" | "log" | "transfer" | "delete" | null;

export function TemplateMenu({
  template,
  viewer,
  campaigns,
  showAnalytics = true,
  showEdit = true,
  onAutomate,
  automateHref,
  onDeleted,
  triggerVariant = "ghost",
}: {
  /** The template as the store has it (status, owner): pass rows built with applyTemplateStore / findTemplate. */
  template: Template;
  viewer: Viewer;
  /** Copy to… targets; ended and archived campaigns are left out here. */
  campaigns: Campaign[];
  /** Hidden on the template's own page. */
  showAnalytics?: boolean;
  /** Hidden where Edit already sits next to the menu (list row, detail header). */
  showEdit?: boolean;
  /** Opens the Automate dialog (list rows, cards) or scrolls to the Automation card (template page). */
  onAutomate?: () => void;
  /** Link to the template's Automation section instead of a dialog. */
  automateHref?: string;
  /** After a delete, e.g. leave the template's own page. */
  onDeleted?: () => void;
  triggerVariant?: "ghost" | "outline";
}) {
  const [open, setOpen] = useState<Open>(null);
  const copyTo = useCopyTemplate(viewer);
  const templateStore = useTemplateStore();
  const campaignState = useCampaignStore();
  // Copy to… offers only campaigns that can still send: not ended, not archived (live app skips archived ones).
  const copyTargets = campaigns.filter((c) => campaignStatus(c) !== "ended" && !isArchived(c.id, campaignState));
  const auto = useAutomation();
  const scheduleOn = currentSchedule(auto, template.id)?.status === "active";
  const inFlow = auto.flows.some((f) => f.templateId === template.id || f.steps.some((st) => st.templateId === template.id));
  const access = accessFor(template, viewer);
  const edit = canEdit(access);
  const manage = canManage(access);
  const transfer = canTransfer(access, viewer);
  // Automate only for an active template; Mark active / inactive lives in the editor, not here.
  const inactive = liveStatus(template.id, template.status, templateStore) !== "active";
  // One line on why the menu is short, since the items the viewer can't use are hidden (not "this" of a grey item).
  const note = !manage ? `Owned by ${ownerName(template.owner)}. Only they or an admin can share or delete it.` : null;
  // Why Automate is greyed (a disabled item can't hold a tooltip, PATTERNS 9.12).
  const automateNote =
    inactive && edit && (onAutomate || automateHref)
      ? campaignOffReason(template.id)
        ? `${campaignOffReason(template.id)}.`
        : "Mark it active in the editor to automate it."
      : null;
  const notes = [automateNote, note].filter((x): x is string => Boolean(x));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={triggerVariant} size="icon-sm" aria-label={`More actions for ${template.name}`}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {showEdit && (
              <DropdownMenuItem asChild>
                <Link href={`/templates/${template.id}/edit`}>
                  {edit ? <PencilIcon /> : <EyeIcon />}
                  {edit ? "Edit" : "View content"}
                </Link>
              </DropdownMenuItem>
            )}
            {automateHref && (
              <DropdownMenuItem asChild disabled={inactive}>
                <Link href={automateHref}>
                  <CalendarClockIcon />
                  {edit ? "Automate" : "View automation"}
                </Link>
              </DropdownMenuItem>
            )}
            {onAutomate && (
              <DropdownMenuItem onSelect={onAutomate} disabled={inactive}>
                <CalendarClockIcon />
                {edit ? "Automate" : "View automation"}
              </DropdownMenuItem>
            )}
            {showAnalytics && (
              <DropdownMenuItem asChild>
                <Link href={`/templates/${template.id}`}>
                  <BarChart3Icon />
                  View analytics
                </Link>
              </DropdownMenuItem>
            )}
            {/* Items the viewer has no right to are left out, not greyed: Share, View log, Delete (owner or admin), Transfer
                owner (admin). */}
            {manage && (
              <DropdownMenuItem onSelect={() => setOpen("share")}>
                <Share2Icon />
                Share
              </DropdownMenuItem>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <CopyIcon />
                Copy to…
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {copyTargets.map((c) => (
                  <DropdownMenuItem key={c.id} onSelect={() => copyTo(template, c)}>
                    {c.name}
                  </DropdownMenuItem>
                ))}
                {copyTargets.length === 0 && <DropdownMenuItem disabled>No open campaigns</DropdownMenuItem>}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {manage && (
              <DropdownMenuItem onSelect={() => setOpen("log")}>
                <HistoryIcon />
                View log
              </DropdownMenuItem>
            )}
            {transfer && (
              <DropdownMenuItem onSelect={() => setOpen("transfer")}>
                <UserRoundCogIcon />
                Transfer owner
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          {manage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onSelect={() => setOpen("delete")}>
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
          {notes.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {notes.map((line) => (
                <DropdownMenuLabel key={line} className="max-w-64 text-sm font-normal whitespace-normal text-muted-foreground">
                  {line}
                </DropdownMenuLabel>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {open === "share" && <ShareDialog template={template} viewer={viewer} onClose={() => setOpen(null)} />}
      {open === "transfer" && <TransferDialog template={template} viewer={viewer} onClose={() => setOpen(null)} />}
      {open === "log" && <ActivitySheet template={template} onClose={() => setOpen(null)} />}
      <AlertDialog open={open === "delete"} onOpenChange={(o) => !o && setOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{template.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Sent batches keep their reports.
              {(scheduleOn || inFlow) && " Its schedule and follow-ups stop."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep template</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                templateActions.remove(template.id, viewer.email);
                toast.success(`Deleted “${template.name}”`);
                onDeleted?.();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const initials = (name: string) =>
  name
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

function MemberMedia({ name }: { name: string }) {
  return (
    <ItemMedia>
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
      </Avatar>
    </ItemMedia>
  );
}

/**
 * Share (live ShareTemplateModal, TPL-SHARE-001): active teammates who may edit, send, automate and schedule it.
 * The owner and the admin are left out (they have every right already). Each click takes effect at once.
 */
function ShareDialog({ template, viewer, onClose }: { template: Template; viewer: Viewer; onClose: () => void }) {
  useTemplateStore();
  const shared = detailsFor(template.id).sharedWith;
  const people = members.filter((m) => m.status === "active" && m.role !== "admin" && m.email !== template.owner);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share “{template.name}”</DialogTitle>
          <DialogDescription>People you share with can edit, send and automate it. Everyone else can view or copy it.</DialogDescription>
        </DialogHeader>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other active members yet.</p>
        ) : (
          <ItemGroup className="gap-1">
            {people.map((m) => {
              const on = shared.includes(m.email);
              return (
                <Item key={m.id} size="sm" className="px-0">
                  <MemberMedia name={m.name} />
                  <ItemContent>
                    <ItemTitle>{m.name}</ItemTitle>
                    <ItemDescription>{m.email}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        templateActions.setShared(template.id, shared, m.email, !on, viewer.email);
                        toast.success(on ? `${m.name} can no longer edit it` : `Shared with ${m.name}`);
                      }}
                    >
                      {on ? "Remove" : "Share"}
                    </Button>
                  </ItemActions>
                </Item>
              );
            })}
          </ItemGroup>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Transfer owner (live TransferOwnerModal + transfer route): admin only; active members other than the owner. */
function TransferDialog({ template, viewer, onClose }: { template: Template; viewer: Viewer; onClose: () => void }) {
  const [to, setTo] = useState("");
  const people = members.filter((m) => m.status === "active" && m.email !== template.owner);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer “{template.name}”</DialogTitle>
          <DialogDescription>
            Owned by {ownerName(template.owner)}. The new owner gets every right; existing shares stay.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="tr-owner">New owner</FieldLabel>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger id="tr-owner" className="w-full">
              <SelectValue placeholder="Choose a member" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {people.map((m) => (
                  <SelectItem key={m.id} value={m.email}>
                    {m.name}
                    <span className="text-muted-foreground">{m.email}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!to}
            onClick={() => {
              templateActions.transfer(template.id, template.owner, to, detailsFor(template.id).sharedWith, viewer.email);
              toast.success(`Transferred to ${ownerName(to)}`, { description: "Both owners are told in the app and by email." });
              onClose();
            }}
          >
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ACTION_LABEL: Record<ActivityAction, string> = {
  edit: "Edited",
  share: "Shared",
  revoke: "Share removed",
  copy: "Copied",
  send: "Sent",
  reassign: "Owner changed",
  schedule: "Schedule",
  followup: "Follow-up",
  delete: "Deleted",
};

/** View log (live TemplateActivityModal): who changed or sent it, newest first. Views are not recorded. */
function ActivitySheet({ template, onClose }: { template: Template; onClose: () => void }) {
  const store = useTemplateStore();
  const rows = activityFor(template.id, store);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Activity</SheetTitle>
          <SheetDescription>{template.name}</SheetDescription>
        </SheetHeader>
        <div className={cn("p-4", SCROLL_SHEET_BODY)}>
          {rows.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HistoryIcon />
                </EmptyMedia>
                <EmptyTitle>Nothing yet</EmptyTitle>
                <EmptyDescription>Edits, shares and sends of this template show here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ol className="flex flex-col">
              {rows.map((r) => (
                <li key={r.id} className="group/entry relative flex gap-3 pb-5 last:pb-0">
                  <span aria-hidden className="relative z-10 mt-1.5 size-2 shrink-0 rounded-full bg-border ring-4 ring-background" />
                  <span aria-hidden className="absolute top-3 bottom-0 left-[3.5px] w-px bg-border group-last/entry:hidden" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm">
                        <span className="font-medium">{ACTION_LABEL[r.action]}</span>
                        <span className="text-muted-foreground"> · {ownerName(r.actor)}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatDateTime(r.at)}</span>
                    </div>
                    {r.detail && <span className="text-sm text-muted-foreground">{r.detail}</span>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Send batch (to the batch wizard). Live app: the template's main action (primary on its analytics page, an icon
 * in the list row). Disabled, with the reason, when the viewer can't edit, sending is blocked or it is inactive.
 */
export function SendButton({
  template,
  viewer,
  sendingBlocked,
  variant = "outline",
  iconOnly = false,
}: {
  template: Template;
  viewer: Viewer;
  sendingBlocked?: string;
  variant?: "outline" | "default";
  /** Icon button for table rows; the tooltip names it. */
  iconOnly?: boolean;
}) {
  const reason = sendBlockedReason(template, viewer, sendingBlocked);
  const size = iconOnly ? "icon-sm" : "sm";
  const v = iconOnly ? "ghost" : variant;
  const body = iconOnly ? (
    <SendIcon />
  ) : (
    <>
      <SendIcon data-icon="inline-start" />
      Send batch
    </>
  );
  if (reason)
    return (
      <LockedTip reason={reason}>
        <Button variant={v} size={size} aria-label={iconOnly ? "Send batch" : undefined} disabled>
          {body}
        </Button>
      </LockedTip>
    );
  const button = (
    <Button variant={v} size={size} asChild>
      <Link href={`/batches/new?template=${template.id}`} aria-label={iconOnly ? `Send batch with ${template.name}` : undefined}>
        {body}
      </Link>
    </Button>
  );
  return iconOnly ? <Hint label="Send batch">{button}</Hint> : button;
}

/** Edit (or View content for people who can't edit) as a row icon, first of the row actions as in the live list. */
export function EditIconButton({ template, viewer }: { template: Template; viewer: Viewer }) {
  const edit = canEdit(accessFor(template, viewer));
  const label = edit ? "Edit" : "View content";
  return (
    <Hint label={label}>
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={`/templates/${template.id}/edit`} aria-label={`${label}: ${template.name}`}>
          {edit ? <PencilIcon /> : <EyeIcon />}
        </Link>
      </Button>
    </Hint>
  );
}

/**
 * The template name cell of every template table (Templates list; Campaigns cards): the name (a link, for the
 * keyboard; the row opens it on a click anywhere, PATTERNS 9.1) and, on line 2, the type (Letter / Design). Owner and
 * the viewer's access sit in the name's tooltip. On a search that matched the subject and not the name, line 2 adds
 * the subject with the match marked.
 */
export function TemplateNameCell({
  template: t,
  viewer,
  query = "",
}: {
  template: Template;
  viewer: Viewer;
  /** Trimmed, lower-case search; the subject shows only when it, not the name, matched. */
  query?: string;
}) {
  const access = accessFor(t, viewer);
  const details = detailsFor(t.id);
  const who =
    access === "owner"
      ? "Owner: you"
      : `Owner: ${ownerName(t.owner)} · ${access === "viewer" ? "view only" : access === "shared" ? "shared with you" : "admin access"}`;
  const subjectHit = query && !t.name.toLowerCase().includes(query) ? details.subject.toLowerCase().indexOf(query) : -1;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Hint
        label={
          <>
            <span className="block font-medium">{t.name}</span>
            {who}
          </>
        }
      >
        {/* Wraps to two lines before it truncates, so a narrow column still shows most of the name. */}
        <Link
          href={`/templates/${t.id}`}
          className="line-clamp-2 rounded-sm font-medium break-words focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t.name}
        </Link>
      </Hint>
      <span className="truncate text-sm text-muted-foreground" title={subjectHit >= 0 ? details.subject : undefined}>
        {details.kind === "design" ? "Design" : "Letter"}
        {subjectHit >= 0 && (
          <>
            {" · "}
            {details.subject.slice(0, subjectHit)}
            <mark className="rounded-sm bg-primary-subtle px-0.5 text-foreground">
              {details.subject.slice(subjectHit, subjectHit + query.length)}
            </mark>
            {details.subject.slice(subjectHit + query.length)}
          </>
        )}
      </span>
    </div>
  );
}

/**
 * A click anywhere on a row opens its page (PATTERNS 9.1, as DataTable onRowClick), except on a control in the row
 * (link, button, menu). Clicks that bubble up from a portal (the row's menu, its dialogs) are ignored: they are not
 * inside the row in the DOM.
 */
export function useRowOpen() {
  const router = useRouter();
  return (href: string) => (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (!e.currentTarget.contains(target)) return;
    if (target.closest("button, a, input, label, select, textarea, [role=checkbox], [role=menuitem], [data-no-row-click]")) return;
    // Selecting text in a row is not a click on it.
    if (window.getSelection()?.toString()) return;
    router.push(href);
  };
}
