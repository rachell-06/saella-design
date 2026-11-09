"use client";

// "Recent replies" on Overview (ĐX R15, 2026-10-29, learned from Apollo A5 Home › Recent replies): who just answered,
// sorted by what the reply says, each row opening the batch report already filtered to that person's intent.
// Same people, same intents, same counts as the report's Recipients tab: both come from `withReplies` (R6), over
// the batches the page filters select, so the intent counts add up to the "N replied" on the Reply rate card.
// Apollo is a mailbox and has a Reply button; Saella is not (replies land at the reply-to address), so there is none.
// Colour only on the intent badges; the filter column stays neutral (fewer colours on Overview, 2026-10-29).
// Hierarchy pass (user feedback 2026-10-29: "no hierarchy, too much to read"): intents split into "Needs a reply"
// (meet, question) and "No action needed"; All replies lists the first group before the second. Each row is two
// lines, who + when, then what they said. The batch · template line was dropped (the row opens that batch's
// report), and the intent badge only shows under All replies, where it is not already the filter.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CircleAlertIcon, InboxIcon, RotateCwIcon } from "lucide-react";
import { type ReportBatch, batchTitle, recipientRows } from "@/lib/mock/batches";
import { INTENTS, type ReplyIntent, type ReplyRow, withReplies } from "@/lib/mock/replies";
import { formatDateTime } from "@/lib/mock/campaigns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";

const n = (x: number) => x.toLocaleString("en-US");
const ACTIONABLE: ReplyIntent[] = ["meet", "question"];
const isActionable = (i: ReplyIntent) => ACTIONABLE.includes(i);
const FILTER_GROUPS = [
  { label: "Needs a reply", items: INTENTS.filter((i) => isActionable(i.value)) },
  { label: "No action needed", items: INTENTS.filter((i) => !isActionable(i.value)) },
];
const PAGE = 5;

type RecentReply = { row: ReplyRow & { reply: NonNullable<ReplyRow["reply"]> }; batch: ReportBatch };

// One line quoted from the reply. The backend has no reply text yet: illustrative lines per intent. 2026-11-05: rows of
// the same intent take the pool in turn (see quotesFor), so neighbours never repeat a line, and the pools are wider.
const QUOTES: Record<ReplyIntent, string[]> = {
  meet: [
    "Thursday afternoon works for us. Can you send an invite?",
    "Happy to talk. Our purchasing lead will join the call too.",
    "Let's set up 30 minutes next week, any morning is fine.",
    "Could you visit our Hanoi showroom one day next week?",
    "Interesting timing, we are refitting two properties. Call me Friday?",
  ],
  question: [
    "Do you ship to Da Nang, and what is the minimum order?",
    "Could you send the price list for the 60×60 range?",
    "What lead time should we expect for 200 units?",
    "Are the glazes food-safe for restaurant use?",
    "Can you share photos of a hotel project you supplied?",
  ],
  ooo: [
    "I'm out of the office until Monday with limited access to email.",
    "Thanks for your email. I'm on leave and back on the 4th.",
    "Away at a trade fair this week, I'll reply when I'm back.",
  ],
  "not-interested": [
    "Thanks, but we already have a supplier for this.",
    "Not a fit for us right now. Please take us off your list.",
    "We just signed a two-year contract, maybe next year.",
  ],
  "wrong-person": [
    "I don't handle purchasing. Please contact our procurement team.",
    "Wrong contact, I moved to a different department last year.",
    "I've passed this on to our operations manager, Mr. Tuan.",
  ],
};

/** A quote per row: each intent starts at a stable offset, then the next row of that intent takes the next line. */
function quotesFor(rows: RecentReply[]): Map<string, string> {
  const next = new Map<ReplyIntent, number>();
  const out = new Map<string, string>();
  for (const { row } of rows) {
    const pool = QUOTES[row.reply.intent];
    let i = next.get(row.reply.intent);
    if (i === undefined) {
      i = 0;
      for (let c = 0; c < row.id.length; c++) i = (i * 31 + row.id.charCodeAt(c)) >>> 0;
    }
    out.set(row.id, pool[i % pool.length]);
    next.set(row.reply.intent, i + 1);
  }
  return out;
}

/** Every reply in these batches: those needing a reply first, then newest first. Only batches with replies are expanded into recipient rows. */
function collectReplies(batches: ReportBatch[]): RecentReply[] {
  const out: RecentReply[] = [];
  for (const batch of batches) {
    if (!batch.metrics?.replies) continue;
    for (const row of withReplies(batch, recipientRows(batch))) {
      if (row.reply) out.push({ row: row as RecentReply["row"], batch });
    }
  }
  return out.sort(
    (a, b) =>
      Number(isActionable(b.row.reply.intent)) - Number(isActionable(a.row.reply.intent)) ||
      b.row.reply.at.localeCompare(a.row.reply.at)
  );
}

const reportHref = (batchId: string, intent?: ReplyIntent | null) =>
  `/batches/${batchId}/report?tab=recipients&event=replied${intent ? `&intent=${intent}` : ""}`;

