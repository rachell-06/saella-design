import Link from "next/link";
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, CircleAlertIcon, TriangleAlertIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Hint } from "@/components/saella/hint";

export type MetricDelta = {
  /** Already formatted, e.g. "+4.2 pts" or "−12%". */
  value: string;
  direction: "up" | "down";
  /** Whether this change is good news. A falling bounce rate is good. */
  good: boolean;
  /** Comparison period, e.g. "vs last 30 days". */
  period: string;
};

// Joined KPI strip: one bordered row of cells divided by hairlines, for a detail page's headline
// numbers (first used inline in campaigns/campaign-detail.tsx). A small
// delta can sit next to the number here
// (Overview made compact). A value from too small a sample is greyed
// and its note says so (BR-RULE-EC-21).
// The one KPI pattern for Overview, Campaigns and the batch report. Rates come from rateKpi
// (rate-meter.tsx): note "2,349 of 5,968 delivered", counts and threshold in a tooltip, warning/danger in
// soft-foreground text with an icon.
export function KpiStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn("grid auto-cols-fr grid-flow-col divide-x rounded-lg border", className)}>{children}</dl>;
}

export function KpiStripItem({
  label,
  value,
  note,
  delta,
  detail,
  muted = false,
  tone,
  loading = false,
  href,
  hrefLabel,
}: {
  label: string;
  /** Formatted value; undefined shows a dash. */
  value?: string;
  /** One short line under the number, e.g. "466 opened". */
  note?: string;
  /** Change vs a previous period, shown small next to the number; its period goes in the tooltip. */
  delta?: MetricDelta;
  /** Counts behind the number, shown on hover instead of an extra line (e.g. "2,349 opened"). */
  detail?: string;
  /** Grey number: too few to judge, or not available yet. */
  muted?: boolean;
  /** A value past a threshold (e.g. bounce ≥ 5% warning, ≥ 10% danger); shown with an icon, never colour alone. */
  tone?: "warning" | "danger";
  loading?: boolean;
  /** Makes the whole cell a link, e.g. to the people behind the number. */
  href?: string;
  /** Accessible name for the link; defaults to the label. */
  hrefLabel?: string;
}) {
  const flagged = tone && !muted && value;
  const Flag = tone === "danger" ? CircleAlertIcon : TriangleAlertIcon;
  const cell = (
    <div className={cn("group/kpi relative flex min-w-0 flex-col gap-1 px-4 py-3", href && "transition-colors first:rounded-l-lg last:rounded-r-lg hover:bg-muted/50")}>
      {href && (
        // A stretched link keeps dt/dd direct children of the cell (an <a> may not wrap them inside a <dl>).
        <Link href={href} scroll={false} aria-label={hrefLabel ?? label} className="absolute inset-0 rounded-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
      )}
      <dt className="truncate text-sm text-muted-foreground">{label}</dt>
      {loading ? (
        <dd>
          <Skeleton className="h-8 w-20" />
        </dd>
      ) : (
        <dd className="flex flex-wrap items-baseline gap-x-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-2xl font-semibold tracking-title tabular-nums",
              (muted || !value) && "text-subtle-foreground",
              flagged && (tone === "danger" ? "text-destructive-soft-foreground" : "text-warning-soft-foreground")
            )}
          >
            {flagged && <Flag aria-hidden className="size-5 shrink-0" />}
            {value ?? "–"}
            {flagged && <span className="sr-only">{tone === "danger" ? ", danger" : ", warning"}</span>}
          </span>
          {delta && value && !muted && <Delta delta={delta} />}
        </dd>
      )}
      {/* Same height as the note line, so the strip does not move when the numbers arrive. */}
      {note && loading && (
        <dd>
          <Skeleton className="my-0.5 h-4 w-28" />
        </dd>
      )}
      {note && !loading && (
        // Wraps rather than truncates: in a narrow strip "667 of 1,850 delivered" lost its last word.
        <dd className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
          <span className="min-w-0">{note}</span>
          {/* a linked cell says so before hover, with a small arrow that nudges on hover. */}
          {href && <ArrowRightIcon aria-hidden className="size-3.5 shrink-0 transition-transform group-hover/kpi:translate-x-0.5" />}
        </dd>
      )}
    </div>
  );
  if (!detail || loading) return cell;
  // Counts and threshold on hover or focus (shadcn Tooltip, not a native title).
  return (
    <Tooltip>
      <TooltipTrigger asChild>{cell}</TooltipTrigger>
      <TooltipContent className="max-w-64">{detail}</TooltipContent>
    </Tooltip>
  );
}

function Delta({ delta }: { delta: MetricDelta }) {
  const Arrow = delta.direction === "down" ? ArrowDownRightIcon : ArrowUpRightIcon;
  return (
    <Hint label={delta.period}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-sm font-medium tabular-nums",
          delta.good ? "text-success-soft-foreground" : "text-destructive-soft-foreground"
        )}
      >
        <Arrow aria-hidden className="size-4" />
        {delta.value}
        <span className="sr-only">{delta.period}</span>
      </span>
    </Hint>
  );
}
