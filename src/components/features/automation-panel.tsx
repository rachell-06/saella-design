"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import {
  ChevronRightIcon,
  ClockIcon,
  CornerDownRightIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { campaignStatus, sampleCampaigns } from "@/lib/mock/campaigns";
import { senders } from "@/lib/mock/workspace";
import {
  type Viewer,
  accessFor,
  canEdit,
  findTemplate,
  lockReason,
  viewerFor,
  withBatchTotals,
} from "@/lib/mock/templates";
import { StatusBadge } from "@/components/saella/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  automation,
  currentSchedule,
  delayLabel,
  flowTriggerLabel,
  nextRun,
  scheduleWhen,
  tzLabel,
  useAutomation,
} from "@/components/features/automation";
import { LockedTip, ScheduleDialog } from "@/components/features/automate-dialog";
import { FollowUpDialog } from "@/components/features/follow-up-dialog";

// A template's automation, one source for every screen: two tabs, Schedule and Follow-up, each a
// table in a bordered frame, the tab's action on the right. Used inside the
// Automation card on the template page and inside AutomateDialog (Templates list row menu; Campaigns can use it too).
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
      {/* Shared dialog frame: the content scrolls inside the max height, the footer stays put. */}
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Automate · {found.template.name}</DialogTitle>
          <DialogDescription>Send it on a schedule, and follow up with the people it reached.</DialogDescription>
        </DialogHeader>
        <AutomationPanel templateId={templateId} viewer={viewer} />
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
}: {
  templateId: string;
  /** Defaults to the signed-in user (admin in the mock). */
  viewer?: Viewer;
  /** Row above the tabs, with the action on its right, e.g. the card title on the template page. */
  title?: React.ReactNode;
}) {
  const found = findTemplate(templateId);
  const access = found ? accessFor(found.template, viewer ?? viewerFor(null)) : "viewer";
  const mayEdit = canEdit(access);
  const lockedReason = found && !mayEdit ? lockReason.edit(found.template.owner) : undefined;
  const ended = found ? campaignStatus(found.campaign) === "ended" : false;
  const campaignStartsOn = found?.campaign.startsOn;
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const onEditSchedule = () => setScheduleOpen(true);
  // Two tabs: Schedule and Follow-up. Sources: live app TemplateAutomateModal (schedules table:
  // Schedule / Status / Sent / Next run / edit, delete; one schedule per template; flows table: Flow / Steps / Sent /
  // Status / edit, delete), TemplateAutomationRows (Send from), PRD-02 AC-EC-A-01..07, AC-EC-F-01..07, BR-RULE-EC-31..33,
  // EC-EC-25. No per-step sent count or follow-up open/click rates: neither the PRD nor the live app has them.
  const store = useAutomation();
  const all = sampleCampaigns.flatMap((c) => c.templates.map(withBatchTotals));
  const nameOf = (id: string) => all.find((t) => t.id === id)?.name;
  const schedules = store.schedules
    .filter((x) => x.templateId === templateId)
    .sort((x, y) => (x.status === "completed" ? 1 : 0) - (y.status === "completed" ? 1 : 0));
  const current = currentSchedule(store, templateId);
  // The flow this template starts (AC-EC-F-01), and flows that use it as a step.
  const flows = store.flows.filter((f) => f.templateId === templateId || f.steps.some((st) => st.templateId === templateId));
  const ownFlow = store.flows.find((f) => f.templateId === templateId) ?? null;
  const [tab, setTab] = useState<"schedule" | "follow-up">("schedule");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(flows.map((f) => f.id)));
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ kind: "schedule" | "flow"; id: string } | null>(null);

  const senderOf = (id?: string) => (id ? senders.find((x) => x.id === id)?.email : undefined);
  const gmt = (tz: string) => tzLabel(tz).match(/\((GMT[^)]*)\)/)?.[1] ?? tzLabel(tz);
  // One schedule per template (live app: POST refuses a second one; the engine dedupes per template).
  const scheduleReason = lockedReason ?? (ended ? "The campaign has ended" : current ? "This template already has a schedule" : undefined);
  // One flow per starting template (live app); more steps go in the same flow.
  const followUpReason = lockedReason ?? (ownFlow ? "Add steps to the existing follow-up" : undefined);
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
        <Button variant="outline" size="sm" disabled={Boolean(scheduleReason)} onClick={onEditSchedule}>
          <ClockIcon data-icon="inline-start" />
          Set schedule
        </Button>
      </LockedTip>
    ) : (
      <LockedTip reason={followUpReason}>
        <Button variant="outline" size="sm" disabled={Boolean(followUpReason)} onClick={() => setFollowUpOpen(true)}>
          <CornerDownRightIcon data-icon="inline-start" />
          Add follow-up
        </Button>
      </LockedTip>
    );

  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="gap-3">
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
        <div>
          <TabsContent value="schedule">
            {schedules.length === 0 ? (
              emptyState("No schedule", "Send this template on set days to the campaign's audience.")
            ) : (
              <div className={tableFrame}>
                <Table aria-label="Schedules of this template" className="table-fixed [&_td]:px-3 [&_th]:px-3">
                  <colgroup>
                    <col />
                    <col className="w-44" />
                    <col className="w-20" />
                    <col className="w-56" />
                    <col className="w-28" />
                    <col className="w-14" />
                  </colgroup>
                  <TableHeader className="bg-table-head">
                    <TableRow>
                      <TableHead className={divider}>When</TableHead>
                      <TableHead className={divider}>Next run</TableHead>
                      <TableHead className={divider}>Sent</TableHead>
                      <TableHead className={divider}>Send from</TableHead>
                      <TableHead className={divider}>Status</TableHead>
                      <TableHead className={divider}>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((sc) => (
                      <TableRow key={sc.id}>
                        <TableCell className={cn(divider, "tabular-nums")}>
                          <span className="flex items-center gap-2">
                            <ClockIcon aria-hidden className="size-4 shrink-0 text-brand" />
                            <span className="truncate">
                              {sc.cadence === "custom" ? "Every " : ""}
                              {scheduleWhen(sc)} <span className="text-muted-foreground">{gmt(sc.timezone)}</span>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className={cn(divider, "text-muted-foreground tabular-nums")}>{nextRun(sc, campaignStartsOn) ?? ""}</TableCell>
                        <TableCell className={cn(divider, "tabular-nums")}>{n(sc.sentCount)}</TableCell>
                        <TableCell className={cn(divider, "truncate text-muted-foreground")}>{senderOf(sc.senderId) ?? "Default sender"}</TableCell>
                        <TableCell className={divider}>
                          <StatusBadge
                            status={sc.status === "completed" ? "ended" : sc.status === "paused" ? "paused" : "active"}
                            label={sc.status === "completed" ? "Completed" : undefined}
                          />
                        </TableCell>
                        <TableCell className={cn(divider, "px-1 text-right")}>
                          <RowMenu
                            label="Schedule"
                            mayEdit={mayEdit}
                            lockedReason={lockedReason}
                            onEdit={sc.status === "completed" ? undefined : onEditSchedule}
                            paused={sc.status === "completed" ? undefined : sc.status === "paused"}
                            onTogglePause={() => {
                              automation.saveSchedule({ ...sc, status: sc.status === "paused" ? "active" : "paused" });
                              toast.success(sc.status === "paused" ? "Schedule resumed" : "Schedule paused");
                            }}
                            onDelete={() => setToDelete({ kind: "schedule", id: sc.id })}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
                                  aria-label={open ? "Hide steps" : "Show steps"}
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
                            {/* What starts the flow: step 1's trigger and wait (was a step count).
                                Later steps, each with its own trigger, show when the row is opened; "+N" says how many. */}
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
                                  onEdit={() => setFollowUpOpen(true)}
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
                                      <span className="shrink-0 text-muted-foreground tabular-nums">Step {i + 1}</span>
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

      <ScheduleDialog templateId={templateId} open={scheduleOpen} onOpenChange={setScheduleOpen} viewer={viewer} />
      <FollowUpDialog templateId={templateId} open={followUpOpen} onOpenChange={setFollowUpOpen} viewer={viewer} />

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toDelete?.kind === "flow" ? "Delete this follow-up?" : "Delete this schedule?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.kind === "flow"
                ? "None of its steps go out any more. Emails already sent stay in their reports."
                : "It stops sending. Batches already queued still go out."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (toDelete?.kind === "flow") automation.deleteFlow(toDelete.id);
                else if (toDelete) automation.deleteSchedule(toDelete.id);
                toast.success(toDelete?.kind === "flow" ? "Follow-up deleted" : "Schedule deleted");
                setToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


/** Row ⋯ for an automation item: Edit, Pause/Resume, Delete. Locked items say why at the bottom. */
function RowMenu({
  label,
  mayEdit,
  lockedReason,
  onEdit,
  paused,
  onTogglePause,
  onDelete,
}: {
  label: string;
  mayEdit: boolean;
  lockedReason?: string;
  /** Absent for a completed schedule (history). */
  onEdit?: () => void;
  /** Absent when there is nothing to pause (completed). */
  paused?: boolean;
  onTogglePause: () => void;
  onDelete: () => void;
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
            <DropdownMenuItem disabled={!mayEdit} onSelect={onTogglePause}>
              {paused ? <PlayIcon /> : <PauseIcon />}
              {paused ? "Resume" : "Pause"}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
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
