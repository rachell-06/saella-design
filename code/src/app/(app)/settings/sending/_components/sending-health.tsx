"use client";

import Link from "next/link";
import { CircleAlertIcon, CircleCheckIcon, PlayIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { PAUSE_BOUNCE, TODAY, allBatches } from "@/lib/mock/batches";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type HealthConfig, type HealthLevel, HEALTH_THRESHOLDS, HealthRing, scoreHealth } from "../../_components/health-score";
import { InfoTip, SectionHeader } from "../../_components/section-header";
import { Item } from "@/components/ui/item";

// Sending health (R16, learned from Apollo A8 Deliverability suite): the last 7 days across every sender, read
// against the workspace auto-pause limits, with one short line on what to do. Numbers come from the same
// batches as the reports, so the backend only needs the 7-day sums it already keeps for auto-pause.
// - Bounce over sent, complaints over delivered (same bases as the batch report).
// - Limits only count from 200 sends (BR-RULE-EC-18); below that the rates show but nothing is judged.
// - Health ring (designer 2026-11-12, as the live app's HealthCircle): one 0-100 score for the last 7 days, scored by
//   the live app's formula (../../_components/health-score.tsx). Ring (with its caption) and the coloured numbers all read the
//   same bands: bounce warning 5% / danger 10%, complaints warning 0.1% / danger 0.3%, delivery warning under 90%.
//   The text says the same as the colour (color is never the only signal).

/** Complaint auto-pause level. ĐX 2026-10-29: the PRD has no number; the batch report already says "pauses at 0.3%". */
export const PAUSE_COMPLAINT = 0.003;
/** Fewest sends in 7 days before a limit applies (BR-RULE-EC-18). */
export const PAUSE_MIN_SENDS = 200;

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
/** Live-app level to this screen's three states: danger = at the auto-pause level, warning = near it. */
const state = (l: HealthLevel): Level => (l === "danger" ? "paused" : l === "warning" ? "near" : "ok");

type Tone = "warning" | "danger";
const TONE: Record<Tone, string> = {
  warning: "text-warning-soft-foreground",
  danger: "text-destructive-soft-foreground",
};
const tone = (l: HealthLevel): Tone | undefined => (l === "danger" ? "danger" : l === "warning" ? "warning" : undefined);
const hintText = (l: HealthLevel, warn: string, danger?: string) =>
  l === "danger" && danger ? `Danger: ${danger} or more` : `Warning: ${warn}`;

