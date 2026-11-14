"use client";

import { useCallback, useEffect, useState } from "react";
import { delay } from "@/lib/mock/delay";
import { cn } from "@/lib/utils";
import { LoadingStatus, SectionError, SectionStalled } from "./loading-status";

// Loading one data section of a page on its own (PATTERNS.md §9.17). The page frame (PageHeader, toolbar, card
// headers) renders at once; each section (KPI strip, chart, table) waits on its own, so fast ones show first.
//   0s     skeleton shaped like the real section (same count, size, columns), aria-busy on the region
//   1s     a status line over the skeleton: the step, a progress bar with its percent, and how long it takes
//          (designer 2026-11-14: real data loads slower than the demo; say how long to wait). Real percent when the
//          work can be counted (rows arriving page by page), else an estimate from the usual duration that stops
//          at 95% until the data is in (LoadingStatus)
//   15s    an Alert with Retry over the skeleton; the request may still finish
//   error  an Alert with Retry in place of the section; sections that loaded stay
//   revisit in the same session: the section shows at once, with "Updating… · Updated 2 min ago" (UpdatedIndicator)
// The demo computes mock data at once; this hook only times the wait. In production `load` would fetch and the
// cache would hold the data, not only the time it arrived.

export const SLOW_AFTER_MS = 1000;
export const STALLED_AFTER_MS = 15000;

/** waiting: under 1s · slow: 1–15s, show the status line and progress · stalled: over 15s, offer Retry. */
export type LoadStage = "waiting" | "slow" | "stalled";

export type SectionLoad = {
  /** loading: nothing to show yet · ready: show the section (maybe refreshing) · error: show the Alert. */
  status: "loading" | "ready" | "error";
  stage: LoadStage;
  /** Showing the session's earlier copy while a fresh one loads. */
  refreshing: boolean;
  /** When the copy on screen arrived (ms), for "Updated 2 min ago". */
  updatedAt: number | null;
  retry: () => void;
  /** Changes on every try, so the progress restarts on Retry. */
  attemptKey: string;
  /** How long this load usually takes (ms), for the estimated progress and "usually ~8s". */
  estimateMs: number;
  /** What is being counted, when the load can be counted (rows arriving page by page): real progress. */
  total?: LoadTotal;
};

/** A countable load: `count` items of `unit` (plural), arriving in pages of `page`. */
export type LoadTotal = { count: number; unit: string; page?: number };

/** The usual duration when none is known (preview ?state=loading). */
const SLOW_DELAY_DEFAULT = 8000;

// Session cache: when each section key last loaded. Module memory, so a reload starts empty.
const loadedAt = new Map<string, number>();

