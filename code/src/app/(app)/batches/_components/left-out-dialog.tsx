"use client";

import { SCROLL_DIALOG_LIST } from "@/lib/scroll";
import { useState } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import type { UnreachableReason } from "@/lib/mock/contacts";
import { formatDate } from "@/lib/mock/campaigns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BATCH_CAP, allBatches, batchTitle } from "@/lib/mock/batches";
import { cn } from "@/lib/utils";
import type { RefinedAudience } from "./recipient-check";

// "N skipped" (R1; HubSpot "Estimated recipients · review reasons"): one row per reason with its count, the biggest
// open first; a row opens to the people it names (where the mock has them), 50 at a time with "Show 50 more", so
// thousands stay usable. The longer "why" is one line under the open row. Order = the order the live app removes them.

const PAGE = 50;
const n = (x: number) => x.toLocaleString("en-US");

/** Short per-person reasons (the full sentences live in Leads › Self-upload). */
const SHORT: Record<UnreachableReason, string> = {
  bad_format: "Invalid address",
  no_mailbox: "Mailbox doesn't exist",
  low_quality: "Blocked after failures",
  complained: "Marked as spam",
  bounced: "Bounced before",
  flagged: "Flagged by you",
};

type Person = { id: string; name: string; email: string; why: string };
type Group = { key: string; title: string; count: number; note: React.ReactNode; people?: Person[] };

export function LeftOutDialog({
  open,
  onOpenChange,
  audience,
  templateId,
  excludeTags,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: RefinedAudience;
  templateId?: string;
  excludeTags: string[];
}) {
  const skipped = audience.contacts - audience.recipients;
  // The send that already reached these tags with this template, to link its report.
  const picked = new Set(audience.tags.map((t) => t.toLowerCase()));
  const earlier = allBatches()
    .filter(
      (b) =>
        b.templateId === templateId &&
        (b.status === "sent" || b.status === "sending") &&
        b.tags.some((t) => picked.has(t.toLowerCase())),
    )
    .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))[0];

  const groups: Group[] = [
    {
      key: "unreachable",
      title: "Can't be reached",
      count: audience.unreachable,
      note: "Unsubscribed, bounced or invalid. Sending to them hurts your sender reputation.",
      people: audience.unreachablePeople.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
        why: c.unreachable ? SHORT[c.unreachable] : "",
      })),
    },
    {
      key: "duplicates",
      title: "Same mailbox as another contact",
      count: audience.duplicates,
      note: "Each mailbox gets one email.",
    },
    {
      key: "received",
      title: "Already got this template",
      count: audience.alreadyReceived,
      note: earlier ? (
        <>
          In{" "}
          <Link href={`/batches/${earlier.id}/report`} className="text-primary underline-offset-4 hover:underline">
            {batchTitle(earlier)}
          </Link>
          {earlier.sentAt && ` on ${formatDate(earlier.sentAt.slice(0, 10), true)}`}.
        </>
      ) : (
        "Each template goes to a mailbox once."
      ),
    },
    {
      key: "excluded",
      title: "In “Don't send to”",
      count: audience.excluded,
      note: `Tagged ${excludeTags.map((t) => `“${t}”`).join(" or ")}.`,
      people: audience.excludedPeople.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
        why: c.tags.filter((t) => excludeTags.some((x) => x.toLowerCase() === t.toLowerCase())).join(", "),
      })),
    },
    {
      key: "cap",
      title: `Over ${n(BATCH_CAP)} per batch`,
      count: audience.truncated,
      note: "Send them in a second batch.",
    },
  ].filter((g) => g.count > 0);

  // Until the user picks a row, the first reason that names people is open (the others are counts and a line).
  const auto = groups.find((g) => (g.people?.length ?? 0) > 0)?.key ?? null;
  const [chosen, setOpenKey] = useState<string | null | undefined>(undefined);
  const openKey = chosen === undefined ? auto : chosen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="tabular-nums">{skipped === 0 ? "No one is skipped" : `${n(skipped)} skipped`}</DialogTitle>
          <DialogDescription className="tabular-nums">
            {skipped === 0
              ? `All ${n(audience.recipients)} get this email.`
              : `Of ${n(audience.contacts)} selected. Saella leaves them out before sending.`}
          </DialogDescription>
        </DialogHeader>

        {groups.length > 0 && (
          <div className="flex flex-col divide-y rounded-lg border">
            {groups.map((g) => (
              <ReasonRow
                key={g.key}
                group={g}
                open={openKey === g.key}
                onOpenChange={(o) => setOpenKey(o ? g.key : null)}
              />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReasonRow({
  group: g,
  open,
  onOpenChange,
}: {
  group: Group;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [shown, setShown] = useState(PAGE);
  const people = g.people ?? [];
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
        <ChevronRightIcon aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <span className="min-w-0 flex-1 font-medium">{g.title}</span>
        <span className="font-medium tabular-nums">{n(g.count)}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2 px-3 pb-3">
        <p className="ps-6 text-sm text-muted-foreground">{g.note}</p>
        {people.length > 0 && (
          <div className={cn("ms-6 flex flex-col rounded-md border", SCROLL_DIALOG_LIST)}>
            <ul className="divide-y text-sm">
              {people.slice(0, shown).map((p) => (
                // Two lines: name over email, the reason on the right.
                <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-3 py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{p.name || p.email}</span>
                    {p.name && <span className="truncate text-muted-foreground">{p.email}</span>}
                  </span>
                  <span className="text-muted-foreground">{p.why}</span>
                </li>
              ))}
            </ul>
            {people.length > shown && (
              <Button
                variant="ghost"
                size="sm"
                className="m-1 tabular-nums"
                onClick={() => setShown((x) => x + PAGE)}
              >
                Show {n(Math.min(PAGE, people.length - shown))} more · {n(shown)} of {n(people.length)}
              </Button>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
