"use client";

import { SCROLL_POPOVER_LIST } from "@/lib/scroll";
import { WORKSPACE_TZ } from "@/lib/time";
import { NOW as MOCK_NOW } from "@/lib/mock/constants";
import { useState } from "react";
import Link from "next/link";
import { BellIcon, Building2Icon, CoinsIcon, GlobeIcon, MailIcon, Share2Icon, UserPlusIcon } from "lucide-react";
import { type AppNotification, notifications as seed } from "@/lib/mock/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item } from "@/components/ui/item";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Header bell (PRD Notification, US-NTF-F, read):
// - badge = unread count, capped at "9+" (AC-NTF-F-01); feed newest first, opening an item goes to its subject
//   (AC-NTF-F-02); reading an item marks it read, plus "Mark all read" (AC-NTF-F-03).
// - The PRD diagram also marks everything read when the panel opens; that contradicts AC-NTF-F-03, so we follow
//   the AC (only reading or "Mark all read" clears an item).
// - The live app shows the 30 newest; the mock has six. "credits" (a schedule waiting for credits) is not in the
//   PRD; it opens the template's Automation card, where that schedule has Buy credits.
const ICONS: Record<AppNotification["kind"], typeof BellIcon> = {
  batch: MailIcon,
  campaign: Building2Icon,
  member: UserPlusIcon,
  domain: GlobeIcon,
  share: Share2Icon,
  credits: CoinsIcon,
};

// The shared mock clock keeps relative times stable in screenshots.
const NOW = Date.parse(MOCK_NOW);

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
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const shown = filter === "unread" ? items.filter((n) => !n.read) : items;
  // New = unread, Earlier = read (Facebook's split); empty groups are left out.
  const groups = [
    { label: "New", items: shown.filter((n) => !n.read) },
    { label: "Earlier", items: shown.filter((n) => n.read) },
  ].filter((g) => g.items.length > 0);

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
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 leading-none tabular-nums">
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-96 flex-col gap-0 p-0"
        // Focus the panel, not Mark all read: no focus ring on a button nobody picked.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
      >
        {/* A heading, an All / Unread switch, "New" and "Earlier" groups, and per row an icon in a circle, the title, a
            two-line body and the time; unread rows carry the weight, an orange time and a dot. */}
        <div className="flex flex-col gap-3 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-title">Notifications</h2>
            <Button variant="ghost" size="sm" onClick={markAll} disabled={unread === 0}>
              Mark all read
            </Button>
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
            <TabsList variant="default" aria-label="Show">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread{unread > 0 && <span className="tabular-nums text-muted-foreground"> {unread}</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {shown.length === 0 ? (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellIcon />
              </EmptyMedia>
              <EmptyTitle>{items.length === 0 ? "No notifications yet" : "You're all caught up"}</EmptyTitle>
              <EmptyDescription>
                {items.length === 0
                  ? "Join requests, finished batches and domain changes show up here."
                  : "Nothing unread. Older notifications are under All."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className={cn("overflow-x-hidden pb-2", SCROLL_POPOVER_LIST)}>
            {groups.map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h3 className="px-4 pt-2 pb-1 text-sm font-medium">{g.label}</h3>
                <ul className="flex flex-col px-2">
                  {g.items.map((n) => {
                    const Icon = ICONS[n.kind];
                    const body = (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-full",
                            n.read ? "bg-muted text-muted-foreground" : "bg-primary-soft text-primary-soft-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className={cn("text-sm text-foreground", !n.read && "font-semibold")}>{n.title}</span>
                          <span className="line-clamp-2 text-sm text-muted-foreground">{n.body}</span>
                          <span
                            className={cn(
                              "text-xs tabular-nums",
                              // 12px metadata is muted-foreground at the faintest (DESIGN §5).
                              n.read ? "text-muted-foreground" : "font-medium text-primary-soft-foreground",
                            )}
                          >
                            {ago(n.at)}
                          </span>
                        </span>
                        {/* Unread is a dot plus weight and the sr-only word, never colour alone. */}
                        {!n.read && <span className="mt-3.5 size-2.5 shrink-0 rounded-full bg-brand" aria-hidden />}
                        {!n.read && <span className="sr-only">Unread</span>}
                      </>
                    );
                    // Item (shadcn) keeps the focus ring; inset rows with round corners, lit on hover / focus.
                    const cls =
                      "flex-nowrap items-start gap-3 rounded-lg border-0 px-2 py-2 text-left focus-visible:ring-inset hover:bg-muted [a]:hover:bg-muted focus-visible:bg-muted";
                    return (
                      <li key={n.id}>
                        <Item asChild className={cls}>
                          {n.href ? (
                            <Link
                              href={n.href}
                              onClick={() => {
                                markRead(n.id);
                                setOpen(false);
                              }}
                            >
                              {body}
                            </Link>
                          ) : (
                            <button type="button" onClick={() => markRead(n.id)}>
                              {body}
                            </button>
                          )}
                        </Item>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
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
