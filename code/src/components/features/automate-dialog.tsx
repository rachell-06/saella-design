"use client";

import { useState } from "react";
import { LockIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { type Campaign, TODAY } from "@/lib/mock/campaigns";
import { members } from "@/lib/mock/workspace";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LockedTip } from "@/components/saella/locked-tip";
import { useUnlocks } from "@/lib/mock/unlocks";
import { useFocusReturn } from "@/lib/use-focus-return";
import { useTemplateStore } from "@/lib/mock/use-template-store";
import { campaignOffReason, liveStatus } from "@/components/features/activation";
import { campaignReach } from "@/lib/mock/company-audience";
import { dailyCapFor, domainOf } from "@/lib/mock/batches";
import {
  type Schedule,
  automation,
  campaignTimezone,
  monthlyFor,
  newScheduleId,
  nextRun,
  useAutomation,
} from "@/components/features/automation";
import {
  EmailsPerRun,
  RunPlan,
  WhenToSend,
  perRunError,
  timingErrors,
} from "@/components/features/schedule-parts";
import {
  DEFAULT_SENDER_ID,
  type Viewer,
  accessFor,
  canEdit,
  findTemplate,
  lockReason,
  senderById,
  senderOptions,
  viewerFor,
} from "@/lib/mock/templates";

// Set or edit a template's schedule (live app ScheduleConfigModal). A schedule sends the template to the campaign's
// matches, run after run: Saella says
// how many companies fit (unlocked + locked, Ceased left out), the user picks Send from (its domain's daily cap shown),
// Emails per run (up to that cap) and When to send. Credits are charged per run, not here: each run unlocks the locked
// companies it reaches, 1 credit each; short of credits, the schedule waits and runs again once credits are bought.
// Edit has the same fields: no Active / Paused switch and no progress (the card and its ⋯ menu show and change
// both). Deleting lives on the schedule card. Changes need edit access (Repo template-permissions.ts canEdit);
// viewers see the settings read-only.

const n = (x: number) => x.toLocaleString("en-US");

