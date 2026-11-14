"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BellOffIcon,
  CircleAlertIcon,
  MailCheckIcon,
  MailIcon,
  MailOpenIcon,
  MailXIcon,
  MousePointerClickIcon,
  PencilIcon,
  ReplyIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { type ActivityEvent, type ActivityKind, contactActivity, formatEventTime, groupByMonth, summarize } from "./contact-activity";
import { type Contact, fmt, formatDate, useContactsStore } from "@/lib/mock/contacts";
import { invalidReason } from "./contact-book";
import { InvalidBadge } from "./email-safety";

// Contact profile in a Sheet (DESIGN.md §8.1: Sheet for contact detail; R8 2026-10-29, HubSpot H3 + Apollo A2).
// Details on top, then the email activity timeline: one line per event, grouped by month, newest first, with a
// one-line summary counted per batch. Each line links to the batch report. Preview: ?contact=<id> opens it,
// &activity=loading | empty | error forces a state. An Invalid address shows the badge and its reason.

export type ActivityState = "loading" | "empty" | "error";

const KIND: Record<ActivityKind, { verb: string; icon: React.ReactNode; tone: string }> = {
  delivered: { verb: "Received", icon: <MailCheckIcon />, tone: "bg-muted text-muted-foreground" },
  opened: { verb: "Opened", icon: <MailOpenIcon />, tone: "bg-info-soft text-info-soft-foreground" },
  clicked: { verb: "Clicked a link in", icon: <MousePointerClickIcon />, tone: "bg-info-soft text-info-soft-foreground" },
  replied: { verb: "Replied to", icon: <ReplyIcon />, tone: "bg-success-soft text-success-soft-foreground" },
  bounced: { verb: "Bounced:", icon: <MailXIcon />, tone: "bg-destructive-soft text-destructive-soft-foreground" },
  unsubscribed: { verb: "Unsubscribed from", icon: <BellOffIcon />, tone: "bg-warning-soft text-warning-soft-foreground" },
  complained: { verb: "Marked as spam:", icon: <ShieldAlertIcon />, tone: "bg-destructive-soft text-destructive-soft-foreground" },
};

export function ContactSheet({
  contact,
  activityState,
  onOpenChange,
  onEdit,
  onRetry,
}: {
  contact: Contact | null;
  /** Preview override; without it the activity is derived from the batches sent to this contact's tags. */
  activityState?: ActivityState;
  onOpenChange: (open: boolean) => void;
  onEdit: (contact: Contact) => void;
  onRetry: () => void;
}) {
  const c = contact;
  const { contacts: book } = useContactsStore();
  const events = useMemo(
    () => (c && !activityState ? contactActivity(c, book) : []),
    [c, activityState, book]
  );
  const name = c ? `${c.firstName} ${c.lastName}`.trim() : "";

  return (
    <Sheet open={c !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        {c && (
          <>
            <SheetHeader className="border-b pr-12">
              <SheetTitle>{name || c.email}</SheetTitle>
              <SheetDescription>{[c.position, c.company].filter(Boolean).join(" · ") || "No company"}</SheetDescription>
              {c.unreachable && (
                <div>
                  <InvalidBadge />
                </div>
              )}
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                <Fact label="Email">
                  {c.email}
                  {/* Invalid owes the reader a reason; Valid needs none (live app contact-status.ts). */}
                  {c.unreachable && <span className="block text-muted-foreground">{invalidReason(c)}</span>}
                </Fact>
                {c.phone && <Fact label="Phone">{c.phone}</Fact>}
                {c.tags.length > 0 && (
                  <Fact label="Tags">
                    <span className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </span>
                  </Fact>
                )}
                <Fact label="Added">{formatDate(c.addedOn)}</Fact>
              </dl>

              <Separator />

              <section aria-labelledby="ct-activity" className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 id="ct-activity" className="font-heading text-base font-medium">
                    Email activity
                  </h3>
                  {!activityState && events.length > 0 && <SummaryLine events={events} />}
                </div>
                <ActivityBody state={activityState ?? (events.length === 0 ? "empty" : undefined)} events={events} onRetry={onRetry} />
              </section>
            </div>

            <SheetFooter className="flex-row border-t">
              <Button variant="outline" onClick={() => onEdit(c)}>
                <PencilIcon data-icon="inline-start" />
                Edit contact
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SummaryLine({ events }: { events: ActivityEvent[] }) {
  const s = summarize(events);
  const parts = [
    `Received ${fmt(s.received)} ${s.received === 1 ? "batch" : "batches"}`,
    `opened ${fmt(s.opened)}`,
    s.clicked > 0 && `clicked ${fmt(s.clicked)}`,
    `replied ${fmt(s.replied)}`,
    s.bounced > 0 && `bounced ${fmt(s.bounced)}`,
  ].filter(Boolean);
  return <p className="text-sm text-muted-foreground tabular-nums">{parts.join(" · ")}</p>;
}

function ActivityBody({ state, events, onRetry }: { state?: ActivityState; events: ActivityEvent[]; onRetry: () => void }) {
  if (state === "loading") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading activity">
        <Skeleton className="h-4 w-56" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (state === "error") {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Activity didn&apos;t load</AlertTitle>
        <AlertDescription>Check your connection and try again.</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  if (state === "empty") {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MailIcon />
          </EmptyMedia>
          <EmptyTitle>No emails sent yet</EmptyTitle>
          <EmptyDescription>When a batch goes to this contact, deliveries, opens, clicks and replies show up here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groupByMonth(events).map((g) => (
        <section key={g.month} aria-label={g.month} className="flex flex-col gap-3">
          <h4 className="text-sm font-medium text-muted-foreground">{g.month}</h4>
          <ol className="flex flex-col">
            {g.events.map((e, i) => (
              <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                {/* Rail between icons; the last line of a month has none. */}
                {i < g.events.length - 1 && <span aria-hidden className="absolute top-8 bottom-1 left-3.5 w-px bg-border" />}
                <span
                  aria-hidden
                  className={cn("flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5", KIND[e.kind].tone)}
                >
                  {KIND[e.kind].icon}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                  <p className="text-sm">
                    {KIND[e.kind].verb} <span className="font-medium">“{e.template}”</span>
                  </p>
                  {e.url && <p className="truncate text-sm text-muted-foreground">{e.url}</p>}
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {formatEventTime(e.at)} ·{" "}
                    <Link href={`/batches/${e.batchId}/report`} className="underline-offset-4 hover:text-foreground hover:underline">
                      {e.batchTitle}
                    </Link>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 wrap-break-word">{children}</dd>
    </div>
  );
}
