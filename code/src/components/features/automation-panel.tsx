"use client";

import { SCROLL_DIALOG_LIST } from "@/lib/scroll";
import { Fragment, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  ClockIcon,
  CornerDownRightIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  FastForwardIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/mock/campaigns";
import { TODAY } from "@/lib/mock/constants";
import { spendCredits, useCreditBalance } from "@/lib/mock/credits";
import { creditsUsd } from "@/lib/mock/pricing";
import { useTemplateStore } from "@/lib/mock/use-template-store";
import { campaignOffReason, liveStatus } from "@/components/features/activation";
import {
  type Viewer,
  accessFor,
  canEdit,
  findTemplate,
  lockReason,
  viewerFor,
} from "@/lib/mock/templates";
import { StatusBadge } from "@/components/saella/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  type Run,
  type Schedule,
  type ScheduleState,
  automation,
  cadenceAt,
  delayLabel,
  flowTriggerLabel,
  nextRun,
  scheduleProgress,
  scheduleState,
  tzLabel,
  useAutomation,
} from "@/components/features/automation";
import { ScheduleDialog } from "@/components/features/automate-dialog";
import { LockedTip } from "@/components/saella/locked-tip";
import { DeleteAutomationDialog, FollowUpDialog } from "@/components/features/follow-up-dialog";
import { TopUpDialog } from "@/components/features/top-up-dialog";

// A template's automation, one source for every screen: two tabs, Schedule and Follow-up, the tab's action on the
// right. Schedule lists one card per schedule; Follow-up is a table in a bordered frame (PATTERNS 9.1 "Bảng trong
// section card"). Used inside the Automation card on the template page and inside AutomateDialog.
// Live app: TemplateAutomateModal (a schedules table and a flows table in one modal).

const divider = "border-r border-border/50 last:border-r-0";
const tableFrame = "overflow-hidden rounded-lg border";
const n = (x: number) => x.toLocaleString("en-US");

