"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Chart in a card with a time-range switch and an optional link to the full report (Studio Admin's "Customer
// Activity" card). The chart itself is passed as children: ChartContainer from ui/chart with chart-1..5 colors.
export type ChartRange = { value: string; label: string };

export function ChartCard({
  title,
  description,
  ranges,
  range,
  onRangeChange,
  reportHref,
  action,
  loading = false,
  children,
}: {
  title: string;
  description?: string;
  ranges?: ChartRange[];
  range?: string;
  onRangeChange?: (value: string) => void;
  /** Link to the full report page, e.g. "/reports/campaigns". */
  reportHref?: string;
  /** Any other control for the header's right side, used when there is no time-range switch. */
  action?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card aria-busy={loading || undefined}>
      <CardHeader>
        {/* A heading under the page's h1, so card titles show in the outline. */}
        <CardTitle className="font-heading text-base font-medium">
          <h2>{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && !ranges && <CardAction>{action}</CardAction>}
        {ranges && (
          <CardAction>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              aria-label="Time range"
              value={range}
              onValueChange={(v) => v && onRangeChange?.(v)}
            >
              {ranges.map((r) => (
                <ToggleGroupItem key={r.value} value={r.value}>
                  {r.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{loading ? <Skeleton className="h-64 w-full" /> : children}</CardContent>
      {reportHref && (
        <CardFooter>
          <Button variant="link" size="sm" className="px-0" asChild>
            <Link href={reportHref}>
              View report
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
