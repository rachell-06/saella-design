"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  CircleAlertIcon,
  FilePenIcon,
  FilePlusIcon,
  FolderPlusIcon,
  ListChecksIcon,
  PowerIcon,
  SendIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  type Approval,
  type DraftPreview,
  FLOW_STEPS,
  type FlowStep,
  type SendSplit,
  canSplit,
  confirmLabelOf,
  noteOf,
} from "./data";
import { SendSplitChoice, TestSendView, approveLabel } from "./send-split";

// Approval queue of the full agent page (R17, learnt from Unify's enrollment queue, Competitor.md U-P1/U-P2):
// everything the agent is waiting on, across conversations, on the left; exactly what will be saved or sent on
// the right. It is a second view of the same approval parts the chat shows as ApprovalCards, so deciding here
// collapses the card there and moves the Campaign flow, and the other way round. Which steps stop at all is
// still the open 2-or-5 gates question (?gates=all); the queue only lists what the gates let through.
// "Ready" is a queue-only mark (Unify `Mark ready`) so several items can be approved at once; a live send can
// only be marked ready, or approved, after its confirm tick (AC-AG-G-06).
// Preview states: ?queue=open | empty | done (all approved) | error (one approval failed).
// R18 (2026-10-29): a large live send shows "Send to 20 first / Send to all N" above the tick (send-split.tsx);
// the main button says which. "Send the remaining N" items show what the first 20 did.

export type QueueStatus = "waiting" | "ready" | "running" | "error" | "approved" | "rejected";
export type QueueItem = { approval: Approval; threadId: string; threadTitle: string; status: QueueStatus };

const KIND: Record<FlowStep, { label: string; icon: typeof SendIcon; preview: string }> = {
  campaign: { label: "Campaign", icon: FolderPlusIcon, preview: "" },
  template: { label: "New template", icon: FilePlusIcon, preview: "What will be saved" },
  edit: { label: "Template edit", icon: FilePenIcon, preview: "What will be saved" },
  activate: { label: "Activation", icon: PowerIcon, preview: "What it will send" },
  send: { label: "Live send", icon: SendIcon, preview: "What will be sent" },
};

const STATUS: Record<QueueStatus, { label: string; variant: "brand" | "info" | "secondary" | "destructive" | "success" }> = {
  waiting: { label: "Waiting", variant: "brand" },
  ready: { label: "Ready", variant: "info" },
  running: { label: "Working", variant: "secondary" },
  error: { label: "Failed", variant: "destructive" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "secondary" },
};

export const isOpen = (s: QueueStatus) => s === "waiting" || s === "ready" || s === "running" || s === "error";

export type QueueHandlers = {
  onApprove: (id: string) => void;
  onApproveMany: (ids: string[]) => void;
  onReject: (id: string) => void;
  onSetReady: (id: string, ready: boolean) => void;
  onEdit: (id: string, draft: { subject: string; body: string }) => void;
  onOpenThread: (threadId: string) => void;
  onSplit: (id: string, split: SendSplit) => void;
};

export function ApprovalQueue({
  open,
  onOpenChange,
  items,
  gates,
  focusId,
  handlers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: QueueItem[];
  gates: FlowStep[];
  /** Item to show first, e.g. the one a Review link pointed at. */
  focusId?: string;
  handlers: QueueHandlers;
}) {
  const waiting = items.filter((i) => isOpen(i.status)).length;
  const approved = items.filter((i) => i.status === "approved").length;
  const rejected = items.filter((i) => i.status === "rejected").length;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-5xl">
        <SheetHeader className="border-b px-5 py-4 pr-12">
          <SheetTitle className="flex items-center gap-2">
            Approval queue
            {waiting > 0 && (
              <Badge variant="brand" className="tabular-nums">
                {waiting} waiting
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {waiting > 0
              ? "Nothing is sent or changed yet. These are drafts the agent made; each one waits for your approval."
              : items.length > 0
                ? `All caught up: ${approved} approved${rejected ? `, ${rejected} rejected` : ""}. Nothing is waiting for you.`
                : "Anything the agent wants to save or send waits here and in the chat until you decide."}
          </SheetDescription>
        </SheetHeader>
        {/* Remounts on every open (the content unmounts when closed), so selection and ticks start fresh. */}
        {items.length === 0 ? <QueueEmpty gates={gates} /> : <QueueBody items={items} focusId={focusId} handlers={handlers} />}
      </SheetContent>
    </Sheet>
  );
}

function QueueEmpty({ gates }: { gates: FlowStep[] }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ListChecksIcon />
        </EmptyMedia>
        <EmptyTitle>Nothing waiting for approval</EmptyTitle>
        <EmptyDescription>
          When the agent drafts something that changes your data or sends email, it shows up here with a preview.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <p className="text-sm text-muted-foreground">
          Right now the agent asks before: {FLOW_STEPS.filter((s) => gates.includes(s.step)).map((s) => s.label).join(", ")}.
        </p>
      </EmptyContent>
    </Empty>
  );
}

