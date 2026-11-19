"use client";

// New batch wizard: /batches/new?template=<id> (PRD-02 BAT-CREATE-001, AC-EC-B-01..08, live app EmailBatchWizard +
// POST /api/email/batches). Template → Recipients → Sender → Review, ending in Save draft or Send now. A batch sends
// now: neither the PRD nor the live app schedules a one-off batch (schedules live in Automate › Schedule).
// Recipients come from one source per batch (AC-EC-B-02, live app "Send to: Companies | Self-upload"):
// - Companies (default): unlocked companies, no filter at first, picked in a table (company-picker.tsx,
//   company-audience.ts); the campaign's matches come selected. Locked matches follow unticked; ticked ones are
//   unlocked for credits after a confirm on Continue (or Send now if Recipients was skipped; the live app unlocks on
//   send, #116, without asking); sending itself is free (PRD-05).
// - Self-upload: contacts by tag, with "Don't send to" (recipient-check.ts).
// Review: one summary, the per-recipient merge-tag check, the email preview; Send is the confirmation.
// Preview states (?state=):
//   paused       workspace auto-paused (BR-RULE-EC-18/19): everything can be prepared, Send stays locked
//   locked       no verified domain / confirmed sender (AC-EC-B-01): no sender to pick, link to Settings
//   inactive     opens on an inactive template (t3): Continue and Send wait, Open editor leads to Mark active
//   empty        no contacts yet (Self-upload)
//   error        the send request fails (shows the error and Try again)
//   loading      skeleton while contacts and senders load
//   checking     Review: the per-recipient check is still running (Send waits)
//   check-error  Review: the per-recipient check failed (Try again)
//   badtag       Review: the subject uses {{first_name}}, a tag Saella doesn't know (blocks Send)
// Also ?step=0..3; ?source=contacts&tags=hotel,fair (the agent's hand-over: sets the Tag filter, ticks no one).

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, CalendarClockIcon, CircleAlertIcon, CirclePauseIcon, LockIcon, LockOpenIcon, PencilIcon, PlusIcon, SearchCheckIcon, SearchIcon, SendIcon, TriangleAlertIcon, UsersIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { campaignStatus, formatDate, industryLabels } from "@/lib/mock/campaigns";
import { isArchived } from "@/lib/mock/campaign-store";
import { useCampaignStore, useCurrentCampaigns } from "@/lib/mock/created-campaigns";
import {
  accessFor,
  canEdit as canEditTemplate,
  findTemplate,
  lockReason,
  ownerName,
  viewerFor,
} from "@/lib/mock/templates";
import { companies as allCompanies } from "@/lib/mock/companies";
import { type Contact, tagsOf, useContactsStore } from "@/lib/mock/contacts";
import { NOW } from "@/lib/mock/constants";
import { UNLOCK_COST, unlockCompanies, useUnlocks } from "@/lib/mock/unlocks";
import { readCreditBalance } from "@/lib/mock/credits";
import { creditsUsd } from "@/lib/mock/pricing";
import { filtersFromCampaign, lockedCompanies } from "@/lib/mock/company-audience";
import { CAMPAIGN_ARCHIVED, campaignOffReason, isCampaignOff, liveStatus } from "@/components/features/activation";
import { LockedTip } from "@/components/saella/locked-tip";
import { type UnlockAsk, UnlockDialog } from "@/components/features/unlock-dialog";
import { TopUpDialog } from "@/components/features/top-up-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTemplateStore } from "@/lib/mock/use-template-store";
import { NewTemplateDialog } from "@/components/features/new-template-dialog";
import { activateBlockedReason } from "@/components/features/template-menu";
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
  type ReportBatch,
  BATCH_CAP,
  CURRENT_USER_ID,
  SHARED_MONTHLY_CAP,
  SHARED_USED_THIS_MONTH,
  addCreatedBatch,
  updateCreatedBatch,
  batchCode,
  defaultSenderFor,
  domainOf,
  sendEstimate,
  senderAvailability,
} from "@/lib/mock/batches";
import {
  type AudienceFilters,
  NO_AUDIENCE_FILTERS,
  audienceFilters,
  companyAudience,
  companyRecipient,
  filterCompanies,
  matchCompanies,
} from "./company-audience";
import { CompanyPicker } from "./company-picker";
import { LeftOutDialog } from "./left-out-dialog";
import { type RefinedAudience, DEFAULT_FALLBACK, buildAudience, checkRecipients, subjectFor } from "./recipient-check";
import { type CheckStatus, type Handling, RecipientChecks } from "./recipient-checks";
import { type WizardStash, draftWizard, resumeWizard, stashDraft, stashWizard } from "./wizard-stash";
import { RecipientPreview } from "./recipient-preview";
import { BODY_CELL, HEAD_CELL, HEADER, TABLE, TableFrame, usePaging } from "./table-frame";
import { SubjectText } from "./subject-text";

/** A session-unique id for a batch made here (mock). */
const newBatchId = () => `n${Date.now().toString(36)}`;

const STEPS = [
  { id: "template", label: "Template" },
  { id: "recipients", label: "Recipients" },
  { id: "sender", label: "Sender" },
  { id: "review", label: "Review" },
];
const REVIEW = STEPS.length - 1;

type Source = "companies" | "contacts";

const n = (x: number) => x.toLocaleString("en-US");

/** The campaign's matches among the unlocked companies: selected when Recipients opens. */
function campaignMatches(templateId: string | undefined, unlocked: ReadonlySet<string>) {
  const found = findTemplate(templateId);
  if (!found) return new Set<string>();
  // Ceased left out like the locked matches, so "Saella found N" counts both sides alike.
  const rows = matchCompanies(audienceFilters(filtersFromCampaign(found.campaign)), "", unlocked).rows.filter(
    (c) => c.status !== "ceased",
  );
  return new Set(rows.slice(0, BATCH_CAP).map((c) => c.id));
}

