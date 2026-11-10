"use client";

import Link from "next/link";
import { CircleAlertIcon, CircleCheckIcon, PlayIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { PAUSE_BOUNCE, TODAY, allBatches } from "@/lib/mock/batches";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type RateBand, bandHint, rateBand } from "@/components/saella/rate-meter";
import { cn } from "@/lib/utils";
import { InfoTip, SectionHeader } from "../../_components/section-header";
import { Item } from "@/components/ui/item";

// Sending health (R16, learned from Apollo A8 Deliverability suite): the last 7 days across every sender, read
// against the workspace auto-pause limits, with one short line on what to do. Numbers come from the same
// batches as the reports, so the backend only needs the 7-day sums it already keeps for auto-pause.
// - Bounce over sent, complaints over delivered (same bases as the batch report).
// - Limits only count from 200 sends (BR-RULE-EC-18); below that the rates show but nothing is judged.
// - No bars (2026-11-05): a bar drawn against the limit didn't match its number. The number shows with "pauses at",
//   bounce and delivery coloured by RATE_BANDS (DESIGN §2); the badge text says the same thing (color is never the only signal).

/** Complaint auto-pause level. ĐX 2026-10-29: the PRD has no number; the batch report already says "pauses at 0.3%". */
export const PAUSE_COMPLAINT = 0.003;
/** Fewest sends in 7 days before a limit applies (BR-RULE-EC-18). */
export const PAUSE_MIN_SENDS = 200;
/** "Near limit" from this share of a limit. ĐX 2026-10-29. */
const NEAR = 0.7;

export type HealthTotals = { sent: number; delivered: number; bounces: number; complaints: number };

const DAY = 86_400_000;

/** Sums of every batch sent in the 7 days up to today (mock clock). */
export function last7Days(): HealthTotals {
  const since = new Date(`${TODAY}T23:59:59Z`).getTime() - 7 * DAY;
  const t: HealthTotals = { sent: 0, delivered: 0, bounces: 0, complaints: 0 };
  for (const b of allBatches()) {
    if (!b.metrics || !b.sentAt || new Date(b.sentAt).getTime() < since) continue;
    t.sent += b.sent;
    t.delivered += b.metrics.delivered;
    t.bounces += b.metrics.bounces;
    t.complaints += b.metrics.complaints;
  }
  return t;
}

/** Preview numbers for ?state=near-limit and ?state=paused (illustrative). */
export const PREVIEW_HEALTH: Record<"near-limit" | "paused", HealthTotals> = {
  "near-limit": { sent: 2140, delivered: 1957, bounces: 183, complaints: 4 },
  paused: { sent: 2410, delivered: 2159, bounces: 251, complaints: 5 },
};

type Level = "ok" | "near" | "paused";

const n = (x: number) => x.toLocaleString("en-US");
const pct = (r: number, digits = 1) => `${(r * 100).toFixed(digits)}%`;
const level = (r: number, limit: number): Level => (r >= limit ? "paused" : r >= limit * NEAR ? "near" : "ok");

const TONE: Record<Exclude<RateBand, "good">, string> = {
  fair: "text-warning-soft-foreground",
  poor: "text-destructive-soft-foreground",
};

