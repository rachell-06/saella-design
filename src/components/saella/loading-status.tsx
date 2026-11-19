"use client";

import { useEffect, useState } from "react";
import { CircleAlertIcon, ClockIcon, RotateCwIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// The words of a long wait, used by SectionLoader and by pages that show the
// "Updating…" state of a revisit.

/** Estimated progress never claims done before the data is in. */
const ESTIMATE_CAP = 95;

/**
 * Status over a skeleton after 1s: the step, a progress bar with its percent, and how long it
 * takes, so people know how long to wait (designer 2026-11-14).
 * - `total` set (rows arriving page by page): real progress, "1,500 / 4,675 contacts · 32%". The demo has no real
 *   pages, so it advances one page at a time over `estimateMs`; in production `done` is the rows received.
 * - otherwise an estimate from the usual duration: ~90% at the usual time, then creeping toward 95%, never 100%
 *   until the data is in; "~62% · usually ~8s", then "Taking longer than usual".
 * The live region is always mounted so screen readers announce the step when it appears (the ticking numbers
 * are not announced).
 */
export function LoadingStatus({
  show,
  estimateMs = 8000,
  total,
  children,
}: {
  show: boolean;
  estimateMs?: number;
  total?: { count: number; unit: string; page?: number };
  children: React.ReactNode;
}) {
  const elapsed = useElapsed();
  let pct: number;
  let detail: string;
  if (total && total.count > 0) {
    const page = total.page ?? 500;
    const pages = Math.ceil(total.count / page);
    const done = Math.min(total.count, Math.floor((elapsed / estimateMs) * pages) * page);
    pct = Math.floor((done / total.count) * 100);
    detail = `${done.toLocaleString("en-US")} / ${total.count.toLocaleString("en-US")} ${total.unit}`;
  } else {
    const r = elapsed / estimateMs;
    pct = Math.floor(r <= 1 ? 90 * r : Math.min(ESTIMATE_CAP, 90 + 5 * (1 - Math.exp(-(r - 1)))));
    detail = r <= 1 ? `usually ~${Math.max(1, Math.round(estimateMs / 1000))}s` : "taking longer than usual";
  }
  const estimated = !(total && total.count > 0);
  return (
    <div
      className={cn(
        // Work in progress reads in the brand "running" family, like the Sending status (tokens.css status-sending).
        "flex w-full max-w-sm flex-col gap-2 rounded-lg border border-brand/25 bg-primary-subtle px-3 py-2.5 text-sm text-primary-soft-foreground shadow-card",
        !show && "sr-only"
      )}
    >
      <p aria-live="polite" className="flex items-center gap-2 font-medium">
        {show && (
          <>
            <Spinner
              aria-hidden
              role={undefined}
              aria-label={undefined}
              className="shrink-0 text-brand motion-reduce:animate-none"
            />
            <span className="min-w-0">{children}</span>
          </>
        )}
      </p>
      {show && (
        <>
          <Progress
            value={pct}
            aria-label={estimated ? "Estimated progress" : "Progress"}
            className="h-1.5 bg-brand/15 *:data-[slot=progress-indicator]:bg-brand *:data-[slot=progress-indicator]:transition-transform *:data-[slot=progress-indicator]:duration-300 motion-reduce:*:data-[slot=progress-indicator]:transition-none"
          />
          <p className="flex justify-between gap-3 text-xs tabular-nums">
            <span>{detail}</span>
            <span className="font-medium">
              {estimated && "~"}
              {pct}%
            </span>
          </p>
        </>
      )}
    </div>
  );
}

/** Milliseconds since mount, ticking every 200ms. Starts at 0 on the server and on hydration. */
function useElapsed() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => setElapsed(Date.now() - start), 200);
    return () => window.clearInterval(id);
  }, []);
  return elapsed;
}

/** Over 15s: the request may still finish, but say so and offer Retry. Sits over the skeleton. */
export function SectionStalled({ label, onRetry, className }: { label: string; onRetry: () => void; className?: string }) {
  return (
    <Alert variant="warning" className={cn("max-w-lg shadow-card", className)}>
      <ClockIcon />
      <AlertTitle>Still loading {label.toLowerCase()}</AlertTitle>
      <AlertDescription>Other sections still work. Try again, or keep waiting.</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCwIcon data-icon="inline-start" />
          Retry
        </Button>
      </AlertAction>
    </Alert>
  );
}

/** The request failed: an Alert in place of the section. */
export function SectionError({ title, onRetry, className }: { title: string; onRetry: () => void; className?: string }) {
  return (
    <Alert variant="destructive" className={className}>
      <CircleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>The rest of the page is up to date. Try again in a moment.</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCwIcon data-icon="inline-start" />
          Retry
        </Button>
      </AlertAction>
    </Alert>
  );
}

/** "Updating… · Updated 2 min ago": a revisit shows the earlier copy at once while a fresh one loads. */
export function UpdatedIndicator({
  refreshing,
  updatedAt,
  className,
}: {
  refreshing: boolean;
  updatedAt: number | null;
  className?: string;
}) {
  const now = useNow(refreshing);
  return (
    <p aria-live="polite" className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
      {refreshing && (
        <>
          <Spinner aria-hidden role={undefined} aria-label={undefined} className="size-3.5 text-brand motion-reduce:animate-none" />
          <span>Updating…</span>
          {updatedAt !== null && now !== null && <span>· Updated {ago(now - updatedAt)}</span>}
        </>
      )}
    </p>
  );
}

/** The time now, ticking every 30s while `on`; null until mounted (the server render has no clock). */
function useNow(on: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!on) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const every = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, [on]);
  return now;
}

function ago(ms: number) {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return `${h} h ago`;
}
