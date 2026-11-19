"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRightIcon,
  BracesIcon,
  SaveIcon,
  CircleAlertIcon,
  CopyIcon,
  PenLineIcon,
  CalendarClockIcon,
  SendIcon,
  PaletteIcon,
  LightbulbIcon,
  LockIcon,
  MoreHorizontalIcon,
  PowerOffIcon,
  PaperclipIcon,
  PlusIcon,
  RotateCwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { CURRENT_USER, type Template, campaignStatus, sampleCampaigns } from "@/lib/mock/campaigns";
import { applyCampaignStore, isArchived } from "@/lib/mock/campaign-store";
import { useCampaignStore } from "@/lib/mock/created-campaigns";
import { PageHeader } from "@/components/layout/page-header";
import { ChipRemove } from "@/components/saella/chip-remove";
import { Hint } from "@/components/saella/hint";
import { AnimatedSparkles, type AnimatedSparklesHandle } from "@/components/saella/animated-sparkles";
import { StatusBadge } from "@/components/saella/status-badge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Editor as TipTapEditor } from "@tiptap/react";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/time";
import { ScheduleDialog } from "@/components/features/automate-dialog";
import { LockedTip } from "@/components/saella/locked-tip";
import { useAutomation } from "@/components/features/automation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCopyTemplate } from "@/components/features/template-menu";
import { CAMPAIGN_ARCHIVED, CAMPAIGN_ENDED } from "@/components/features/activation";
import { UnsavedDialog } from "@/components/saella/unsaved-dialog";
import { MERGE_TAG_MENU_CLASS, MergeTagItems } from "@/components/features/merge-tag-items";
import { type LeaveTarget, useLeaveGuard } from "@/lib/leave-guard";
import { templateActions } from "@/lib/mock/template-store";
import {
  type Block,
  type BlockType,
  DEFAULT_SENDER_ID,
  SAMPLE_VALUES,
  type TemplateKind,
  accessFor,
  canEdit,
  convertBlocks,
  detailsFor,
  emptyBlock,
  findTemplate,
  isDesignStart,
  lockReason,
  newBlockId,
  resolveTags,
  senderById,
  senderOptions,
  starterBlocks,
  untitledName,
  viewerFor,
} from "@/lib/mock/templates";
import { AddBlockItems, type BlockRequest, DesignCanvas } from "./design-canvas";
import { EnvelopeRow, EnvelopeTagRow, FLAT_CONTROL } from "./envelope";
import { LetterEditor } from "./letter-editor";
import { blocksToHtml, designToHtml, htmlToBlocks, htmlToDesign, joinHtmlBlock, sanitizeHtml, splitHtmlBlock } from "@/lib/mock/templates-html";
import { HtmlBlockArea, HtmlSource, SourceToggle } from "./html-tools";
import { type Issue, checkContent, checkSubject } from "./content-check";
import { EmailBody } from "@/components/features/email-body";
import { SubjectCheckButton } from "./subject-checklist";
import { AiMark, type Draft, WriteWithSaellaDialog } from "./write-with-ai";

// The email editor (live app EmailTemplateEditor; PATTERNS.md §9.3).
// Layout as the live editor: two panes side by side.
// Left: the editor card: kind in its top-right corner, envelope as compact rows (name, subject, preheader, campaign,
// from), a sticky toolbar (add blocks, attach, and Write with Saella, which opens its dialog), the editable email.
// Right: the live preview (name, subject, preheader, then the email with sample merge values), always visible.
// Header: the content check ("N to fix") + Save draft + Mark active; once active, Save changes + Send batch.
// Simplified on purpose, to be decided with the user:
//  - a Letter is rich text (TipTap), a Design is blocks; no A/B versions (hidden behind a flag in the live app) and
//    no per-template colours yet;
//  - envelope as the live editor: name, campaign (movable, TPL-UPDATE-001), sender, subject, preheader and
//    attachments (AC-EC-T-04, 10 MB each; mock keeps only the file name and size);
//  - images are placeholders (no storage); the preview follows the app theme instead of a fixed white email.
// Permissions (Repo template-permissions.ts): editing needs canEdit; others open it read-only with Make a copy
// (AC-EC-TO-03). A save after access is revoked is rejected and the editor drops to read-only (AC-EC-TO-05).
// Preview states: ?state=loading | error | member | revoked (save fails) | ai-error. `draft` = new template
// (?campaign, ?kind, ?start = how a Design starts, ?name optional, ?return = page to go back to after the first save).
// ?ai=subject | subject-writing opens the subject suggestions beside the Subject field (write-with-ai.tsx).
// ?subject=…&preheader=… start the template with that text, to show the live subject checklist (R5).

type Snapshot = {
  name: string;
  kind: TemplateKind;
  subject: string;
  preheader: string;
  senderId: string;
  /** Live app editor: the template's campaign can be changed here (PRD TPL-UPDATE-001). */
  campaignId: string;
  /** Files sent with the email, up to 10 MB each (AC-EC-T-04). */
  attachments: { name: string; size: number }[];
  /** Design body. */
  blocks: Block[];
  /** Letter body: rich-text HTML (TipTap). */
  html: string;
  /** A Letter's HTML block below the text, sent as an image (live app). */
  htmlBlock: string;
};

const ATTACH_MAX = 10 * 1024 * 1024;
const fileSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);


// A copy made from the ⋯ menu lives only in this session (lib/mock/template-store.ts): after a reload it is gone.
export function TemplateEditor({ id }: { id: string }) {
  if (id !== "draft" && !findTemplate(id))
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>This template isn&apos;t here any more</EmptyTitle>
          <EmptyDescription>It was deleted, or it was a copy that wasn&apos;t saved.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" asChild>
            <Link href="/templates">Back to Templates</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  // Keyed: after a new template's first save the URL moves from /draft to its id, and the editor must start over
  // as that template (not keep the draft's state).
  return <Editor key={id} id={id} />;
}

