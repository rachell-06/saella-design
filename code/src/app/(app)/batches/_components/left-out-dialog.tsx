"use client";

import Link from "next/link";
import { REASON_LABEL } from "@/lib/mock/contacts";
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
import { BATCH_CAP, allBatches, batchTitle } from "@/lib/mock/batches";
import type { RefinedAudience } from "./recipient-check";

// "Review who is left out" (R1, 2026-10-29; HubSpot "Estimated recipients 2 out of 3 · review reasons").
// One section per reason that removes anyone, in the order the live app removes them; where the mock has the
// people (unreachable, Don't send to tags) the first few are named, the rest counted.

const SHOWN = 5;
const n = (x: number) => x.toLocaleString("en-US");

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
  const leftOut = audience.contacts - audience.recipients;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Who is left out</DialogTitle>
          <DialogDescription className="tabular-nums">
            {leftOut === 0
              ? `Everyone with these tags gets this email: ${n(audience.recipients)} people.`
              : `${n(leftOut)} of ${n(audience.contacts)} contacts won't get this email. Saella removes them before sending.`}
          </DialogDescription>
        </DialogHeader>

        {leftOut > 0 && (
          <div className="-mx-4 flex max-h-96 flex-col divide-y overflow-y-auto border-y">
            {audience.unreachable > 0 && (
              <Reason
                title="Can't be reached"
                count={audience.unreachable}
                note="Unsubscribed, bounced before, or an address that can't receive mail. Sending to them hurts your sender reputation."
              >
                <People
                  rows={audience.unreachablePeople.map((c) => ({
                    id: c.id,
                    name: `${c.firstName} ${c.lastName}`,
                    email: c.email,
                    why: c.unreachable ? REASON_LABEL[c.unreachable] : "",
                  }))}
                  total={audience.unreachable}
                />
              </Reason>
            )}
            {audience.duplicates > 0 && (
              <Reason
                title="Same mailbox as another contact"
                count={audience.duplicates}
                note="Each mailbox gets one email, even when several contacts share it."
              />
            )}
            {audience.alreadyReceived > 0 && (
              <Reason
                title="Already received this template"
                count={audience.alreadyReceived}
                note="Saella sends each template once per mailbox."
              >
                {earlier && (
                  <p className="text-sm text-muted-foreground">
                    They got it in{" "}
                    <Link
                      href={`/batches/${earlier.id}/report`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {batchTitle(earlier)}
                    </Link>
                    {earlier.sentAt &&
                      ` on ${formatDate(earlier.sentAt.slice(0, 10), true)}`}
                    .
                  </p>
                )}
              </Reason>
            )}
            {audience.excluded > 0 && (
              <Reason
                title="In “Don't send to”"
                count={audience.excluded}
                note={`Tagged ${excludeTags.map((t) => `“${t}”`).join(" or ")}.`}
              >
                <People
                  rows={audience.excludedPeople.map((c) => ({
                    id: c.id,
                    name: `${c.firstName} ${c.lastName}`,
                    email: c.email,
                    why: c.tags.filter((t) => excludeTags.some((x) => x.toLowerCase() === t.toLowerCase())).join(", "),
                  }))}
                  total={audience.excluded}
                />
              </Reason>
            )}
            {audience.truncated > 0 && (
              <Reason
                title={`Over the ${n(BATCH_CAP)} limit per batch`}
                count={audience.truncated}
                note="Send them in a second batch. People who already got this template are skipped automatically."
              />
            )}
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

function Reason({
  title,
  count,
  note,
  children,
}: {
  title: string;
  count: number;
  note: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-medium">{title}</h3>
        <span className="font-medium tabular-nums">−{n(count)}</span>
      </div>
      <p className="text-sm text-muted-foreground">{note}</p>
      {children}
    </section>
  );
}

function People({
  rows,
  total,
}: {
  rows: { id: string; name: string; email: string; why: string }[];
  total: number;
}) {
  const more = total - Math.min(SHOWN, rows.length);
  return (
    <ul className="flex flex-col divide-y rounded-lg border text-sm">
      {rows.slice(0, SHOWN).map((r) => (
        <li
          key={r.id}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 px-3 py-2"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{r.name}</span>
            <span className="truncate text-muted-foreground">{r.email}</span>
          </span>
          <span className="text-muted-foreground">{r.why}</span>
        </li>
      ))}
      {more > 0 && (
        <li className="px-3 py-2 text-muted-foreground tabular-nums">
          and {n(more)} more
        </li>
      )}
    </ul>
  );
}