/** "Automate · <template>": the AutomationPanel in a dialog, live app TemplateAutomateModal. */
export function AutomateDialog({
  templateId,
  open,
  onOpenChange,
  viewer,
}: {
  templateId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  viewer?: Viewer;
}) {
  const found = findTemplate(templateId);
  if (!found) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Only the schedules / follow-ups scroll: title, tabs + action and Done stay put. */}
      <DialogContent className="flex flex-col overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Automate · {found.template.name}</DialogTitle>
          <DialogDescription className="sr-only">Schedules and follow-ups of this template</DialogDescription>
        </DialogHeader>
        <AutomationPanel templateId={templateId} viewer={viewer} fill />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AutomationPanel({
  templateId,
  viewer,
  title,
  fill = false,
}: {
  templateId: string;
  /** Defaults to the signed-in user (admin in the mock). */
  viewer?: Viewer;
  /** Row above the tabs, with the action on its right, e.g. the card title on the template page. */
  title?: React.ReactNode;
  /** In a dialog: take the free height and scroll the list only (tabs and action stay). */
  fill?: boolean;
}) {
  const found = findTemplate(templateId);
  const access = found ? accessFor(found.template, viewer ?? viewerFor(null)) : "viewer";
  const mayEdit = canEdit(access);
  const lockedReason = found && !mayEdit ? lockReason.edit(found.template.owner) : undefined;
  // Ended or archived campaign: the reason, or undefined while it runs.
  const ended = found ? campaignOffReason(templateId) : undefined;
  const campaignStartsOn = found?.campaign.startsOn;
  const templates = useTemplateStore();
  const inactive = found ? liveStatus(templateId, found.template.status, templates) === "inactive" : false;
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // Which schedule / follow-up the dialog opens; null = a new one.
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [flowId, setFlowId] = useState<string | null>(null);
  const openSchedule = (id: string | null) => {
    setScheduleId(id);
    setScheduleOpen(true);
  };
  // Two tabs: Schedule and Follow-up. Sources: live app TemplateAutomateModal (schedules table:
  // Schedule / Status / Sent / Next run / edit, delete; one schedule per template; flows table: Flow / Steps / Sent /
  // Status / edit, delete), TemplateAutomationRows (Send from), PRD-02 AC-EC-A-01..07, AC-EC-F-01..07, BR-RULE-EC-31..33,
  // EC-EC-25. No per-step sent count or follow-up open/click rates: neither the PRD nor the live app has them.
  const store = useAutomation();
  // Names as of now (renamed, deleted this session).
  const nameOf = (id: string) => findTemplate(id)?.template.name;
  const schedules = store.schedules
    .filter((x) => x.templateId === templateId)
    .sort((x, y) => (x.status === "completed" ? 1 : 0) - (y.status === "completed" ? 1 : 0));
  // The flow this template starts (AC-EC-F-01), and flows that use it as a step.
  const flows = store.flows.filter((f) => f.templateId === templateId || f.steps.some((st) => st.templateId === templateId));
  const [tab, setTab] = useState<"schedule" | "follow-up">("schedule");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(flows.map((f) => f.id)));
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ kind: "schedule" | "flow"; id: string } | null>(null);

  const balance = useCreditBalance();
  const gmt = (tz: string) => tzLabel(tz).match(/\((GMT[^)]*)\)/)?.[1] ?? tzLabel(tz);
  // Several schedules and follow-ups per template (the live app allows one of each: its POST refuses a second schedule
  // and the engine dedupes per template; open question in decisions.md). One running schedule at a time: Set schedule
  // opens again once the running one is paused.
  const running = schedules.find((x) => x.status === "active");
  const scheduleReason =
    lockedReason ??
    (ended
      ? ended
      : inactive
        ? "Mark it active in the editor to schedule it"
        : running
          ? "Pause the current schedule to set a new one"
          : undefined);
  const followUpReason = lockedReason;
  const toggle = (id: string) =>
    setExpanded((x) => {
      const next = new Set(x);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const emptyState = (title: string, body: string) => (
    <div className="flex flex-col items-center gap-1 rounded-lg border py-8 text-center text-sm">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );

  const tabs = (
    <TabsList aria-label="Automation">
      <TabsTrigger value="schedule">
        Schedule <span className="text-muted-foreground tabular-nums">{schedules.length}</span>
      </TabsTrigger>
      <TabsTrigger value="follow-up">
        Follow-up <span className="text-muted-foreground tabular-nums">{flows.length}</span>
      </TabsTrigger>
    </TabsList>
  );
  const action =
    tab === "schedule" ? (
      <LockedTip reason={scheduleReason}>
        {scheduleReason ? (
          <Button variant="outline" size="sm" disabled>
            <ClockIcon data-icon="inline-start" />
            Set schedule
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => openSchedule(null)}>
            <ClockIcon data-icon="inline-start" />
            Set schedule
          </Button>
        )}
      </LockedTip>
    ) : (
      <LockedTip reason={followUpReason}>
        <Button
          variant="outline"
          size="sm"
          disabled={Boolean(followUpReason)}
          onClick={() => {
            setFlowId(null);
            setFollowUpOpen(true);
          }}
        >
          <CornerDownRightIcon data-icon="inline-start" />
          Add follow-up
        </Button>
      </LockedTip>
    );

  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className={cn("gap-3", fill && "min-h-0 flex-1")}>
        {/* With a title (template page): row 1 = title + the tab's action, row 2 = the tabs.
            Without (Automate dialog, its title names it): tabs and action share one row. */}
        {title ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              {title}
              {action}
            </div>
            {tabs}
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {tabs}
            {action}
          </div>
        )}
        <div className={fill ? "-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1" : undefined}>
          <TabsContent value="schedule">
            {schedules.length === 0 ? (
              emptyState("No schedule", "Send this template to the campaign's matches, run after run.")
            ) : (
              <ul aria-label="Schedules of this template" className="flex flex-col gap-3">
                {schedules.map((sc) => (
                  <ScheduleCard
                    key={sc.id}
                    schedule={sc}
                    templateId={templateId}
                    templateName={found?.template.name ?? ""}
                    state={scheduleState(sc, balance, campaignStartsOn)}
                    balance={balance}
                    next={nextRun(sc, campaignStartsOn)}
                    startsOn={campaignStartsOn}
                    gmt={gmt(sc.timezone)}
                    held={ended ? ended : inactive ? "Waits until the template is active again" : undefined}
                    resumeReason={
                      sc.status !== "paused"
                        ? undefined
                        : (lockedReason ?? (running ? "Pause the running schedule to resume this one" : undefined))
                    }
                    onResume={() => {
                      automation.saveSchedule({ ...sc, status: "active" });
                      toast.success("Schedule resumed");
                    }}
                    menu={
                      <RowMenu
                        label="Schedule"
                        mayEdit={mayEdit}
                        lockedReason={lockedReason}
                        onEdit={sc.status === "completed" ? undefined : () => openSchedule(sc.id)}
                        paused={sc.status === "completed" ? undefined : sc.status === "paused"}
                        resumeBlocked={sc.status === "paused" && Boolean(running)}
                        onTogglePause={() => {
                          automation.saveSchedule({ ...sc, status: sc.status === "paused" ? "active" : "paused" });
                          toast.success(sc.status === "paused" ? "Schedule resumed" : "Schedule paused");
                        }}
                        onDelete={() => setToDelete({ kind: "schedule", id: sc.id })}
                        onRunNow={sc.status === "active" ? () => runNow(sc, balance, campaignStartsOn) : undefined}
                      />
                    }
                  />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="follow-up">
            {flows.length === 0 ? (
              emptyState("No follow-up", "Send more emails after this one, step by step, based on what each person did.")
            ) : (
              <div className={tableFrame}>
                <Table aria-label="Follow-ups of this template" className="table-fixed [&_td]:px-3 [&_th]:px-3">
                  <colgroup>
                    <col />
                    <col className="w-56" />
                    <col className="w-20" />
                    <col className="w-28" />
                    <col className="w-14" />
                  </colgroup>
                  <TableHeader className="bg-table-head">
                    <TableRow>
                      <TableHead className={divider}>Flow</TableHead>
                      <TableHead className={divider}>Trigger</TableHead>
                      <TableHead className={divider}>Sent</TableHead>
                      <TableHead className={divider}>Status</TableHead>
                      <TableHead className={divider}>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flows.map((f) => {
                      const open = expanded.has(f.id);
                      const own = f.templateId === templateId;
                      return (
                        <Fragment key={f.id}>
                          <TableRow className={cn(open && "border-b-0")}>
                            <TableCell className={divider}>
                              <span className="flex min-w-0 items-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-expanded={open}
                                  aria-label={open ? "Hide triggers" : "Show triggers"}
                                  onClick={() => toggle(f.id)}
                                >
                                  <ChevronRightIcon className={cn("transition-transform", open && "rotate-90")} />
                                </Button>
                                {/* Live app names a flow by what it starts from; it has no name of its own. */}
                                <span className="truncate font-medium">
                                  After {own ? "this template" : <Link href={`/templates/${f.templateId}`} className="underline-offset-4 hover:underline">{nameOf(f.templateId)}</Link>}
                                </span>
                              </span>
                            </TableCell>
                            {/* What starts the flow: step 1's trigger and wait. Later steps show when the row is opened; "+N" says how many. */}
                            <TableCell className={cn(divider, "tabular-nums")}>
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate">
                                  {f.steps[0]
                                    ? `${flowTriggerLabel(f.steps[0].trigger)}, after ${delayLabel(f.steps[0].delayHours)}`
                                    : "–"}
                                </span>
                                {f.steps.length > 1 && (
                                  <Badge variant="secondary" className="shrink-0">
                                    +{f.steps.length - 1}
                                  </Badge>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className={cn(divider, "tabular-nums")}>{n(f.sent)}</TableCell>
                            <TableCell className={divider}>
                              <StatusBadge status={f.status === "paused" ? "paused" : "active"} />
                            </TableCell>
                            <TableCell className={cn(divider, "px-1 text-right")}>
                              {own && (
                                <RowMenu
                                  label="Follow-up"
                                  mayEdit={mayEdit}
                                  lockedReason={lockedReason}
                                  onEdit={() => {
                                    setFlowId(f.id);
                                    setFollowUpOpen(true);
                                  }}
                                  paused={f.status === "paused"}
                                  onTogglePause={() => {
                                    automation.saveFlow({ ...f, status: f.status === "paused" ? "active" : "paused" });
                                    toast.success(f.status === "paused" ? "Follow-up resumed" : "Follow-up paused");
                                  }}
                                  onDelete={() => setToDelete({ kind: "flow", id: f.id })}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                          {open &&
                            f.steps.map((st, i) => {
                              const name = nameOf(st.templateId);
                              return (
                                <TableRow key={`${f.id}-${i}`} className={cn(i < f.steps.length - 1 && "border-b-0")}>
                                  <TableCell className={divider} colSpan={2}>
                                    <span className="flex min-w-0 items-center gap-2 pl-9">
                                      <CornerDownRightIcon aria-hidden className="size-4 shrink-0 text-brand" />
                                      <span className="shrink-0 text-muted-foreground tabular-nums">Trigger {i + 1}</span>
                                      {name ? (
                                        <Link href={`/templates/${st.templateId}`} className="truncate font-medium underline-offset-4 hover:underline">
                                          {name}
                                        </Link>
                                      ) : (
                                        // EC-EC-25: the step's template was deleted, so the flow stops advancing here.
                                        <span className="text-destructive-soft-foreground">Template deleted, flow stops here</span>
                                      )}
                                      {st.templateId === templateId && (
                                        <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
                                          This template
                                        </Badge>
                                      )}
                                      <span className="truncate text-muted-foreground">
                                        · {flowTriggerLabel(st.trigger)}, after {delayLabel(st.delayHours)}
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className={divider} />
                                  <TableCell className={divider} />
                                  <TableCell className={divider} />
                                </TableRow>
                              );
                            })}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <ScheduleDialog templateId={templateId} scheduleId={scheduleId} open={scheduleOpen} onOpenChange={setScheduleOpen} viewer={viewer} />
      <FollowUpDialog templateId={templateId} flowId={flowId} open={followUpOpen} onOpenChange={setFollowUpOpen} viewer={viewer} />

      <DeleteAutomationDialog
        kind={toDelete?.kind ?? "schedule"}
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => {
          if (toDelete?.kind === "flow") automation.deleteFlow(toDelete.id);
          else if (toDelete) automation.deleteSchedule(toDelete.id);
          toast.success(toDelete?.kind === "flow" ? "Follow-up deleted" : "Schedule deleted");
          setToDelete(null);
        }}
      />
    </>
  );
}

/** Demo only ("run it until the credits run out"): plays a schedule's next run as the engine
 *  would — unlocked companies first, then each locked one unlocked for a credit. A run the balance can't pay for
 *  doesn't go (the card shows Waiting for credits); the last one completes the schedule. */
function runNow(sc: Schedule, balance: number, startsOn?: string) {
  const p = scheduleProgress(sc, startsOn);
  if (p.nextCount <= 0) return;
  if (p.nextCredits > balance) {
    toast.warning("Not enough credits for this run", { description: `It needs ${n(p.nextCredits)}; you have ${n(balance)}.` });
    return;
  }
  if (p.nextCredits > 0) spendCredits(p.nextCredits, { kind: "unlock", label: `Schedule run: unlocked ${n(p.nextCredits)} companies` });
  const sentCount = sc.sentCount + p.nextCount;
  const done = sentCount >= p.total;
  automation.saveSchedule({
    ...sc,
    sentCount,
    ...(done ? { status: "completed" as const, completedReason: "target_reached" as const, completedOn: TODAY } : {}),
  });
  toast.success(`Run sent to ${n(p.nextCount)} companies`, {
    description: p.nextCredits > 0 ? `${n(p.nextCredits)} credits used.` : "No credits used.",
  });
}

/**
 * One schedule as a card: "<template> · <cadence at time>", a status badge, "Sent to X of ~N companies" with a bar,
 * and one line by state. Running: what the next run reaches and may cost. Waiting for credits: how many more credits
 * the next run needs, and Buy credits (it runs again by itself). Completed: reached every match, or the campaign
 * ended; "See who it reached" opens the template's All recipients. Paused: the next-run line muted, and how to
 * resume. Runs, segments, run list and top-up all come from scheduleProgress.
 */
function ScheduleCard({
  schedule: sc,
  templateId,
  templateName,
  state,
  balance,
  next,
  startsOn,
  gmt,
  held,
  resumeReason,
  onResume,
  menu,
}: {
  schedule: Schedule;
  templateId: string;
  templateName: string;
  state: ScheduleState;
  balance: number;
  next: string | null;
  /** The campaign's first day: runs don't start before it. */
  startsOn?: string;
  gmt: string;
  /** Why the next run won't go out: the template is inactive, or its campaign has ended. */
  held?: string;
  /** Paused only: why Resume is off (no edit access, or another schedule of the template is running). */
  resumeReason?: string;
  onResume: () => void;
  menu: React.ReactNode;
}) {
  const p = scheduleProgress(sc, startsOn);
  const reachedAll = sc.completedReason === "target_reached";
  const share = p.total > 0 ? (sc.sentCount / p.total) * 100 : 0;
  const runsDone = p.done.length;
  const runs = runsDone + p.remaining.length;
  const [topUp, setTopUp] = useState(false);
  // Credits each run still to go needs, next first: the same runs the bar and the run list show.
  const runCosts = p.remaining.map((r) => r.credits);
  const [runsOpen, setRunsOpen] = useState(false);
  // Short next-run line: when, how many, what it costs. The run size shows only when there's no bar to show it (a
  // one-run schedule not sent yet); otherwise the segments and the run list carry it.
  const showCount = runs <= 1 && sc.sentCount === 0;
  const nextLine = (
    <>
      Next{next && state === "running" ? ` ${next}` : " run"} ·{" "}
      {showCount && `${n(p.nextCount)} ${p.nextCount === 1 ? "company" : "companies"} · `}
      {p.nextCredits > 0 ? `${n(p.nextCredits)} credits (${creditsUsd(p.nextCredits)})` : "no credits"}
    </>
  );
  const badge = {
    running: "schedule-running",
    waiting: "schedule-waiting",
    paused: "schedule-paused",
    completed: "schedule-completed",
  } as const;
  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4" aria-label={`${templateName} schedule`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <ClockIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          {/* No template name: the card sits under that template already. */}
          <p className="min-w-0 truncate font-medium">
            {cadenceAt(sc)} <span className="font-normal text-muted-foreground">{gmt}</span>
          </p>
          <StatusBadge status={badge[state]} />
        </div>
        <div className="-my-1 shrink-0">{menu}</div>
      </div>

      {/* A one-run schedule that hasn't sent yet has no progress to show (the next-run line says it). */}
      {!(showCount && state !== "completed") && (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
          <span>
            {reachedAll ? (
              <>Sent to all {n(p.total)} matches</>
            ) : (
              <>
                <span className="font-medium">{n(sc.sentCount)}</span>
                <span className="text-muted-foreground"> of {n(p.total)} companies sent</span>
              </>
            )}
          </span>
          {/* The run count opens the run list, only once the schedule is completed; before that it's plain text. One run:
              the share instead. */}
          {runs > 1 && state !== "completed" ? (
            <span className="text-muted-foreground tabular-nums">
              {n(runsDone)} of {n(runs)} runs sent
            </span>
          ) : runs > 1 ? (
            <Button
              variant="ghost"
              size="xs"
              // Buttons are never 12px (DESIGN.md §5): the compact height, body-size text.
              className="-my-1 -mr-2 text-sm font-normal text-muted-foreground"
              aria-expanded={runsOpen}
              onClick={() => setRunsOpen((o) => !o)}
            >
              {n(runsDone)} of {n(runs)} runs sent
              <ChevronDownIcon data-icon="inline-end" className={cn("transition-transform", runsOpen && "rotate-180")} />
            </Button>
          ) : (
            <span className="text-muted-foreground">{Math.floor(share)}%</span>
          )}
        </div>
        {/* One segment per run: done runs filled, the next one tinted (outlined in amber when it waits for credits), the
            rest empty. Past 30 runs the segments would be slivers, so it's one bar again. */}
        {runs > 1 && runs <= 30 ? (
          <div
            role="progressbar"
            aria-label="Runs sent"
            aria-valuemin={0}
            aria-valuemax={runs}
            aria-valuenow={runsDone}
            aria-valuetext={`${n(runsDone)} of ${n(runs)} runs sent`}
            className="flex gap-1"
          >
            {Array.from({ length: runs }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  // Only runs sent are filled, in brand orange (not green, so the Running badge stands out). The next or waiting run is
                  // told by the badge and the line below, not the bar.
                  i < runsDone ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        ) : (
          <Progress value={share} aria-label="Sent so far" className="[&>[data-slot=progress-indicator]]:bg-primary" />
        )}
      </div>
      )}

      {state === "running" && (
        <p className="text-sm text-muted-foreground tabular-nums">
          {nextLine}
          {held && <span className="text-warning-soft-foreground"> · {held}</span>}
        </p>
      )}

      {state === "waiting" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* One line, the shortfall only: the badge already says it waits, the Top up dialog shows prices. */}
          <p className="min-w-0 text-sm text-warning-soft-foreground tabular-nums">
            Next run needs {n(Math.max(p.nextCredits - balance, 0))} more credits
          </p>
          {/* Top up here, not on Billing: the card turns Running once it's paid for. Outline: the page's one solid button is
              elsewhere (DESIGN.md §2). */}
          <Button variant="outline" size="sm" onClick={() => setTopUp(true)}>
            Buy credits
          </Button>
        </div>
      )}

      {state === "paused" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground tabular-nums">{nextLine}</p>
          {/* Resume right on the card. Outline: the page's one solid button is elsewhere (DESIGN.md §2). */}
          <LockedTip reason={resumeReason}>
            <Button variant="outline" size="sm" disabled={Boolean(resumeReason)} onClick={onResume}>
              <PlayIcon data-icon="inline-start" />
              Resume
            </Button>
          </LockedTip>
        </div>
      )}

      {state === "completed" && (
        <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground tabular-nums">
          <span>
            {sc.completedReason === "campaign_ended"
              ? `Completed when the campaign ended${sc.completedOn ? `, ${formatDate(sc.completedOn)}` : ""}.`
              : `Completed${sc.completedOn ? ` ${formatDate(sc.completedOn)}` : ""}.`}{" "}
          </span>
          {/* To the template's All recipients: who it reached and what they did. */}
          <Button variant="link" className="h-auto border-0 p-0" asChild>
            {/* Scrolls on every click: the hash alone doesn't change on a second click, so no hashchange fires. */}
            <Link
              href={`/templates/${templateId}#recipients`}
              onClick={() => document.getElementById("recipients")?.scrollIntoView({ block: "start" })}
            >
              See who it reached
            </Link>
          </Button>
        </p>
      )}

      {/* Outside the Waiting block: paying turns the card Running, and the dialog must close, not vanish. */}
      <TopUpDialog open={topUp} onOpenChange={setTopUp} runCosts={runCosts} />
      {runs > 1 && state === "completed" && runsOpen && <RunList schedule={sc} done={p.done} remaining={p.remaining} state={state} startsOn={startsOn} />}
    </li>
  );
}

/** The runs of a schedule, collapsed under the bar (a timeline, one row per run). Same runs as the bar
 *  (scheduleProgress). Dates (mock: no run log yet) walk the schedule's run days: a completed schedule back from the
 *  day it completed; otherwise back from its next run day for sent runs; the runs to go carry their own day from
 *  scheduleProgress (on the shared sender, past this month's limit they land next month, as in the dialog's RunPlan).
 *  A paused schedule has no next run day, so the runs to go show none. Unlocked companies go first, so the early runs
 *  cost nothing. */
function RunList({
  schedule: sc,
  done,
  remaining,
  state,
  startsOn,
}: {
  schedule: Schedule;
  done: Run[];
  remaining: Run[];
  state: ScheduleState;
  startsOn?: string;
}) {
  const runsOn = (d: Date) => sc.cadence === "daily" || sc.cadence === "once" || sc.days.includes(d.getUTCDay());
  const step = (d: Date, by: number) => {
    const x = new Date(d);
    do x.setUTCDate(x.getUTCDate() + by);
    while (!runsOn(x));
    return x;
  };
  const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const doneDates: (string | null)[] = done.map(() => null);
  const nextDates: (string | null)[] = remaining.map(() => null);
  const walkBack = (last: Date) => {
    for (let k = done.length - 1, d = last; k >= 0; k--, d = step(d, -1)) doneDates[k] = iso(d);
  };
  if (state === "completed") {
    // Reached every match: the last run was the day it completed. Campaign ended: the next run found it over, so the
    // last one that sent was the run day before.
    if (sc.completedOn) {
      let last = day(sc.completedOn);
      if (sc.completedReason === "campaign_ended" || !runsOn(last)) last = step(last, -1);
      walkBack(last);
    }
  } else {
    const from = sc.cadence === "once" && sc.runOn ? sc.runOn : startsOn && startsOn > TODAY ? startsOn : TODAY;
    let next = day(from);
    if (!runsOn(next)) next = step(next, 1);
    if (done.length > 0) walkBack(step(next, -1));
    if (state !== "paused") remaining.forEach((r, k) => (nextDates[k] = r.date ?? null));
  }
  const rows = [
    ...done.map((r, i) => ({ ...r, date: doneDates[i], status: "Sent" })),
    ...remaining.map((r, i) => ({
      ...r,
      date: nextDates[i],
      status:
        state === "completed"
          ? "Not sent"
          : i > 0
            ? ""
            : state === "waiting"
              ? "Waiting for credits"
              : state === "paused"
                ? "Paused"
                : "Next",
    })),
  ].map((r, i) => ({ ...r, k: i + 1 }));
  return (
    <>
        {/* A vertical timeline: a marker per run, the run and its date, then what it sends and costs; the state on the
            right. Over 5 runs the list scrolls inside at the dialog-list height (lib/scroll.ts). */}
        <ol
          className={cn(
            "flex flex-col text-sm tabular-nums",
            rows.length > 5 && cn(SCROLL_DIALOG_LIST, "pr-2"),
          )}
          tabIndex={rows.length > 5 ? 0 : undefined}
          aria-label="Runs"
        >
          {rows.map((r, i) => (
            <li key={r.k} className="relative flex gap-3 pb-4 last:pb-0">
              {i < rows.length - 1 && (
                <span
                  aria-hidden
                  className={cn("absolute top-5 bottom-0 left-[9px] w-px", r.status === "Sent" ? "bg-primary/40" : "bg-border")}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 grid size-5 shrink-0 place-items-center rounded-full border bg-card",
                  r.status === "Sent" && "border-transparent bg-primary-soft text-primary-soft-foreground",
                  r.status === "Waiting for credits" && "border-warning text-warning-soft-foreground",
                  r.status === "Next" && "border-muted-foreground text-foreground",
                )}
              >
                {r.status === "Sent" ? (
                  <CheckIcon className="size-3" />
                ) : r.status === "Waiting for credits" ? (
                  <CircleAlertIcon className="size-3" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current opacity-60" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className={cn(r.status === "" || r.status === "Not sent" ? "text-muted-foreground" : "font-medium")}>
                    Run {n(r.k)}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {r.date ? formatDate(r.date) : r.status === "Paused" ? "when resumed" : "–"}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {n(r.size)} companies · {r.credits > 0 ? `${n(r.credits)} credits` : "no credits"}
                  </span>
                </div>
                {r.status &&
                  (r.status === "Waiting for credits" || r.status === "Not sent" ? (
                    <span
                      className={cn(
                        "shrink-0",
                        r.status === "Waiting for credits" ? "text-warning-soft-foreground" : "text-muted-foreground",
                      )}
                    >
                      {r.status}
                    </span>
                  ) : (
                    // The marker shows it; screen readers get it here (the marker is aria-hidden).
                    <span className="sr-only">{r.status}</span>
                  ))}
              </div>
            </li>
          ))}
        </ol>
    </>
  );
}

/** Row ⋯ for an automation item: Edit, Pause/Resume, Delete. Locked items say why at the bottom (PATTERNS 9.12). */
function RowMenu({
  label,
  mayEdit,
  lockedReason,
  onEdit,
  paused,
  resumeBlocked,
  onTogglePause,
  onDelete,
  onRunNow,
}: {
  label: string;
  mayEdit: boolean;
  lockedReason?: string;
  /** Absent for a completed schedule (history). */
  onEdit?: () => void;
  /** Absent when there is nothing to pause (completed). */
  paused?: boolean;
  /** Resume is off while another schedule of the template runs (one at a time). */
  resumeBlocked?: boolean;
  onTogglePause: () => void;
  onDelete: () => void;
  /** Demo only: play the next run now. */
  onRunNow?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${label.toLowerCase()}`}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          {onEdit && (
            <DropdownMenuItem disabled={!mayEdit} onSelect={onEdit}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
          )}
          {paused !== undefined && (
            <DropdownMenuItem disabled={!mayEdit || (paused && resumeBlocked)} onSelect={onTogglePause}>
              {paused ? <PlayIcon /> : <PauseIcon />}
              {paused ? "Resume" : "Pause"}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {onRunNow && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onRunNow}>
              <FastForwardIcon />
              Run next now (demo)
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={!mayEdit} onSelect={onDelete}>
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
        {lockedReason && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{lockedReason}</DropdownMenuLabel>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
