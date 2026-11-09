"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CopyIcon,
  FileTextIcon,
  HeadingIcon,
  ImageIcon,
  LayoutTemplateIcon,
  LightbulbIcon,
  LockIcon,
  MinusIcon,
  PilcrowIcon,
  RectangleHorizontalIcon,
  RotateCwIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { CURRENT_USER, type Template } from "@/app/(app)/campaigns/_components/data";
import { PageHeader } from "@/components/layout/page-header";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { LockedTip } from "../automate-dialog";
import {
  BLOCKS_FOR,
  BLOCK_LABEL,
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
  lockReason,
  newBlockId,
  resolveTags,
  senderById,
  senderOptions,
  starterBlocks,
  viewerFor,
} from "../data";
import { BlockInspector, TagField } from "./block-inspector";
import { type Issue, checkContent, checkSubject } from "./content-check";
import { EmailBody } from "./email-body";
import { SubjectChecklist } from "./subject-checklist";
import { WriteWithAi } from "./write-with-ai";

// The email editor (live app EmailTemplateEditor; DESIGN.md §9.3), first build 2026-10-28.
// Layout: envelope (name, sender, subject, preheader, kind) + the email on a canvas in the middle; on the right
// a panel with Block (properties of the clicked block), Check (content check) and Write with AI.
// Simplified on purpose, to be decided with the user:
//  - blocks instead of free rich text: no inline bold/links/fonts, no drag and drop (move up/down instead),
//    no HTML code view, no A/B versions, no attachments (AC-EC-T-04) and no per-template colours yet;
//  - images are placeholders (no storage); the preview follows the app theme instead of a fixed white email;
//  - the unsaved guard covers in-app links and closing the tab, not the browser Back button.
// Permissions (Repo template-permissions.ts): editing needs canEdit; others open it read-only with Make a copy
// (AC-EC-TO-03). A save after access is revoked is rejected and the editor drops to read-only (AC-EC-TO-05).
// Preview states: ?state=loading | error | member | revoked (save fails) | ai-error. `draft` = new template.
// ?ai=subject | subject-writing opens Write with AI on the Subject tab (write-with-ai.tsx).
// ?subject=…&preheader=… start the template with that text, to show the live subject checklist (R5).

type Snapshot = {
  name: string;
  kind: TemplateKind;
  subject: string;
  preheader: string;
  senderId: string;
  blocks: Block[];
};

const BLOCK_ICON: Record<BlockType, React.ElementType> = {
  heading: HeadingIcon,
  paragraph: PilcrowIcon,
  image: ImageIcon,
  button: RectangleHorizontalIcon,
  divider: MinusIcon,
  hero: LayoutTemplateIcon,
};