/** Set a new schedule (scheduleId null) or edit one. Opened from AutomationPanel and the editor's Ready to send box. */
export function ScheduleDialog({
  templateId,
  open,
  onOpenChange,
  viewer,
  scheduleId,
}: {
  templateId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Defaults to the signed-in user (admin in the mock). Pass it to preview as a member. */
  viewer?: Viewer;
  /** The schedule to edit; null sets a new one. */
  scheduleId: string | null;
}) {
  const found = findTemplate(templateId);
  const store = useAutomation();
  const templates = useTemplateStore();
  const focus = useFocusReturn();
  if (!found) return null;
  const { template, campaign } = found;
  const who = viewer ?? viewerFor(null);
  const mayEdit = canEdit(accessFor(template, who));
  const schedule = scheduleId ? (store.schedules.find((x) => x.id === scheduleId && x.templateId === templateId) ?? null) : null;
  if (scheduleId && !schedule) return null;
  // Another schedule of this template is running: a paused one can't be turned on (one at a time).
  const otherRunning = store.schedules.some((x) => x.templateId === templateId && x.status === "active" && x.id !== schedule?.id);
  // Only an active template sends: the schedule stays editable and waits (live automation-run).
  const inactive = liveStatus(templateId, template.status, templates) === "inactive";
  // Its campaign has ended (off for good) or is archived (off until unarchived; decisions.md): no run goes out.
  const ended = campaignOffReason(templateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" {...focus}>
        {/* Inside the content, so every open starts from the saved values (no open-keyed remount: focus goes back to
            the trigger on close). Keyed by schedule in case another one opens. */}
        <ScheduleForm
          key={schedule?.id ?? "new"}
          templateId={templateId}
          templateName={template.name}
          campaign={campaign}
          schedule={schedule}
          viewerEmail={who.email}
          otherRunning={otherRunning}
          disabled={!mayEdit}
          notice={
            !mayEdit ? (
              <Alert>
                <LockIcon />
                <AlertTitle>View only</AlertTitle>
                <AlertDescription>{lockReason.edit(template.owner)}</AlertDescription>
              </Alert>
            ) : ended ? (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle>{ended}</AlertTitle>
                <AlertDescription>This schedule won&apos;t send any more.</AlertDescription>
              </Alert>
            ) : inactive ? (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle>This template is inactive</AlertTitle>
                <AlertDescription>The schedule waits until it&apos;s active again.</AlertDescription>
                {/* Mark active lives in the editor, where its content check runs. */}
                <AlertAction>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/templates/${templateId}/edit`}>Open editor</Link>
                  </Button>
                </AlertAction>
              </Alert>
            ) : null
          }
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ScheduleForm({
  templateId,
  templateName,
  campaign,
  schedule,
  viewerEmail,
  otherRunning,
  disabled,
  notice,
  onDone,
}: {
  templateId: string;
  templateName: string;
  campaign: Campaign;
  /** null = a new schedule. */
  schedule: Schedule | null;
  viewerEmail: string;
  otherRunning: boolean;
  disabled: boolean;
  notice: React.ReactNode;
  onDone: () => void;
}) {
  const creating = schedule === null;
  const { unlocked, balance } = useUnlocks();
  // What the campaign can reach now, for a new schedule and an edited one alike (a total lowered in Edit can be raised
  // back up to what fits now, not just to what was stored).
  const [reach] = useState(() => {
    // Preview ?reach=12000: a big campaign; a quarter of it already unlocked.
    const big = Number(new URLSearchParams(window.location.search).get("reach"));
    if (big > 0) {
      const u = Math.round(big / 4);
      return { total: big, unlocked: u, locked: big - u };
    }
    const r = campaignReach(campaign, unlocked);
    return { total: r.total, unlocked: r.unlocked, locked: r.locked };
  });

  const paused = schedule?.status === "paused";
  const own = senderOptions(viewerEmail);
  // The schedule's own sender stays listed even when this viewer can't pick it (another member's address): it's what
  // the schedule sends from, so the field and its daily cap are never blank. Picking another one is a one-way change.
  const current = schedule?.senderId ? senderById(schedule.senderId) : undefined;
  const foreign = current && !own.some((s) => s.id === current.id) ? current : undefined;
  const senders = foreign ? [foreign, ...own] : own;
  const foreignOwner = foreign ? members.find((m) => m.id === foreign.ownerId)?.name : undefined;
  // A real sender is always picked (no "Business default sender" choice).
  const [senderId, setSenderId] = useState(
    current?.id ?? (own.some((s) => s.id === DEFAULT_SENDER_ID) ? DEFAULT_SENDER_ID : (own[0]?.id ?? ""))
  );
  const sender = senders.find((s) => s.id === senderId);
  const cap = dailyCapFor(sender);
  // Per run: a new schedule sends up to the domain's daily cap (or all of it if fewer). An edited one keeps its own
  // size, so saving without changes keeps the plan the card shows; only a sender with a smaller cap lowers it.
  const perRunFor = (total: number, domainCap: number) =>
    Math.max(1, schedule ? Math.min(schedule.perRunCap, domainCap) : Math.min(domainCap, total));
  // Companies to send: the total the user wants, up to what fits; default all of them. Each run
  // sends up to the sender domain's daily limit, so more than that goes out over several runs. Editing can't go below
  // what was sent already; equal to it, saving completes the schedule. The top is what fits the campaign now (the
  // companies already sent to still count among them), so a total lowered earlier can go back up. When fewer fit now
  // than the schedule was set for (the registry changed), its own total stays the top: opening Edit and saving
  // unchanged never shrinks or completes it.
  const sent = schedule?.sentCount ?? 0;
  const fits = Math.max(reach.total, sent, schedule?.reach.total ?? 0);
  const minTarget = Math.max(1, sent);
  const [target, setTargetRaw] = useState(() => String(schedule ? Math.max(sent, schedule.reach.total) : Math.max(1, reach.total)));
  const targetN = Number(target) || 0;
  const runSize = perRunFor(targetN, cap);
  const left = Math.max(0, targetN - sent);
  const unlockedLeft = Math.max(0, Math.min(schedule ? schedule.reach.unlocked : reach.unlocked, targetN) - sent);
  // Once is a single run: more than one run's worth left, only Every day / On these days.
  const onceBlocked = left > runSize ? `More than ${n(runSize)} companies takes several days` : undefined;
  // Shared sender: 1,000 sends a calendar month across the workspace (PRD AC-EC-I-03, BR-RULE-EC-05).
  const monthly = monthlyFor(sender);
  const [cadence, setCadence] = useState<Schedule["cadence"]>(() =>
    schedule?.cadence ?? "daily"
  );
  function setTarget(v: string) {
    setTargetRaw(v);
    const total = Number(v) || 0;
    if (total - sent > perRunFor(total, cap) && cadence === "once") setCadence("daily");
  }
  const firstDay = campaign.startsOn && campaign.startsOn > TODAY ? campaign.startsOn : TODAY;
  const [runOn, setRunOn] = useState(schedule?.runOn ?? firstDay);
  const [days, setDays] = useState<string[]>(schedule?.days.map(String) ?? []);
  const [sendHour, setSendHour] = useState(schedule?.sendHour ?? 9);
  const [showErrors, setShowErrors] = useState(false);
  // Send zone (PATTERNS 9.8): the campaign's country when it targets one, else the workspace's; saved on the schedule.
  const [timezone, setTimezone] = useState(() => schedule?.timezone ?? campaignTimezone(campaign));
  const { daysError, dateError } = timingErrors({ cadence, days, runOn });
  const perRunErr = perRunError(target, Math.max(1, fits), minTarget);
  const nothing = creating && reach.total === 0;
  // Set schedule rules: the campaign hasn't ended (or been archived), one running schedule per template.
  const createBlocked = !creating
    ? undefined
    : (campaignOffReason(templateId) ??
      (otherRunning ? "Pause the current schedule to set a new one" : undefined));

  function pickSender(id: string) {
    setSenderId(id);
    // A smaller daily limit can rule Once out.
    const nextCap = dailyCapFor(senders.find((s) => s.id === id));
    if (left > perRunFor(targetN, nextCap) && cadence === "once") setCadence("daily");
  }

  function save() {
    if (daysError || dateError || perRunErr) return setShowErrors(true);
    const timing = {
      cadence,
      days: cadence === "custom" ? days.map(Number) : [],
      runOn: cadence === "once" ? runOn : undefined,
      sendHour,
      timezone,
      senderId: senderId || undefined,
      perRunCap: runSize,
    };
    // Lowered to what it already sent: nothing is left, so it completes rather than stay on with nothing to send.
    const finished = schedule !== null && targetN <= schedule.sentCount;
    const draft: Schedule = schedule
      ? {
          ...schedule,
          ...timing,
          status: finished ? "completed" : schedule.status,
          reach: { ...schedule.reach, total: targetN },
          ...(finished ? { completedReason: "target_reached" as const, completedOn: TODAY } : {}),
        }
      : {
          id: newScheduleId(templateId),
          templateId,
          status: "active",
          ...timing,
          reach: { total: targetN, unlocked: Math.min(reach.unlocked, targetN) },
          sentCount: 0,
        };
    automation.saveSchedule(draft);
    const next = nextRun(draft, campaign.startsOn);
    toast.success(creating ? "Schedule set" : finished ? "Schedule completed" : "Schedule updated", {
      description: finished
        ? undefined
        : draft.status === "paused"
          ? "Still paused."
          : next
            ? `Next run ${next}.`
            : undefined,
    });
    onDone();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{creating ? "Set schedule" : disabled ? "Schedule" : "Edit schedule"}</DialogTitle>
        {creating ? (
          <DialogDescription className="tabular-nums">
            {/* One short sentence, no template name (the dialog opens from that template already). The unlocked / locked
                split is in the cost line below. */}
            {nothing
              ? "No companies fit this campaign yet."
              : `${n(reach.total)} ${reach.total === 1 ? "company fits" : "companies fit"} this campaign.`}
          </DialogDescription>
        ) : (
          <DialogDescription className="sr-only">Schedule for “{templateName}”</DialogDescription>
        )}
      </DialogHeader>

      {notice}

      <fieldset disabled={disabled} className="contents">
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="sch-sender">Send from</FieldLabel>
            <Select value={senderId} onValueChange={pickSender} disabled={disabled}>
              <SelectTrigger id="sch-sender" className="w-full">
                <SelectValue placeholder="Pick a sender" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {senders.map((s) => (
                    <SelectItem key={s.id} value={s.id} disabled={s === foreign}>
                      {s.name} · {s.email}
                      {s === foreign && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {foreignOwner ? `${foreignOwner}’s` : "Another member’s"}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <EmailsPerRun
            value={target}
            onChange={setTarget}
            cap={cap}
            matches={fits}
            min={minTarget}
            domain={sender ? domainOf(sender.email) : "This domain"}
            disabled={disabled}
            showErrors={showErrors}
          />

          <WhenToSend
            cadence={cadence}
            onCadence={setCadence}
            runOn={runOn}
            onRunOn={setRunOn}
            days={days}
            onDays={setDays}
            sendHour={sendHour}
            onSendHour={setSendHour}
            timezone={timezone}
            onTimezone={setTimezone}
            firstDay={firstDay}
            endsOn={campaign.endsOn}
            disabled={disabled}
            showErrors={showErrors}
            onceBlocked={onceBlocked}
          />

          {!perRunErr && (
            <RunPlan
              left={left}
              unlockedLeft={unlockedLeft}
              perRun={runSize}
              sent={sent}
              monthly={monthly}
              paused={paused}
              cadence={cadence}
              days={days.map(Number)}
              firstDay={cadence === "once" && runOn ? runOn : firstDay}
              endsOn={campaign.endsOn}
              balance={balance}
            />
          )}
        </FieldGroup>
      </fieldset>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {disabled ? "Close" : "Cancel"}
        </Button>
        {!disabled && (
          <LockedTip reason={nothing ? "No companies fit this campaign yet" : createBlocked}>
            <Button onClick={save} disabled={nothing || Boolean(createBlocked)}>
              {creating ? "Set schedule" : "Save changes"}
            </Button>
          </LockedTip>
        )}
      </DialogFooter>
    </>
  );
}