function QueueBody({ items, focusId, handlers }: { items: QueueItem[]; focusId?: string; handlers: QueueHandlers }) {
  const [selectedId, setSelectedId] = useState(
    () => (items.find((i) => i.approval.id === focusId) ?? items.find((i) => isOpen(i.status)) ?? items[0]).approval.id
  );
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const selected = items.find((i) => i.approval.id === selectedId) ?? items[0];
  const pending = items.filter((i) => isOpen(i.status));
  const decided = items.filter((i) => !isOpen(i.status));
  const ready = items.filter((i) => i.status === "ready").map((i) => i.approval.id);

  /** After deciding one, move on to the next item still waiting (Unify does the same). */
  const next = (id: string) => {
    const rest = pending.filter((i) => i.approval.id !== id && i.status !== "running");
    if (rest.length) setSelectedId(rest[0].approval.id);
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] divide-x">
      <div className="flex min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <QueueGroup title="Waiting" items={pending} selectedId={selected.approval.id} onSelect={setSelectedId} />
          <QueueGroup title="Decided" items={decided} selectedId={selected.approval.id} onSelect={setSelectedId} />
        </div>
        <div className="flex flex-col gap-1.5 border-t p-3">
          <Button disabled={ready.length === 0} onClick={() => handlers.onApproveMany(ready)}>
            <CheckIcon data-icon="inline-start" />
            Approve {ready.length} ready
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {ready.length === 0 ? "Mark items ready to approve them together." : "Each one runs as if you approved it on its own."}
          </p>
        </div>
      </div>
      <QueueDetail
        key={selected.approval.id}
        item={selected}
        confirmed={confirmed.includes(selected.approval.id)}
        onConfirm={(v) => {
          const id = selected.approval.id;
          setConfirmed((c) => (v ? [...c, id] : c.filter((x) => x !== id)));
          // Unticking takes back the "ready" too: a live send is never approved without the tick.
          if (!v && selected.status === "ready") handlers.onSetReady(id, false);
        }}
        handlers={{
          ...handlers,
          onApprove: (id) => {
            handlers.onApprove(id);
            next(id);
          },
          onReject: (id) => {
            handlers.onReject(id);
            next(id);
          },
          // A different number to send needs a fresh tick, as on the chat card (agent-screen drops "ready").
          onSplit: (id, split) => {
            setConfirmed((c) => c.filter((x) => x !== id));
            handlers.onSplit(id, split);
          },
        }}
      />
    </div>
  );
}