export function TemplateEditor({ id }: { id: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const previewState = params.get("state");
  const viewer = viewerFor(previewState);
  const isDraft = id === "draft";
  const found = isDraft ? null : findTemplate(id);

  const template: Template = found?.template ?? {
    id: "draft",
    name: params.get("name") ?? "Untitled template",
    owner: CURRENT_USER,
    status: "inactive",
    recipients: 0,
    delivered: 0,
    opens: 0,
    clicks: 0,
    bounces: 0,
    unsubs: 0,
  };
  const draftKind: TemplateKind = params.get("kind") === "design" ? "design" : "letter";

  const initial = useMemo<Snapshot>(() => {
    const envelope = { subject: params.get("subject"), preheader: params.get("preheader") };
    if (isDraft)
      return {
        name: template.name,
        kind: draftKind,
        subject: envelope.subject ?? "",
        preheader: envelope.preheader ?? "",
        senderId: DEFAULT_SENDER_ID,
        blocks: starterBlocks(draftKind),
      };
    const d = detailsFor(id);
    return {
      name: template.name,
      kind: d.kind,
      subject: envelope.subject ?? d.subject,
      preheader: envelope.preheader ?? d.preheader,
      senderId: d.senderId ?? DEFAULT_SENDER_ID,
      blocks: d.blocks,
    };
    // Loaded once per template.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [saved, setSaved] = useState<Snapshot>(initial);
  const [doc, setDoc] = useState<Snapshot>(initial);
  const [status, setStatus] = useState(template.status);
  const [revoked, setRevoked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initial.blocks[0]?.id ?? null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [panel, setPanel] = useState(params.get("ai") ? "ai" : "block");
  const [pendingKind, setPendingKind] = useState<TemplateKind | null>(null);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);

  const access = accessFor(template, viewer);
  const readOnly = !canEdit(access) || revoked;
  const dirty = JSON.stringify(doc) !== JSON.stringify(saved);
  const { issues, passed } = useMemo(() => checkContent(doc), [doc]);
  const subjectChecks = useMemo(() => checkSubject(doc.subject, doc.preheader), [doc.subject, doc.preheader]);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const issueIds = new Set(issues.filter((i) => i.blockId && i.severity !== "tip").map((i) => i.blockId!));
  const subjectRef = useRef<HTMLDivElement>(null);

  // Unsaved guard: closing the tab asks the browser; in-app links ask us (capture phase, before Next's Link).
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== window.location.origin || a.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(a.pathname + a.search);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const patch = (p: Partial<Snapshot>) => setDoc((d) => ({ ...d, ...p }));
  const setBlocks = (fn: (b: Block[]) => Block[]) => setDoc((d) => ({ ...d, blocks: fn(d.blocks) }));
  const selectedIndex = doc.blocks.findIndex((b) => b.id === selectedId);
  const selected = selectedIndex >= 0 ? doc.blocks[selectedIndex] : null;

  function addBlock(type: BlockType) {
    const b = emptyBlock(type);
    setBlocks((all) => {
      const at = selectedIndex >= 0 ? selectedIndex + 1 : all.length;
      return [...all.slice(0, at), b, ...all.slice(at)];
    });
    setSelectedId(b.id);
    setPanel("block");
  }

  function save(markActive: boolean): boolean {
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
    setSaved(doc);
    if (markActive) setStatus("active");
    toast.success(isDraft ? `Created “${doc.name}”` : markActive ? "Saved and marked active" : "Saved", {
      description: markActive ? "It can be sent now." : status === "inactive" ? "Still inactive: mark it active when it's ready to send." : undefined,
    });
    return true;
  }

  function goToIssue(issue: Issue) {
    if (issue.blockId) {
      setSelectedId(issue.blockId);
      setView("edit");
      setPanel("block");
    } else if (issue.field) {
      const el = document.getElementById(issue.field === "sender" ? "ed-sender" : `ed-${issue.field}`);
      el?.focus();
      subjectRef.current?.scrollIntoView({ block: "nearest" });
    }
  }

  if (previewState === "loading") return <EditorSkeleton />;
  if (previewState === "error")
    return (
      <>
        <PageHeader title="Edit template" breadcrumbs={[{ label: "Templates", href: "/templates" }]} />
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
  const markReason = errors.length > 0 ? `Fix ${errors.length} ${errors.length === 1 ? "problem" : "problems"} in Check first` : undefined;
  const checkCount = errors.length + warnings.length;

  const actions = readOnly ? (
    <Button variant="outline" onClick={() => toast.success("Copy created", { description: "It's inactive and yours to edit." })}>
      <CopyIcon data-icon="inline-start" />
      Make a copy
    </Button>
  ) : (
    <>
      {/* Write with AI lives only in the right panel's tab (one entry point, 2026-11-05). */}
      {status === "inactive" ? (
        <>
          <Button variant="outline" onClick={() => save(false)} disabled={!dirty && !isDraft}>
            Save draft
          </Button>
          <LockedTip reason={markReason}>
            <Button onClick={() => save(true)} disabled={Boolean(markReason)}>
              Save and mark active
            </Button>
          </LockedTip>
        </>
      ) : (
        <LockedTip reason={markReason && "An active template can be sent. " + markReason}>
          <Button onClick={() => save(false)} disabled={!dirty || Boolean(markReason)}>
            Save changes
          </Button>
        </LockedTip>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title={doc.name || "Untitled template"}
        breadcrumbs={[{ label: "Templates", href: "/templates" }]}
        actions={actions}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <StatusBadge status={status === "active" ? "template-active" : "template-inactive"} />
          <span aria-live="polite">{readOnly ? "View only" : isDraft && !dirty ? "Not saved yet" : dirty ? "Unsaved changes" : "All changes saved"}</span>
          {found && <span>in {found.campaign.name}</span>}
          {found && (
            <Link href={`/templates/${id}`} className="underline-offset-4 hover:text-foreground hover:underline">
              View results
            </Link>
          )}
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Envelope */}
          <div ref={subjectRef} className="grid gap-x-6 gap-y-4 rounded-card border p-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="ed-name">Template name</FieldLabel>
              <Input id="ed-name" value={doc.name} onChange={(e) => patch({ name: e.target.value })} disabled={readOnly} />
              <FieldDescription>Only your team sees it.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="ed-sender">From</FieldLabel>
              <Select value={doc.senderId} onValueChange={(v) => patch({ senderId: v })} disabled={readOnly}>
                <SelectTrigger id="ed-sender" className="w-full">
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
              <FieldDescription>New batches from this template start with this sender, for everyone.</FieldDescription>
            </Field>
            <TagField
              id="ed-subject"
              label="Subject"
              value={doc.subject}
              onChange={(subject) => patch({ subject })}
              disabled={readOnly}
              placeholder="What the recipient sees first"
              invalid={(!isDraft || dirty) && issues.some((i) => i.field === "subject" && i.severity === "error")}
            />
            <TagField
              id="ed-preheader"
              label="Preheader"
              value={doc.preheader}
              onChange={(preheader) => patch({ preheader })}
              disabled={readOnly}
              placeholder="The line shown after the subject in the inbox"
            />
            {doc.subject.trim() && <SubjectChecklist checks={subjectChecks} />}
          </div>

          {/* Canvas */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
                value={view}
                onValueChange={(v) => v && setView(v as "edit" | "preview")}
                aria-label="Canvas mode"
              >
                <ToggleGroupItem value="edit">Edit</ToggleGroupItem>
                <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
              </ToggleGroup>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
                value={doc.kind}
                onValueChange={(v) => v && v !== doc.kind && setPendingKind(v as TemplateKind)}
                aria-label="Template kind"
                disabled={readOnly}
              >
                <ToggleGroupItem value="letter">
                  <FileTextIcon />
                  Letter
                </ToggleGroupItem>
                <ToggleGroupItem value="design">
                  <LayoutTemplateIcon />
                  Design
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="rounded-card bg-muted p-6">
              {view === "preview" && (
                <div className="email-canvas mx-auto mb-3 flex w-full max-w-150 flex-col gap-0.5 rounded-lg border px-4 py-3 text-sm">
                  <span className="font-medium">{currentSender?.name ?? "Sender"}</span>
                  <span className="truncate">
                    <span className="font-medium">{resolveTags(doc.subject, SAMPLE_VALUES) || "No subject"}</span>
                    {doc.preheader && <span className="text-muted-foreground"> · {resolveTags(doc.preheader, SAMPLE_VALUES)}</span>}
                  </span>
                </div>
              )}
              {/* email-canvas: always the light palette recipients see, whatever the app theme (tokens.css). */}
              <div className="email-canvas mx-auto w-full max-w-150 rounded-lg border p-8">
                <EmailBody
                  blocks={doc.blocks}
                  kind={doc.kind}
                  mode={view}
                  values={SAMPLE_VALUES}
                  selectedId={readOnly ? null : selectedId}
                  onSelect={readOnly ? undefined : (bid) => { setSelectedId(bid); setPanel("block"); }}
                  issueIds={issueIds}
                />
              </div>
              {view === "edit" && !readOnly && (
                <div className="mx-auto mt-3 flex w-full max-w-150 flex-wrap items-center gap-1">
                  <span className="mr-1 text-sm text-muted-foreground">{selected ? "Add below selected:" : "Add:"}</span>
                  {BLOCKS_FOR[doc.kind].map((type) => {
                    const Icon = BLOCK_ICON[type];
                    return (
                      <Button key={type} variant="ghost" size="sm" onClick={() => addBlock(type)}>
                        <Icon data-icon="inline-start" />
                        {BLOCK_LABEL[type]}
                      </Button>
                    );
                  })}
                </div>
              )}
              {view === "preview" && (
                <p className="mx-auto mt-3 w-full max-w-150 text-sm text-muted-foreground">
                  Shown as {SAMPLE_VALUES.recipient_name} at {SAMPLE_VALUES.company_name} would see it, at desktop width.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <aside className="sticky top-0 flex flex-col rounded-card border" aria-label="Editor panel">
          <Tabs value={panel} onValueChange={setPanel} className="gap-0">
            <TabsList className="w-full justify-start border-b px-2" aria-label="Editor panel">
              <TabsTrigger value="block">Block</TabsTrigger>
              <TabsTrigger value="check">
                Check
                {checkCount > 0 && (
                  <Badge variant={errors.length ? "destructive" : "secondary"} className="h-5 min-w-5 px-1.5 tabular-nums">
                    {checkCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ai">
                <SparklesIcon />
                Write with AI
              </TabsTrigger>
            </TabsList>
            <TabsContent value="block" className="p-4">
              <BlockInspector
                block={readOnly ? null : selected}
                index={selectedIndex}
                count={doc.blocks.length}
                disabled={readOnly}
                onChange={(b) => setBlocks((all) => all.map((x) => (x.id === b.id ? b : x)))}
                onMove={(dir) =>
                  setBlocks((all) => {
                    const next = [...all];
                    const [b] = next.splice(selectedIndex, 1);
                    next.splice(selectedIndex + dir, 0, b);
                    return next;
                  })
                }
                onDuplicate={() => {
                  if (!selected) return;
                  const copy = { ...selected, id: newBlockId() };
                  setBlocks((all) => [...all.slice(0, selectedIndex + 1), copy, ...all.slice(selectedIndex + 1)]);
                  setSelectedId(copy.id);
                }}
                onDelete={() => {
                  setBlocks((all) => all.filter((x) => x.id !== selectedId));
                  setSelectedId(doc.blocks[selectedIndex + 1]?.id ?? doc.blocks[selectedIndex - 1]?.id ?? null);
                }}
              />
            </TabsContent>
            <TabsContent value="check" className="p-4">
              <ContentCheck issues={issues} passed={passed} onPick={goToIssue} />
            </TabsContent>
            <TabsContent value="ai" className="p-4">
              {readOnly ? (
                <p className="text-sm text-muted-foreground">Write with AI needs edit access.</p>
              ) : (
                <WriteWithAi
                  kind={doc.kind}
                  blocks={doc.blocks}
                  selectedId={selectedId}
                  disabled={readOnly}
                  failMidway={previewState === "ai-error"}
                  preview={params.get("ai")}
                  subject={doc.subject}
                  onUseSubject={(subject) => {
                    patch({ subject });
                    toast.success("Subject updated", { description: "Review it, then save. Nothing is saved yet." });
                  }}
                  onUse={(mode, result) => {
                    if (mode === "block") {
                      setBlocks((all) => {
                        const at = selectedIndex >= 0 ? selectedIndex + 1 : all.length;
                        return [...all.slice(0, at), ...result, ...all.slice(at)];
                      });
                      setSelectedId(result[0]?.id ?? null);
                    } else {
                      setBlocks(() => result);
                      setSelectedId(result[0]?.id ?? null);
                    }
                    toast.success("Draft added to the editor", { description: "Review it, then save. Nothing is saved yet." });
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <AlertDialog open={pendingKind !== null} onOpenChange={(o) => !o && setPendingKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to {pendingKind === "design" ? "Design" : "Letter"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingKind === "design"
                ? "The email is laid out as a centred poster. Headings become hero blocks; your text, images and buttons stay."
                : "The email reads as a letter. Hero blocks become headings; your text, images and buttons stay."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep {doc.kind === "design" ? "Design" : "Letter"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingKind) patch({ kind: pendingKind, blocks: convertBlocks(doc.blocks, pendingKind) });
                setPendingKind(null);
              }}
            >
              Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveTo !== null} onOpenChange={(o) => !o && setLeaveTo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>Your changes to “{doc.name}” will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                const to = leaveTo;
                dirtyRef.current = false;
                setLeaveTo(null);
                if (to) router.push(to);
              }}
            >
              Discard changes
            </Button>
            {!readOnly && (
              <AlertDialogAction
                onClick={() => {
                  const to = leaveTo;
                  if (save(false)) {
                    dirtyRef.current = false;
                    if (to) router.push(to);
                  }
                  setLeaveTo(null);
                }}
              >
                Save and leave
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const SEVERITY = {
  error: { icon: CircleAlertIcon, className: "text-destructive", label: "Must fix" },
  warning: { icon: TriangleAlertIcon, className: "text-warning-soft-foreground", label: "Worth fixing" },
  tip: { icon: LightbulbIcon, className: "text-muted-foreground", label: "Tips" },
} as const;

function ContentCheck({ issues, passed, onPick }: { issues: Issue[]; passed: string[]; onPick: (i: Issue) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {issues.some((i) => i.severity === "error")
          ? "Fix the problems below before this template can be marked active."
          : issues.length
            ? "Nothing blocks sending. A few things could be better."
            : "Looks good. Nothing to fix."}
      </p>
      {(["error", "warning", "tip"] as const).map((sev) => {
        const list = issues.filter((i) => i.severity === sev);
        if (list.length === 0) return null;
        const S = SEVERITY[sev];
        return (
          <section key={sev} className="flex flex-col gap-1" aria-label={S.label}>
            <h3 className="text-sm font-medium">
              {S.label} <span className="font-normal text-muted-foreground tabular-nums">{list.length}</span>
            </h3>
            <ItemGroup>
              {list.map((i) => {
                const clickable = Boolean(i.blockId || i.field);
                const body = (
                  <>
                    <ItemMedia>
                      <S.icon aria-hidden className={cn("size-4", S.className)} />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="font-normal">{i.title}</ItemTitle>
                      {i.detail && <ItemDescription className="line-clamp-none">{i.detail}</ItemDescription>}
                    </ItemContent>
                    {clickable && <ChevronRightIcon aria-hidden className="size-4 text-subtle-foreground" />}
                  </>
                );
                return clickable ? (
                  <Item key={i.id} size="sm" className="-mx-2 px-2" asChild>
                    <button type="button" onClick={() => onPick(i)} className="text-left">
                      {body}
                    </button>
                  </Item>
                ) : (
                  <Item key={i.id} size="sm" className="-mx-2 px-2">
                    {body}
                  </Item>
                );
              })}
            </ItemGroup>
          </section>
        );
      })}
      {passed.length > 0 && (
        <section className="flex flex-col gap-1.5" aria-label="Passed">
          <h3 className="text-sm font-medium">Passed</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {passed.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <CircleCheckIcon aria-hidden className="size-4 text-success-soft-foreground" />
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
