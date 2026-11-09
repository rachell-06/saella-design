"use client";

import { WORKSPACE_TZ } from "@/lib/time";
import { useState } from "react";
import Link from "next/link";
import { BellIcon, Building2Icon, GlobeIcon, MailIcon, Share2Icon, UserPlusIcon } from "lucide-react";
import { type AppNotification, notifications as seed } from "@/lib/mock/workspace";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Header bell (PRD Notification, US-NTF-F, read 2026-10-28):
// - badge = unread count, capped at "9+" (AC-NTF-F-01); feed newest first, opening an item goes to its subject
//   (AC-NTF-F-02); reading an item marks it read, plus "Mark all read" (AC-NTF-F-03).
// - The PRD diagram also marks everything read when the panel opens; that contradicts AC-NTF-F-03, so we follow
//   the AC (only reading or "Mark all read" clears an item). Listed as an open question in the report.
// - The live app shows the 30 newest; the mock has five.
const ICONS: Record<AppNotification["kind"], typeof BellIcon> = {
  batch: MailIcon,
  campaign: Building2Icon,
  member: UserPlusIcon,
  domain: GlobeIcon,
  share: Share2Icon,
};

// Fixed "today" (same as the mock data) keeps relative times stable in screenshots.
const NOW = Date.parse("2026-10-27T05:00:00Z");

function ago(iso: string) {
  const mins = Math.max(1, Math.round((NOW - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: WORKSPACE_TZ });
}

export function NotificationsMenu({ items: initial = seed }: { items?: AppNotification[] }) {
  const [items, setItems] = useState(() => [...initial].sort((a, b) => b.at.localeCompare(a.at)));
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  const markRead = (id: string) => setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAll = () => setItems((list) => list.map((n) => ({ ...n, read: true })));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <BellIcon />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs leading-none font-semibold text-primary-foreground tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-96 flex-col gap-0 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <h2 className="font-medium">Notifications</h2>
          <Button variant="ghost" size="sm" onClick={markAll} disabled={unread === 0}>
            Mark all read
          </Button>
        </div>
        {items.length === 0 ? (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellIcon />
              </EmptyMedia>
              <EmptyTitle>No notifications yet</EmptyTitle>
              <EmptyDescription>Join requests, finished batches and domain changes show up here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <ul className="flex flex-col">
              {items.map((n) => {
                const Icon = ICONS[n.kind];
                const body = (
                  <>
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn("text-sm", n.read ? "text-muted-foreground" : "font-medium text-foreground")}>
                        {n.title}
                      </span>
                      <span className="text-sm text-muted-foreground">{n.body}</span>
                      <span className="text-xs text-subtle-foreground tabular-nums">{ago(n.at)}</span>
                    </span>
                    {/* Unread is a dot plus weight and the sr-only word, never colour alone. */}
                    {!n.read && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-hidden />
                    )}
                    {!n.read && <span className="sr-only">Unread</span>}
                  </>
                );
                const cls =
                  "flex w-full gap-3 border-b px-4 py-3 text-left outline-none last:border-b-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        className={cls}
                        onClick={() => {
                          markRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {body}
                      </Link>
                    ) : (
                      <button type="button" className={cls} onClick={() => markRead(n.id)}>
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className="border-t px-4 py-2.5">
          <Button variant="link" size="sm" className="h-auto px-0" asChild>
            <Link href="/settings/notifications" onClick={() => setOpen(false)}>
              Notification settings
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
