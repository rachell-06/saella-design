"use client";

import { WORKSPACE_TZ, WORKSPACE_TZ_LABEL } from "@/lib/time";
// New batch wizard: /batches/new?template=<id> (PRD-02 AC-EC-B-01..08, live app EmailBatchWizard +
// POST /api/email/batches). Template → Recipients → Sender → Schedule → Review. Send is the agent's gated
// "send" action, so the human path asks for the same confirmation tick before it unlocks (AC-AG-G-06).
// Preview states (?state=):
//   paused   workspace auto-paused (BR-RULE-EC-18/19): everything can be prepared, Send stays locked
//   locked   no verified domain / confirmed sender (AC-EC-B-01): no sender to pick, link to Settings
//   inactive opens on an inactive template (t3) to show the "mark active" block
//   empty    no contact lists yet
//   error    the send request fails (shows the error and Try again)
//   loading  skeleton while lists and senders load
//   checking     Review: the per-recipient check is still running (Send waits)
//   check-error  Review: the per-recipient check failed (Try again)
//   badtag       Review: the subject uses {{first_name}}, a tag Saella doesn't know (blocks Send)
// Also ?step=0..4 and ?lists=l1,l2 to open part-way (previews; the agent handing over a prepared batch), and
// ?exclude=l3&excludeTags=vip for "Don't send to".
// 2026-10-29 (Competitor.md R1–R3): Recipients has "Don't send to" and an estimate with the reasons people are
// left out; Review checks every recipient against the merge tags the template uses and previews the email
// with one recipient's data (recipient-check.ts).

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CircleAlertIcon,
  ListChecksIcon,
  LockIcon,
  SendIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  CURRENT_USER,
  formatDate,
  sampleCampaigns,
} from "@/app/(app)/campaigns/_components/data";
import { useContactsStore } from "@/app/(app)/contacts/_components/data";
import { PageHeader } from "@/components/layout/page-header";
import { MultiSelect } from "@/components/saella/multi-select";
import { StatusBadge } from "@/components/saella/status-badge";
import { DatePicker, TimePicker } from "@/components/saella/date-picker";
import { Stepper } from "@/components/saella/stepper";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { type ContactList, contactLists, senders } from "@/lib/mock/workspace";
import {
  BATCH_CAP,
  CURRENT_USER_ID,
  DAILY_ALLOWANCE,
  SHARED_MONTHLY_CAP,
  SHARED_USED_THIS_MONTH,
  SUBJECTS,
  addCreatedBatch,
  batchCode,
  defaultSenderFor,
  findTemplate,
  sendEstimate,
  senderAvailability,
  summarizeAudience,
} from "./data";
import { LeftOutDialog } from "./left-out-dialog";
import {
  type RefinedAudience,
  DEFAULT_FALLBACK,
  applyExclusions,
  checkRecipients,
  subjectFor,
  tagsIn,
} from "./recipient-check";
import {
  type CheckStatus,
  type Handling,
  RecipientChecks,
} from "./recipient-checks";
import { RecipientPreview } from "./recipient-preview";
import { SubjectText } from "./subject-text";

const STEPS = [
  { id: "template", label: "Template" },
  { id: "recipients", label: "Recipients" },
  { id: "sender", label: "Sender" },
  { id: "schedule", label: "Schedule" },
  { id: "review", label: "Review" },
];

// Fixed "now" for the mock: 2026-10-27 10:00 in the workspace time zone (GMT+7).
const NOW = "2026-10-27T03:00:00Z";
const TZ_LABEL = `${WORKSPACE_TZ} (${WORKSPACE_TZ_LABEL})`;

// The picked day and time are workspace time (GMT+7); scheduledIso is UTC, so show it back in workspace time
// (keeps the year off, unlike formatDateTime).
function atWorkspaceTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: WORKSPACE_TZ,
  });
}
const n = (x: number) => x.toLocaleString("en-US");