function Editor({ id }: { id: string }) {
  const params = useSearchParams();
  // Campaigns as of now (lib/mock/campaign-store.ts): made this session (newest first), edited, archived, deleted.
  const campaignState = useCampaignStore();
  const allCampaigns = useMemo(() => applyCampaignStore(sampleCampaigns, campaignState), [campaignState]);
  const router = useRouter();
  const previewState = params.get("state");
  const viewer = viewerFor(previewState);
  const isDraft = id === "draft";
  const found = isDraft ? null : findTemplate(id);
  const copyTo = useCopyTemplate(viewer);

  const draftKind: TemplateKind = params.get("kind") === "design" ? "design" : "letter";
  const startParam = params.get("start");
  const draftStart = isDesignStart(startParam) ? startParam : undefined;
  // A new template the user didn't name: "Untitled …" (live app), and Write with Saella may name it.
  const draftUntitled = isDraft && !params.get("name")?.trim();
  const template: Template = found?.template ?? {
    id: "draft",
    name: params.get("name")?.trim() || untitledName(draftKind, draftStart),
    owner: CURRENT_USER,
    status: "inactive",
    recipients: 0,
    delivered: 0,
    opens: 0,
    clicks: 0,
    bounces: 0,
    unsubs: 0,
  };

  const initial = useMemo<Snapshot>(() => {
    const envelope = { subject: params.get("subject"), preheader: params.get("preheader") };
    if (isDraft)
      return {
        name: template.name,
        kind: draftKind,
        subject: envelope.subject ?? "",
        preheader: envelope.preheader ?? "",
        senderId: DEFAULT_SENDER_ID,
        campaignId: params.get("campaign") ?? allCampaigns[0]?.id ?? "",
        attachments: [],
        blocks: draftKind === "design" ? starterBlocks("design", draftStart) : [],
        html: draftKind === "letter" ? blocksToHtml(starterBlocks("letter")) : "",
        htmlBlock: "",
      };
    const d = detailsFor(id);
    return {
      name: template.name,
      kind: d.kind,
      subject: envelope.subject ?? d.subject,
      preheader: envelope.preheader ?? d.preheader,
      senderId: d.senderId ?? DEFAULT_SENDER_ID,
      campaignId: found?.campaign.id ?? "",
      attachments: d.attachments ?? [],
      blocks: d.kind === "design" ? d.blocks : [],
      ...(d.kind === "letter"
        ? (({ body, block }) => ({ html: body, htmlBlock: block }))(splitHtmlBlock(d.html ?? blocksToHtml(d.blocks)))
        : { html: "", htmlBlock: "" }),
    };
    // Loaded once per template.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [saved, setSaved] = useState<Snapshot>(initial);
  const [doc, setDoc] = useState<Snapshot>(initial);
  const [status, setStatus] = useState(template.status);
  const [revoked, setRevoked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initial.blocks[0]?.id ?? null);
  // Write with Saella is a dialog opened from the editor toolbar (live app "Agent" modal). Like the
  // live app it opens by itself only for a blank Design (nothing to look at yet); a Letter starter or a preset doesn't.
  const [aiOpen, setAiOpen] = useState(isDraft && draftKind === "design" && (!draftStart || draftStart === "blank"));
  // After "Save and mark active": ask what's next instead of stopping here.
  const [ready, setReady] = useState(params.get("ready") === "1");
  // "Set a schedule" opens the schedule modal.
  const [scheduling, setScheduling] = useState(false);
  const automationState = useAutomation();
  const scheduleRunning = automationState.schedules.some((x) => x.templateId === id && x.status === "active");
  // Fields Saella filled, marked ✨ until the user edits them.
  const [aiFilled, setAiFilled] = useState<ReadonlySet<string>>(new Set());
  const unmark = (field: string) =>
    setAiFilled((s) => {
      if (!s.has(field)) return s;
      const next = new Set(s);
      next.delete(field);
      return next;
    });
  const [letterEpoch, setLetterEpoch] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  // Visual | HTML (live app): the HTML view's text, kept as typed while it's open.
  const [source, setSource] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [checkOpen, setCheckOpen] = useState(false);
  const [blockRequest, setBlockRequest] = useState<BlockRequest | null>(null);
  // A Letter's image picked in the content check: the editor selects it.
  const [letterImage, setLetterImage] = useState<{ index: number; n: number } | null>(null);
  // The Design text field being edited in place: the toolbar's Tags menu inserts at its caret.
  const [activeField, setActiveField] = useState<TipTapEditor | null>(null);
  const [pendingKind, setPendingKind] = useState<TemplateKind | null>(null);
  const [leaveTo, setLeaveTo] = useState<LeaveTarget | null>(null);
  // Mark inactive with a running schedule asks first: the schedule then waits.
  const [deactivating, setDeactivating] = useState(false);

  const access = accessFor(template, viewer);
  const readOnly = !canEdit(access) || revoked;
  const dirty = JSON.stringify(doc) !== JSON.stringify(saved);
  const letter = doc.kind === "letter";
  /** The body as blocks: a Design's own, a Letter's read from its HTML (for the check and Write with Saella). */
  const bodyBlocks = useMemo(() => (letter ? htmlToBlocks(doc.html) : doc.blocks), [letter, doc.html, doc.blocks]);
  const { issues } = useMemo(() => {
    const r = checkContent({ ...doc, blocks: bodyBlocks, html: letter ? joinHtmlBlock(doc.html, doc.htmlBlock) : undefined });
    // A Letter has no blocks to jump to: its image problems select the image in the text instead (letterImage).
    return letter ? { ...r, issues: r.issues.map((i) => ({ ...i, blockId: undefined })) } : r;
  }, [doc, bodyBlocks, letter]);
  const subjectChecks = useMemo(() => checkSubject(doc.subject, doc.preheader), [doc.subject, doc.preheader]);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const issueIds = new Set(issues.filter((i) => i.blockId && i.severity !== "tip").map((i) => i.blockId!));
  const subjectRef = useRef<HTMLDivElement>(null);
  // Write with Saella's sparkles move while the button is hovered or focused.
  const sparklesRef = useRef<AnimatedSparklesHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Ask before leaving with unsaved work, on every way out (lib/leave-guard.ts: tab close, in-app links, the top bar's
  // Back, the browser's Back). A new template counts as unsaved until its first save: its campaign and kind are already
  // picked, so leaving loses them.
  // Making a template: until it's active, leaving also asks to mark it active, saved or not.
  // `?new=1` follows a new template from /draft to its own URL after the first save.
  const creating = isDraft || params.get("new") === "1";
  const unfinished = creating && status === "inactive";
  const leave = useLeaveGuard(!readOnly && (dirty || isDraft || unfinished), setLeaveTo);

  const patch = (p: Partial<Snapshot>) => setDoc((d) => ({ ...d, ...p }));
  const setBlocks = (fn: (b: Block[]) => Block[]) => setDoc((d) => ({ ...d, blocks: fn(d.blocks) }));
  const selectedIndex = doc.blocks.findIndex((b) => b.id === selectedId);
  const selected = selectedIndex >= 0 ? doc.blocks[selectedIndex] : null;

  /** A new block at `at` (default: after the selected block, or at the end), selected; a text block gets the caret. */
  function addBlock(type: BlockType, at?: number) {
    const b = emptyBlock(type);
    setBlocks((all) => {
      const i = at ?? (selectedIndex >= 0 ? selectedIndex + 1 : all.length);
      return [...all.slice(0, i), b, ...all.slice(i)];
    });
    setSelectedId(b.id);
  }

  /** Drag, Alt+↑/↓ or the bar's arrows. A drag can be undone from the toast. */
  function reorder(from: number, to: number) {
    const before = doc.blocks;
    setBlocks((all) => {
      const next = [...all];
      const [b] = next.splice(from, 1);
      next.splice(to, 0, b);
      return next;
    });
    if (Math.abs(to - from) > 1)
      toast("Moved", { action: { label: "Undo", onClick: () => setDoc((d) => ({ ...d, blocks: before })) } });
  }

  function save(markActive: boolean, opts?: { stay?: boolean }): boolean {
    if (previewState === "revoked") {
      setRevoked(true);
      toast.error("Not saved: your edit access was removed", {
        description: "The owner stopped sharing this template. Copy your text before you leave, or make a copy.",
      });
      return false;
    }
    if (!doc.name.trim()) {
      toast.error("Give the template a name first");
      return false;
    }
    if (isDraft) {
      // A draft saves without a subject. The live POST needs one and pre-fills "Subject — update me"; the mock keeps it
      // empty instead, so Check still lists "Add a subject" and blocks Mark active. Saved to the same store as copies, so
      // lists and New batch can pick it.
      const campaign = allCampaigns.find((c) => c.id === doc.campaignId);
      if (!campaign) {
        toast.error("Pick a campaign first");
        return false;
      }
      const newId = templateActions.create(
        campaign,
        { name: doc.name.trim(), status: markActive ? "active" : "inactive" },
        {
          kind: doc.kind,
          subject: doc.subject,
          preheader: doc.preheader,
          senderId: doc.senderId,
          blocks: bodyBlocks,
          html: letter ? joinHtmlBlock(doc.html, doc.htmlBlock) : undefined,
          attachments: doc.attachments,
        },
        viewer.email
      );
      setSaved(doc);
      const back = params.get("return");
      // Only paths inside the app (no open redirect through ?return=).
      const returning = back?.startsWith("/") && !back.startsWith("//");
      toast.success(`Created “${doc.name.trim()}”`, {
        description: returning
          ? "Back to your batch with this template picked."
          : markActive
            ? "It can be sent now."
            : "Still inactive: mark it active when it's ready to send.",
      });
      // Leaving through the dialog: it goes where the user was heading.
      if (opts?.stay) return true;
      // Active and not on its way back to a batch: the template page asks what's next (?ready=1).
      leave({
        kind: "href",
        href: returning
          ? `${back}${back!.includes("?") ? "&" : "?"}template=${encodeURIComponent(newId)}`
          : `/templates/${newId}/edit${markActive ? "?ready=1" : "?new=1"}`,
        // The draft URL would open a fresh empty draft on Back: the saved template takes its place in history.
        replace: !returning,
      });
      return true;
    }
    // An existing template: name, status, content, attachments and campaign go to the shared store (live PATCH,
    // TPL-UPDATE-001), so the lists, Campaigns, the template page, New batch and the ⋯ menu see them in this session.
    // A reload resets the mock.
    const nextStatus = markActive ? "active" : status;
    const moveTo = doc.campaignId !== saved.campaignId ? allCampaigns.find((c) => c.id === doc.campaignId) : undefined;
    templateActions.update(
      id,
      { name: doc.name.trim(), status: nextStatus },
      {
        kind: doc.kind,
        subject: doc.subject,
        preheader: doc.preheader,
        senderId: doc.senderId,
        blocks: bodyBlocks,
        html: letter ? joinHtmlBlock(doc.html, doc.htmlBlock) : undefined,
        attachments: doc.attachments,
      },
      viewer.email,
      moveTo && { id: moveTo.id, name: moveTo.name }
    );
    setSaved(doc);
    setSavedAt(formatTime(new Date()));
    if (markActive) setStatus("active");
    // Opened from another page with ?return= (e.g. New batch's "Fix in editor"): back there, this template picked.
    const back = params.get("return");
    const returning = back?.startsWith("/") && !back.startsWith("//");
    toast.success(markActive ? "Saved and marked active" : "Saved", {
      description: returning
        ? "Back to your batch with this template."
        : markActive
          ? "It can be sent now."
          : nextStatus === "inactive"
            ? "Still inactive: mark it active when it's ready to send."
            : undefined,
    });
    if (returning && !opts?.stay) {
      const url = new URL(back!, window.location.origin);
      url.searchParams.set("template", id);
      leave({ kind: "href", href: url.pathname + url.search });
      return true;
    }
    // Leaving through the dialog's Mark active: no "Ready to send" on the way out.
    if (markActive && !opts?.stay) setReady(true);
    return true;
  }

  /** Status only (live PATCH status): unsaved edits stay in the editor, still unsaved. */
  function markInactive() {
    templateActions.setStatus(id, "inactive", viewer.email);
    setStatus("inactive");
    toast.success("Marked inactive", {
      description: scheduleRunning ? "Its schedule waits until you mark it active again." : "It can't be sent until you mark it active again.",
    });
  }

  function applyDraft(d: Draft) {
    const before = doc;
    // The name is the user's: Saella only names a new template still on its "Untitled …" name.
    const untitled = !doc.name.trim() || (draftUntitled && doc.name === initial.name);
    const name = untitled && d.name ? d.name : doc.name;
    setDoc((x) => ({
      ...x,
      name,
      subject: d.subject ?? x.subject,
      preheader: d.preheader ?? x.preheader,
      ...(x.kind === "letter" ? { html: blocksToHtml(d.blocks) } : { blocks: d.blocks }),
    }));
    setLetterEpoch((n) => n + 1);
    setAiFilled(new Set([...(name !== doc.name ? ["name"] : []), ...(d.subject ? ["subject"] : []), ...(d.preheader ? ["preheader"] : [])]));
    setSelectedId(d.blocks[0]?.id ?? null);
    toast.success("Saella's draft is in", {
      description: "Check it, change anything, then save.",
      action: {
        label: "Undo",
        onClick: () => {
          setDoc(before);
          setAiFilled(new Set());
          setLetterEpoch((n) => n + 1);
        },
      },
    });
  }

  function goToIssue(issue: Issue) {
    setCheckOpen(false);
    if (issue.field === "sender") setDetailsOpen(true);
    if (letter && issue.image !== undefined) {
      if (source) setView(false);
      setLetterImage({ index: issue.image, n: Date.now() });
    } else if (issue.blockId) {
      setSelectedId(issue.blockId);
      const action = issue.id.startsWith("img-file-") ? "file" : issue.id.startsWith("img-alt-") ? "alt" : issue.id.startsWith("btn-url-") ? "link" : null;
      if (action) setBlockRequest({ id: issue.blockId, action, n: Date.now() });
    } else if (issue.field) {
      // After the popover closes (and the details open), so focus lands on the field.
      setTimeout(() => {
        document.getElementById(issue.field === "sender" ? "ed-sender" : `ed-${issue.field}`)?.focus();
        subjectRef.current?.scrollIntoView({ block: "nearest" });
      }, 50);
    }
  }

  if (previewState === "loading") return <EditorSkeleton />;
  if (previewState === "error")
    return (
      <>
        <PageHeader title="Edit template" description="Draft, review and get this email ready to send." breadcrumbs={[{ label: "Templates", href: "/templates" }]} />
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The template didn&apos;t load</AlertTitle>
          <AlertDescription>Nothing was changed. Try again, or go back to Templates.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/templates/${id}/edit`}>
                <RotateCwIcon data-icon="inline-start" />
                Retry
              </Link>
            </Button>
          </AlertAction>
        </Alert>
      </>
    );

  const senderList = senderOptions(viewer.email);
  const currentSender = senderById(doc.senderId);
  // Opened from New batch › Review › Edit template (?batch=): Send batch goes back to that Review, the picks kept,
  // instead of starting a new batch.
  const batchParam = params.get("batch");
  const batchReturn = batchParam?.startsWith("/batches/new?") ? batchParam : undefined;
  const markReason = errors.length > 0 ? `Fix ${errors.length} ${errors.length === 1 ? "problem" : "problems"} first` : undefined;
  // A template of an ended campaign stays off (live campaign-expiry sweep); moving it to an open campaign frees it.
  const docCampaign = allCampaigns.find((c) => c.id === doc.campaignId);
  // The editor says where to fix it: the campaign is changed under the summary line (Details).
  // An archived campaign keeps it off the same way, until the campaign is unarchived.
  const campaignOff =
    docCampaign === undefined
      ? undefined
      : campaignStatus(docCampaign) === "ended"
        ? CAMPAIGN_ENDED
        : isArchived(docCampaign.id, campaignState)
          ? CAMPAIGN_ARCHIVED
          : undefined;
  const activateReason = campaignOff ? `${campaignOff}. Move it to a running campaign in Details.` : markReason;
  const checkCount = errors.length + warnings.length;

  // Left of the save buttons: the page's results (existing templates) and the content check, next to the action it
  // blocks. The check disappears when there is nothing to fix.
  const leading = (
    <>
      {/* Only once it has sent: before that the results page is empty. */}
      {found && found.template.recipients > 0 && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href={`/templates/${id}`}>View results</Link>
        </Button>
      )}
      {!readOnly && checkCount > 0 && <CheckPopover issues={issues} open={checkOpen} onOpenChange={setCheckOpen} onPick={goToIssue} />}
    </>
  );
  const actions = readOnly ? (
    <Button size="sm" variant="outline" onClick={() => found && copyTo(found.template, found.campaign)}>
      <CopyIcon data-icon="inline-start" />
      Make a copy
    </Button>
  ) : status === "inactive" ? (
    // Live app header: Save draft + Mark active (which saves too).
    <>
      {leading}
      <Button size="sm" variant="outline" onClick={() => save(false)} disabled={!dirty && !isDraft}>
        <SaveIcon data-icon="inline-start" />
        Save draft
      </Button>
      <LockedTip reason={activateReason}>
        <Button size="sm" onClick={() => save(true)} disabled={Boolean(activateReason)}>
          Mark active
        </Button>
      </LockedTip>
    </>
  ) : (
    // Active (live app): save, and Send batch as the main action. A Link, so the unsaved guard asks first.
    <>
      {leading}
      <LockedTip reason={markReason && "An active template can be sent. " + markReason}>
        <Button size="sm" variant="outline" onClick={() => save(false)} disabled={!dirty || Boolean(markReason)}>
          <SaveIcon data-icon="inline-start" />
          Save changes
        </Button>
      </LockedTip>
      {/* Mark inactive: only here, like Mark active (decisions.md). */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="outline" aria-label="More actions">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => (scheduleRunning ? setDeactivating(true) : markInactive())}>
              <PowerOffIcon />
              Mark inactive
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Hint label={batchReturn ? "Back to your batch, picks kept, to send this version" : "Pick the audience, then queue the batch"}>
      <Button size="sm" asChild>
        <Link href={batchReturn ?? `/batches/new?template=${encodeURIComponent(id)}&step=1`}>
          <SendIcon data-icon="inline-start" />
          Send batch
        </Link>
      </Button>
      </Hint>
    </>
  );
  // Where the live app's orange "Agent" button sits. Solid orange like the live app (an exception to "one solid orange
  // per page", recorded in DESIGN.md).
  const writeButton = (
    <Button
      size="sm"
      className="shrink-0"
      onClick={() => setAiOpen(true)}
      onMouseEnter={() => sparklesRef.current?.startAnimation()}
      onMouseLeave={() => sparklesRef.current?.stopAnimation()}
      onFocus={() => sparklesRef.current?.startAnimation()}
      onBlur={() => sparklesRef.current?.stopAnimation()}
    >
      <AnimatedSparkles ref={sparklesRef} data-icon="inline-start" />
      Write with Saella
    </Button>
  );
  function setView(html: boolean) {
    if (html === source) return;
    // One element per line, so the HTML reads (the letter's HTML comes from the editor as a single line).
    if (html) setSourceText(letter ? doc.html.replace(/(<\/(?:p|h[1-6]|ul|ol|li|blockquote)>|<hr>|<img\b[^>]*>)(?!\n)/g, "$1\n") : designToHtml(doc.blocks));
    // Back to Visual: the Letter editor reloads the HTML that was typed.
    else if (letter) setLetterEpoch((n) => n + 1);
    setSource(html);
  }
  function editSource(text: string) {
    setSourceText(text);
    const clean = sanitizeHtml(text);
    if (letter) patch({ html: clean });
    else patch({ blocks: htmlToDesign(clean) });
  }
  const viewToggle = <SourceToggle source={source} onChange={setView} disabled={readOnly} />;
  const sampleName = `${SAMPLE_VALUES.recipient_name} at ${SAMPLE_VALUES.company_name}`;

  return (
    <>
      <PageHeader
        title={doc.name || "Untitled template"}
        // No description: the status line under the title is enough.
        breadcrumbs={[{ label: "Templates", href: "/templates" }]}
        actions={actions}
        centerActions
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {/* Only the template's state here; what acts on it sits with the actions. */}
          <StatusBadge status={status === "active" ? "template-active" : "template-inactive"} />
          <span aria-hidden className="text-subtle-foreground">
            ·
          </span>
          <span aria-live="polite">{readOnly ? "View only" : isDraft && !dirty ? "Not saved yet" : dirty ? "Unsaved changes" : savedAt ? `Saved at ${savedAt}` : "All changes saved"}</span>
        </div>
      </PageHeader>

      {readOnly && (
        <Alert>
          <LockIcon />
          <AlertTitle>{revoked ? "Your edit access was removed" : "View only"}</AlertTitle>
          <AlertDescription>
            {revoked
              ? "Your last changes weren't saved. Make a copy to keep working on your own version."
              : lockReason.edit(template.owner)}
          </AlertDescription>
        </Alert>
      )}

      {/* Live app layout: the editable email on the left, the live preview on the right, side by side. */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section aria-label="Editor" className="flex min-w-0 flex-col gap-3 rounded-card border p-4">
          {/* Envelope: compact rows (live app "email-page-meta"); the kind sits in the card's top-right corner. */}
          <div ref={subjectRef} className="flex flex-col">
            {/* Campaign and sender fold into one line so the email itself shows first; name, Subject and Preheader stay as
                rows. */}
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              {/* Wraps on narrow cards (1280–1366 laptops): the campaign line keeps room for a readable name (min-w-48)
                  and the corner controls move under it; the full line is in the hint. */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-1">
                {/* The campaign name gives way first, so the sender always shows; the full line is in the hint. */}
                <Hint label={`${docCampaign?.name ?? "No campaign"} · From ${currentSender ? `${currentSender.name} (${currentSender.email})` : "no sender"}`}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="group/details -ml-2 min-w-48 shrink font-normal text-muted-foreground">
                      <ChevronRightIcon data-icon="inline-start" className="transition-transform group-data-[state=open]/details:rotate-90" />
                      <span className="truncate">{docCampaign?.name ?? "No campaign"}</span>
                      <span className="shrink-0">· {currentSender?.name ?? "No sender"}</span>
                    </Button>
                  </CollapsibleTrigger>
                </Hint>
                {/* How you edit, together in the corner (live app: Letter/Design and Visual/HTML on the editor's top). */}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {viewToggle}
                    {/* A dropdown, not two buttons: the kind is set once. Switching still asks first (the AlertDialog below). */}
                    <Select value={doc.kind} onValueChange={(v) => v !== doc.kind && setPendingKind(v as TemplateKind)} disabled={readOnly}>
                      <Hint label="Letter: an email you write. Design: a poster built from blocks.">
                        <SelectTrigger size="sm" aria-label="Template kind" className="min-w-28">
                          <SelectValue />
                        </SelectTrigger>
                      </Hint>
                      <SelectContent align="end">
                        <SelectGroup>
                          {/* Not LayoutTemplate (the Templates nav icon, and the hero block's) nor a file. */}
                          <SelectItem value="letter">
                            <PenLineIcon className="text-muted-foreground" />
                            Letter
                          </SelectItem>
                          <SelectItem value="design">
                            <PaletteIcon className="text-muted-foreground" />
                            Design
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                </div>
              </div>
              <CollapsibleContent>
                    <EnvelopeRow label="Campaign" htmlFor="ed-campaign">
                      <Select value={doc.campaignId} onValueChange={(v) => patch({ campaignId: v })} disabled={readOnly}>
                        <SelectTrigger id="ed-campaign" className={cn(FLAT_CONTROL, "w-full")}>
                          <SelectValue placeholder="Pick a campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {/* Ended and archived campaigns take no templates, so they're only listed when the template is already in one. A
                                move is saved with the template (Save draft / Save changes). */}
                            {allCampaigns
                              .filter((c) => (campaignStatus(c) !== "ended" && !isArchived(c.id, campaignState)) || c.id === doc.campaignId)
                              .map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </EnvelopeRow>
                    <EnvelopeRow label="From" htmlFor="ed-sender" invalid={issues.some((i) => i.field === "sender")}>
                      <Select value={doc.senderId} onValueChange={(v) => patch({ senderId: v })} disabled={readOnly}>
                        <SelectTrigger id="ed-sender" className={cn(FLAT_CONTROL, "w-full")}>
                          <SelectValue>{currentSender ? `${currentSender.name} · ${currentSender.email}` : "Pick a sender"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {senderList.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} · {s.email}
                              </SelectItem>
                            ))}
                            {currentSender && !senderList.includes(currentSender) && (
                              <SelectItem value={currentSender.id} disabled>
                                {currentSender.name} · {currentSender.email} (only its owner can pick it)
                              </SelectItem>
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </EnvelopeRow>
              </CollapsibleContent>
            </Collapsible>
            {/* Always visible, as in the live editor. */}
            <EnvelopeRow label="Template name" htmlFor="ed-name" mark={aiFilled.has("name") && <AiMark />} invalid={!doc.name.trim()}>
              <Input
                id="ed-name"
                value={doc.name}
                onChange={(e) => {
                  patch({ name: e.target.value });
                  unmark("name");
                }}
                disabled={readOnly}
                placeholder="Only your team sees it"
                className={FLAT_CONTROL}
              />
            </EnvelopeRow>
            <EnvelopeTagRow
              id="ed-subject"
              label="Subject"
              value={doc.subject}
              onChange={(subject) => {
                patch({ subject });
                unmark("subject");
              }}
              mark={aiFilled.has("subject") && <AiMark />}
              disabled={readOnly}
              placeholder="What the recipient sees first"
              extra={doc.subject.trim() ? <SubjectCheckButton checks={subjectChecks} /> : undefined}
              invalid={(!isDraft || dirty) && issues.some((i) => i.field === "subject" && i.severity === "error")}
            />
            <EnvelopeTagRow
              id="ed-preheader"
              label="Preheader"
              value={doc.preheader}
              onChange={(preheader) => {
                patch({ preheader });
                unmark("preheader");
              }}
              mark={aiFilled.has("preheader") && <AiMark />}
              disabled={readOnly}
              placeholder="Inbox preview line, optional"
            />
          </div>


          {letter && source ? (
            // HTML view of the Letter (live app: Visual | HTML).
            <>
              <div className="flex items-center gap-2 border-b pb-1.5">
                <span className="min-w-0 flex-1 truncate px-2 text-sm text-muted-foreground">The letter as HTML</span>
                {!readOnly && writeButton}
              </div>
              <HtmlSource value={sourceText} onChange={editSource} disabled={readOnly} hint="Drop an .html file here to load it." />
            </>
          ) : letter ? (
            // Letter: rich text like the live app's EmailEditor (TipTap); toolbar on top, Write with Saella at its right.
            <>
              <LetterEditor
                key={`letter-${letterEpoch}`}
                value={doc.html}
                onChange={(html) => patch({ html })}
                disabled={readOnly}
                onAttach={() => fileRef.current?.click()}
                focusImage={letterImage}
                trailing={
                  <>{!readOnly && writeButton}</>
                }
              />
              {/* The live app's HTML block below the text (sent as an image). */}
              <HtmlBlockArea block={doc.htmlBlock} onChange={(htmlBlock) => patch({ htmlBlock })} disabled={readOnly} />
            </>
          ) : (
            <>
          {/* Toolbar + the selected block's properties, kept in view while the email scrolls. */}
          {!readOnly && (
            <div className="sticky top-0 z-10 flex flex-col gap-3 bg-background">
              {/* No box of its own (fewer nested outlines): a hairline under the toolbar. */}
              <div className="flex items-start gap-2 border-b pb-1.5">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5" role="toolbar" aria-label="Email toolbar">
                {/* One menu: adds after the selected block, or at the end. The gaps between blocks and the block's bar add in
                    place. */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={source}>
                      <PlusIcon data-icon="inline-start" />
                      Add block
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <AddBlockItems onPick={(t) => addBlock(t)} />
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <Hint label={activeField ? "Insert a merge tag where you're typing" : "Click into a text to insert a merge tag"}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={!activeField || activeField.isDestroyed} className="text-muted-foreground">
                        <BracesIcon data-icon="inline-start" />
                        Tags
                      </Button>
                    </DropdownMenuTrigger>
                  </Hint>
                  <DropdownMenuContent align="start" className={MERGE_TAG_MENU_CLASS}>
                    <MergeTagItems onPick={(t) => activeField?.chain().focus().insertContent(`{{${t}}}`).run()} />
                  </DropdownMenuContent>
                </DropdownMenu>
                <Hint label="Attach a file, up to 10 MB">
                  <Button variant="ghost" size="icon-sm" aria-label="Attach a file" onClick={() => fileRef.current?.click()}>
                    <PaperclipIcon />
                  </Button>
                </Hint>
              </div>
              {writeButton}
              </div>
            </div>
          )}

          {/* Editable email: text is edited in place; merge tags show as chips, the preview fills them.
              email-canvas: always the light palette recipients see, whatever the app theme (tokens.css). */}
          {source ? (
            <HtmlSource value={sourceText} onChange={editSource} disabled={readOnly} hint="Drop an .html file here to load it." />
          ) : (
          <div className="email-canvas w-full rounded-lg border p-6 pt-8">
            {readOnly ? (
              <EmailBody blocks={doc.blocks} kind={doc.kind} mode="edit" values={SAMPLE_VALUES} />
            ) : (
              <DesignCanvas
                blocks={doc.blocks}
                selectedId={selectedId}
                issueIds={issueIds}
                request={blockRequest}
                onSelect={setSelectedId}
                onPatch={(bid, p) => setBlocks((all) => all.map((x) => (x.id === bid ? ({ ...x, ...p } as Block) : x)))}
                onReorder={reorder}
                onInsert={(at, type) => addBlock(type, at)}
                onDuplicate={() => {
                  if (!selected) return;
                  const copy = { ...selected, id: newBlockId() };
                  setBlocks((all) => [...all.slice(0, selectedIndex + 1), copy, ...all.slice(selectedIndex + 1)]);
                  setSelectedId(copy.id);
                }}
                onDelete={() => {
                  setBlocks((all) => all.filter((x) => x.id !== selectedId));
                  setSelectedId(doc.blocks[selectedIndex + 1]?.id ?? doc.blocks[selectedIndex - 1]?.id ?? null);
                  setActiveField(null);
                }}
                onActiveEditor={setActiveField}
              />
            )}
          </div>
          )}

            </>
          )}

          {/* Attachments (AC-EC-T-04): chips under the body, as in the live editor. */}
          {doc.attachments.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Attachments">
              {doc.attachments.map((a) => (
                <li key={a.name}>
                  <Badge variant="secondary" className="gap-1 pr-1">
                    <PaperclipIcon aria-hidden />
                    <span className="max-w-48 truncate" title={a.name}>
                      {a.name}
                    </span>
                    <span className="font-normal text-muted-foreground tabular-nums">{fileSize(a.size)}</span>
                    {!readOnly && (
                      <ChipRemove
                        label={`Remove ${a.name}`}
                        onClick={() => patch({ attachments: doc.attachments.filter((x) => x.name !== a.name) })}
                      />
                    )}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {/* Hidden file input opened by the toolbar's Attach (DESIGN.md §2 Control). Up to 10 MB each. */}
          <input
            ref={fileRef}
            id="ed-attach"
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-label="Attach files, up to 10 MB each"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              const tooBig = files.filter((f) => f.size > ATTACH_MAX);
              const ok = files.filter((f) => f.size <= ATTACH_MAX && !doc.attachments.some((a) => a.name === f.name));
              if (tooBig.length) toast.error(`${tooBig.map((f) => f.name).join(", ")} is over 10 MB`, { description: "Attach a smaller file or share a link to it instead." });
              if (ok.length) patch({ attachments: [...doc.attachments, ...ok.map((f) => ({ name: f.name, size: f.size }))] });
              e.target.value = "";
            }}
          />
        </section>

        {/* Live preview (live app "email-page-preview"): name, subject, preheader, then the email with sample values. */}
        <div className="sticky top-0 flex min-w-0 flex-col gap-4">
        <section aria-label="Preview" className="flex min-w-0 flex-col gap-4 rounded-card border p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">Preview</h2>
            <span className="truncate text-sm text-muted-foreground">As {sampleName} sees it</span>
          </div>
          <div className="flex flex-col gap-1 border-b pb-3">
            <p className="truncate font-heading text-lg font-medium tracking-title">{doc.name || "Untitled template"}</p>
            <p className={cn("truncate text-sm", doc.subject ? "font-medium" : "text-subtle-foreground")}>
              {resolveTags(doc.subject, SAMPLE_VALUES) || "Subject line"}
            </p>
            <p className="truncate text-sm text-subtle-foreground">
              {doc.preheader ? <span className="text-muted-foreground">{resolveTags(doc.preheader, SAMPLE_VALUES)}</span> : "Preheader (inbox preview line), optional"}
            </p>
          </div>
          <div className="email-canvas w-full rounded-lg border p-6">
            <EmailBody blocks={doc.blocks} html={letter ? joinHtmlBlock(doc.html, doc.htmlBlock) : undefined} kind={doc.kind} mode="preview" values={SAMPLE_VALUES} />
          </div>
        </section>
        </div>
      </div>

      {!readOnly && (
        <WriteWithSaellaDialog
          open={aiOpen}
          onOpenChange={setAiOpen}
          kind={doc.kind}
          current={bodyBlocks}
          fresh={isDraft && doc.blocks === initial.blocks && doc.html === initial.html}
          failMidway={previewState === "ai-error"}
          onUse={applyDraft}
        />
      )}

      {/* What's next once the template can send: a batch now, or a schedule. "Not now" stays in the editor. */}
      <Dialog
        open={ready && !isDraft}
        onOpenChange={(o) => {
          if (o) return;
          setReady(false);
          if (params.get("ready")) router.replace(`/templates/${id}/edit`);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ready to send “{doc.name}”</DialogTitle>
            <DialogDescription>It&apos;s saved and active. What would you like to do next?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button className="justify-start" onClick={() => router.push(`/batches/new?template=${encodeURIComponent(id)}&step=1`)}>
              <SendIcon data-icon="inline-start" />
              Send a batch now
            </Button>
            {/* One running schedule per template. */}
            <LockedTip reason={scheduleRunning ? "Pause the current schedule to set a new one" : undefined}>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={scheduleRunning}
                onClick={() => {
                  setReady(false);
                  if (params.get("ready")) router.replace(`/templates/${id}/edit`);
                  setScheduling(true);
                }}
              >
                <CalendarClockIcon data-icon="inline-start" />
                Set a schedule
              </Button>
            </LockedTip>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Not now</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isDraft && <ScheduleDialog templateId={id} scheduleId={null} open={scheduling} onOpenChange={setScheduling} />}

      <AlertDialog open={pendingKind !== null} onOpenChange={(o) => !o && setPendingKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to {pendingKind === "design" ? "Design" : "Letter"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingKind === "design"
                ? "The email is laid out as a centred poster. Your text, images and links stay; text formatting and the HTML block don't carry over."
                : "The email reads as a letter. Hero blocks become headings; your text, images and buttons stay."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep {doc.kind === "design" ? "Design" : "Letter"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSource(false);
                if (pendingKind === "design")
                  patch({ kind: "design", blocks: convertBlocks(htmlToBlocks(joinHtmlBlock(doc.html, doc.htmlBlock)), "design"), html: "", htmlBlock: "" });
                if (pendingKind === "letter") {
                  patch({ kind: "letter", html: blocksToHtml(convertBlocks(doc.blocks, "letter")), blocks: [] });
                  setLetterEpoch((n) => n + 1);
                }
                setPendingKind(null);
              }}
            >
              Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leaving a template still being made: save it, and mark it active so it can be sent. */}
      <AlertDialog open={leaveTo !== null && unfinished} onOpenChange={(o) => !o && setLeaveTo(null)}>
        <AlertDialogContent
          tabIndex={-1}
          className="outline-none data-[size=default]:sm:max-w-lg"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Mark “{doc.name || "this template"}” active before you leave?</AlertDialogTitle>
            <AlertDialogDescription>
              {dirty ? "Your changes aren't saved yet. " : isDraft ? "Not saved yet. " : "It's saved as a draft. "}
              Only active templates can be sent{campaignOff ? `; ${campaignOff.toLowerCase()}.` : markReason ? `; ${markReason.toLowerCase()}.` : "."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {(dirty || isDraft) && (
              <Button
                variant="ghost"
                className="text-destructive-soft-foreground hover:text-destructive-soft-foreground sm:mr-auto"
                onClick={() => {
                  const to = leaveTo;
                  setLeaveTo(null);
                  if (to) leave(to);
                }}
              >
                Discard
              </Button>
            )}
            <Button variant="outline" onClick={() => setLeaveTo(null)}>
              Keep editing
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const to = leaveTo;
                setLeaveTo(null);
                if (!to) return;
                if (dirty || isDraft) {
                  if (save(false, { stay: true })) leave(to);
                } else leave(to);
              }}
            >
              {dirty || isDraft ? "Save draft" : "Leave as draft"}
            </Button>
            <LockedTip reason={activateReason}>
              <Button
                disabled={Boolean(activateReason)}
                onClick={() => {
                  const to = leaveTo;
                  setLeaveTo(null);
                  if (to && save(true, { stay: true })) leave(to);
                }}
              >
                Mark active
              </Button>
            </LockedTip>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deactivating} onOpenChange={setDeactivating}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark “{doc.name}” inactive?</AlertDialogTitle>
            <AlertDialogDescription>Its schedule is running. It waits, and sends nothing, until you mark the template active again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction onClick={markInactive}>Mark inactive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leaving with unsaved work (lib/leave-guard.ts; shared dialog, PATTERNS.md §9.10). */}
      <UnsavedDialog
        open={leaveTo !== null && !unfinished}
        title="Save this template?"
        description={isDraft ? `“${doc.name}” hasn't been saved yet. Leave now and it's gone.` : `Your changes to “${doc.name}” aren't saved yet.`}
        saveLabel="Save draft"
        onKeepEditing={() => setLeaveTo(null)}
        onDiscard={() => {
          const to = leaveTo;
          setLeaveTo(null);
          if (to) leave(to);
        }}
        onSave={() => {
          const to = leaveTo;
          setLeaveTo(null);
          // A failed save (e.g. no subject yet) says why and keeps the user here.
          if (to && save(false, { stay: true })) leave(to);
        }}
      />
    </>
  );
}

const SEVERITY = {
  error: { icon: CircleAlertIcon, className: "text-destructive", label: "Must fix" },
  warning: { icon: TriangleAlertIcon, className: "text-warning-soft-foreground", label: "Worth fixing" },
  tip: { icon: LightbulbIcon, className: "text-muted-foreground", label: "Tips" },
} as const;

// Content check (live app lint findings), as a button on the status line under the title: "3 to fix" opens the list.
// Problems that block Mark active come first; picking one goes to the field or block.
function CheckPopover({
  issues,
  open,
  onOpenChange,
  onPick,
}: {
  issues: Issue[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (i: Issue) => void;
}) {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={errors ? "outline" : "ghost"}
          size="sm"
          aria-label={errors ? `${errors} ${errors === 1 ? "problem" : "problems"} to fix before Mark active` : `${warnings} worth fixing`}
          className={cn(
            "text-warning-soft-foreground hover:text-warning-soft-foreground",
            errors && "border-warning/40 bg-warning-soft hover:bg-warning-soft"
          )}
        >
          {errors ? <CircleAlertIcon data-icon="inline-start" /> : <TriangleAlertIcon data-icon="inline-start" />}
          {errors ? `${errors} to fix` : `${warnings} to check`}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-2">
        {/* The button's count is the first group's rows; a second kind gets its own heading and count. */}
        <ItemGroup aria-label="Content check">
          {(["error", "warning", "tip"] as const).flatMap((sev) => {
            const rows = issues.filter((i) => i.severity === sev);
            const grouped = new Set(issues.map((i) => i.severity)).size > 1;
            const heading =
              grouped && rows.length > 0 ? (
                <p key={`h-${sev}`} className="px-2 pt-1.5 pb-0.5 text-sm font-medium text-muted-foreground tabular-nums">
                  {SEVERITY[sev].label} · {rows.length}
                </p>
              ) : null;
            return [
              heading,
              ...rows.map((i) => {
                const S = SEVERITY[sev];
                const clickable = Boolean(i.blockId || i.field || i.image !== undefined);
                const body = (
                  <>
                    <ItemMedia>
                      <S.icon aria-label={S.label} className={cn("size-4", S.className)} />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="font-normal">{i.title}</ItemTitle>
                      {i.detail && <ItemDescription className="line-clamp-none">{i.detail}</ItemDescription>}
                    </ItemContent>
                    {clickable && <ChevronRightIcon aria-hidden className="size-4 text-subtle-foreground" />}
                  </>
                );
                return clickable ? (
                  <Item key={i.id} size="sm" asChild>
                    <button type="button" onClick={() => onPick(i)} className="text-left">
                      {body}
                    </button>
                  </Item>
                ) : (
                  <Item key={i.id} size="sm">
                    {body}
                  </Item>
                );
              }),
            ];
          })}
        </ItemGroup>
      </PopoverContent>
    </Popover>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72" />
      </div>
      {/* As the editor: two equal panes, envelope rows + toolbar + email on the left, the preview on the right. */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-card border p-4">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-9" />
          <Skeleton className="h-96" />
        </div>
        <div className="flex flex-col gap-4 rounded-card border p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16" />
          <Skeleton className="h-96" />
        </div>
      </div>
    </div>
  );
}