export function SendingHealth({
  totals,
  paused,
  canManage,
  onResume,
  config = { verified: true, spf: true, dmarc: true },
}: {
  totals: HealthTotals;
  /** The workspace is auto-paused right now (the queue is held). */
  paused: boolean;
  canManage: boolean;
  onResume: () => void;
  /** The workspace domain's DNS posture, which feeds the score. */
  config?: HealthConfig;
}) {
  const header = (actions?: React.ReactNode) => (
    <SectionHeader
      id="health-title"
      title="Sending health"
      description="Last 7 days, all senders."
      info="Sending pauses if bounces or complaints hit a limit."
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

  const report = scoreHealth(
    { sends: totals.sent, delivered: totals.delivered, bounced: totals.bounces, complained: totals.complaints },
    config
  );
  const { bounce, complaint, delivery } = report.rates;
  const dims = report.dimensions;
  const early = totals.sent < PAUSE_MIN_SENDS;
  const bounceLevel = state(dims.bounce);
  const complaintLevel = state(dims.complaint);
  const overall: Level = paused ? "paused" : state(report.level);
  // The metric that drives the advice: the one closest to its danger level.
  const worst = bounce / HEALTH_THRESHOLDS.bounce.danger >= complaint / HEALTH_THRESHOLDS.complaint.danger ? "bounce" : "complaint";
  const deliveryOnly = overall === "near" && bounceLevel === "ok" && complaintLevel === "ok";
  const ringReport = paused && report.level !== "danger" ? { ...report, level: "danger" as const } : report;


  // One sentence on the page; the how-to sits behind ⓘ (DESIGN §2).
  const [advice, more]: [string, string?] =
    early && overall === "ok"
      ? [`Fewer than ${PAUSE_MIN_SENDS} sends this week, so the limits don't apply yet.`]
      : overall === "paused"
        ? [
            `${worst === "bounce" ? `Bounces reached ${pct(bounce)}` : `Spam complaints reached ${pct(complaint, 2)}`}, so new sends are on hold.`,
            `Remove the addresses that ${worst === "bounce" ? "bounced" : "complained"}, then resume.`,
          ]
        : overall === "near"
          ? deliveryOnly
            ? [
                `Delivery is ${pct(delivery)}, under the ${pct(HEALTH_THRESHOLDS.delivery.warn, 0)} warning level.`,
                "Check that the addresses you email are valid and in use.",
              ]
            : bounceLevel === "paused" || complaintLevel === "paused"
              ? // Resumed by an admin while the 7-day rate is still over: the next sends decide.
                [
                  `Sending resumed with ${worst === "bounce" ? `bounces at ${pct(bounce)}` : `spam complaints at ${pct(complaint, 2)}`}.`,
                  "If the next sends keep it over the limit, sending pauses again.",
                ]
              : worst === "bounce"
                ? [
                    `Bounces are at ${pct(bounce)}, past the ${pct(HEALTH_THRESHOLDS.bounce.warn, 0)} warning level.`,
                    `Remove dead addresses before the next batch. Sending pauses at ${pct(PAUSE_BOUNCE, 0)}.`,
                  ]
                : [
                    `Spam complaints are at ${pct(complaint, 2)}, past the ${pct(HEALTH_THRESHOLDS.complaint.warn)} warning level.`,
                    "Email only people who expect you; keep unsubscribe easy.",
                  ]
          : ["Well under both limits.", "Saella leaves out addresses that bounced or complained, so lists stay clean."];

  return (
    <section className="flex flex-col gap-4" aria-labelledby="health-title">
      {header()}
      <div className="rounded-card border">
        <div className="flex divide-x">
          <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-6 py-3">
            <HealthRing report={ringReport} />
            <span className="text-sm text-muted-foreground">
              {ringReport.level === "good" ? "Healthy" : ringReport.level === "warning" ? "At risk" : ringReport.level === "danger" ? "Critical" : "No score yet"}
            </span>
          </div>
          <dl className="grid min-w-0 flex-1 grid-cols-3 divide-x">
            <Cell
              label="Delivered"
              value={pct(delivery)}
              note={`${n(totals.delivered)}/${n(totals.sent)} sent`}
              level={dims.delivery}
              hint={hintText(dims.delivery, `under ${pct(HEALTH_THRESHOLDS.delivery.warn, 0)}`)}
            />
            <Cell
              label="Bounce rate"
              value={pct(bounce)}
              note={`${n(totals.bounces)} bounced · pauses at ${pct(PAUSE_BOUNCE, 0)}`}
              level={dims.bounce}
              hint={hintText(dims.bounce, `${pct(HEALTH_THRESHOLDS.bounce.warn, 0)} or more`, pct(HEALTH_THRESHOLDS.bounce.danger, 0))}
            />
            <Cell
              label="Spam complaints"
              value={pct(complaint, 2)}
              note={`${n(totals.complaints)} marked as spam · pauses at ${pct(PAUSE_COMPLAINT)}`}
              level={dims.complaint}
              hint={hintText(dims.complaint, `${pct(HEALTH_THRESHOLDS.complaint.warn)} or more`, pct(HEALTH_THRESHOLDS.complaint.danger))}
            />
          </dl>
        </div>
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

function Cell({ label, value, note, level, hint }: { label: string; value: string; note: string; level: HealthLevel; hint: string }) {
  const flagged = tone(level);
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
