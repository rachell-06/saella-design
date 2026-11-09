"use client";

import Link from "next/link";
import {
  BarChart3Icon,
  CopyIcon,
  EyeIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PowerIcon,
  SendIcon,
  Share2Icon,
  Trash2Icon,
  UserRoundCogIcon,
  ZapIcon,
} from "lucide-react";
import type { Campaign, Template } from "@/lib/mock/campaigns";
import { Button } from "@/components/ui/button";
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
import { LockedTip } from "@/components/features/automate-dialog";
import { type Viewer, accessFor, canEdit, canManage, canTransfer, lockReason } from "@/lib/mock/templates";

// Template actions for the Templates screens, with the live app's four permission tiers
// (Repo src/lib/email/template-permissions.ts): Send/Automate/Edit/activate need canEdit; Share, View log and
// Delete need canManage; Transfer needs an admin. Disabled buttons explain why in a tooltip; locked menu items
// are explained by one line at the bottom of the menu (a disabled menu item can't hold a tooltip).

export function sendBlockedReason(template: Template, viewer: Viewer, sendingBlocked?: string) {
  const access = accessFor(template, viewer);
  if (!canEdit(access)) return lockReason.edit(template.owner);
  if (sendingBlocked) return sendingBlocked;
  if (template.status !== "active") return "Mark this template active first to send a batch";
  return undefined;
}

export function TemplateMenu({
  template,
  viewer,
  campaigns,
  showAnalytics = true,
  onToggleStatus,
  onCopy,
  onRequestDelete,
  onToast,
  triggerVariant = "ghost",
}: {
  template: Template;
  viewer: Viewer;
  campaigns: Campaign[];
  /** Hidden on the analytics page itself. */
  showAnalytics?: boolean;
  onToggleStatus: (id: string) => void;
  onCopy: (id: string, toCampaignId: string) => void;
  onRequestDelete: (t: Template) => void;
  onToast: (title: string, description?: string) => void;
  triggerVariant?: "ghost" | "outline";
}) {
  const access = accessFor(template, viewer);
  const edit = canEdit(access);
  const manage = canManage(access);
  const transfer = canTransfer(access, viewer);
  const note = !edit ? lockReason.edit(template.owner) : !manage ? lockReason.manage(template.owner) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={triggerVariant} size="icon-sm" aria-label={`More actions for ${template.name}`}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/templates/${template.id}/edit`}>
              {edit ? <PencilIcon /> : <EyeIcon />}
              {edit ? "Edit" : "View content"}
            </Link>
          </DropdownMenuItem>
          {showAnalytics && (
            <DropdownMenuItem asChild>
              <Link href={`/templates/${template.id}`}>
                <BarChart3Icon />
                View analytics
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={!manage}
            onSelect={() => onToast(`Share “${template.name}”`, "Pick teammates who may edit, send and automate it.")}
          >
            <Share2Icon />
            Share
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CopyIcon />
              Copy to…
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {campaigns.map((c) => (
                <DropdownMenuItem key={c.id} onSelect={() => onCopy(template.id, c.id)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem disabled={!manage} onSelect={() => onToast(`Activity log for “${template.name}”`, "Edits, sends, shares and schedule changes, newest first.")}>
            <HistoryIcon />
            View log
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!transfer} onSelect={() => onToast("Pick a new owner", "They get the template, its schedules and its results.")}>
            <UserRoundCogIcon />
            Transfer owner
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!edit} onSelect={() => onToggleStatus(template.id)}>
            <PowerIcon />
            {template.status === "active" ? "Mark inactive" : "Mark active"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" disabled={!manage} onSelect={() => onRequestDelete(template)}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {(note || !transfer) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {note ?? lockReason.transfer}
            </DropdownMenuLabel>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Send (to the batch wizard) and Automate buttons. */
export function SendButton({
  template,
  viewer,
  sendingBlocked,
  size = "sm",
}: {
  template: Template;
  viewer: Viewer;
  sendingBlocked?: string;
  size?: "sm" | "default";
}) {
  const reason = sendBlockedReason(template, viewer, sendingBlocked);
  return (
    <LockedTip reason={reason}>
      {reason ? (
        <Button variant="outline" size={size} disabled>
          <SendIcon data-icon="inline-start" />
          Send
        </Button>
      ) : (
        <Button variant="outline" size={size} asChild>
          <Link href={`/batches/new?template=${template.id}`}>
            <SendIcon data-icon="inline-start" />
            Send
          </Link>
        </Button>
      )}
    </LockedTip>
  );
}

export function AutomateButton({
  template,
  viewer,
  onOpen,
  label = false,
  size = "icon-sm",
}: {
  template: Template;
  viewer: Viewer;
  onOpen: () => void;
  /** Show the word next to the icon (detail page). */
  label?: boolean;
  size?: "icon-sm" | "sm" | "default";
}) {
  const edit = canEdit(accessFor(template, viewer));
  // Viewers may still open it to read the settings; the dialog is read-only for them.
  return (
    <Button
      variant={label ? "outline" : "ghost"}
      size={label ? (size === "icon-sm" ? "default" : size) : "icon-sm"}
      aria-label={label ? undefined : edit ? "Automate" : "View automation"}
      title={label ? undefined : edit ? "Automate: schedule and follow-up" : "View automation (read-only)"}
      onClick={onOpen}
    >
      <ZapIcon data-icon={label ? "inline-start" : undefined} />
      {label && "Automate"}
    </Button>
  );
}
