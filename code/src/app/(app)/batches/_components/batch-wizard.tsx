"use client";

// New batch wizard: /batches/new?template=<id> (PRD-02 BAT-CREATE-001, AC-EC-B-01..08, live app EmailBatchWizard +
// POST /api/email/batches). Template → Recipients → Sender → Review. A batch sends now: neither the PRD nor the live
// app schedules a one-off batch; timed sends are Automate › Schedule (decisions.md "Gửi batch").
// Recipients come from one source per batch (2026-11-12, AC-EC-B-02, live app "Send to: Companies | Self-upload"):
// - Unlocked companies (default): companies the workspace unlocked, no filter at first (designer 2026-11-14), picked in a
//   table (company-picker.tsx, company-audience.ts). Designer decision 2026-11-12: only unlocked companies can be
//   sent to and credits are spent in Leads only (the live app unlocks on send, #116); sending is free (PRD-05).
// - Self-upload: contacts by tag, with "Don't send to" (recipient-check.ts).
// Review: one summary, the per-recipient merge-tag check, the email preview; Send is the confirmation.
// Preview states (?state=):
//   paused       workspace auto-paused (BR-RULE-EC-18/19): everything can be prepared, Send stays locked
//   locked       no verified domain / confirmed sender (AC-EC-B-01): no sender to pick, link to Settings
//   inactive     opens on an inactive template (t3) to show the "mark active" block
//   empty        no contacts yet (Self-upload)
//   error        the send request fails (shows the error and Try again)
//   loading      skeleton while contacts and senders load
//   checking     Review: the per-recipient check is still running (Send waits)
//   check-error  Review: the per-recipient check failed (Try again)
//   badtag       Review: the subject uses {{first_name}}, a tag Saella doesn't know (blocks Send)
// Also ?step=0..3; ?source=contacts&tags=hotel,fair&excludeTags=vip (the agent handing over a prepared batch);
// ?pick=all selects every unlocked company.

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CircleAlertIcon,
  LockIcon,
  PlusIcon,
  SendIcon,
  TriangleAlertIcon,
  UsersIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { CURRENT_USER, formatDate, industryLabels, sampleCampaigns } from "@/lib/mock/campaigns";
import { companies as allCompanies } from "@/lib/mock/companies";
import { type Contact, tagsOf, useContactsStore, withAnyTag } from "@/lib/mock/contacts";
import { NOW } from "@/lib/mock/constants";
import { useUnlocks } from "@/lib/mock/unlocks";
import { useTemplateStore } from "@/lib/mock/use-template-store";
import { NewTemplateDialog } from "@/components/features/new-template-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { FilterChips, FilterMultiSelect, FilterPopover } from "@/components/saella/filter-popover";
import { Stepper } from "@/components/saella/stepper";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { senders } from "@/lib/mock/workspace";
import { cn } from "@/lib/utils";
import {
  BATCH_CAP,
  CURRENT_USER_ID,
  DAILY_ALLOWANCE,
  SHARED_MONTHLY_CAP,
  SHARED_USED_THIS_MONTH,
  addCreatedBatch,
  batchCode,
  defaultSenderFor,
  findTemplate,
  sendEstimate,
  senderAvailability,
} from "@/lib/mock/batches";
import {
  type AudienceFilters,
  NO_AUDIENCE_FILTERS,
  companyAudience,
  companyRecipient,
  matchCompanies,
} from "./company-audience";
import { CompanyPicker } from "./company-picker";
import { LeftOutDialog } from "./left-out-dialog";
import { type RefinedAudience, DEFAULT_FALLBACK, buildAudience, checkRecipients, subjectFor } from "./recipient-check";
import { type CheckStatus, type Handling, RecipientChecks } from "./recipient-checks";
import { RecipientListDialog } from "./recipient-list-dialog";
import { RecipientPreview } from "./recipient-preview";
import { BODY_CELL, HEAD_CELL, HEADER, TABLE, TableFrame, usePaging } from "./table-frame";
import { SubjectText } from "./subject-text";

const STEPS = [
  { id: "template", label: "Template" },
  { id: "recipients", label: "Recipients" },
  { id: "sender", label: "Sender" },
  { id: "review", label: "Review" },
];
const REVIEW = STEPS.length - 1;

type Source = "companies" | "contacts";

const n = (x: number) => x.toLocaleString("en-US");

export function BatchWizard() {
  // The wizard seeds its state from the URL once. Next keeps a visited page's state when you come back to it, so a new
  // URL (e.g. back from making a template, now with ?template=) starts the wizard afresh.
  return <Wizard key={useSearchParams().toString()} />;
}