function QueueGroup({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: QueueItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">
        {title} · <span className="tabular-nums">{items.length}</span>
      </h3>
      <ul className="flex flex-col">
        {items.map(({ approval: a, threadTitle, status }) => {
          const Icon = KIND[a.step].icon;
          return (
            <li key={a.id}>
              <button
                type="button"
                aria-current={a.id === selectedId ? "true" : undefined}
                onClick={() => onSelect(a.id)}
                className={cn(
                  "relative flex w-full items-start gap-3 py-2.5 pr-3 pl-4 text-left transition-colors hover:bg-muted/60",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                  "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand before:opacity-0",
                  "aria-[current=true]:bg-primary-subtle aria-[current=true]:before:opacity-100"
                )}
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{KIND[a.step].label}</span>
                  <span className={cn("line-clamp-2 text-sm font-medium", !isOpen(status) && "text-muted-foreground")}>{a.action}</span>
                  <span className="truncate text-xs text-subtle-foreground">{threadTitle}</span>
                </span>
                <QueueStatusBadge status={status} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function QueueStatusBadge({ status }: { status: QueueStatus }) {
  const s = STATUS[status];
  return (
    <Badge variant={s.variant} className="mt-0.5">
      {status === "running" && <Spinner data-icon="inline-start" />}
      {s.label}
    </Badge>
  );
}

function QueueDetail({
  item,
  confirmed,
  onConfirm,
  handlers,
}: {
  item: QueueItem;
  confirmed: boolean;
  onConfirm: (v: boolean) => void;
  handlers: QueueHandlers;
}) {
  const { approval: a, status, threadId, threadTitle } = item;
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const confirmId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const open = isOpen(status);
  const running = status === "running";
  const confirmLabel = confirmLabelOf(a);
  const blocked = Boolean(confirmLabel) && !confirmed;
  const note = noteOf(a);

  return (
    <section aria-label={a.action} className="flex min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {KIND[a.step].label}
            <QueueStatusBadge status={status} />
            {a.edited && <Badge variant="outline">Edited by you</Badge>}
          </div>
          <h3 className="font-heading text-lg font-medium tracking-title">{a.action}</h3>
          <p className="text-sm text-muted-foreground">
            From “{threadTitle}” ·{" "}
            <button
              type="button"
              onClick={() => handlers.onOpenThread(threadId)}
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Open conversation
            </button>
          </p>
        </div>

        {status === "error" && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>This didn&apos;t go through</AlertTitle>
            <AlertDescription>{a.error} It is still waiting; approve again when you&apos;re ready.</AlertDescription>
          </Alert>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {a.details.map((d) => (
            <div key={d.label} className="contents">
              <dt className="text-muted-foreground">{d.label}</dt>
              <dd className="min-w-0 wrap-break-word">{d.value}</dd>
            </div>
          ))}
        </dl>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
        {a.remainderOf && <TestSendView result={a.remainderOf} />}

        {a.preview &&
          (draft ? (
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor={subjectId}>Subject</FieldLabel>
                <Input id={subjectId} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor={bodyId}>Body</FieldLabel>
                <Textarea
                  id={bodyId}
                  rows={10}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
                <FieldDescription>
                  Words in double braces, like {"{{first_name}}"}, are filled in for each recipient.
                </FieldDescription>
              </Field>
            </div>
          ) : (
            <EmailPreview title={KIND[a.step].preview} preview={a.preview} />
          ))}

        {canSplit(a) && open && !draft && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">How many to send now</p>
            <SendSplitChoice approval={a} onChange={(v) => handlers.onSplit(a.id, v)} disabled={running} />
          </div>
        )}

        {confirmLabel && open && !draft && (
          <Field orientation="horizontal" data-disabled={running || undefined}>
            <Checkbox id={confirmId} checked={confirmed} onCheckedChange={(v) => onConfirm(v === true)} disabled={running} />
            <FieldLabel htmlFor={confirmId} className="font-normal">
              {confirmLabel}
            </FieldLabel>
          </Field>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/50 p-3">
        {draft ? (
          <>
            <Button
              disabled={!draft.subject.trim() || !draft.body.trim()}
              onClick={() => {
                handlers.onEdit(a.id, { subject: draft.subject.trim(), body: draft.body.trim() });
                setDraft(null);
              }}
            >
              Save changes
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <span className="ml-auto text-sm text-muted-foreground">Saving puts it back to Waiting so you can check it again.</span>
          </>
        ) : open ? (
          <>
            <Button onClick={() => handlers.onApprove(a.id)} disabled={running || blocked}>
              {running && <Spinner data-icon="inline-start" />}
              {running ? "Working" : status === "error" ? "Approve again" : approveLabel(a)}
            </Button>
            <Button
              variant="outline"
              aria-pressed={status === "ready"}
              disabled={running || blocked}
              onClick={() => handlers.onSetReady(a.id, status !== "ready")}
            >
              {status === "ready" && <CheckIcon data-icon="inline-start" />}
              {status === "ready" ? "Ready" : "Mark ready"}
            </Button>
            {a.editHref ? (
              <Button variant="outline" asChild>
                <Link href={a.editHref}>Edit template</Link>
              </Button>
            ) : (
              a.preview && (
                <Button
                  variant="outline"
                  disabled={running}
                  onClick={() => a.preview && setDraft({ subject: a.preview.subject, body: a.preview.body })}
                >
                  Edit
                </Button>
              )
            )}
            <Button variant="ghost" className="ml-auto" disabled={running} onClick={() => handlers.onReject(a.id)}>
              Reject
            </Button>
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {status === "approved" ? (
              <>
                <CheckIcon className="size-4 text-success" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">Approved</span> · {a.result || "Done"}
                </span>
              </>
            ) : (
              "Rejected. Nothing was changed."
            )}
          </p>
        )}
      </div>
    </section>
  );
}

/** The email as one recipient gets it: variables filled from the sample and highlighted (Clay C-P11). */
function EmailPreview({ title, preview: p }: { title: string; preview: DraftPreview }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <div className="overflow-hidden rounded-card border bg-card">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b px-4 py-3 text-sm">
          <dt className="text-muted-foreground">From</dt>
          <dd className="min-w-0 wrap-break-word">{p.from}</dd>
          <dt className="text-muted-foreground">To</dt>
          <dd className="min-w-0 wrap-break-word">{p.to ?? "Chosen when you send it"}</dd>
          <dt className="text-muted-foreground">Subject</dt>
          <dd className="min-w-0 font-medium wrap-break-word">
            <Filled text={p.subject} sample={p.sample} />
          </dd>
        </dl>
        <p className="px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
          <Filled text={p.body} sample={p.sample} />
        </p>
      </div>
      <p className="text-sm text-muted-foreground">{p.sampleLabel}. Highlighted words change for each recipient.</p>
    </figure>
  );
}

function Filled({ text, sample }: { text: string; sample: Record<string, string> }) {
  return text.split(/(\{\{\w+\}\})/).map((seg, i) => {
    const m = /^\{\{(\w+)\}\}$/.exec(seg);
    return m ? (
      <mark key={i} className="rounded-sm bg-primary-subtle px-0.5 text-foreground">
        {sample[m[1]] ?? seg}
      </mark>
    ) : (
      seg
    );
  });
}