export function SendingHealth({
  totals,
  paused,
  canManage,
  onResume,
}: {
  totals: HealthTotals;
  /** The workspace is auto-paused right now (the queue is held). */
  paused: boolean;
  canManage: boolean;
  onResume: () => void;
}) {
  const header = (actions?: React.ReactNode) => (
    <SectionHeader
      id="health-title"
      title="Sending health"
      description="Last 7 days, all senders."
      info="Sending pauses on its own if bounces or spam complaints reach a limit."
      actions={actions}
    />
  );

  if (totals.sent === 0) {
    return (
      <section className="flex flex-col gap-4" aria-labelledby="health-title">
        {header()}
        <Item variant="outline" className="justify-between gap-3 rounded-card px-4 py-3 text-[length:inherit]">
          <p className="text-muted-foreground">
            Nothing sent in the last 7 days. Delivery, bounce and complaint rates show up here after your next batch.
          </p>
          <Button variant="outline" asChild>
            <Link href="/batches/new">
              <PlusIcon data-icon="inline-start" />
              New batch
            </Link>
          </Button>
        </Item>
      </section>
    );
  }

  const judged = totals.sent >= PAUSE_MIN_SENDS;
  const bounce = totals.bounces / totals.sent;
  const complaint = totals.delivered > 0 ? totals.complaints / totals.delivered : 0;
  const bounceLevel: Level = judged ? level(bounce, PAUSE_BOUNCE) : "ok";
  const complaintLevel: Level = judged ? level(complaint, PAUSE_COMPLAINT) : "ok";
  const overall: Level = paused ? "paused" : bounceLevel !== "ok" || complaintLevel !== "ok" ? "near" : "ok";
  // The metric that drives the advice: the one closest to its limit.
  const worst = bounce / PAUSE_BOUNCE >= complaint / PAUSE_COMPLAINT ? "bounce" : "complaint";

  const badge =
    overall === "paused" ? (
      <Badge variant="destructive">Paused</Badge>
    ) : overall === "near" ? (
      <Badge variant="warning">Near limit</Badge>
    ) : (
      <Badge variant="success">OK</Badge>
    );

  // One sentence on the page; the how-to sits behind ⓘ (DESIGN §2).
  const [advice, more]: [string, string?] = !judged
    ? [`Fewer than ${PAUSE_MIN_SENDS} sends this week, so the limits don't apply yet.`]
    : overall === "paused"
      ? [
          `${worst === "bounce" ? `Bounces reached ${pct(bounce)}` : `Spam complaints reached ${pct(complaint, 2)}`}, so new sends are on hold.`,
          `Scheduled batches wait in the queue. Remove the addresses that ${worst === "bounce" ? "bounced" : "complained"}, then resume.`,
        ]
      : overall === "near"
        ? bounceLevel === "paused" || complaintLevel === "paused"
          ? // Resumed by an admin while the 7-day rate is still over: the next sends decide.
            [
              `Sending resumed with ${worst === "bounce" ? `bounces at ${pct(bounce)}` : `spam complaints at ${pct(complaint, 2)}`}.`,
              "If the next sends keep it over the limit, sending pauses again.",
            ]
          : worst === "bounce"
            ? [`Bounces are close to the ${pct(PAUSE_BOUNCE, 0)} limit.`, "Before the next batch, check its lists and remove addresses that no longer exist."]
            : [
                `Spam complaints are close to the ${pct(PAUSE_COMPLAINT)} limit.`,
                "Send only to people who expect to hear from you, and keep the unsubscribe link easy to find.",
              ]
        : ["Well under both limits.", "Saella leaves out addresses that bounced or complained, so lists stay clean."];

  return (
    <section className="flex flex-col gap-4" aria-labelledby="health-title">
      {header(badge)}
      <div className="rounded-card border">
        <dl className="grid grid-cols-3 divide-x">
          <Cell
            label="Delivered"
            value={pct(totals.delivered / totals.sent)}
            note={`${n(totals.delivered)} of ${n(totals.sent)} sent`}
            band={judged ? rateBand("delivery", totals.delivered / totals.sent) : undefined}
            hint={bandHint("delivery", rateBand("delivery", totals.delivered / totals.sent))}
          />
          <Cell
            label="Bounce rate"
            value={pct(bounce)}
            note={`${n(totals.bounces)} bounced · pauses at ${pct(PAUSE_BOUNCE, 0)}`}
            band={judged ? rateBand("bounce", bounce) : undefined}
            hint={bandHint("bounce", rateBand("bounce", bounce))}
          />
          <Cell
            label="Spam complaints"
            value={pct(complaint, 2)}
            note={`${n(totals.complaints)} marked as spam · pauses at ${pct(PAUSE_COMPLAINT)}`}
          />
        </dl>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-4 py-3">
          {overall === "ok" ? (
            <CircleCheckIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <CircleAlertIcon
              className={cn(
                "size-4 shrink-0",
                overall === "paused" ? "text-destructive-soft-foreground" : "text-warning-soft-foreground"
              )}
              aria-hidden
            />
          )}
          <p className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground">
            {advice}
            {more && <InfoTip label="What to do">{more}</InfoTip>}
          </p>
          {overall !== "ok" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/contacts">Review lists</Link>
              </Button>
              {overall === "paused" &&
                (canManage ? (
                  <Button variant="outline" size="sm" onClick={onResume}>
                    <PlayIcon data-icon="inline-start" />
                    Resume sending
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">Only an admin can resume.</span>
                ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Cell({
  label,
  value,
  note,
  band,
  hint,
}: {
  label: string;
  value: string;
  note: string;
  /** RATE_BANDS band; only "fair" / "poor" colour the number, with an icon and the threshold on hover. */
  band?: RateBand;
  hint?: string;
}) {
  const flagged = band && band !== "good" ? band : undefined;
  const number = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-2xl leading-none font-medium tracking-display tabular-nums",
        flagged && TONE[flagged]
      )}
    >
      {flagged && <TriangleAlertIcon className="size-5" aria-hidden />}
      {value}
    </span>
  );
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex flex-col gap-1.5">
        {flagged ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="w-fit rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                {number}
              </span>
            </TooltipTrigger>
            <TooltipContent>{hint}</TooltipContent>
          </Tooltip>
        ) : (
          number
        )}
        <span className="text-sm text-muted-foreground">{note}</span>
      </dd>
    </div>
  );
}