function Wizard() {
  const params = useSearchParams();
  const router = useRouter();
  const state = params.get("state");
  const paused = state === "paused";
  const locked = state === "locked";

  // Sending starts from a template (?template=, 2026-11-14); the Leads › Unlocked hand-over (?companies=) is gone.
  const [step, setStep] = useState(() => Math.min(REVIEW, Math.max(0, Number(params.get("step")) || 0)));
  const [templateId, setTemplateId] = useState<string | undefined>(
    () => (state === "inactive" ? "t3" : params.get("template")) ?? undefined,
  );
  // Templates marked active from this screen (the live app does it from the board; here so the block can clear).
  const [activated, setActivated] = useState<Set<string>>(() => new Set());
  const [source, setSource] = useState<Source>(() =>
    (params.get("source") === "contacts" || params.get("tags") || params.get("tag") || state === "empty")
      ? "contacts"
      : "companies",
  );
  // Self-upload is picked contact by contact now (designer 2026-11-13); ?tags= / ?excludeTags= (the agent's hand-over)
  // only pre-select the contacts that carry those tags.
  const seedTags = (params.get("tags") ?? params.get("tag"))?.split(",").filter(Boolean) ?? [];
  const seedExclude = params.get("excludeTags")?.split(",").filter(Boolean) ?? [];
  // Unlocked companies: no filter at first, the user adds them (designer 2026-11-14); search, sent switch, the picks.
  const { unlocked } = useUnlocks();
  const [companyFilters, setCompanyFilters] = useState<AudienceFilters>(() =>
    NO_AUDIENCE_FILTERS,
  );
  const [companyQuery, setCompanyQuery] = useState("");
  const [pickedIds, setPickedIds] = useState<Set<string>>(() =>
    params.get("pick") === "all"
      ? new Set(
          matchCompanies(NO_AUDIENCE_FILTERS, "", unlocked)
            .rows.slice(0, BATCH_CAP)
            .map((c) => c.id),
        )
      : new Set(),
  );

  const pool = useMemo(
    () => (locked ? senders.map((s) => ({ ...s, status: "unconfirmed" as const })) : senders),
    [locked],
  );
  const [senderId, setSenderId] = useState<string | undefined>(() => defaultSenderFor(templateId, pool)?.id);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // People taken out one by one on Review (live app confirm step: "Remove" per recipient row).
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [listing, setListing] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // Per-recipient check (R2): per merge tag, send with a fallback word or leave those people out.
  const [handling, setHandling] = useState<Record<string, Handling>>({});
  const [fallbacks, setFallbacks] = useState<Record<string, string>>(() => ({ ...DEFAULT_FALLBACK }));
  const [checkStatus, setCheckStatus] = useState<CheckStatus>(() =>
    state === "checking" ? "checking" : state === "check-error" ? "error" : "ready",
  );
  // Whose email the preview shows (R3); unset = the first recipient.
  const [previewId, setPreviewId] = useState<string>();
  const { contacts } = useContactsStore();

  const book = useMemo(() => (state === "empty" ? [] : contacts), [state, contacts]);
  // Self-upload Tag filter (live app: tag picker over the contact list; AND like Leads › Self-upload, 2026-11-14),
  // seeded from ?tags=. The agent hand-over also pre-selects the contacts it matches (minus ?excludeTags=).
  const [tagFilter, setTagFilter] = useState<string[]>(seedTags);
  const [contactIds, setContactIds] = useState<Set<string>>(() => {
    if (!seedTags.length) return new Set();
    const out = new Set(withAnyTag(book, seedExclude).map((c) => c.id));
    return new Set(withAllTags(book, seedTags).filter((c) => !out.has(c.id)).map((c) => c.id));
  });
  const picked = findTemplate(templateId);
  const tplActive = picked ? picked.template.status === "active" || activated.has(picked.template.id) : false;
  const canEdit = picked
    ? picked.template.owner === CURRENT_USER || picked.template.shared === true
    : false;

  // Self-upload audience.
  const contactAudience = useMemo(
    () => buildAudience(book, [], [], templateId, contactIds),
    [book, templateId, contactIds],
  );
  // The batch's tags (report filters): the tags the picked contacts carry.
  const tags = useMemo(() => tagsOf(book.filter((c) => contactIds.has(c.id))), [book, contactIds]);
  // Saella companies: what matches the filters, and what is picked (in registry order).
  const matched = useMemo(
    () => matchCompanies(companyFilters, companyQuery, unlocked),
    [companyFilters, companyQuery, unlocked],
  );
  // Every picked company is sent to (no Not sent / Sent split, designer 2026-11-14).
  const pickedCompanies = useMemo(() => allCompanies.filter((c) => pickedIds.has(c.id)), [pickedIds]);
  const companyAud = useMemo(() => companyAudience(pickedCompanies), [pickedCompanies]);

  const fromCompanies = source === "companies";
  const people = useMemo(
    () => (fromCompanies ? companyAud.companies.map(companyRecipient) : contactAudience.people),
    [fromCompanies, companyAud, contactAudience.people],
  );
  const subject = state === "badtag" ? "Quick question, {{first_name}}" : subjectFor(templateId);
  const check = useMemo(() => checkRecipients(templateId, subject, people), [templateId, subject, people]);
  // People the check leaves out, by the choice made per merge tag.
  const skipped = new Set(
    check.issues.flatMap((i) => (i.kind === "missing" && handling[i.tag] === "skip" ? i.people.map((p) => p.id) : [])),
  );
  const unknownTag = check.issues.find((i) => i.kind === "unknown");
  const emptyFallback = check.issues.find(
    (i) => i.kind === "missing" && handling[i.tag] !== "skip" && !fallbacks[i.tag]?.trim(),
  );
  const removedHere = people.filter((p) => removed.has(p.id) && !skipped.has(p.id)).length;
  /** What the batch sends to: the audience minus anyone the Review check leaves out or removed by hand. */
  const recipients = people.length - skipped.size - removedHere;

  const sender = pool.find((s) => s.id === senderId);
  const sharedLeft = SHARED_MONTHLY_CAP - SHARED_USED_THIS_MONTH;
  const estimate = sendEstimate(recipients);

  // Why each step can't continue yet; undefined = fine.
  const blockers: (string | undefined)[] = [
    !picked
      ? "Pick a template"
      : !canEdit
        ? `Only ${picked.template.owner.split("@")[0]} or people they share with can send this template`
        : !tplActive
          ? "Mark the template active to send it"
          : undefined,
    fromCompanies
      ? pickedIds.size === 0
        ? "Select at least one company"
        : companyAud.companies.length === 0
          ? "None of these companies can receive email"
          : undefined
      : contactIds.size === 0
        ? "Select at least one contact"
        : contactAudience.recipients === 0
          ? "None of these contacts can receive it"
          : undefined,
    !sender
      ? "Pick a sender"
      : !senderAvailability(sender).ok
        ? "This sender can't send yet"
        : sender.shared && recipients > sharedLeft
          ? `The shared sender has ${n(sharedLeft)} sends left this month`
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
                : undefined,
  ];
  const firstBlocked = blockers.findIndex((b) => b !== undefined);
  const maxReachable = firstBlocked === -1 ? REVIEW : firstBlocked;


  function chooseTemplate(id: string) {
    setTemplateId(id);
    setSenderId(defaultSenderFor(id, pool)?.id);
    // A new template starts a fresh pick with no filter.
    setCompanyFilters(NO_AUDIENCE_FILTERS);
    setPickedIds(new Set());
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
      addCreatedBatch({
        id,
        templateId: picked.template.id,
        campaignId: picked.campaign.id,
        senderId: sender.id,
        tags: fromCompanies ? [] : tags,
        status: "sending",
        recipients,
        sent: 0,
        createdOn: nowIso.slice(0, 10),
        sentAt: nowIso,
        name: name.trim() || undefined,
        operatorId: CURRENT_USER_ID,
        metrics: {
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
      // Live app: "Batch queued with N recipients".
      toast.success(`Batch queued for ${n(recipients)} ${fromCompanies ? "companies" : "recipients"}`);
      router.push(`/batches/${id}/report`);
    }, 900);
  }

  if (state === "loading") {
    return (
      <>
        <PageHeader title="New batch" description="Pick who gets this template, then review and send." breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }]} />
        <div className="flex flex-col gap-6" aria-busy>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96" />
        </div>
      </>
    );
  }

  const review = step === REVIEW;
  // One source per batch (AC-EC-B-02).
  const sourceTabs = (
    <Tabs value={source} onValueChange={(v) => setSource(v as Source)}>
      <TabsList aria-label="Send to">
        <TabsTrigger value="companies">Unlocked companies</TabsTrigger>
        <TabsTrigger value="contacts">Self-upload</TabsTrigger>
      </TabsList>
    </Tabs>
  );
  // Recipients fills the viewport like the Leads tables (designer 2026-11-14): only the rows scroll; the stepper, the
  // toolbar, the pager and Back / Continue stay on screen (Leads: companies-screen.tsx; 2rem more for this page's padding).
  const fill = step === 1;
  return (
    <div className={fill ? "flex h-[calc(100svh-10.5rem)] min-h-[560px] flex-col gap-4 md:gap-6" : "contents"}>
      <PageHeader title="New batch" description="Pick who gets this template, then review and send." breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }]} />

      {paused && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Sending is paused for this workspace</AlertTitle>
          <AlertDescription>
            Bounces passed 10% over the last 7 days. You can prepare this batch; it sends once an admin resumes
            sending.
          </AlertDescription>
        </Alert>
      )}
      {locked && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>Sending is locked</AlertTitle>
          <AlertDescription>Verify a sending domain and confirm a sender first.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/domain">Go to Domain settings</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}

      <Stepper
        // Step names only, no summary line under done steps (designer 2026-11-13): the same look for every step.
        steps={STEPS}
        current={step}
        maxReachable={maxReachable}
        onStepClick={setStep}
        // The last step has no connector after it: keep it to its label so "Review" ends at the form's edge.
        className="[&>li:last-child]:flex-none"
      />

      <div
        className={
          review
            ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_440px]"
            : cn("flex flex-col", fill && "min-h-0 flex-1")
        }
      >
        <section
          aria-labelledby="step-title"
          className={cn("flex flex-col rounded-card border p-6", fill ? "min-h-0 flex-1 gap-4" : "gap-6")}
        >
          {/* Recipients opens on its source tabs; the stepper already names the step, so its title is for screen
              readers only (designer feedback 2026-11-12). */}
          <h2
            id="step-title"
            className={step === 1 ? "sr-only" : "font-heading text-lg font-medium tracking-title"}
          >
            {["Which template?", "Who gets it?", "Send as", "Review and send"][step]}
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
            // Source tabs and the list's toolbar on one row (designer 2026-11-14): the tabs stay in this grid cell for
            // both sources; each list joins the grid (`contents`) with its toolbar in column 2 and the rest below.
            <div className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
              <div className="col-start-1 row-start-1">{sourceTabs}</div>
              {fromCompanies ? (
                <CompanyPicker
                  rows={matched.rows}
                  query={companyQuery}
                  onQuery={setCompanyQuery}
                  filters={companyFilters}
                  onFilters={setCompanyFilters}
                  selected={pickedIds}
                  onSelected={setPickedIds}
                />
              ) : (
                <ContactsStep
                  contacts={book}
                  tagFilter={tagFilter}
                  onTagFilter={setTagFilter}
                  selected={contactIds}
                  onSelected={setContactIds}
                  audience={contactAudience}
                  templateId={templateId}
                />
              )}
            </div>
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
          {review && picked && sender && (
            <ReviewStep
              rows={[
                {
                  label: "Template",
                  value: picked.template.name,
                  sub: subject ? <SubjectText subject={subject} /> : undefined,
                  action: { label: "Change", onClick: () => setStep(0) },
                },
                {
                  // Final count plus what took people out (BAT-CREATE-001: matched, suppressed, dropped).
                  label: "Recipients",
                  value: `${n(recipients)} ${fromCompanies ? "unlocked companies" : "people"}`,
                  sub:
                    [
                      fromCompanies && companyAud.undeliverable > 0 && `${n(companyAud.undeliverable)} can't receive email`,
                      fromCompanies && companyAud.truncated > 0 && `${n(companyAud.truncated)} over the ${n(BATCH_CAP)} limit`,
                      !fromCompanies &&
                        contactAudience.contacts > contactAudience.recipients &&
                        `${n(contactAudience.contacts - contactAudience.recipients)} left out`,
                      skipped.size > 0 && `${n(skipped.size)} missing data`,
                      removedHere > 0 && `${n(removedHere)} removed`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined,
                  action: { label: "See who", onClick: () => setListing(true) },
                },
                {
                  label: "Sender",
                  value: sender.name,
                  sub: sender.email,
                  action: { label: "Change", onClick: () => setStep(2) },
                },
                {
                  // Schedules, follow-ups and hand-sent batches share one daily allowance (PRD Master v1.1.9).
                  label: "Time to send",
                  value: estimate.label,
                  sub: estimate.overflow > 0 ? undefined : `${n(estimate.leftToday)} sends left today`,
                },
                {
                  // Live app "Monthly quota remaining", here where the send is decided (2026-11-14). Sending from the
                  // workspace's own domain is unlimited (live SENDING_UNLIMITED, PRD v1.0.9); the shared sender keeps
                  // its monthly cap (EC-EC-34).
                  label: "Monthly quota",
                  value: sender.shared ? `${n(sharedLeft - recipients)} left after this batch` : "Unlimited",
                  sub: sender.shared
                    ? `${n(sharedLeft)} of ${n(SHARED_MONTHLY_CAP)} left this month on the shared sender`
                    : undefined,
                },
              ]}
              name={name}
              onName={setName}
              placeholder={batchCode({ createdOn: NOW.slice(0, 10), sentAt: NOW })}
              overDaily={estimate.overflow > 0 ? estimate : undefined}
              sendError={sendError}
              checks={
                <RecipientChecks
                  check={check}
                  status={checkStatus}
                  onRetry={retryCheck}
                  recipients={people.length}
                  templateId={picked.template.id}
                  handling={handling}
                  onHandling={(tag, h) => setHandling((x) => ({ ...x, [tag]: h }))}
                  fallbacks={fallbacks}
                  onFallback={(tag, v) => setFallbacks((x) => ({ ...x, [tag]: v }))}
                  onPreview={setPreviewId}
                />
              }
            />
          )}

          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" disabled={step === 0 || submitting} onClick={() => setStep(step - 1)}>
              <ArrowLeftIcon data-icon="inline-start" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              {blockers[step] && <p className="text-sm text-muted-foreground">{blockers[step]}</p>}
              {step < REVIEW ? (
                <Button disabled={!!blockers[step]} onClick={() => setStep(step + 1)}>
                  Continue
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              ) : (
                <Button disabled={!!blockers[step] || submitting} onClick={send} className="tabular-nums">
                  {submitting ? (
                    <Spinner data-icon="inline-start" />
                  ) : paused ? (
                    <LockIcon data-icon="inline-start" />
                  ) : (
                    <SendIcon data-icon="inline-start" />
                  )}
                  {submitting ? "Sending" : `Send batch (${n(recipients)})`}
                </Button>
              )}
            </div>
          </div>
        </section>

        {review && picked && (
          <RecipientPreview
            templateId={picked.template.id}
            subject={subject}
            sender={sender}
            people={people.filter((p) => !removed.has(p.id))}
            issues={check.issues}
            handling={handling}
            fallbacks={fallbacks}
            selectedId={previewId}
            onSelect={setPreviewId}
            status={checkStatus}
            onRetry={retryCheck}
          />
        )}
      </div>

      <RecipientListDialog
        open={listing}
        onOpenChange={setListing}
        people={people}
        leftOut={skipped}
        removed={removed}
        onRemoved={setRemoved}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------

const NEW_TEMPLATE = "__new-template";

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
  const store = useTemplateStore();
  const params = useSearchParams();
  const [creating, setCreating] = useState(false);
  const picked = findTemplate(templateId);
  // Seed campaigns with this session's templates (copies, made in the editor), then campaigns that only have those.
  const gone = new Set(store.deleted);
  const groups = [
    ...sampleCampaigns.map((c) => ({
      id: c.id,
      name: c.name,
      templates: [...c.templates, ...store.copies.filter((x) => x.campaign.id === c.id).map((x) => x.template)],
    })),
    ...Array.from(
      new Map(
        store.copies
          .filter((x) => !sampleCampaigns.some((c) => c.id === x.campaign.id))
          .map((x) => [x.campaign.id, x.campaign] as const)
      ).values()
    ).map((c) => ({ id: c.id, name: c.name, templates: store.copies.filter((x) => x.campaign.id === c.id).map((x) => x.template) })),
  ]
    .map((g) => ({ ...g, templates: g.templates.filter((t) => !gone.has(t.id)).map((t) => ({ ...t, ...store.patch[t.id] })) }))
    .filter((g) => g.templates.length > 0);
  // "+ New template" (designer 2026-11-13): make one (and its campaign if needed), write it, come back here with it
  // picked.
  const back = new URLSearchParams(params);
  back.delete("template");
  back.delete("step");
  const returnTo = `/batches/new${back.size ? `?${back}` : ""}`;
  // Campaign first, then only its templates (designer 2026-11-14: the full list of every campaign's templates was too
  // much). Opened on a template, its campaign is picked already.
  const [campaignId, setCampaignId] = useState<string | undefined>(() => picked?.campaign.id);
  // Opened from a template (Send on its row, or back from making one): its campaign is fixed, shown as text; only
  // the template is picked, among that campaign's (designer 2026-11-14).
  const [campaignFixed] = useState(() => Boolean(params.get("template") && picked));
  // Only active templates can be picked (designer 2026-11-14); the one already chosen stays listed so it can show.
  const all = groups.find((g) => g.id === campaignId);
  const group = all && {
    ...all,
    templates: all.templates.filter((t) => t.status === "active" || t.id === templateId),
  };
  const campaign = sampleCampaigns.find((c) => c.id === campaignId) ?? picked?.campaign;
  // First industry + "+N", so the targeting stays one line (the full list is on the campaign).
  const industries = industryLabels(campaign?.industries ?? []);
  const targeting = campaign
    ? [
        campaign.countries.join(", ") || "All countries",
        industries.length === 0 ? "Any industry" : industries.length > 1 ? `${industries[0]} +${industries.length - 1}` : industries[0],
      ]
    : [];
  return (
    <FieldGroup className="max-w-2xl">
      {campaignFixed ? (
        <Field>
          <FieldLabel>Campaign</FieldLabel>
          <p className="text-sm font-medium">{campaign?.name}</p>
          <FieldDescription>{targeting.join(" · ")}</FieldDescription>
        </Field>
      ) : (
      <Field>
        <FieldLabel htmlFor="bw-campaign">Campaign</FieldLabel>
        <Select
          value={campaignId}
          onValueChange={(v) => {
            setCampaignId(v);
            // Another campaign: the template is picked again from its list.
            if (picked && picked.campaign.id !== v) onChange("");
          }}
        >
          <SelectTrigger id="bw-campaign" className="w-full">
            <SelectValue placeholder="Select a campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {groups.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {campaign && <FieldDescription>{targeting.join(" · ")}</FieldDescription>}
      </Field>
      )}
      <Field data-disabled={!group || undefined}>
        <FieldLabel htmlFor="bw-template">Template</FieldLabel>
        <Select
          value={templateId && group?.templates.some((t) => t.id === templateId) ? templateId : ""}
          onValueChange={(v) => (v === NEW_TEMPLATE ? setCreating(true) : onChange(v))}
          disabled={!group}
        >
          <SelectTrigger id="bw-template" className="w-full">
            <SelectValue
              placeholder={!group ? "Pick a campaign first" : group.templates.length ? "Select a template" : "No active template in this campaign"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {group?.templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                  {t.status === "inactive" && <span className="text-muted-foreground">· Inactive</span>}
                </SelectItem>
              ))}
            </SelectGroup>
            {group && group.templates.length > 0 && <SelectSeparator />}
            <SelectItem value={NEW_TEMPLATE}>
              <PlusIcon />
              New template
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <NewTemplateDialog
        open={creating}
        onOpenChange={setCreating}
        campaigns={sampleCampaigns}
        defaultCampaignId={campaignId}
        returnTo={returnTo}
      />

      {picked && !canEdit && (
        <Alert variant="destructive">
          <LockIcon />
          <AlertTitle>You can&apos;t send this template</AlertTitle>
          <AlertDescription>Ask {picked.template.owner.split("@")[0]} to share it with you.</AlertDescription>
        </Alert>
      )}
      {picked && canEdit && !active && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>This template is inactive</AlertTitle>
          <AlertDescription>Check its content, then mark it active to send it.</AlertDescription>
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

// Self-upload recipients as a table like Leads › Self-upload (designer 2026-11-13; it was tag cards): search, then
// Contact · Company · Email status · Tags · Last sent, scrolling inside. People who can't receive it, duplicates and
// ones this template already reached are counted as "left out" below, as before.

/** Contacts carrying every one of these tags (Leads › Self-upload Tag filter, AND). */
function withAllTags(contacts: Contact[], tags: string[]) {
  const want = tags.map((t) => t.toLowerCase());
  return contacts.filter((c) => {
    const own = c.tags.map((t) => t.toLowerCase());
    return want.every((t) => own.includes(t));
  });
}

function ContactsStep({
  contacts,
  tagFilter,
  onTagFilter,
  selected,
  onSelected,
  audience,
  templateId,
}: {
  contacts: Contact[];
  tagFilter: string[];
  onTagFilter: (tags: string[]) => void;
  selected: ReadonlySet<string>;
  onSelected: (next: Set<string>) => void;
  audience: RefinedAudience;
  templateId?: string;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [query, setQuery] = useState("");
  // Memoised: a new list sends the pager back to page 1.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tagged = tagFilter.length ? withAllTags(contacts, tagFilter) : contacts;
    return q
      ? tagged.filter((c) =>
          [`${c.firstName} ${c.lastName}`, c.email, c.company, ...c.tags].some((v) => v.toLowerCase().includes(q))
        )
      : tagged;
  }, [contacts, tagFilter, query]);
  const paging = usePaging(rows);
  if (contacts.length === 0) {
    return (
      <Empty className="col-span-2 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>No contacts yet</EmptyTitle>
          <EmptyDescription>Upload your contacts, then come back to send.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href="/contacts">Go to Self-upload</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  const ids = rows.map((c) => c.id);
  const allPicked = ids.length > 0 && ids.every((id) => selected.has(id));
  const pageIds = paging.rows.map((c) => c.id);
  const pagePicked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const pageSome = pageIds.some((id) => selected.has(id));
  const setMany = (list: string[], on: boolean) => {
    const next = new Set(selected);
    list.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onSelected(next);
  };
  const pickAll = (on: boolean) => setMany(ids, on);
  const pickPage = (on: boolean) => setMany(pageIds, on);
  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    onSelected(next);
  };
  const leftOut = audience.contacts - audience.recipients;

  return (
    // `contents`: the toolbar joins the wizard's grid, on the source tabs' row (designer 2026-11-14).
    <div className="contents">
      <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-2">
        <InputGroup className="h-8 w-64">
          <InputGroupAddon align="inline-start">
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label="Search contacts"
            placeholder="Name, email, company"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
        <FilterPopover count={tagFilter.length} onClearAll={() => onTagFilter([])} size="default">
          <FilterMultiSelect
            label="Tag"
            options={tagsOf(contacts)}
            value={tagFilter}
            onChange={onTagFilter}
            placeholder="Any tag"
            searchPlaceholder="Search tags"
          />
        </FilterPopover>
      </div>
      <div className="col-span-2 flex min-h-0 flex-col gap-3 self-stretch">
      <FilterChips
        chips={tagFilter.map((t) => ({
          key: `tag:${t}`,
          label: "Tag",
          value: t,
          onRemove: () => onTagFilter(tagFilter.filter((x) => x !== t)),
        }))}
        onClearAll={() => onTagFilter([])}
      />

      <TableFrame
        paging={paging}
        noun="contacts"
        label="Contact pages"
        status={
          <>
            {/* Selection line above the rows, as Unlocked companies: count, what it sends to, select every match. */}
            <span>
              <span className="font-medium text-foreground">{n(selected.size)}</span> of{" "}
              <span className="font-medium text-foreground">{n(rows.length)}</span> selected
            </span>
            {selected.size > 0 && (
              <span>
                <span className="font-medium text-foreground">{n(audience.recipients)}</span> recipients
              </span>
            )}
            {selected.size > 0 && leftOut > 0 && (
              <Button variant="link" className="h-auto border-0 p-0 tabular-nums" onClick={() => setReviewing(true)}>
                {n(leftOut)} left out
              </Button>
            )}
            {pagePicked && !allPicked && rows.length > paging.rows.length && (
              <Button variant="link" className="h-auto border-0 p-0" onClick={() => pickAll(true)}>
                Select all {n(rows.length)} matching
              </Button>
            )}
            {selected.size > 0 && (
              <Button variant="link" className="h-auto border-0 p-0" onClick={() => onSelected(new Set())}>
                Clear selection
              </Button>
            )}
          </>
        }
      >
        <Table aria-label="Contacts to send to" className={cn(TABLE, "table-fixed")}>
          <colgroup>
            <col className="w-10" />
            <col />
            <col className="w-48" />
            <col className="w-32" />
            <col className="w-56" />
            <col className="w-32" />
          </colgroup>
          <TableHeader className={HEADER}>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(HEAD_CELL, "px-0 text-center")}>
                <div className="flex justify-center">
                  <Checkbox
                    aria-label="Select this page"
                    checked={pagePicked ? true : pageSome ? "indeterminate" : false}
                    onCheckedChange={(v) => pickPage(v === true)}
                  />
                </div>
              </TableHead>
              <TableHead className={HEAD_CELL}>Contact</TableHead>
              <TableHead className={HEAD_CELL}>Company</TableHead>
              <TableHead className={HEAD_CELL}>Email status</TableHead>
              <TableHead className={HEAD_CELL}>Tags</TableHead>
              <TableHead className={HEAD_CELL}>Last sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paging.rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className={cn(BODY_CELL, "h-24 text-center text-muted-foreground")}>
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              paging.rows.map((c) => {
                const on = selected.has(c.id);
                return (
                  <TableRow key={c.id} className="border-0" data-state={on ? "selected" : undefined}>
                    <TableCell className={cn(BODY_CELL, "px-0 text-center")}>
                      <div className="flex justify-center">
                        <Checkbox
                          aria-label={`Select ${c.firstName} ${c.lastName}`}
                          checked={on}
                          onCheckedChange={(v) => toggle(c.id, v === true)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className={BODY_CELL}>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{`${c.firstName} ${c.lastName}`.trim() || c.email}</span>
                        <span className="truncate text-muted-foreground">{c.email}</span>
                      </span>
                    </TableCell>
                    <TableCell className={cn(BODY_CELL, "truncate")}>{c.company}</TableCell>
                    <TableCell className={BODY_CELL}>
                      {c.unreachable ? <Badge variant="destructive">Invalid</Badge> : <Badge variant="success">Valid</Badge>}
                    </TableCell>
                    <TableCell className={BODY_CELL}>
                      <span className="flex min-w-0 items-center gap-1">
                        {c.tags.slice(0, 2).map((t) => (
                          <Badge key={t} variant="secondary" className="truncate">
                            {t}
                          </Badge>
                        ))}
                        {c.tags.length > 2 && <Badge variant="outline">+{c.tags.length - 2}</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className={cn(BODY_CELL, "text-muted-foreground tabular-nums")}>
                      {c.lastSent ? formatDate(c.lastSent.on) : ""}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableFrame>

      {selected.size > 0 && (
        <>
          <LeftOutDialog open={reviewing} onOpenChange={setReviewing} audience={audience} templateId={templateId} excludeTags={[]} />
          {audience.truncated > 0 && (
            <Alert variant="warning">
              <TriangleAlertIcon />
              <AlertTitle>Only the first {n(BATCH_CAP)} are sent</AlertTitle>
              <AlertDescription>Send the other {n(audience.truncated)} in a second batch.</AlertDescription>
            </Alert>
          )}
        </>
      )}
      </div>
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
    <FieldSet className="max-w-2xl">
      <FieldLegend className="sr-only">Sender</FieldLegend>
      {locked && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>No sender can send yet</AlertTitle>
          <AlertDescription>Confirm a sender on a verified domain first.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/sending">Set up a sender</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}
      {/* A dropdown of the senders that can send now (designer 2026-11-13): unconfirmed ones and other members' own
          senders aren't listed; they're set up in Settings › Sending. */}
      {!locked && (
        <Field>
          <FieldLabel htmlFor="bw-sender">Sender</FieldLabel>
          <Select value={senderId ?? ""} onValueChange={onChange}>
            <SelectTrigger id="bw-sender" className="w-full">
              <SelectValue placeholder="Pick a sender" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pool
                  .filter((s) => senderAvailability(s).ok)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span>{s.name}</span>
                      <span className="text-muted-foreground">{s.email}</span>
                      {s.id === lastUsedId && <Badge variant="brand">Last used</Badge>}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {sender?.shared && (
            <FieldDescription className="tabular-nums">
              {n(sharedLeft)} of {n(SHARED_MONTHLY_CAP)} sends left this month on the shared sender.
            </FieldDescription>
          )}
        </Field>
      )}
      {sender?.shared && recipients > sharedLeft && (
        <FieldError>
          This batch needs {n(recipients)} sends; the shared sender has {n(sharedLeft)} left. Pick your own sender or
          fewer recipients.
        </FieldError>
      )}
    </FieldSet>
  );
}

// Over today's allowance the rest is deferred, not failed (AC-EC-W-03; PATTERNS 9.12): info, never red.
function OverDailyAlert({ estimate }: { estimate: ReturnType<typeof sendEstimate> }) {
  return (
    <Alert variant="info">
      <CalendarClockIcon />
      <AlertTitle>Spreads over about {estimate.days} days</AlertTitle>
      <AlertDescription className="tabular-nums">
        {n(estimate.leftToday)} go today, the other {n(estimate.overflow)} over the next days (up to{" "}
        {n(DAILY_ALLOWANCE)} a day).
      </AlertDescription>
    </Alert>
  );
}

type ReviewRow = {
  label: string;
  value: string;
  sub?: ReactNode;
  action?: { label: string; onClick: () => void };
};

function ReviewStep({
  rows,
  name,
  onName,
  placeholder,
  overDaily,
  sendError,
  checks,
}: {
  rows: ReviewRow[];
  name: string;
  onName: (v: string) => void;
  placeholder: string;
  overDaily?: ReturnType<typeof sendEstimate>;
  sendError: string | null;
  /** Per-recipient check of the merge tags (R2). */
  checks: ReactNode;
}) {
  return (
    <FieldGroup>
      <dl className="flex flex-col divide-y rounded-lg border">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-4 px-4 py-2.5">
            <dt className="text-sm text-muted-foreground">{r.label}</dt>
            <dd className="flex min-w-0 flex-col">
              <span className="font-medium tabular-nums">{r.value}</span>
              {r.sub && <span className="truncate text-sm text-muted-foreground tabular-nums">{r.sub}</span>}
            </dd>
            {r.action ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={r.action.onClick}
                aria-label={`${r.action.label}: ${r.label.toLowerCase()}`}
              >
                {r.action.label}
              </Button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </dl>

      {overDaily && <OverDailyAlert estimate={overDaily} />}

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
      </Field>

      {sendError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Couldn&apos;t create the batch</AlertTitle>
          <AlertDescription>{sendError} Try again in a moment.</AlertDescription>
        </Alert>
      )}
    </FieldGroup>
  );
}