export function useSectionLoad(
  /** Section + everything its data depends on, e.g. `overview:kpis:campaign:30:all`. */
  key: string,
  {
    delayMs = 0,
    fail,
    forceLoading = false,
    estimateMs,
    total,
  }: {
    /** Simulated wait (lib/mock/delay.ts). 0 = ready at once, as without slow mode. */
    delayMs?: number;
    /** Simulated failure on the first try: `error` fails after the wait, `stall` never answers. Retry succeeds. */
    fail?: "error" | "stall";
    /** Preview ?state=loading: stay on the skeleton. */
    forceLoading?: boolean;
    /** How long it usually takes. In production: from past loads of this section; the demo uses the delay. */
    estimateMs?: number;
    /** Set when the rows can be counted as they arrive: the status shows "1,500 / 4,675 contacts" and a real percent. */
    total?: LoadTotal;
  } = {}
): SectionLoad {
  const [attempt, setAttempt] = useState(0);
  const token = `${key}#${attempt}`;
  const [result, setResult] = useState<{ token: string; status: "ready" | "error"; at: number } | null>(null);
  const [stageOf, setStageOf] = useState<{ token: string; stage: LoadStage } | null>(null);
  const instant = delayMs === 0 && !fail;
  const settled = result?.token === token;

  // The simulated request.
  useEffect(() => {
    if (instant || forceLoading) return;
    let live = true;
    const failing = attempt === 0 ? fail : undefined;
    if (failing !== "stall") {
      void delay(delayMs).then(() => {
        if (!live) return;
        const at = Date.now();
        if (failing === "error") {
          setResult({ token: `${key}#${attempt}`, status: "error", at });
        } else {
          loadedAt.set(key, at);
          setResult({ token: `${key}#${attempt}`, status: "ready", at });
        }
      });
    }
    return () => {
      live = false;
    };
  }, [key, attempt, delayMs, fail, instant, forceLoading]);

  // Stage timers while the request is out.
  useEffect(() => {
    if (instant || settled) return;
    const t = `${key}#${attempt}`;
    const slow = window.setTimeout(() => setStageOf({ token: t, stage: "slow" }), SLOW_AFTER_MS);
    const stalled = window.setTimeout(() => setStageOf({ token: t, stage: "stalled" }), STALLED_AFTER_MS);
    return () => {
      window.clearTimeout(slow);
      window.clearTimeout(stalled);
    };
  }, [key, attempt, instant, settled]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const stage = stageOf?.token === token ? stageOf.stage : "waiting";
  const extra = { attemptKey: token, estimateMs: estimateMs ?? (delayMs || SLOW_DELAY_DEFAULT), total };

  if (instant && !forceLoading)
    return { status: "ready", stage: "waiting", refreshing: false, updatedAt: null, retry, ...extra };
  if (settled && !forceLoading)
    return { status: result.status, stage, refreshing: false, updatedAt: result.at, retry, ...extra };
  // Still loading: the session's earlier copy, if any, shows at once (read in render: it is only written in the
  // browser, so the server render and hydration both see it empty).
  const earlier = forceLoading ? undefined : loadedAt.get(key);
  if (earlier !== undefined) return { status: "ready", stage, refreshing: true, updatedAt: earlier, retry, ...extra };
  return { status: "loading", stage, refreshing: false, updatedAt: null, retry, ...extra };
}

/** The states of several sections as one, for a page-level UpdatedIndicator. */
export function combineLoads(loads: SectionLoad[]) {
  const refreshing = loads.filter((l) => l.refreshing);
  const times = refreshing.map((l) => l.updatedAt).filter((t): t is number => t !== null);
  return { refreshing: refreshing.length > 0, updatedAt: times.length ? Math.min(...times) : null };
}

/**
 * One section's region: the skeleton while loading (status line with progress after 1s, Alert + Retry after 15s), an Alert
 * in place of the section on error, the section itself when ready. The skeleton must match the real section's
 * size so nothing moves when the data arrives.
 */
export function SectionLoader({
  load,
  label,
  skeleton,
  status,
  errorTitle,
  className,
  alertClassName,
  statusAt = "center",
  children,
}: {
  load: SectionLoad;
  /** What the section is, for the region's name and the Alerts, e.g. "Send volume". */
  label: string;
  /** Same layout as the loaded section: same cells, height, columns and rows. */
  skeleton: React.ReactNode;
  /** The status line after 1s: the step being done (the bar, percent and time are added). */
  status: string;
  /** Alert title on error; default "<label> didn't load". */
  errorTitle?: string;
  className?: string;
  /** Where the status line and the 15s Alert sit over the skeleton: centre, or near the top of a tall group. */
  statusAt?: "center" | "top";
  /** Extra classes for the error Alert, e.g. side margins inside a flush card. */
  alertClassName?: string;
  children: React.ReactNode;
}) {
  const loading = load.status === "loading";
  return (
    <div role="region" aria-label={label} aria-busy={loading || load.refreshing || undefined} className={cn("min-w-0", className)}>
      {load.status === "error" ? (
        <SectionError title={errorTitle ?? `${label} didn't load`} onRetry={load.retry} className={alertClassName} />
      ) : loading ? (
        <div className="relative">
          {skeleton}
          <div className={cn("pointer-events-none absolute inset-0 flex justify-center p-3", statusAt === "top" ? "items-start pt-28" : "items-center")}>
            {load.stage === "stalled" ? (
              <SectionStalled label={label} onRetry={load.retry} className="pointer-events-auto" />
            ) : (
              <LoadingStatus
                key={load.attemptKey}
                show={load.stage === "slow"}
                estimateMs={load.estimateMs}
                total={load.total}
              >
                {status}
              </LoadingStatus>
            )}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
