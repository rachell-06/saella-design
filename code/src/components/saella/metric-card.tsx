import Link from "next/link";
import {
  ArrowUpRightIcon,
  type LucideIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/saella/sparkline";
import { cn } from "@/lib/utils";

// KPI card (DESIGN.md §8.2). Layout learned from Studio Admin dashboard/crm KPI cards (user request 2026-10-28):
// label with an optional ↗ link to the detail, the number with its change as a tinted pill, then the previous
// value for comparison. The pill always has an arrow + text, so it never relies on color alone.
// 2026-10-29 (user request, Studio Admin default + e-commerce KPI cards): optional icon tile in the corner, a status
// pill (e.g. Good / Fair / Low) where there is no comparison to show, and a sparkline at the foot.
export type MetricDelta = {
  /** Already formatted, e.g. "+4.2 pts" or "−12%". */
  value: string;
  direction: "up" | "down";
  /** Whether this change is good news. A falling bounce rate is good. */
  good: boolean;
  /** Comparison period, e.g. "vs last 30 days". */
  period: string;
};

export type MetricStatus = {
  label: string;
  variant: "success" | "warning" | "destructive";
  title?: string;
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  status,
  spark,
  delta,
  previous,
  previousLabel = "previous period",
  href,
  note,
  hint,
  tone,
  loading = false,
  className,
}: {
  label: string;
  /** Formatted value. Pass null when there is no data yet. */
  value: string | null;
  /** Icon tile in the top-right corner (ignored when `href` is set: the ↗ link takes the corner). */
  icon?: LucideIcon;
  /** Pill next to the number with a reading of it, text + color. */
  status?: MetricStatus;
  /** Trend over the period, drawn under the note. */
  spark?: { values: (number | null)[]; color: string; label: string };
  delta?: MetricDelta;
  /** The same number for the comparison period, e.g. "42.3%"; shown as "42.3% previous period". */
  previous?: string;
  previousLabel?: string;
  /** Where the ↗ in the corner goes (the detail behind this number). */
  href?: string;
  /** One short reading of the number, e.g. "Above the 30–35% benchmark". */
  note?: string;
  /** Shown when value is null: why it is empty and what fills it. */
  hint?: string;
  /** Danger for a value past a limit (e.g. bounce at the auto-pause level). */
  tone?: "danger";
  loading?: boolean;
  className?: string;
}) {
  const Trend = delta?.direction === "down" ? TrendingDownIcon : TrendingUpIcon;

  return (
    <Card
      size="sm"
      className={cn("gap-3", className)}
      aria-busy={loading || undefined}
    >
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        {Icon && !href && (
          <CardAction className="grid size-7 place-items-center rounded-lg border bg-muted text-muted-foreground">
            <Icon aria-hidden className="size-4" />
          </CardAction>
        )}
        {href && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-xs"
              className="-mt-1 -mr-1 text-muted-foreground"
              asChild
            >
              <Link href={href} aria-label={`Details: ${label}`}>
                <ArrowUpRightIcon />
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {loading ? (
          <>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : value === null ? (
          <>
            <p className="text-3xl font-normal tracking-display text-subtle-foreground">
              –
            </p>
            {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "text-3xl leading-none font-medium tracking-display tabular-nums",
                  tone === "danger" && "text-destructive",
                )}
              >
                {value}
              </p>
              {status && (
                <Badge variant={status.variant} title={status.title}>
                  {status.label}
                </Badge>
              )}
              {delta && (
                <Badge
                  variant={delta.good ? "success" : "destructive"}
                  className="tabular-nums"
                  title={delta.period}
                >
                  <Trend aria-hidden data-icon="inline-start" />
                  {delta.value}
                  <span className="sr-only">{delta.period}</span>
                </Badge>
              )}
            </div>
            {previous && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">
                  {previous}
                </span>{" "}
                {previousLabel}
              </p>
            )}
            {note && <p className="text-sm text-muted-foreground">{note}</p>}
            {spark && <Sparkline {...spark} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}