export function RecentReplies({
  batches,
  periodLabel,
  intent,
  onIntentChange,
  loading,
  error,
  onRetry,
}: {
  /** The batches the page filters select (campaign + time window), same list as the KPI cards. */
  batches: ReportBatch[];
  periodLabel: string;
  intent: ReplyIntent | null;
  onIntentChange: (intent: ReplyIntent | null) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const all = useMemo(() => collectReplies(batches), [batches]);
  const counts = useMemo(
    () => Object.fromEntries(INTENTS.map((i) => [i.value, all.filter((r) => r.row.reply.intent === i.value).length])) as Record<ReplyIntent, number>,
    [all]
  );
  const [limit, setLimit] = useState(PAGE);
  const matched = intent ? all.filter((r) => r.row.reply.intent === intent) : all;
  const shown = matched.slice(0, limit);
  const quotes = useMemo(() => quotesFor(matched), [matched]);
  // "View all" goes to a report only when it really holds all of them (one batch); across batches there is no
  // single page yet, so the list grows in place instead.
  const batchIds = new Set(matched.map((r) => r.batch.id));
  const oneBatch = batchIds.size === 1 ? matched[0].batch : null;

  function pick(next: ReplyIntent | null) {
    setLimit(PAGE);
    onIntentChange(next);
  }

  return (
    <Card aria-busy={loading || undefined}>
      <CardHeader>
        <CardTitle className="font-heading text-base font-medium">Recent replies</CardTitle>
        <CardDescription>
          People who answered your emails {periodLabel}. Replies that need an answer come first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleAlertIcon />
              </EmptyMedia>
              <EmptyTitle>Couldn&apos;t load replies</EmptyTitle>
              <EmptyDescription>Replies are still being collected. Try again in a moment.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RotateCwIcon data-icon="inline-start" />
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        ) : loading ? (
          <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {Array.from({ length: PAGE }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </div>
        ) : all.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon />
              </EmptyMedia>
              <EmptyTitle>No replies {periodLabel}</EmptyTitle>
              <EmptyDescription>
                Replies to the reply-to address show up here, sorted by intent. Most arrive within two days of sending.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          // Apollo layout: intent filter with counts on the left, the replies on the right.
          <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
            <div role="group" aria-label="Filter replies by intent" className="flex flex-col gap-3">
              <FilterButton label="All replies" count={all.length} pressed={intent === null} onClick={() => pick(null)} />
              {FILTER_GROUPS.map((g) => (
                <div key={g.label} className="flex flex-col gap-0.5">
                  <span className="px-2.5 pb-1 text-xs font-medium text-subtle-foreground">{g.label}</span>
                  {g.items.map((i) => (
                    <FilterButton
                      key={i.value}
                      label={i.label}
                      count={counts[i.value]}
                      pressed={intent === i.value}
                      onClick={() => pick(i.value)}
                    />
                  ))}
                </div>
              ))}
            </div>

            {matched.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No replies of this kind</EmptyTitle>
                  <EmptyDescription>Try another intent or All replies.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" size="sm" onClick={() => pick(null)}>
                    All replies
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="flex min-w-0 flex-col">
                <ItemGroup className="-mx-2 w-auto gap-0 has-data-[size=sm]:gap-0">
                  {shown.map(({ row, batch }, idx) => {
                    const meta = INTENTS.find((i) => i.value === row.reply.intent)!;
                    return (
                      <div key={row.id} className="contents">
                        {idx > 0 && <ItemSeparator className="mx-2 my-1 data-horizontal:w-auto" />}
                        <Item size="sm" asChild className="px-2 [a]:hover:bg-transparent">
                          <Link
                            href={reportHref(batch.id, row.reply.intent)}
                            aria-label={`${row.name}, ${row.company}: ${meta.label}. Open ${batchTitle(batch)} replies`}
                          >
                            <ItemContent className="min-w-0 gap-1">
                              <ItemTitle className="w-full">
                                <span className="truncate group-hover/item:underline">{row.name}</span>
                                <span className="truncate font-normal text-muted-foreground">{row.company}</span>
                                {intent === null && (
                                  <Badge variant={meta.variant} className="shrink-0">
                                    {meta.label}
                                  </Badge>
                                )}
                                <span className="ml-auto shrink-0 pl-3 text-sm font-normal text-muted-foreground tabular-nums">
                                  {formatDateTime(row.reply.at)}
                                </span>
                              </ItemTitle>
                              <ItemDescription className="truncate text-foreground">“{quotes.get(row.id)}”</ItemDescription>
                            </ItemContent>
                          </Link>
                        </Item>
                      </div>
                    );
                  })}
                </ItemGroup>
                <div className="mt-2 flex items-center justify-between gap-3 border-t pt-2">
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {n(shown.length)} of {n(matched.length)} {matched.length === 1 ? "reply" : "replies"}
                    {batchIds.size > 1 && ` from ${n(batchIds.size)} batches`}
                  </span>
                  {oneBatch ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={reportHref(oneBatch.id, intent)}>
                        View all in report
                        <ArrowRightIcon data-icon="inline-end" />
                      </Link>
                    </Button>
                  ) : (
                    matched.length > shown.length && (
                      <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE * 2)}>
                        Show {Math.min(PAGE * 2, matched.length - shown.length)} more
                      </Button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FilterButton({
  label,
  count,
  pressed,
  onClick,
}: {
  label: string;
  count: number;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={pressed}
      className="justify-between font-normal aria-pressed:bg-muted aria-pressed:font-medium"
      onClick={onClick}
    >
      {label}
      <span className="text-muted-foreground tabular-nums">{n(count)}</span>
    </Button>
  );
}
