"use client";

import { useState } from "react";
import { ClockIcon, CornerDownRightIcon, InfoIcon, LockIcon, RepeatIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { type Campaign, campaignStatus, formatDate } from "@/lib/mock/campaigns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DELAYS,
  DELAY_MAX,
  DELAY_MIN,
  type Flow,
  PER_RUN_DEFAULT,
  PER_RUN_MAX,
  type Schedule,
  TIMEZONES,
  TRIGGERS,
  WEEKDAYS,
  automation,
  currentSchedule,
  delayLabel,
  hhmm,
  nextRun,
  scheduleWhen,
  useAutomation,
} from "@/components/features/automation";
import { type Viewer, accessFor, canEdit, findTemplate, lockReason, viewerFor } from "@/lib/mock/templates";

// Automate a template (live app TemplateAutomateModal + ScheduleConfigModal + FlowConfigModal, rebuilt
// 2026-10-28). Two tabs:
//  - Schedule: the template's drip. One active or paused schedule per template (the live app's API refuses a
//    second: recipients are deduped per template, so a second schedule finds nothing). Audience = the campaign's
//    targeting (AC-EC-A-01, BR-RULE-EC-29), shown with a match estimate (AC-EC-A-06).
//  - Follow-up: one If / Wait / Send rule for anyone this template reaches (AC-EC-F-01..05).
// Changes need edit access (Repo template-permissions.ts canEdit); viewers see the settings read-only.