/** Mock match score (80–98%) for the upsell list: steady per company, active ones higher. The backend scores it. */
function matchScore(c: { id: string; status: string }) {
  let h = 0;
  for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return Math.min(98, 80 + (h % 15) + (c.status === "active" ? 4 : 0));
}

/** What Saella found for the campaign, above the one table of matches (unlocked first, locked after them). While
 *  locked matches exist, it is a brand-tinted box that also switches between all matches and the locked ones, with
 *  Unlock all of them. Nothing locked: the plain sentence. */
function MatchSummary({
  unlocked,
  locked,
  showLocked,
  onShowLocked,
  unlockCount,
  unlockCost,
  onUnlock,
}: {
  unlocked: number;
  locked: number;
  showLocked: boolean;
  onShowLocked: (on: boolean) => void;
  /** What the Unlock button buys: the ticked locked rows when some are ticked, else all of them. */
  unlockCount: number;
  unlockCost: number;
  onUnlock: () => void;
}) {
  const total = unlocked + locked;
  const found = (
    <>
      Saella found <span className="font-medium text-foreground">{n(total)}</span>{" "}
      {total === 1 ? "company that fits" : "companies that fit"} this campaign
    </>
  );
  if (locked === 0) return <p className="shrink-0 text-sm text-muted-foreground tabular-nums">{found}</p>;
  // Warning amber, same as the Resend note on a template:
  // matches are being left out, worth a look. Orange stays for the user's picks and actions.
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warning/40 bg-warning-soft py-2 dark:border-border dark:bg-muted pr-2 pl-3 text-sm">
      {/* A suggestion, not a lock or AI sparkles: what Saella found; the rows carry the locks. */}
      <SearchCheckIcon aria-hidden className="size-4 shrink-0 text-warning-soft-foreground" />
      <p className="min-w-0 flex-1 text-muted-foreground tabular-nums">
        {showLocked ? (
          <>
            Showing the <span className="font-medium text-foreground">{n(locked)}</span> locked{" "}
            {locked === 1 ? "company" : "companies"}.
          </>
        ) : (
          <>
            {found}. <span className="font-medium text-foreground">{n(locked)}</span> {locked === 1 ? "is" : "are"}{" "}
            locked.
          </>
        )}
      </p>
      <Button variant="ghost" size="sm" className="tabular-nums" onClick={() => onShowLocked(!showLocked)}>
        {showLocked ? `Show all ${n(total)}` : "See locked"}
      </Button>
      {/* Solid: a second solid next to Continue, by choice, so the unlock is not missed. */}
      <Button size="sm" className="tabular-nums" onClick={onUnlock}>
        <LockOpenIcon data-icon="inline-start" />
        {/* The ticked ones, or all of them when none is ticked. */}
        Unlock {n(unlockCount)} · {creditsUsd(unlockCost)}
      </Button>
    </div>
  );
}

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

  // Opened from a template (?template=, its Send button): the template is already chosen, so the Template step is
  // left out and the wizard starts at Recipients.
  const fromTemplate = Boolean(params.get("template"));
  const firstStep = fromTemplate ? 1 : 0;
  // Back from Review › Edit template (?resume=1): the picks made before, straight to Review.
  // A draft's Continue (?draft=<id>) brings back the picks saved with it, also at Review.
  const [resumed] = useState(() =>
    params.get("resume")
      ? resumeWizard(params.get("template"))
      : params.get("draft")
        ? draftWizard(params.get("draft"), params.get("template"))
        : null,
  );
  const draftId = resumed?.draftId;
  const [step, setStep] = useState(() =>
    resumed
      ? Math.min(REVIEW, Math.max(firstStep, resumed.step ?? REVIEW))
      : Math.min(REVIEW, Math.max(firstStep, Number(params.get("step")) || 0)),
  );
  const [templateId, setTemplateId] = useState<string | undefined>(
    () => (state === "inactive" ? "t3" : params.get("template")) ?? undefined,
  );
  const [source, setSource] = useState<Source>(() =>
    resumed
      ? resumed.source
      : params.get("source") === "contacts" || params.get("tags") || params.get("tag") || state === "empty"
        ? "contacts"
        : "companies",
  );
  // Self-upload is picked contact by contact; ?tags= (the agent's hand-over) only sets the Tag filter.
  const seedTags = (params.get("tags") ?? params.get("tag"))?.split(",").filter(Boolean) ?? [];
  // Unlocked companies: no filter at first; search, the picks. The campaign's matches come selected.
  const { unlocked, balance } = useUnlocks();
  const [companyFilters, setCompanyFilters] = useState<AudienceFilters>(() =>
    resumed?.companyFilters ?? NO_AUDIENCE_FILTERS,
  );
  const [companyQuery, setCompanyQuery] = useState(() => resumed?.companyQuery ?? "");
  const [pickedIds, setPickedIds] = useState<Set<string>>(() =>
    resumed
      ? new Set(resumed.pickedIds)
      : campaignMatches(templateId, unlocked),
  );

  const pool = useMemo(
    () => (locked ? senders.map((s) => ({ ...s, status: "unconfirmed" as const })) : senders),
    [locked],
  );
  const [senderId, setSenderId] = useState<string | undefined>(
    () => resumed?.senderId ?? defaultSenderFor(templateId, pool)?.id,
  );
  const [name, setName] = useState(() => resumed?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // Per-recipient check (R2): per merge tag, send with a fallback word or leave those people out.
  const [handling, setHandling] = useState<Record<string, Handling>>(() => resumed?.handling ?? {});
  const [fallbacks, setFallbacks] = useState<Record<string, string>>(() => resumed?.fallbacks ?? { ...DEFAULT_FALLBACK });
  const [checkStatus, setCheckStatus] = useState<CheckStatus>(() =>
    state === "checking" ? "checking" : state === "check-error" ? "error" : "ready",
  );
  // Whose email the preview shows (R3); unset = the first recipient.
  const [previewId, setPreviewId] = useState<string | undefined>(() => resumed?.previewId);
  const { contacts } = useContactsStore();

  const book = useMemo(() => (state === "empty" ? [] : contacts), [state, contacts]);
  // Self-upload Tag filter (live app: tag picker over the contact list; AND like Leads › Self-upload), seeded from
  // ?tags=. Nothing is ticked at first: the user picks who gets it.
  const [tagFilter, setTagFilter] = useState<string[]>(() => resumed?.tagFilter ?? seedTags);
  const [contactIds, setContactIds] = useState<Set<string>>(() => {
    if (resumed) return new Set(resumed.contactIds);
    return new Set();
  });
  const picked = findTemplate(templateId);
  const templateStore = useTemplateStore();
  // Only an active template sends; Mark active lives in the editor, reached by Open editor.
  const tplActive = picked
    ? liveStatus(picked.template.id, picked.template.status, templateStore) === "active"
    : false;
  // Who may send or edit it: the shared template rule (owner, admin, or on the share list; lib/mock/templates.ts),
  // with this session's owner and share changes. ?state=member previews a plain member.
  const access = picked
    ? accessFor(picked.template, viewerFor(state))
    : "viewer";
  const canEdit = picked ? canEditTemplate(access) : false;
  const editLock = picked && !canEdit ? lockReason.edit(picked.template.owner) : undefined;

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
  // Saella's offer: the campaign's matches still locked, unlocked on Send now.
  const lockedRows = useMemo(() => {
    const found = findTemplate(templateId);
    // Ceased companies aren't suggested: no credits spent on a business that has closed.
    return found ? lockedCompanies(filtersFromCampaign(found.campaign), unlocked).filter((c) => c.status !== "ceased") : [];
  }, [templateId, unlocked]);
  // Recipients › Companies: one table of the campaign's matches, the unlocked ones (selected at first, free), then the
  // locked ones (email masked, unticked; each tick = unlock for a credit). Unlocked ticks live in pickedIds, locked
  // ticks in unlockIds.
  // All matches, or only the locked ones (the tinted box's switch).
  const [showLockedOnly, setShowLockedOnly] = useState(false);
  const [unlockIds, setUnlockIds] = useState<Set<string>>(() => new Set(resumed?.unlockIds));
  const lockedIds = useMemo(() => new Set(lockedRows.map((c) => c.id)), [lockedRows]);
  const campaignSet = useMemo(() => campaignMatches(templateId, unlocked), [templateId, unlocked]);
  const campaignUnlocked = campaignSet.size;
  // The campaign's matches only, under search and Filter; the locked ones always after the unlocked ones. "See locked"
  // lists only those (gone once none is left).
  const lockedOnly = showLockedOnly && lockedRows.length > 0;
  const companyRows = useMemo(
    () => [
      ...(lockedOnly ? [] : matched.rows.filter((c) => campaignSet.has(c.id))),
      ...filterCompanies(lockedRows, companyFilters, companyQuery),
    ],
    [lockedOnly, campaignSet, matched.rows, lockedRows, companyFilters, companyQuery],
  );
  const companySelected = useMemo(() => new Set([...pickedIds, ...unlockIds]), [pickedIds, unlockIds]);
  /** One selection in the table, kept as two: free picks and locked ones to unlock. */
  function selectCompanies(next: Set<string>) {
    setPickedIds(new Set([...next].filter((id) => !lockedIds.has(id))));
    setUnlockIds(new Set([...next].filter((id) => lockedIds.has(id))));
  }
  const fromCompanies = source === "companies";
  const extraRows = useMemo(
    () => (fromCompanies ? lockedRows.filter((c) => unlockIds.has(c.id)) : []),
    [fromCompanies, lockedRows, unlockIds],
  );
  const toUnlock = extraRows.length;
  const unlockCost = toUnlock * UNLOCK_COST;
  const unlockShort = unlockCost > balance;

  // Every picked company is sent to (no Not sent / Sent split), plus the ones to unlock.
  const pickedCompanies = useMemo(() => allCompanies.filter((c) => pickedIds.has(c.id)), [pickedIds]);
  const companyAud = useMemo(() => companyAudience([...pickedCompanies, ...extraRows]), [pickedCompanies, extraRows]);

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
  /** What the batch sends to: the audience minus anyone the Review check leaves out. People are added or taken out
   *  on Recipients only (Review's Change goes back there). */
  const recipients = people.length - skipped.size;
  /** A draft unlocks nothing (credits are spent on Send now only), so it counts the companies already unlocked. */
  const draftRecipients =
    recipients - (fromCompanies ? people.filter((p) => unlockIds.has(p.id) && !skipped.has(p.id)).length : 0);

  const sender = pool.find((s) => s.id === senderId);
  const sharedLeft = SHARED_MONTHLY_CAP - SHARED_USED_THIS_MONTH;
  // Each sender domain has its own daily cap (lib/mock/batches.ts DOMAIN_DAILY_CAP).
  const estimate = sendEstimate(recipients, sender);

  const reviewIssue =
    checkStatus === "checking"
      ? "Checking recipient data"
      : checkStatus === "error"
        ? "The recipient check didn't finish. Try again."
        : unknownTag
          ? `Fix {{${unknownTag.tag}}} in the template first`
          : emptyFallback
            ? "Type a fallback, or leave those recipients out"
            : recipients === 0
              ? "Nobody left to send to"
              : undefined;
  // Why each step can't continue yet; undefined = fine.
  const blockers: (string | undefined)[] = [
    !picked
      ? "Pick a template"
      : editLock
        ? editLock
        : !tplActive
          ? // An ended or archived campaign: the same reason as the alert above (nothing to mark active).
            (campaignOffReason(picked.template.id) ?? "Mark the template active in the editor to send it")
          : undefined,
    fromCompanies
      ? pickedIds.size === 0 && toUnlock === 0
        ? "Select at least one company"
        : unlockShort
          ? "Not enough credits to unlock that many"
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
    paused ? "Sending is paused for this workspace" : reviewIssue,
  ];
  const firstBlocked = blockers.findIndex((b) => b !== undefined);
  const maxReachable = firstBlocked === -1 ? REVIEW : firstBlocked;
  // What stops this step: its own blocker or any earlier step's. The wizard can open past a step (?template= skips
  // Template, ?step=, ?resume=1, a draft), so an inactive template still blocks Continue and Send now.
  const gate = blockers.slice(0, step + 1).find((b) => b !== undefined);

  const [ask, setAsk] = useState<UnlockAsk | null>(null);
  // Continue with locked matches left out: one reminder per wizard (to sell the unlock), never again once the user
  // chose to go on without them.
  const [upsell, setUpsell] = useState<"closed" | "open" | "seen">("closed");
  // Short of credits for the locked picks: "Top up credits" next to the gate line opens Top up in place; once paid
  // the balance covers it and Continue opens.
  const [topUp, setTopUp] = useState(false);


  function chooseTemplate(id: string) {
    setTemplateId(id);
    setSenderId(defaultSenderFor(id, pool)?.id);
    // A new template starts a fresh pick with no filter.
    setCompanyFilters(NO_AUDIENCE_FILTERS);
    setPickedIds(campaignMatches(id, unlocked));
    setUnlockIds(new Set());
  }

  /** Spending credits is confirmed first (the Leads › Unlock dialog), then `go` runs. Short of credits → "Not enough
   *  credits" with Top up, which tops up in place and comes back to this confirm. Unlocking is all or nothing (live
   *  unlock route). */
  function askUnlock(details: { confirmLabel?: string; title?: string; onConfirm: () => void }) {
    const then = { companies: toUnlock, alreadyUnlocked: 0, ...details };
    setAsk(unlockShort ? { kind: "short", cost: unlockCost, balance, then } : { kind: "confirm", cost: unlockCost, balance, ...then });
  }

  /** Charge for the locked picks with the live balance (a top-up may have come in since the ask). */
  function chargeUnlock() {
    const now = readCreditBalance();
    if (unlockCompanies(extraRows, now)) return true;
    toast.error("Not enough credits", { description: `Needs ${n(unlockCost)} credits, you have ${n(now)}.` });
    return false;
  }

  function unlockThen(confirmLabel: string, go: () => void) {
    if (toUnlock === 0) return go();
    askUnlock({
      confirmLabel,
      // The whole step in one question: what is bought and who it goes to.
      title: `Unlock ${n(toUnlock)} and send to ${n(recipients)} ${recipients === 1 ? "company" : "companies"}?`,
      onConfirm: () => {
        if (!chargeUnlock()) return;
        // They're unlocked now: they join the picks, and the offer closes.
        setPickedIds((s) => new Set([...s, ...extraRows.map((c) => c.id)]));
        setUnlockIds(new Set());
        go();
      },
    });
  }

  /** The box's Unlock: the ticked locked rows, or every locked match when none is ticked; confirmed (or short → top
   *  up) like Continue, then selected. */
  function unlockRows(rows: typeof lockedRows, after?: () => void, direct = false) {
    const cost = rows.length * UNLOCK_COST;
    const then = {
      companies: rows.length,
      alreadyUnlocked: 0,
      onConfirm: () => {
        if (!unlockCompanies(rows, readCreditBalance())) {
          toast.error("Not enough credits", { description: `Needs ${n(cost)} credits, you have ${n(readCreditBalance())}.` });
          return;
        }
        setPickedIds((s) => new Set([...s, ...rows.map((c) => c.id)]));
        setUnlockIds(new Set());
        toast.success(
          `${n(rows.length)} ${rows.length === 1 ? "company" : "companies"} unlocked · ${n(readCreditBalance())} credits left`,
          { description: "They're selected." },
        );
        after?.();
      },
    };
    // direct: the upsell already showed the price, so no second confirm (decisions: "unlock rồi sang Sender").
    if (cost > balance) setAsk({ kind: "short", cost, balance, then });
    else if (direct) then.onConfirm();
    else setAsk({ kind: "confirm", cost, balance, ...then });
  }

  /** Continue on Recipients with locked rows ticked: the same confirm unlocks them first, so the emails show and they
   *  join the picks; then the next step. Send now asks nothing more. */
  function unlockAndContinue() {
    askUnlock({
      confirmLabel: "Unlock and continue",
      onConfirm: () => {
        if (!chargeUnlock()) return;
        setPickedIds((s) => new Set([...s, ...extraRows.map((c) => c.id)]));
        setUnlockIds(new Set());
        // "N companies unlocked · X credits left".
        toast.success(
          `${n(toUnlock)} ${toUnlock === 1 ? "company" : "companies"} unlocked · ${n(readCreditBalance())} credits left`,
          { description: "They're selected." },
        );
        setStep(2);
      },
    });
  }

  // Stands in for re-running the server check (live app: the recipient rows for this batch).
  function retryCheck() {
    setCheckStatus("checking");
    window.setTimeout(() => setCheckStatus("ready"), 700);
  }

  /** Everything picked so far, to bring back on Review (Edit template, a draft's Continue). */
  function snapshot(templateId: string): WizardStash {
    return {
      templateId,
      source,
      companyFilters,
      companyQuery,
      pickedIds: [...pickedIds],
      unlockIds: [...unlockIds],
      tagFilter,
      contactIds: [...contactIds],
      senderId,
      name,
      handling,
      fallbacks,
      previewId,
      draftId,
    };
  }

  // Save draft (status "draft", like the live app's draft batches): nothing is unlocked or charged, so it counts only
  // companies already unlocked. The picks are kept with it, so its report's Continue reopens Review as it was. A draft
  // continued here is updated, not saved again.
  function saveDraft() {
    if (!picked) return;
    const id = draftId ?? newBatchId();
    const draft = {
      templateId: picked.template.id,
      campaignId: picked.campaign.id,
      senderId: sender?.id ?? "",
      tags: fromCompanies ? [] : tags,
      recipients: draftRecipients,
      name: name.trim() || undefined,
    };
    if (draftId) updateCreatedBatch(id, draft);
    else
      addCreatedBatch({
        id,
        ...draft,
        status: "draft",
        sent: 0,
        // The mock clock (lib/mock/constants.ts), so the draft dates agree with the rest of the mock.
        createdOn: NOW.slice(0, 10),
        operatorId: CURRENT_USER_ID,
      });
    stashDraft(id, { ...snapshot(picked.template.id), step: REVIEW });
    toast.success("Draft saved", { description: "Nothing was sent. Continue it here when you're ready." });
    router.push(`/batches/${id}/report`);
  }

  // Review › Edit template: fix the email without losing the picks. The editor's Send batch comes back here
  // (?resume=1), to Review as it was. Also the way to an inactive template's Mark active (only in the editor); opened
  // before Review, it comes back to Recipients.
  function editTemplate() {
    if (!picked) return;
    const id = picked.template.id;
    stashWizard({ ...snapshot(id), step: Math.max(1, step) });
    const back = `/batches/new?template=${encodeURIComponent(id)}&resume=1`;
    router.push(`/templates/${encodeURIComponent(id)}/edit?batch=${encodeURIComponent(back)}`);
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
      // A continued draft is the batch that goes out (no second row next to it).
      const id = draftId ?? newBatchId();
      const nowIso = NOW; // mock clock, like every other date in the mock
      const queued: Omit<ReportBatch, "id"> = {
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
      };
      if (draftId) updateCreatedBatch(id, queued);
      else addCreatedBatch({ id, ...queued });
      // Live app: "Batch queued with N recipients".
      toast.success(`Batch queued for ${n(recipients)} ${fromCompanies ? (recipients === 1 ? "company" : "companies") : recipients === 1 ? "recipient" : "recipients"}`, {
        description:
          toUnlock > 0
            ? `${n(toUnlock)} ${toUnlock === 1 ? "company" : "companies"} unlocked · ${n(readCreditBalance())} credits left`
            : undefined,
      });
      router.push(`/batches/${id}/report`);
    }, 900);
  }

  if (state === "loading") {
    return (
      <>
        <PageHeader title="New batch" description="Send one email to the companies or contacts you choose." breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }]} />
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
        <TabsTrigger value="companies">Companies</TabsTrigger>
        <TabsTrigger value="contacts">Self-upload</TabsTrigger>
      </TabsList>
    </Tabs>
  );
  // Recipients fills the viewport like the Leads tables (companies-screen.tsx): only the rows scroll; the stepper,
  // toolbar, pager and Back / Continue stay on screen. 2rem more for this page's padding.
  const fill = step === 1;
  return (
    <div className={fill ? "flex h-[calc(100svh-10.5rem)] min-h-[560px] flex-col gap-4 md:gap-6" : "contents"}>
      <PageHeader
        title="New batch"
        description="Send one email to the companies or contacts you choose."
        breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }]}
      />

      {paused && (
        // Same auto-pause alert as Overview, Campaigns, Templates and the batch report (warning).
        <Alert variant="warning">
          <CirclePauseIcon />
          <AlertTitle>Sending is paused for this workspace</AlertTitle>
          <AlertDescription>
            Bounces passed 10% over the last 7 days. You can prepare this batch; Send opens once Saella reviews and
            lifts the pause.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/sending">Sending health</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}
      {/* One alert for the one cause, with the link that fixes it; the Sender step only shows the empty, locked field. */}
      {locked && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>No sender can send yet</AlertTitle>
          <AlertDescription>Confirm a sender on a verified domain to send this batch.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/sending">Set up a sender</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}
      {/* Opened past the Template step (?template=, ?step=, ?resume=1, a draft): what's wrong with the template still
          shows, with the way to fix it, since Continue and Send now wait on it. */}
      {fromTemplate && picked && (
        <TemplateAlert
          owner={picked.template.owner}
          editLock={editLock}
          active={tplActive}
          templateId={picked.template.id}
          onOpenEditor={editTemplate}
        />
      )}

      <Stepper
        // Step names only, no summary line under done steps: the same look for every step.
        steps={STEPS.slice(firstStep)}
        current={step - firstStep}
        maxReachable={maxReachable - firstStep}
        onStepClick={(i) => setStep(i + firstStep)}
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
          {/* The stepper already names the step, so its title is for screen readers only. */}
          <h2 id="step-title" className="sr-only">
            {["Which template?", "Who gets it?", "Send as", "Review"][step]}
          </h2>

          {step === 0 && (
            <TemplateStep
              templateId={templateId}
              onChange={chooseTemplate}
              editLock={editLock}
              active={tplActive}
              onOpenEditor={editTemplate}
            />
          )}
          {step === 1 && (
            // Source tabs and the list's toolbar on one row: the tabs stay in this grid cell for both sources; each list joins
            // the grid (`contents`) with its toolbar in column 2 and the rest below.
            <div className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
              <div className="col-start-1 row-start-1">{sourceTabs}</div>
              {fromCompanies ? (
                <CompanyPicker
                  rows={companyRows}
                  query={companyQuery}
                  onQuery={setCompanyQuery}
                  filters={companyFilters}
                  onFilters={setCompanyFilters}
                  selected={companySelected}
                  onSelected={selectCompanies}
                  lockedIds={lockedIds}
                  // Only with no match at all; with locked matches only, the table lists them.
                  empty={
                    campaignUnlocked === 0 && lockedRows.length === 0 ? (
                      <NoCampaignMatch onSelfUpload={() => setSource("contacts")} />
                    ) : undefined
                  }
                  summary={
                    <MatchSummary
                      unlocked={campaignUnlocked}
                      locked={lockedRows.length}
                      showLocked={lockedOnly}
                      onShowLocked={setShowLockedOnly}
                      unlockCount={toUnlock > 0 ? toUnlock : lockedRows.length}
                      unlockCost={(toUnlock > 0 ? toUnlock : lockedRows.length) * UNLOCK_COST}
                      onUnlock={() => unlockRows(toUnlock > 0 ? extraRows : lockedRows)}
                    />
                  }
                  // No cost on the selection line: the box's Unlock button carries it.
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
                  action: fromTemplate ? undefined : { label: "Change", onClick: () => setStep(0) },
                },
                {
                  // Final count plus what took people out (BAT-CREATE-001: matched, suppressed, dropped).
                  label: "Recipients",
                  value: `${n(recipients)} ${fromCompanies ? "companies" : "people"}`,
                  sub:
                    [
                      toUnlock > 0 &&
                        `${n(toUnlock)} to unlock for ${n(unlockCost)} ${unlockCost === 1 ? "credit" : "credits"} (${creditsUsd(unlockCost)})`,
                      fromCompanies && companyAud.undeliverable > 0 && `${n(companyAud.undeliverable)} can't receive email`,
                      fromCompanies && companyAud.truncated > 0 && `${n(companyAud.truncated)} over the ${n(BATCH_CAP)} limit`,
                      !fromCompanies &&
                        contactAudience.contacts > contactAudience.recipients &&
                        `${n(contactAudience.contacts - contactAudience.recipients)} skipped`,
                      skipped.size > 0 && `${n(skipped.size)} missing data`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined,
                  action: { label: "Change", onClick: () => setStep(1) },
                },
                {
                  label: "Sender",
                  value: sender.name,
                  sub: sender.email,
                  action: { label: "Change", onClick: () => setStep(2) },
                },
                {
                  // Schedules, follow-ups and hand-sent batches share the sender domain's daily cap (PRD Master v1.1.9).
                  label: "If sent now",
                  value: estimate.label,
                  sub:
                    estimate.overflow > 0
                      ? undefined
                      : `${n(estimate.leftToday)} of ${n(estimate.cap)} left today on ${domainOf(sender.email)}`,
                },
                // Live app "Monthly quota remaining". Only the shared sender has one (EC-EC-34); the workspace's own domain is
                // unlimited (live SENDING_UNLIMITED, PRD v1.0.9), so no row then.
                ...(sender.shared
                  ? [
                      {
                        label: "Monthly quota",
                        value: `${n(sharedLeft - recipients)} left after this batch`,
                        sub: `${n(sharedLeft)} of ${n(SHARED_MONTHLY_CAP)} left this month on the shared sender`,
                      },
                    ]
                  : []),
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
                  onFixTemplate={editTemplate}
                  fixLock={editLock}
                  handling={handling}
                  onHandling={(tag, h) => setHandling((x) => ({ ...x, [tag]: h }))}
                  fallbacks={fallbacks}
                  onFallback={(tag, v) => setFallbacks((x) => ({ ...x, [tag]: v }))}
                />
              }
            />
          )}

          {!review && <Separator />}
          <div
            // Sticky on Review: lifts the floating "Ask the agent" pill above it (app-shell.tsx).
            data-sticky-actions={review ? "" : undefined}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3",
              // Review runs long: Back / Save draft / Send now stay in view at the bottom of the section.
              review && "sticky bottom-0 z-10 -mx-6 -mb-6 rounded-b-card border-t bg-background px-6 py-4",
            )}
          >
            <Button variant="outline" disabled={step === firstStep || submitting} onClick={() => setStep(step - 1)}>
              <ArrowLeftIcon data-icon="inline-start" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              {/* Nothing picked yet: the disabled Continue says enough, no line. */}
              {gate && !SILENT_GATES.has(gate) && <p className="text-sm text-muted-foreground">{gate}</p>}
              {fromCompanies && unlockShort && gate === blockers[1] && (
                <Button variant="link" className="h-auto min-h-6 border-0 p-0" onClick={() => setTopUp(true)}>
                  Top up credits
                </Button>
              )}
              {step < REVIEW ? (
                <Button
                  disabled={!!gate}
                  // Locked rows ticked: the unlock confirm first. None ticked but some left locked: one reminder of what unlocking
                  // adds.
                  onClick={() =>
                    step === 1 && fromCompanies && toUnlock > 0
                      ? unlockAndContinue()
                      : step === 1 && fromCompanies && lockedRows.length > 0 && upsell === "closed"
                        ? setUpsell("open")
                        : setStep(step + 1)
                  }
                >
                  Continue
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {/* A draft can wait for an inactive template or a fix; it can't be kept by someone who may not send it. */}
                  <Button variant="ghost" disabled={!picked || !!editLock || submitting} onClick={saveDraft}>
                    Save draft
                  </Button>
                  <Button
                    disabled={!!gate || submitting}
                    aria-busy={submitting || undefined}
                    onClick={() => unlockThen("Unlock and send", send)}
                    className="tabular-nums"
                  >
                    {submitting ? (
                      <Spinner data-icon="inline-start" />
                    ) : paused ? (
                      <LockIcon data-icon="inline-start" />
                    ) : (
                      <SendIcon data-icon="inline-start" />
                    )}
                    {/* Both labels in one cell, so the button keeps its width while sending. */}
                    <span className="grid justify-items-center">
                      <span className="col-start-1 row-start-1">{submitting ? "Sending…" : `Send now (${n(recipients)})`}</span>
                      <span aria-hidden className="invisible col-start-1 row-start-1">
                        Send now ({n(recipients)})
                      </span>
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {review && picked && (
          <RecipientPreview
            templateId={picked.template.id}
            subject={subject}
            sender={sender}
            people={people}
            issues={check.issues}
            handling={handling}
            fallbacks={fallbacks}
            selectedId={previewId}
            onSelect={setPreviewId}
            action={
              <LockedTip reason={editLock}>
                <Button variant="outline" size="sm" disabled={!canEdit || submitting} onClick={editTemplate}>
                  <PencilIcon data-icon="inline-start" />
                  Edit template
                </Button>
              </LockedTip>
            }
            status={checkStatus}
            onRetry={retryCheck}
          />
        )}
      </div>

      {/* Upsell on Continue: honest numbers, the skip is as easy as the buy. */}
      <Dialog open={upsell === "open"} onOpenChange={(o) => !o && setUpsell("closed")}>
        <DialogContent className="sm:max-w-md">
          {/* Short, loss-framed copy: the reach as a bar (picked + the locked ones in brand) and the companies left out by
              name. Names are registry data, free to show; only contacts are locked. */}
          <DialogHeader className="flex-row items-start gap-3">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-subtle text-brand">
              <LockOpenIcon className="size-5" />
            </span>
            <div className="flex flex-col gap-1.5">
              <DialogTitle className="pr-6 leading-snug tabular-nums">
                Are you sure you want to leave {n(lockedRows.length)} {lockedRows.length === 1 ? "match" : "matches"}{" "}
                behind?
              </DialogTitle>
              <DialogDescription className="tabular-nums">
                {creditsUsd(lockedRows.length * UNLOCK_COST)} can{" "}
                <span className="font-semibold text-foreground">
                  {/* Over 100% reads loud ("400% more"): the count instead. */}
                  {lockedRows.length > recipients
                    ? `reach ${n(lockedRows.length)} more`
                    : `reach ${Math.round((lockedRows.length / Math.max(1, recipients)) * 100)}% more`}
                </span>{" "}
                companies.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-3 rounded-lg border p-3 text-sm tabular-nums">
            <div className="flex flex-col gap-1.5">
              <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                <span className="rounded-full bg-muted-foreground/30" style={{ flex: Math.max(1, recipients) }} />
                <span className="rounded-full bg-brand" style={{ flex: lockedRows.length }} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{n(recipients)} selected</span>
                <span className="font-medium text-primary">+{n(lockedRows.length)} locked</span>
              </div>
            </div>
            <ul className="flex flex-col gap-1.5 border-t pt-3">
              {/* The 3 best matches with their match %, best first. Mock score; the real one is the backend's. */}
              {[...lockedRows]
                .map((c) => ({ c, score: matchScore(c) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map(({ c, score }) => (
                  <li key={c.id} className="flex min-w-0 items-center gap-2">
                    <LockIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="shrink-0 font-medium text-success-soft-foreground">{score}% match</span>
                  </li>
                ))}
              {lockedRows.length > 3 && (
                <li className="pl-5.5 text-muted-foreground">and {n(lockedRows.length - 3)} more</li>
              )}
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="tabular-nums"
              onClick={() => {
                setUpsell("seen");
                setStep(step + 1);
              }}
            >
              Continue
            </Button>
            <Button
              className="tabular-nums"
              onClick={() => {
                // Close now; marked seen only once the unlock went through, so backing out of a top up asks again.
                setUpsell("closed");
                unlockRows(
                  lockedRows,
                  () => {
                    setUpsell("seen");
                    setStep(2);
                  },
                  true,
                );
              }}
            >
              <LockOpenIcon data-icon="inline-start" />
              Unlock {n(lockedRows.length)} · {creditsUsd(lockedRows.length * UNLOCK_COST)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnlockDialog ask={ask} onOpenChange={(o) => !o && setAsk(null)} />
      <TopUpDialog open={topUp} onOpenChange={setTopUp} need={Math.max(0, unlockCost - balance)} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------

const SILENT_GATES = new Set(["Select at least one company", "Select at least one contact"]);

const NEW_TEMPLATE = "__new-template";

/** Why the picked template can't send yet, with the way to fix it: someone else's template not
 *  shared with you → ask its owner; inactive → Open editor, where Mark active lives (its content check included). The
 *  editor's Send batch comes back to this batch with the picks kept. */
function TemplateAlert({
  owner,
  editLock,
  active,
  templateId,
  onOpenEditor,
}: {
  owner: string;
  editLock?: string;
  active: boolean;
  templateId: string;
  onOpenEditor: () => void;
}) {
  if (editLock) {
    return (
      <Alert variant="destructive">
        <LockIcon />
        <AlertTitle>You can&apos;t send this template</AlertTitle>
        <AlertDescription>
          {editLock} Ask {ownerName(owner)} to share it with you.
        </AlertDescription>
      </Alert>
    );
  }
  if (active) return null;
  const activateBlock = activateBlockedReason(templateId);
  // An ended or archived campaign's templates stay off: nothing to do in the editor, so no Open editor.
  if (isCampaignOff(activateBlock))
    return (
      <Alert variant="warning">
        <TriangleAlertIcon />
        <AlertTitle>{activateBlock}</AlertTitle>
        <AlertDescription>
          {activateBlock === CAMPAIGN_ARCHIVED
            ? "Unarchive it on Campaigns to send its templates."
            : "Its templates can't be sent any more."}
        </AlertDescription>
      </Alert>
    );
  return (
    <Alert variant="warning">
      <TriangleAlertIcon />
      <AlertTitle>This template is inactive</AlertTitle>
      <AlertDescription>{activateBlock ?? "Mark it active in the editor to send it."}</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onOpenEditor}>
          Open editor
        </Button>
      </AlertAction>
    </Alert>
  );
}

/** Recipients › Companies when nothing fits the campaign, unlocked or locked: says where to go instead. */
function NoCampaignMatch({ onSelfUpload }: { onSelfUpload: () => void }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LockOpenIcon />
        </EmptyMedia>
        <EmptyTitle>No companies fit this campaign</EmptyTitle>
        <EmptyDescription>Send to your own contacts, or find companies to unlock in Leads.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button variant="outline" size="sm" onClick={onSelfUpload}>
          Use Self-upload
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function TemplateStep({
  templateId,
  onChange,
  editLock,
  active,
  onOpenEditor,
}: {
  templateId?: string;
  onChange: (id: string) => void;
  /** Why this viewer may not send the picked template (lockReason.edit), if so. */
  editLock?: string;
  active: boolean;
  onOpenEditor: () => void;
}) {
  const params = useSearchParams();
  const [creating, setCreating] = useState(false);
  // Campaigns and templates as of now (created, edited, archived, deleted; template status, moves, copies; an ended
  // campaign's templates read inactive). Listed: campaigns with templates that can still send, so not archived and
  // not ended (as New template and Copy to…); the picked template's campaign stays so it can show.
  const campaigns = useCurrentCampaigns();
  const campaignState = useCampaignStore();
  const picked = findTemplate(templateId, campaigns);
  const groups = campaigns.filter(
    (c) =>
      c.id === picked?.campaign.id ||
      (c.templates.length > 0 && !isArchived(c.id, campaignState) && campaignStatus(c) !== "ended")
  );
  // "+ New template": make one (and its campaign if needed), write it, come back here with it picked.
  const back = new URLSearchParams(params);
  back.delete("template");
  back.delete("step");
  const returnTo = `/batches/new${back.size ? `?${back}` : ""}`;
  // Campaign first, then only its templates. Opened on a template, its campaign is picked already.
  const [campaignId, setCampaignId] = useState<string | undefined>(() => picked?.campaign.id);
  // Opened from a template (Send on its row, or back from making one): its campaign is fixed, shown as text; only
  // the template is picked, among that campaign's.
  const [campaignFixed] = useState(() => Boolean(params.get("template") && picked));
  // Only active templates can be picked; the one already chosen stays listed so it can show.
  const all = groups.find((g) => g.id === campaignId);
  const group = all && {
    ...all,
    templates: all.templates.filter((t) => t.status === "active" || t.id === templateId),
  };
  const campaign = campaigns.find((c) => c.id === campaignId) ?? picked?.campaign;
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
        campaigns={campaigns}
        defaultCampaignId={campaignId}
        returnTo={returnTo}
      />

      {picked && (
        <TemplateAlert
          owner={picked.template.owner}
          editLock={editLock}
          active={active}
          templateId={picked.template.id}
          onOpenEditor={onOpenEditor}
        />
      )}
    </FieldGroup>
  );
}

// Self-upload recipients as a table like Leads › Self-upload: search, then Contact · Company · Email status · Tags ·
// Last sent, scrolling inside. People who can't receive it, duplicates and ones this template already reached are
// counted as "left out" below.

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
    // `contents`: the toolbar joins the wizard's grid, on the source tabs' row.
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
            {/* No separate "N recipients" (it would repeat the selected count). Only when some selected contacts can't receive
                it does the line say so ("2 skipped", opens the list). */}
            {selected.size > 0 && leftOut > 0 && (
              <Button variant="link" className="h-auto min-h-6 border-0 p-0 tabular-nums" onClick={() => setReviewing(true)}>
                {n(leftOut)} skipped
              </Button>
            )}
            {pagePicked && !allPicked && rows.length > paging.rows.length && (
              <Button variant="link" className="h-auto min-h-6 border-0 p-0" onClick={() => pickAll(true)}>
                Select all {n(rows.length)} matching
              </Button>
            )}
            {selected.size > 0 && (
              <Button
                variant="link"
                className="h-auto min-h-6 border-0 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => onSelected(new Set())}
              >
                <XIcon data-icon="inline-start" />
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
                        {c.tags.length > 2 && (
                          // White like the tags beside it on a selected row.
                          <Badge variant="outline" className={cn(on && "bg-card")}>
                            +{c.tags.length - 2}
                          </Badge>
                        )}
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
      {/* The senders that can send now; unconfirmed ones and other members' own senders aren't listed. None yet
          (?state=locked): the field stays, locked and empty; the page's one alert says how to fix it. */}
      <Field data-disabled={locked || undefined}>
        <FieldLabel htmlFor="bw-sender">Sender</FieldLabel>
        <Select value={locked ? "" : (senderId ?? "")} onValueChange={onChange} disabled={locked}>
          <SelectTrigger id="bw-sender" className="w-full">
            <SelectValue placeholder={locked ? "No sender can send yet" : "Pick a sender"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {pool
                .filter((s) => senderAvailability(s).ok)
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">{s.email}</span>
                    {/* In the open list only, not repeated in the closed field. */}
                    {s.id === lastUsedId && (
                      <Badge variant="brand" className="in-data-[slot=select-trigger]:hidden">
                        Last used
                      </Badge>
                    )}
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
      {sender?.shared && recipients > sharedLeft && (
        <FieldError>
          This batch needs {n(recipients)} sends; the shared sender has {n(sharedLeft)} left. Pick your own sender or
          fewer recipients.
        </FieldError>
      )}
    </FieldSet>
  );
}

// Over today's allowance the rest is deferred, not failed (AC-EC-W-03): info, never red.
function OverDailyAlert({ estimate }: { estimate: ReturnType<typeof sendEstimate> }) {
  return (
    <Alert variant="info">
      <CalendarClockIcon />
      <AlertTitle>Spreads over about {estimate.days} days</AlertTitle>
      <AlertDescription className="tabular-nums">
        {n(estimate.leftToday)} go today, the other {n(estimate.overflow)} over the next days (up to{" "}
        {n(estimate.cap)} a day from this sender&apos;s domain).
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
              <span className="text-sm font-medium tabular-nums">{r.value}</span>
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
