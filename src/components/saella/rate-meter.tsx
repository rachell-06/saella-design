import { CircleAlertIcon, TriangleAlertIcon } from "lucide-react";
import { TableCell } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Email rates: a plain number, the count behind it grey in brackets
// ("38.3% (467)"), the denominator in a tooltip. Only Bounce and Delivery are ever coloured, from RATE_BANDS below,
// always with an icon and the threshold in the tooltip. Under 20 sends the number is grey: too few to judge.
// Use RateCell in tables (one left-aligned column per rate), RateValue inline, rateKpi for a KpiStripItem.

/** Workspace auto-pause level (PRD-02: 10% bounces over 7 days). */
export const BOUNCE_ALERT = 0.1;

const LOW_SAMPLE = "too few to judge";

export type RateKind = "delivery" | "open" | "click" | "reply" | "unsub" | "bounce";
/** good · fair = warning · poor = danger. */
export type RateBand = "good" | "fair" | "poor";

export const RATE_LABELS: Record<RateKind, string> = {
  delivery: "Delivery",
  open: "Open",
  click: "Click",
  reply: "Replied",
  unsub: "Unsub",
  bounce: "Bounce",
};

/**
 * Cut points (0–1 ratios), copied from the live app (Repo src/lib/email/health.ts HEALTH_THRESHOLDS, which mirrors
 * AWS SES reputation limits): bounce warning from 5%, danger from 10% (the auto-pause
 * level); delivery warning under 90%, never danger. Open, click, reply and unsubscribe have no threshold in the
 * live app or the PRD, so they are never flagged.
 */
export const RATE_BANDS: Partial<Record<RateKind, { warn: number; danger?: number; higherIsBetter: boolean }>> = {
  delivery: { warn: 0.9, higherIsBetter: true },
  bounce: { warn: 0.05, danger: BOUNCE_ALERT, higherIsBetter: false },
};

/** Undefined when the rate has no threshold. */
export function rateBand(kind: RateKind, r: number): RateBand | undefined {
  const b = RATE_BANDS[kind];
  if (!b) return undefined;
  const bad = (x: number) => (b.higherIsBetter ? r < x : r >= x);
  if (b.danger !== undefined && bad(b.danger)) return "poor";
  return bad(b.warn) ? "fair" : "good";
}

const pctText = (r: number) => `${(r * 100).toFixed(1)}%`;

export function bandHint(kind: RateKind, band: RateBand | undefined) {
  const b = RATE_BANDS[kind];
  if (!b || !band) return "";
  const p = (x: number) => `${+(x * 100).toFixed(1)}%`;
  if (b.higherIsBetter) return band === "good" ? `Good: ${p(b.warn)} or more` : `Warning: under ${p(b.warn)}`;
  if (band === "poor") return `Danger: ${p(b.danger!)} or more`;
  return band === "fair" ? `Warning: ${p(b.warn)} or more` : `Good: under ${p(b.warn)}`;
}

const num = (x: number) => x.toLocaleString("en-US");

/** What the denominator counts, for the KPI note "2,349 of 5,968 delivered". */
const DENOMINATOR: Record<RateKind, "delivered" | "sent"> = {
  delivery: "sent",
  open: "delivered",
  click: "delivered",
  reply: "delivered",
  unsub: "delivered",
  bounce: "sent",
};
const PAST: Record<RateKind, string> = {
  delivery: "delivered",
  open: "opened",
  click: "clicked",
  reply: "replied",
  unsub: "unsubscribed",
  bounce: "bounced",
};

export type RateFlag = "warning" | "danger";

export type RateInfo = {
  /** "38.3%", or undefined when nothing was sent. */
  text?: string;
  /** Fewer than 20 sends: grey, never flagged. */
  low: boolean;
  /** Only Bounce and Delivery past their threshold. */
  flag?: RateFlag;
  /** KPI note: "2,349/5,968 delivered"; bounce and delivery "/N sent". */
  note: string;
  /** Tooltip: counts, denominator and, when flagged, the threshold. */
  detail: string;
};

export function rateInfo(kind: RateKind, part: number, whole: number): RateInfo {
  // X/Y under a rate: shorter than "X of Y"; the unit word stays so the base is clear.
  const note = `${num(part)}/${num(whole)} ${DENOMINATOR[kind]}`;
  if (!whole) return { low: true, note, detail: "Nothing sent yet" };
  const r = part / whole;
  const low = whole < 20;
  const band = low ? undefined : rateBand(kind, r);
  const flag: RateFlag | undefined = band === "poor" ? "danger" : band === "fair" ? "warning" : undefined;
  const counts = `${num(part)} ${PAST[kind]} of ${num(whole)} ${DENOMINATOR[kind]}`;
  // One short line: counts, then the band only when flagged. The 10% bounce auto-pause is stated
  // where it acts (Settings › Sending health, the paused alert), not on every cell.
  return {
    text: pctText(r),
    low,
    flag,
    note,
    detail: low ? `${counts} · ${LOW_SAMPLE}` : flag ? `${counts} · ${bandHint(kind, band)}` : counts,
  };
}

const flagTone: Record<RateFlag, string> = {
  warning: "text-warning-soft-foreground",
  danger: "text-destructive-soft-foreground",
};
const FlagIcon = { warning: TriangleAlertIcon, danger: CircleAlertIcon } satisfies Record<RateFlag, unknown>;

/** Props for a KpiStripItem showing one rate, so every page words and colours it the same way. */
export function rateKpi(kind: RateKind, part: number, whole: number) {
  const i = rateInfo(kind, part, whole);
  return { value: i.text, note: whole ? i.note : undefined, muted: i.low, tone: i.flag, detail: i.detail };
}

/** "38.3% (467)"; a tooltip only when flagged or too few sends. Renders nothing when nothing was sent (empty cell, §2). */
export function RateValue({
  kind,
  part,
  whole,
  strong = false,
  className,
}: {
  kind: RateKind;
  part: number;
  whole: number;
  /** The rate a table is ranked by, in medium weight. */
  strong?: boolean;
  className?: string;
}) {
  if (!whole) return null;
  const i = rateInfo(kind, part, whole);
  const Icon = i.flag ? FlagIcon[i.flag] : null;
  const value = (
        <span
          // Flagged values take focus so the threshold is reachable from the keyboard.
          tabIndex={i.flag ? 0 : undefined}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm whitespace-nowrap tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring",
            i.low ? "text-subtle-foreground" : i.flag ? flagTone[i.flag] : "text-foreground",
            className
          )}
        >
          {Icon && <Icon aria-hidden className="size-3.5 shrink-0" />}
          <span className={cn(strong && !i.low && "font-medium")}>{i.text}</span>
          <span className={i.low ? "text-subtle-foreground" : "text-muted-foreground"}>({num(part)})</span>
          {i.flag && <span className="sr-only">{i.flag === "danger" ? ", danger" : ", warning"}</span>}
        </span>
  );
  // A tooltip only where it says something the cell can't (too many hovers on numbers):
  // a flagged rate (the threshold) or too few sends. Plain cells explain themselves; the denominator lives in
  // the column header or KPI caption.
  if (!i.flag && !i.low) return value;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{value}</TooltipTrigger>
      <TooltipContent className="max-w-64">{i.detail}</TooltipContent>
    </Tooltip>
  );
}

/** One rate as a left-aligned table cell. */
export function RateCell({ className, ...props }: React.ComponentProps<typeof RateValue>) {
  return (
    <TableCell className={className}>
      <RateValue {...props} />
    </TableCell>
  );
}