// Illustrative audience estimates per campaign (AC-EC-A-06 preview).
const AUDIENCE: Record<string, number> = { c1: 1180, c2: 296, c3: 2810, c4: 12, c5: 640, c6: 420 };

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function AutomateDialog({
  templateId,
  open,
  onOpenChange,
  viewer,
}: {
  templateId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Defaults to the signed-in user (admin in the mock). Pass it to preview as a member. */
  viewer?: Viewer;
}) {
  const found = findTemplate(templateId);
  const store = useAutomation();
  const [tab, setTab] = useState("schedule");
  if (!found) return null;
  const { template, campaign } = found;
  const access = accessFor(template, viewer ?? viewerFor(null));
  const mayEdit = canEdit(access);
  const schedule = currentSchedule(store, templateId);
  const history = store.schedules.filter((s) => s.templateId === templateId && s.status === "completed");
  const flow = store.flows.find((f) => f.templateId === templateId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Automate “{template.name}”</DialogTitle>
          <DialogDescription>
            A schedule keeps sending this template to new companies in “{campaign.name}”. A follow-up sends another
            email to the people it reached.
          </DialogDescription>
        </DialogHeader>

        {!mayEdit && (
          <Alert>
            <LockIcon />
            <AlertTitle>View only</AlertTitle>
            <AlertDescription>{lockReason.edit(template.owner)}</AlertDescription>
          </Alert>
        )}

        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          <TabsList aria-label="Automation type">
            <TabsTrigger value="schedule">
              <ClockIcon />
              Schedule
              {schedule && <Badge variant="secondary" className="h-5 min-w-5 px-1.5 tabular-nums">1</Badge>}
            </TabsTrigger>
            <TabsTrigger value="followup">
              <RepeatIcon />
              Follow-up
              {flow && <Badge variant="secondary" className="h-5 min-w-5 px-1.5 tabular-nums">1</Badge>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="schedule">
            {/* Keyed so reopening for another schedule starts from its saved values. */}
            <ScheduleForm
              key={`${templateId}-${schedule?.id ?? "new"}-${open}`}
              templateId={templateId}
              campaign={campaign}
              schedule={schedule}
              history={history}
              disabled={!mayEdit}
              onDone={() => onOpenChange(false)}
            />
          </TabsContent>
          <TabsContent value="followup">
            <FollowUpForm
              key={`${templateId}-${flow?.id ?? "new"}-${open}`}
              templateId={templateId}
              campaign={campaign}
              flow={flow}
              disabled={!mayEdit}
              onDone={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleForm({
  templateId,
  campaign,
  schedule,
  history,
  disabled,
  onDone,
}: {
  templateId: string;
  campaign: Campaign;
  schedule: Schedule | null;
  history: Schedule[];
  disabled: boolean;
  onDone: () => void;
}) {
  const ended = campaignStatus(campaign) === "ended";
  const notStarted = campaignStatus(campaign) === "not-started";
  const [status, setStatus] = useState<"active" | "paused">(schedule?.status === "paused" ? "paused" : "active");
  const [cadence, setCadence] = useState<Schedule["cadence"]>(schedule?.cadence ?? "daily");
  const [days, setDays] = useState<string[]>((schedule?.days ?? [1, 3]).map(String));
  const [sendHour, setSendHour] = useState(schedule?.sendHour ?? 9);
  const [timezone, setTimezone] = useState(schedule?.timezone ?? "Asia/Ho_Chi_Minh");
  const [cap, setCap] = useState(String(schedule?.perRunCap ?? PER_RUN_DEFAULT));
  const [continuous, setContinuous] = useState((schedule?.targetTotal ?? 0) === 0);
  const [target, setTarget] = useState(schedule && schedule.targetTotal > 0 ? String(schedule.targetTotal) : "1000");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const audience = AUDIENCE[campaign.id] ?? 0;
  const capN = Number(cap);
  const targetN = Number(target);
  const capError = !Number.isInteger(capN) || capN < 1 || capN > PER_RUN_MAX ? "Between 1 and 100,000 per run" : null;
  const targetError =
    !continuous && (!Number.isInteger(targetN) || targetN < 1) ? "Enter a total, or turn on Keep sending" : null;
  const daysError = cadence === "weekly" && days.length === 0 ? "Pick at least one day" : null;
  // Creating is blocked once the campaign has ended (its schedules complete, EC-EC-23) or nobody matches.
  const blockCreate = !schedule && (ended || audience === 0);
  const invalid = Boolean(capError || targetError || daysError);
  const locked = disabled || blockCreate;

  const draft: Schedule = {
    id: schedule?.id ?? `s-${templateId}`,
    templateId,
    status: schedule ? status : "active",
    cadence,
    days: cadence === "weekly" ? days.map(Number) : [],
    sendHour,
    timezone,
    perRunCap: capN,
    targetTotal: continuous ? 0 : targetN,
    sentCount: schedule?.sentCount ?? 0,
  };
  const next = nextRun(draft, campaign.startsOn);

  function save() {
    if (invalid) return;
    // A new schedule gets a fresh id so it never overwrites a completed one.
    automation.saveSchedule(schedule ? draft : { ...draft, id: `s-${templateId}-${Date.now()}` });
    toast.success(schedule ? "Schedule updated" : "Schedule created", {
      description: draft.status === "paused" ? "Paused. It won't send until you turn it back on." : next ? `Next run ${next}.` : undefined,
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Audience comes from the campaign; it can't be changed here (AC-EC-A-01). */}
      <div className="flex flex-col gap-1 rounded-lg border px-4 py-3">
        <p className="text-sm text-muted-foreground">Sends to companies matching “{campaign.name}”</p>
        <p className="text-sm">
          {campaign.countries.join(", ") || "All countries"} · {campaign.industries.join(", ") || "Any industry"}
        </p>
        <p className="text-sm">
          <span className="font-semibold tabular-nums">~{audience.toLocaleString("en-US")}</span>{" "}
          <span className="text-muted-foreground">match today. Each company gets this email once per schedule.</span>
        </p>
      </div>

      {ended && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>The campaign ended on {formatDate(campaign.endsOn!, true)}</AlertTitle>
          <AlertDescription>
            Its schedules completed on the next run, so a new one can&apos;t start. Follow-ups keep running. Extend the
            campaign period to schedule again.
          </AlertDescription>
        </Alert>
      )}
      {!ended && audience === 0 && !schedule && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>No companies match this campaign</AlertTitle>
          <AlertDescription>Widen the campaign&apos;s countries or industries first.</AlertDescription>
        </Alert>
      )}
      {schedule && (
        <Alert>
          <InfoIcon />
          <AlertTitle>This template already has a schedule: {scheduleWhen(schedule)}</AlertTitle>
          <AlertDescription>
            One schedule per template. Edit this one; a second would only find companies the first already reached.
          </AlertDescription>
        </Alert>
      )}

      <fieldset disabled={locked} className="contents">
        <FieldGroup className="gap-5">
          {schedule && (
            <Field orientation="horizontal">
              <Switch
                id="sch-status"
                checked={status === "active"}
                onCheckedChange={(on) => setStatus(on ? "active" : "paused")}
                disabled={locked}
              />
              <FieldLabel htmlFor="sch-status" className="font-normal">
                {status === "active" ? "Active" : "Paused"}
                <span className="text-muted-foreground tabular-nums">
                  · {schedule.sentCount.toLocaleString("en-US")} sent so far
                </span>
              </FieldLabel>
            </Field>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldSet>
              <FieldLegend variant="label">Repeat</FieldLegend>
              <ToggleGroup
                type="single"
                variant="outline"
                value={cadence}
                onValueChange={(v) => v && setCadence(v as Schedule["cadence"])}
                disabled={locked}
                aria-label="Repeat"
              >
                <ToggleGroupItem value="daily">Every day</ToggleGroupItem>
                <ToggleGroupItem value="weekly">Some days</ToggleGroupItem>
              </ToggleGroup>
            </FieldSet>
            <Field>
              <FieldLabel htmlFor="sch-hour">Send at</FieldLabel>
              <Select value={String(sendHour)} onValueChange={(v) => setSendHour(Number(v))} disabled={locked}>
                <SelectTrigger id="sch-hour" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {hhmm(h)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {cadence === "weekly" && (
            <FieldSet data-invalid={daysError ? true : undefined}>
              <FieldLegend variant="label">Days</FieldLegend>
              <ToggleGroup
                type="multiple"
                variant="outline"
                spacing={0}
                value={days}
                onValueChange={setDays}
                disabled={locked}
                aria-label="Days of the week"
              >
                {WEEKDAYS.map((d) => (
                  <ToggleGroupItem key={d.value} value={String(d.value)} className="w-12">
                    {d.short}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {daysError && <FieldError>{daysError}</FieldError>}
            </FieldSet>
          )}
          <Field>
            <FieldLabel htmlFor="sch-tz">Time zone</FieldLabel>
            <Select value={timezone} onValueChange={setTimezone} disabled={locked}>
              <SelectTrigger id="sch-tz" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TIMEZONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              {next
                ? `Next run ${next}${notStarted ? ", when the campaign starts" : ""}.`
                : schedule?.status === "paused" || status === "paused"
                  ? "Paused: no run planned."
                  : null}
            </FieldDescription>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={capError ? true : undefined}>
              <FieldLabel htmlFor="sch-cap">Companies per run</FieldLabel>
              <Input
                id="sch-cap"
                inputMode="numeric"
                value={cap}
                onChange={(e) => setCap(e.target.value.replace(/\D/g, ""))}
                aria-invalid={capError ? true : undefined}
                className="tabular-nums"
              />
              {capError ? <FieldError>{capError}</FieldError> : <FieldDescription>Default 200.</FieldDescription>}
            </Field>
            <Field data-invalid={targetError ? true : undefined}>
              <FieldLabel htmlFor="sch-target">Stop after</FieldLabel>
              <Input
                id="sch-target"
                inputMode="numeric"
                value={continuous ? "" : target}
                placeholder={continuous ? "No limit" : undefined}
                disabled={locked || continuous}
                onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))}
                aria-invalid={targetError ? true : undefined}
                className="tabular-nums"
              />
              {targetError ? <FieldError>{targetError}</FieldError> : <FieldDescription>Companies in total.</FieldDescription>}
            </Field>
          </div>
          <Field orientation="horizontal">
            <Switch id="sch-continuous" checked={continuous} onCheckedChange={setContinuous} disabled={locked} />
            <FieldLabel htmlFor="sch-continuous" className="font-normal">
              Keep sending until the campaign ends
            </FieldLabel>
          </Field>
        </FieldGroup>
      </fieldset>

      {history.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {history.map((h) => (
            <span key={h.id} className="block">
              Earlier schedule ({scheduleWhen(h)}) completed
              {h.completedOn ? ` on ${formatDate(h.completedOn, true)}` : ""}
              {h.completedReason === "campaign_ended" ? " because the campaign ended" : " after reaching its total"} ·{" "}
              <span className="tabular-nums">{h.sentCount.toLocaleString("en-US")}</span> sent.
            </span>
          ))}
        </p>
      )}

      <DialogFooter className="items-center">
        {schedule && !disabled && (
          <Button
            variant="ghost"
            className="mr-auto text-destructive hover:text-destructive"
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              automation.deleteSchedule(schedule.id);
              toast.success("Schedule deleted", { description: "Emails already queued still go out." });
              onDone();
            }}
          >
            <Trash2Icon data-icon="inline-start" />
            {confirmDelete ? "Click again to delete" : "Delete schedule"}
          </Button>
        )}
        <Button variant="outline" onClick={onDone}>
          {disabled ? "Close" : "Cancel"}
        </Button>
        {!disabled && (
          <LockedTip reason={blockCreate ? (ended ? "The campaign has ended" : "No companies match the campaign") : undefined}>
            <Button onClick={save} disabled={blockCreate || invalid}>
              {schedule ? "Save schedule" : "Create schedule"}
            </Button>
          </LockedTip>
        )}
      </DialogFooter>
    </div>
  );
}

function FollowUpForm({
  templateId,
  campaign,
  flow,
  disabled,
  onDone,
}: {
  templateId: string;
  campaign: Campaign;
  flow: Flow | null;
  disabled: boolean;
  onDone: () => void;
}) {
  // Picked from the same campaign so the sequence reads as one story (2026-10-28 choice; the live app's
  // FlowConfigModal lists the workspace's templates and can create one inline).
  const options = campaign.templates.filter((t) => t.id !== templateId);
  const [stepTemplateId, setStepTemplateId] = useState(flow?.stepTemplateId ?? "");
  const [trigger, setTrigger] = useState<Flow["trigger"]>(flow?.trigger ?? "no_engagement");
  const [delay, setDelay] = useState(flow?.delayHours ?? 72);
  const [custom, setCustom] = useState(!DELAYS.some((d) => d.value === (flow?.delayHours ?? 72)));
  const [status, setStatus] = useState<Flow["status"]>(flow?.status ?? "active");
  const [showErrors, setShowErrors] = useState(false);

  const templateError = !stepTemplateId ? "Pick the email to send" : null;
  const delayError = !Number.isInteger(delay) || delay < DELAY_MIN || delay > DELAY_MAX ? "Between 1 and 1,440 hours (60 days)" : null;
  const picked = options.find((t) => t.id === stepTemplateId);

  function save() {
    if (templateError || delayError) return setShowErrors(true);
    automation.saveFlow({
      id: flow?.id ?? `f-${templateId}-${Date.now()}`,
      templateId,
      stepTemplateId,
      trigger,
      delayHours: delay,
      status: flow ? status : "active",
      sent: flow?.sent ?? 0,
    });
    toast.success(flow ? "Follow-up updated" : "Follow-up added", {
      description: `${picked?.name} goes out ${delayLabel(delay)} after this email.`,
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset disabled={disabled} className="contents">
        <FieldGroup className="gap-5">
          {flow && (
            <Field orientation="horizontal">
              <Switch id="fu-status" checked={status === "active"} onCheckedChange={(on) => setStatus(on ? "active" : "paused")} disabled={disabled} />
              <FieldLabel htmlFor="fu-status" className="font-normal">
                {status === "active" ? "Active" : "Paused"}
                <span className="text-muted-foreground tabular-nums">· {flow.sent.toLocaleString("en-US")} sent so far</span>
              </FieldLabel>
            </Field>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fu-trigger">If the recipient</FieldLabel>
              <Select value={trigger} onValueChange={(v) => setTrigger(v as Flow["trigger"])} disabled={disabled}>
                <SelectTrigger id="fu-trigger" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TRIGGERS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={showErrors && delayError ? true : undefined}>
              <FieldLabel htmlFor="fu-delay">Wait</FieldLabel>
              {custom ? (
                <Input
                  id="fu-delay"
                  inputMode="numeric"
                  value={String(delay)}
                  onChange={(e) => setDelay(Number(e.target.value.replace(/\D/g, "")))}
                  aria-invalid={showErrors && delayError ? true : undefined}
                  className="tabular-nums"
                />
              ) : (
                <Select
                  value={String(delay)}
                  onValueChange={(v) => (v === "custom" ? setCustom(true) : setDelay(Number(v)))}
                  disabled={disabled}
                >
                  <SelectTrigger id="fu-delay" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DELAYS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Other (hours)…</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              {showErrors && delayError ? (
                <FieldError>{delayError}</FieldError>
              ) : custom ? (
                <FieldDescription>Hours, 1 to 1,440.</FieldDescription>
              ) : null}
            </Field>
          </div>
          <Field data-invalid={showErrors && templateError ? true : undefined}>
            <FieldLabel htmlFor="fu-template">Then send</FieldLabel>
            <Select value={stepTemplateId} onValueChange={setStepTemplateId} disabled={disabled || options.length === 0}>
              <SelectTrigger id="fu-template" className="w-full" aria-invalid={showErrors && templateError ? true : undefined}>
                <SelectValue placeholder={options.length === 0 ? "No other template in this campaign" : "Pick a template"} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {options.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.status === "inactive" ? " (inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {showErrors && templateError ? (
              <FieldError>{templateError}</FieldError>
            ) : (
              <FieldDescription>Templates in “{campaign.name}”. Add one to the campaign to see it here.</FieldDescription>
            )}
          </Field>
        </FieldGroup>
      </fieldset>

      {picked && (
        <div className="flex items-start gap-2 text-sm">
          <CornerDownRightIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p>
            {TRIGGERS.find((t) => t.value === trigger)?.label} within {delayLabel(delay)} → “{picked.name}”.{" "}
            <span className="text-muted-foreground">
              People who reply, unsubscribe or bounce leave the sequence. Follow-ups use the same sending limits as
              batches.
            </span>
          </p>
        </div>
      )}

      <DialogFooter className="items-center">
        {flow && !disabled && (
          <Button
            variant="ghost"
            className="mr-auto text-destructive hover:text-destructive"
            onClick={() => {
              automation.deleteFlow(flow.id);
              toast.success("Follow-up removed", { description: "Emails already queued still go out." });
              onDone();
            }}
          >
            <Trash2Icon data-icon="inline-start" />
            Remove follow-up
          </Button>
        )}
        <Button variant="outline" onClick={onDone}>
          {disabled ? "Close" : "Cancel"}
        </Button>
        {!disabled && <Button onClick={save}>{flow ? "Save follow-up" : "Add follow-up"}</Button>}
      </DialogFooter>
    </div>
  );
}

// Disabled buttons don't fire pointer events, so the tooltip wraps a span.
export function LockedTip({ reason, children }: { reason?: string; children: React.ReactNode }) {
  if (!reason) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" tabIndex={0}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{reason}</TooltipContent>
    </Tooltip>
  );
}