export function BatchWizard() {
  const params = useSearchParams();
  const router = useRouter();
  const state = params.get("state");
  const paused = state === "paused";
  const locked = state === "locked";

  // ?step=<0-4>&lists=l1,l2 open the wizard part-way, for previews and for the agent handing over a draft.
  const [step, setStep] = useState(() =>
    Math.min(4, Math.max(0, Number(params.get("step")) || 0)),
  );
  const [templateId, setTemplateId] = useState<string | undefined>(
    () => (state === "inactive" ? "t3" : params.get("template")) ?? undefined,
  );
  // Templates marked active from this screen (the live app does it from the board; here so the block can clear).
  const [activated, setActivated] = useState<Set<string>>(() => new Set());
  const [listIds, setListIds] = useState<string[]>(
    () =>
      (params.get("lists") ?? params.get("list"))?.split(",").filter(Boolean) ??
      [],
  );
  const pool = useMemo(
    () =>
      locked
        ? senders.map((s) => ({ ...s, status: "unconfirmed" as const }))
        : senders,
    [locked],
  );
  const [senderId, setSenderId] = useState<string | undefined>(
    () => defaultSenderFor(templateId, pool)?.id,
  );
  const [when, setWhen] = useState<"now" | "later">("now");
  const [date, setDate] = useState("2026-10-28");
  const [time, setTime] = useState("09:00");
  const [name, setName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // "Don't send to" (R1): lists and contact tags left out even when they are in a picked list.
  const [excludeListIds, setExcludeListIds] = useState<string[]>(
    () => params.get("exclude")?.split(",").filter(Boolean) ?? [],
  );
  const [excludeTags, setExcludeTags] = useState<string[]>(
    () => params.get("excludeTags")?.split(",").filter(Boolean) ?? [],
  );
  // Per-recipient check (R2): per merge tag, send with a fallback word or leave those people out.
  const [handling, setHandling] = useState<Record<string, Handling>>({});
  const [fallbacks, setFallbacks] = useState<Record<string, string>>(
    () => ({ ...DEFAULT_FALLBACK }),
  );
  const [checkStatus, setCheckStatus] = useState<CheckStatus>(() =>
    state === "checking"
      ? "checking"
      : state === "check-error"
        ? "error"
        : "ready",
  );
  // Whose email the preview shows (R3); unset = the first recipient.
  const [previewId, setPreviewId] = useState<string>();
  const { contacts } = useContactsStore();

  const lists: ContactList[] = state === "empty" ? [] : contactLists;
  const picked = findTemplate(templateId);
  const tplActive = picked
    ? picked.template.status === "active" || activated.has(picked.template.id)
    : false;
  const canEdit = picked
    ? picked.template.owner === CURRENT_USER || picked.template.shared === true
    : false;
  const audience = useMemo(
    () =>
      applyExclusions(summarizeAudience(listIds, templateId), contacts, {
        listIds: excludeListIds,
        tags: excludeTags,
      }),
    [listIds, templateId, contacts, excludeListIds, excludeTags],
  );
  const subject =
    state === "badtag"
      ? "Quick question, {{first_name}}"
      : subjectFor(templateId);
  const check = useMemo(
    () => checkRecipients(templateId, subject, audience.people),
    [templateId, subject, audience.people],
  );
  // People the check leaves out, by the choice made per merge tag.
  const skipped = new Set(
    check.issues.flatMap((i) =>
      i.kind === "missing" && handling[i.tag] === "skip"
        ? i.people.map((p) => p.id)
        : [],
    ),
  );
  const unknownTag = check.issues.find((i) => i.kind === "unknown");
  const emptyFallback = check.issues.find(
    (i) =>
      i.kind === "missing" &&
      handling[i.tag] !== "skip" &&
      !fallbacks[i.tag]?.trim(),
  );
  /** What the batch sends to: the audience minus anyone the Review check leaves out. */
  const recipients = audience.recipients - skipped.size;
  const sender = pool.find((s) => s.id === senderId);
  const sharedLeft = SHARED_MONTHLY_CAP - SHARED_USED_THIS_MONTH;
  const estimate = sendEstimate(recipients);

  // Scheduled time as UTC ISO (inputs are GMT+7).
  const scheduledIso =
    when === "later" && date && time
      ? new Date(`${date}T${time}:00+07:00`).toISOString()
      : undefined;
  const campaignEnd = picked?.campaign.endsOn;

  // Why each step can't continue yet; undefined = fine.
  const blockers: (string | undefined)[] = [
    !picked
      ? "Pick a template"
      : !canEdit
        ? `Only ${picked.template.owner.split("@")[0]} or people they share with can send this template`
        : !tplActive
          ? "Mark the template active to send it"
          : undefined,
    listIds.length === 0
      ? "Pick at least one contact list"
      : audience.recipients === 0
        ? "Nobody left to send to after exclusions"
        : undefined,
    !sender
      ? "Pick a sender"
      : !senderAvailability(sender).ok
        ? "This sender can't send yet"
        : sender.shared && recipients > sharedLeft
          ? `The shared sender has ${n(sharedLeft)} sends left this month`
          : undefined,
    when === "later"
      ? !scheduledIso || scheduledIso <= NOW
        ? "Pick a time in the future"
        : campaignEnd && scheduledIso.slice(0, 10) > campaignEnd
          ? `The campaign ends ${formatDate(campaignEnd, true)}. Pick an earlier date.`
          : undefined
      : undefined,
    paused
      ? "Sending is paused for this workspace"
      : checkStatus === "checking"
        ? "Checking recipient data"
        : checkStatus === "error"
          ? "The recipient check didn't finish. Try again."
          : unknownTag
            ? `Fix {{${unknownTag.tag}}} in the template first`
            : emptyFallback
              ? "Type a fallback, or leave those recipients out"
              : recipients === 0
                ? "Nobody left to send to"
                : !confirmed
        ? "Tick the confirmation to send"
        : undefined,
  ];
  const firstBlocked = blockers.findIndex((b) => b !== undefined);
  const maxReachable = firstBlocked === -1 ? STEPS.length - 1 : firstBlocked;

  const summaries = [
    picked?.template.name,
    listIds.length ? `${n(recipients)} recipients` : undefined,
    sender ? sender.name : undefined,
    when === "now"
      ? "Send now"
      : scheduledIso
        ? atWorkspaceTime(scheduledIso)
        : undefined,
    undefined,
  ];

  function chooseTemplate(id: string) {
    setTemplateId(id);
    setSenderId(defaultSenderFor(id, pool)?.id);
    setConfirmed(false);
  }

  // Stands in for re-running the server check (live app: the recipient rows for this batch).
  function retryCheck() {
    setCheckStatus("checking");
    window.setTimeout(() => setCheckStatus("ready"), 700);
  }

  function send() {
    if (!picked || !sender) return;
    setSubmitting(true);
    setSendError(null);
    // Stands in for POST /api/email/batches.
    window.setTimeout(() => {
      setSubmitting(false);
      if (state === "error") {
        setSendError("The server didn't answer. Nothing was sent.");
        return;
      }
      const id = `n${Date.now().toString(36)}`;
      const nowIso = new Date().toISOString();
      const scheduled = when === "later";
      addCreatedBatch({
        id,
        templateId: picked.template.id,
        campaignId: picked.campaign.id,
        senderId: sender.id,
        listIds,
        status: scheduled ? "scheduled" : "sending",
        recipients,
        sent: 0,
        createdOn: nowIso.slice(0, 10),
        sentAt: scheduled ? undefined : nowIso,
        scheduledFor: scheduledIso,
        name: name.trim() || undefined,
        operatorId: CURRENT_USER_ID,
        metrics: scheduled
          ? undefined
          : {
              delivered: 0,
              opens: 0,
              clicks: 0,
              bounces: 0,
              unsubs: 0,
              replies: 0,
              complaints: 0,
              botOpens: 0,
              botClicks: 0,
              totalOpens: 0,
              totalClicks: 0,
              forwarded: 0,
            },
      });
      toast.success(scheduled ? "Batch scheduled" : "Batch is sending", {
        description: scheduled
          ? `${n(recipients)} recipients on ${atWorkspaceTime(scheduledIso!)}.`
          : `${n(recipients)} recipients. ${sender.shared ? "" : `${picked.template.name} will use ${sender.name} by default next time.`}`,
      });
      router.push(`/batches/${id}/report`);
    }, 900);
  }

  if (state === "loading") {
    return (
      <>
        <PageHeader
          title="New batch"
          breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }]}
        />
        <div className="flex flex-col gap-6" aria-busy>
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Skeleton className="h-96" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </>
    );
  }

  const cols =
    step === 4
      ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_440px]"
      : "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]";
  return (
    <>
      <PageHeader
        title="New batch"
        description="Send one template to your contact lists, now or at a set time."
        breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }]}
      />

      {paused && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Sending is paused for this workspace</AlertTitle>
          <AlertDescription>
            Bounces passed 10% over the last 7 days, so Saella paused every
            send. You can prepare this batch, but it can&apos;t go out until an
            admin resumes sending.
          </AlertDescription>
        </Alert>
      )}
      {locked && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>Sending is locked</AlertTitle>
          <AlertDescription>
            To send a batch, verify a sending domain and confirm a sender first.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/sending">Go to Sending settings</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* The stepper sits in the same grid as the form, so its width matches the form column (2026-11-05). */}
      <div className={cols}>
        <Stepper
          steps={STEPS.map((s, i) => ({
            ...s,
            summary: i < step ? summaries[i] : undefined,
          }))}
          current={step}
          maxReachable={maxReachable}
          onStepClick={setStep}
          // The last step has no connector after it: keep it to its label so "Review" ends at the form's edge.
          className="[&>li:last-child]:flex-none"
        />
      </div>

      <div className={cols}>
        <section
          aria-labelledby="step-title"
          className="flex flex-col gap-6 rounded-card border p-6"
        >
          <h2
            id="step-title"
            className="font-heading text-lg font-medium tracking-title"
          >
            {
              [
                "Which template?",
                "Who gets it?",
                "Send as",
                "When should it go out?",
                "Review and send",
              ][step]
            }
          </h2>

          {step === 0 && (
            <TemplateStep
              templateId={templateId}
              onChange={chooseTemplate}
              canEdit={canEdit}
              active={tplActive}
              onActivate={() => {
                if (!picked) return;
                setActivated((s) => new Set(s).add(picked.template.id));
                toast.success(`“${picked.template.name}” is active`);
              }}
            />
          )}
          {step === 1 && (
            <RecipientsStep
              lists={lists}
              listIds={listIds}
              onChange={(ids) => {
                setListIds(ids);
                setExcludeListIds((x) => x.filter((id) => !ids.includes(id)));
              }}
              audience={audience}
              excludeListIds={excludeListIds}
              onExcludeLists={setExcludeListIds}
              excludeTags={excludeTags}
              onExcludeTags={setExcludeTags}
              tagOptions={tagsIn(contacts, listIds)}
              templateId={templateId}
            />
          )}
          {step === 2 && (
            <SenderStep
              pool={pool}
              senderId={senderId}
              onChange={setSenderId}
              lastUsedId={defaultSenderFor(templateId, senders)?.id}
              recipients={recipients}
              sharedLeft={sharedLeft}
              locked={locked}
            />
          )}
          {step === 3 && (
            <ScheduleStep
              when={when}
              onWhen={setWhen}
              date={date}
              time={time}
              onDate={setDate}
              onTime={setTime}
              error={blockers[3]}
              estimate={estimate}
              campaignEnd={campaignEnd}
            />
          )}
          {step === 4 && picked && sender && (
            <ReviewStep
              rows={[
                {
                  label: "Template",
                  value: picked.template.name,
                  sub: subject ? <>Subject: <SubjectText subject={subject} /></> : "Subject: –",
                  step: 0,
                },
                {
                  label: "Recipients",
                  value: `${n(recipients)} people`,
                  sub: [
                    audience.lists.map((l) => l.name).join(", "),
                    audience.excluded > 0 &&
                      `${n(audience.excluded)} in Don't send to`,
                    skipped.size > 0 &&
                      `${n(skipped.size)} left out for missing data`,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  step: 1,
                },
                {
                  label: "Sender",
                  value: sender.name,
                  sub: sender.email,
                  step: 2,
                },
                {
                  label: "When",
                  value: when === "now" ? "Now" : atWorkspaceTime(scheduledIso!),
                  sub: `${estimate.label} to send all${when === "later" ? ` · ${TZ_LABEL}` : ""}`,
                  step: 3,
                },
              ]}
              onEdit={setStep}
              name={name}
              onName={setName}
              placeholder={batchCode({
                createdOn: NOW.slice(0, 10),
                sentAt: scheduledIso ?? NOW,
              })}
              confirmed={confirmed}
              onConfirm={setConfirmed}
              recipients={recipients}
              scheduled={when === "later"}
              overDaily={estimate.overflow > 0 ? estimate : undefined}
              sendError={sendError}
              checks={
                <RecipientChecks
                  check={check}
                  status={checkStatus}
                  onRetry={retryCheck}
                  recipients={audience.recipients}
                  templateId={picked.template.id}
                  handling={handling}
                  onHandling={(tag, h) => {
                    setHandling((x) => ({ ...x, [tag]: h }));
                    setConfirmed(false);
                  }}
                  fallbacks={fallbacks}
                  onFallback={(tag, v) =>
                    setFallbacks((x) => ({ ...x, [tag]: v }))
                  }
                  onPreview={setPreviewId}
                />
              }
            />
          )}

          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={step === 0 || submitting}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              {blockers[step] && (
                <p className="text-sm text-muted-foreground">
                  {blockers[step]}
                </p>
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  disabled={!!blockers[step]}
                  onClick={() => setStep(step + 1)}
                >
                  Continue
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              ) : (
                <Button
                  disabled={!!blockers[step] || submitting}
                  onClick={send}
                >
                  {submitting ? (
                    <Spinner data-icon="inline-start" />
                  ) : paused ? (
                    <LockIcon data-icon="inline-start" />
                  ) : when === "later" ? (
                    <CalendarClockIcon data-icon="inline-start" />
                  ) : (
                    <SendIcon data-icon="inline-start" />
                  )}
                  {submitting
                    ? "Sending"
                    : when === "later"
                      ? `Schedule for ${n(recipients)} recipients`
                      : `Send to ${n(recipients)} recipients`}
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* On Review the summary gives way to the email preview (R3, 2026-10-29): the review list already shows
            every line of the summary (2026-10-28). */}
        {step === 4 && picked ? (
          <RecipientPreview
            templateId={picked.template.id}
            subject={subject}
            sender={sender}
            people={audience.people}
            issues={check.issues}
            handling={handling}
            fallbacks={fallbacks}
            selectedId={previewId}
            onSelect={setPreviewId}
            status={checkStatus}
            onRetry={retryCheck}
          />
        ) : step < 4 && (
          <SummaryCard
            template={picked?.template.name}
            campaign={picked?.campaign.name}
            recipients={listIds.length ? recipients : undefined}
            sender={sender ? `${sender.name}` : undefined}
            // Sending now: one row, "Now · about 2.5 hours to send", instead of "When: Now" next to a
            // "Time to send: Not set" that read as a contradiction (2026-11-05).
            when={
              when === "now"
                ? listIds.length
                  ? `Now · ${estimate.label.toLowerCase()} to send`
                  : "Now"
                : scheduledIso
                  ? atWorkspaceTime(scheduledIso)
                  : undefined
            }
            estimate={
              when === "later" && listIds.length ? estimate.label : undefined
            }
            showEstimate={when === "later"}
          />
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------

function TemplateStep({
  templateId,
  onChange,
  canEdit,
  active,
  onActivate,
}: {
  templateId?: string;
  onChange: (id: string) => void;
  canEdit: boolean;
  active: boolean;
  onActivate: () => void;
}) {
  const picked = findTemplate(templateId);
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="bw-template">Template</FieldLabel>
        <Select value={templateId} onValueChange={onChange}>
          <SelectTrigger id="bw-template" className="w-full max-w-md">
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            {sampleCampaigns
              .filter((c) => c.templates.length > 0)
              .map((c) => (
                <SelectGroup key={c.id}>
                  <SelectLabel>{c.name}</SelectLabel>
                  {c.templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.status === "inactive" && (
                        <span className="text-muted-foreground">
                          · Inactive
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          Templates live in campaigns. The batch is counted in that
          campaign&apos;s report.
        </FieldDescription>
      </Field>

      {picked && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{picked.template.name}</span>
            <StatusBadge
              status={active ? "template-active" : "template-inactive"}
            />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Subject</dt>
            <dd>{SUBJECTS[picked.template.id] ? <SubjectText subject={SUBJECTS[picked.template.id]} /> : "–"}</dd>
            <dt className="text-muted-foreground">Campaign</dt>
            <dd>
              {picked.campaign.name}
              {picked.campaign.countries.length > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  · {picked.campaign.countries.join(", ")}
                </span>
              )}
            </dd>
            <dt className="text-muted-foreground">Owner</dt>
            <dd>
              {picked.template.owner === CURRENT_USER
                ? "You"
                : picked.template.owner}
            </dd>
          </dl>
        </div>
      )}

      {picked && !canEdit && (
        <Alert variant="destructive">
          <LockIcon />
          <AlertTitle>You can&apos;t send this template</AlertTitle>
          <AlertDescription>
            Sending needs the owner, a share from them, or an admin. Ask{" "}
            {picked.template.owner.split("@")[0]} to share it with you.
          </AlertDescription>
        </Alert>
      )}
      {picked && canEdit && !active && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>This template is inactive</AlertTitle>
          <AlertDescription>
            Only active templates can send. Check its content, then mark it
            active.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={onActivate}>
              Mark active
            </Button>
          </AlertAction>
        </Alert>
      )}
    </FieldGroup>
  );
}

function RecipientsStep({
  lists,
  listIds,
  onChange,
  audience,
  excludeListIds,
  onExcludeLists,
  excludeTags,
  onExcludeTags,
  tagOptions,
  templateId,
}: {
  lists: ContactList[];
  listIds: string[];
  onChange: (ids: string[]) => void;
  audience: RefinedAudience;
  excludeListIds: string[];
  onExcludeLists: (ids: string[]) => void;
  excludeTags: string[];
  onExcludeTags: (tags: string[]) => void;
  /** Contact tags found in the picked lists. */
  tagOptions: string[];
  templateId?: string;
}) {
  const [reviewing, setReviewing] = useState(false);
  if (lists.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>No contact lists yet</EmptyTitle>
          <EmptyDescription>
            Upload a spreadsheet or save companies as a list, then come back to
            send.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href="/contacts">Go to Contacts</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...listIds, id] : listIds.filter((x) => x !== id));
  const SOURCE = {
    upload: "Uploaded",
    companies: "From Companies",
    agent: "Made by the agent",
  } as const;
  // "Don't send to" lists: any list not already picked above. The picker works on names.
  const otherLists = lists.filter((l) => !listIds.includes(l.id));
  const nameOf = (id: string) => lists.find((l) => l.id === id)?.name ?? id;
  const leftOut = audience.contacts - audience.recipients;

  return (
    <div className="flex flex-col gap-6">
      <FieldSet>
        <FieldLegend variant="label">Send to</FieldLegend>
        <FieldDescription>
          People in more than one list get one email.{" "}
          <Link
            href="/contacts"
            className="text-primary underline-offset-4 hover:underline"
          >
            Manage lists
          </Link>
        </FieldDescription>
        <div className="grid gap-3 md:grid-cols-2">
          {lists.map((l) => (
            <FieldLabel key={l.id} htmlFor={`bw-list-${l.id}`}>
              <Field orientation="horizontal">
                <Checkbox
                  id={`bw-list-${l.id}`}
                  checked={listIds.includes(l.id)}
                  onCheckedChange={(v) => toggle(l.id, v === true)}
                />
                <FieldContent>
                  <FieldTitle>{l.name}</FieldTitle>
                  <FieldDescription className="tabular-nums">
                    {n(l.contacts)} contacts · {SOURCE[l.source]}
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          ))}
        </div>
      </FieldSet>

      {listIds.length > 0 && (
        <FieldSet>
          <FieldLegend variant="label">Don&apos;t send to (optional)</FieldLegend>
          <FieldDescription>
            People in these lists or with these tags are left out, even when
            they are in a list above.
          </FieldDescription>
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="bw-exclude-lists">Lists</FieldLabel>
              {otherLists.length > 0 ? (
                <MultiSelect
                  id="bw-exclude-lists"
                  options={otherLists.map((l) => l.name)}
                  value={excludeListIds.map(nameOf)}
                  onChange={(names) =>
                    onExcludeLists(
                      otherLists
                        .filter((l) => names.includes(l.name))
                        .map((l) => l.id),
                    )
                  }
                  placeholder="No list left out"
                />
              ) : (
                <Button
                  id="bw-exclude-lists"
                  variant="outline"
                  disabled
                  className="w-full justify-start font-normal"
                >
                  Every list is picked above
                </Button>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="bw-exclude-tags">Contact tags</FieldLabel>
              {tagOptions.length > 0 ? (
                <MultiSelect
                  id="bw-exclude-tags"
                  options={tagOptions}
                  value={excludeTags.filter((t) => tagOptions.includes(t))}
                  onChange={onExcludeTags}
                  placeholder="No tag left out"
                />
              ) : (
                <Button
                  id="bw-exclude-tags"
                  variant="outline"
                  disabled
                  className="w-full justify-start font-normal"
                >
                  No tags in these lists
                </Button>
              )}
            </Field>
          </div>
        </FieldSet>
      )}

      {listIds.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Estimated recipients</h3>
            <p className="tabular-nums">
              <span className="font-heading text-2xl font-semibold tracking-title">
                {n(audience.recipients)}
              </span>{" "}
              <span className="text-muted-foreground">
                of {n(audience.contacts)} contacts
              </span>
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground tabular-nums">
              {leftOut === 0
                ? "Everyone in these lists gets this email."
                : `${n(leftOut)} won't get this email.`}
              {leftOut > 0 && (
                <Button
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => setReviewing(true)}
                >
                  <ListChecksIcon data-icon="inline-start" />
                  Review who is left out
                </Button>
              )}
            </p>
          </div>
          <LeftOutDialog
            open={reviewing}
            onOpenChange={setReviewing}
            audience={audience}
            templateId={templateId}
            excludeListIds={excludeListIds}
            excludeTags={excludeTags}
          />
          <dl className="grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm tabular-nums">
            <dt className="text-muted-foreground">Contacts in these lists</dt>
            <dd className="text-right">{n(audience.contacts)}</dd>
            <dt className="text-muted-foreground">In more than one list</dt>
            <dd className="text-right">−{n(audience.duplicates)}</dd>
            <dt
              className="text-muted-foreground"
              title="Unsubscribed, bounced before, or an address that can't receive mail"
            >
              Unsubscribed, bounced or invalid
            </dt>
            <dd className="text-right">−{n(audience.unreachable)}</dd>
            <dt className="text-muted-foreground">
              Already received this template
            </dt>
            <dd className="text-right">−{n(audience.alreadyReceived)}</dd>
            {audience.excluded > 0 && (
              <>
                <dt className="text-muted-foreground">In Don&apos;t send to</dt>
                <dd className="text-right">−{n(audience.excluded)}</dd>
              </>
            )}
            {audience.truncated > 0 && (
              <>
                <dt className="text-muted-foreground">
                  Over the {n(BATCH_CAP)} limit per batch
                </dt>
                <dd className="text-right">−{n(audience.truncated)}</dd>
              </>
            )}
            <Separator className="col-span-2 my-1" />
            <dt className="font-medium">Will receive it</dt>
            <dd className="text-right font-medium">{n(audience.recipients)}</dd>
          </dl>
          {audience.truncated > 0 && (
            <Alert variant="warning">
              <TriangleAlertIcon />
              <AlertTitle>Only the first {n(BATCH_CAP)} are sent</AlertTitle>
              <AlertDescription>
                A batch holds up to {n(BATCH_CAP)} people. Send the other{" "}
                {n(audience.truncated)} in a second batch; people who already
                got this template are skipped automatically.
              </AlertDescription>
            </Alert>
          )}
          {audience.recipients === 0 && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Nobody left to send to</AlertTitle>
              <AlertDescription>
                Everyone in these lists already received this template,
                can&apos;t be reached or is in Don&apos;t send to. Pick another
                list or leave out fewer people.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}

function SenderStep({
  pool,
  senderId,
  onChange,
  lastUsedId,
  recipients,
  sharedLeft,
  locked,
}: {
  pool: typeof senders;
  senderId?: string;
  onChange: (id: string) => void;
  lastUsedId?: string;
  recipients: number;
  sharedLeft: number;
  locked: boolean;
}) {
  const sender = pool.find((s) => s.id === senderId);
  return (
    <FieldSet>
      <FieldLegend variant="label">Sender</FieldLegend>
      <FieldDescription>
        You can send as yourself, as identities an admin shared with everyone,
        or through Saella&apos;s shared sender. The template remembers your
        choice for next time.
      </FieldDescription>
      {locked && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>No sender can send yet</AlertTitle>
          <AlertDescription>
            Confirm a sender on a verified domain in Sending settings, then come
            back.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/sending">Set up a sender</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}
      <RadioGroup
        value={senderId ?? ""}
        onValueChange={onChange}
        className="gap-3"
      >
        {pool.map((s) => {
          const avail = senderAvailability(s);
          return (
            <FieldLabel key={s.id} htmlFor={`bw-sender-${s.id}`}>
              <Field
                orientation="horizontal"
                data-disabled={!avail.ok || undefined}
              >
                <RadioGroupItem
                  value={s.id}
                  id={`bw-sender-${s.id}`}
                  disabled={!avail.ok}
                />
                <FieldContent>
                  <FieldTitle>
                    {s.name}
                    {s.shared && <Badge variant="secondary">Shared</Badge>}
                    {s.ownerId === CURRENT_USER_ID && (
                      <Badge variant="secondary">You</Badge>
                    )}
                    {s.id === lastUsedId && avail.ok && (
                      <Badge variant="brand">
                        Last used with this template
                      </Badge>
                    )}
                  </FieldTitle>
                  <FieldDescription>
                    {s.email}
                    {!avail.ok && ` · ${avail.reason}`}
                    {avail.ok &&
                      s.shared &&
                      ` · Up to ${n(SHARED_MONTHLY_CAP)} sends a month (${n(sharedLeft)} left)`}
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          );
        })}
      </RadioGroup>
      {sender?.shared && recipients > sharedLeft && (
        <FieldError>
          This batch needs {n(recipients)} sends; the shared sender has{" "}
          {n(sharedLeft)} left this month. Pick your own sender or fewer
          recipients.
        </FieldError>
      )}
    </FieldSet>
  );
}

function ScheduleStep({
  when,
  onWhen,
  date,
  time,
  onDate,
  onTime,
  error,
  estimate,
  campaignEnd,
}: {
  when: "now" | "later";
  onWhen: (w: "now" | "later") => void;
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  error?: string;
  estimate: ReturnType<typeof sendEstimate>;
  campaignEnd?: string;
}) {
  return (
    <FieldGroup>
      <RadioGroup
        value={when}
        onValueChange={(v) => onWhen(v as "now" | "later")}
        className="grid gap-3 md:grid-cols-2"
      >
        <FieldLabel htmlFor="bw-when-now">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Send now</FieldTitle>
              <FieldDescription>
                Starts within a minute and goes out gradually.
              </FieldDescription>
            </FieldContent>
            <RadioGroupItem value="now" id="bw-when-now" />
          </Field>
        </FieldLabel>
        <FieldLabel htmlFor="bw-when-later">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Schedule for later</FieldTitle>
              <FieldDescription>
                Pick a day and time, for example their working morning.
              </FieldDescription>
            </FieldContent>
            <RadioGroupItem value="later" id="bw-when-later" />
          </Field>
        </FieldLabel>
      </RadioGroup>

      {when === "later" && (
        <div className="flex flex-wrap gap-4">
          <Field className="w-48" data-invalid={!!error || undefined}>
            <FieldLabel htmlFor="bw-date">Date</FieldLabel>
            <DatePicker
              id="bw-date"
              value={date}
              min="2026-10-27"
              max={campaignEnd}
              invalid={!!error}
              onChange={onDate}
            />
          </Field>
          <Field className="w-36" data-invalid={!!error || undefined}>
            <FieldLabel htmlFor="bw-time">Time</FieldLabel>
            <TimePicker id="bw-time" value={time} invalid={!!error} onChange={onTime} />
          </Field>
          <FieldDescription className="basis-full">
            Times are in your workspace time zone, {TZ_LABEL}.
            {campaignEnd &&
              ` The campaign ends ${formatDate(campaignEnd, true)}.`}
          </FieldDescription>
          {error && <FieldError className="basis-full">{error}</FieldError>}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Saella sends about 600 emails an hour to protect your sender reputation.{" "}
        {estimate.label} to send this batch.
      </p>
      {estimate.overflow > 0 && <OverDailyAlert estimate={estimate} />}
    </FieldGroup>
  );
}

function OverDailyAlert({
  estimate,
}: {
  estimate: ReturnType<typeof sendEstimate>;
}) {
  return (
    <Alert variant="info">
      <CalendarClockIcon />
      <AlertTitle>
        This batch spreads over about {estimate.days} days
      </AlertTitle>
      <AlertDescription>
        Your workspace sends up to {n(DAILY_ALLOWANCE)} emails a day.{" "}
        {n(estimate.leftToday)} can go today; the other {n(estimate.overflow)}{" "}
        go out automatically over the next days.
      </AlertDescription>
    </Alert>
  );
}

function ReviewStep({
  rows,
  onEdit,
  name,
  onName,
  placeholder,
  confirmed,
  onConfirm,
  recipients,
  scheduled,
  overDaily,
  sendError,
  checks,
}: {
  rows: { label: string; value: string; sub?: ReactNode; step: number }[];
  onEdit: (step: number) => void;
  name: string;
  onName: (v: string) => void;
  placeholder: string;
  confirmed: boolean;
  onConfirm: (v: boolean) => void;
  recipients: number;
  scheduled: boolean;
  overDaily?: ReturnType<typeof sendEstimate>;
  sendError: string | null;
  /** Per-recipient check of the merge tags (R2). */
  checks: React.ReactNode;
}) {
  return (
    <FieldGroup>
      <dl className="flex flex-col divide-y rounded-lg border">
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[8rem_1fr_auto] items-start gap-4 px-4 py-3"
          >
            <dt className="text-sm text-muted-foreground">{r.label}</dt>
            <dd className="flex min-w-0 flex-col">
              <span className="font-medium tabular-nums">{r.value}</span>
              {r.sub && (
                <span className="truncate text-sm text-muted-foreground">
                  {r.sub}
                </span>
              )}
            </dd>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(r.step)}
              aria-label={`Change ${r.label.toLowerCase()}`}
            >
              Change
            </Button>
          </div>
        ))}
      </dl>

      {checks}

      <Field className="max-w-md">
        <FieldLabel htmlFor="bw-name">Batch name (optional)</FieldLabel>
        <Input
          id="bw-name"
          value={name}
          maxLength={120}
          placeholder={placeholder}
          onChange={(e) => onName(e.target.value)}
        />
        <FieldDescription>
          Leave it blank to use the code {placeholder} in reports.
        </FieldDescription>
      </Field>

      {overDaily && <OverDailyAlert estimate={overDaily} />}

      <FieldLabel htmlFor="bw-confirm">
        <Field orientation="horizontal">
          <Checkbox
            id="bw-confirm"
            checked={confirmed}
            onCheckedChange={(v) => onConfirm(v === true)}
          />
          <FieldContent>
            <FieldTitle>
              I checked the template, the recipients and the sender
            </FieldTitle>
            <FieldDescription>
              {scheduled
                ? `${n(recipients)} emails go out at the scheduled time. You can cancel until then.`
                : `${n(recipients)} emails start going out right away. A sent email can't be taken back.`}
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>

      {sendError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Couldn&apos;t create the batch</AlertTitle>
          <AlertDescription>
            {sendError} Try again in a moment.
          </AlertDescription>
        </Alert>
      )}
    </FieldGroup>
  );
}

function SummaryCard({
  template,
  campaign,
  recipients,
  sender,
  when,
  estimate,
  showEstimate = true,
}: {
  template?: string;
  campaign?: string;
  recipients?: number;
  sender?: string;
  when?: string;
  estimate?: string;
  /** Off when sending now: the When row already carries the estimate. */
  showEstimate?: boolean;
}) {
  const row = (label: string, value?: React.ReactNode) => (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={value ? "text-right" : "text-right text-subtle-foreground"}
      >
        {value ?? "Not set"}
      </dd>
    </>
  );
  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle>This batch</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm tabular-nums">
          {row(
            "Template",
            template && <span className="line-clamp-2">{template}</span>,
          )}
          {row(
            "Campaign",
            campaign && <span className="line-clamp-2">{campaign}</span>,
          )}
          {row(
            "Recipients",
            recipients !== undefined ? n(recipients) : undefined,
          )}
          {row("Sender", sender)}
          {row("When", when)}
          {showEstimate && row("Time to send", estimate)}
        </dl>
      </CardContent>
    </Card>
  );
}
