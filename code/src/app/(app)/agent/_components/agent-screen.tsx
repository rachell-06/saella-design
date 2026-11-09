"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlertIcon, ListChecksIcon, MoreHorizontalIcon, PanelRightCloseIcon, PanelRightOpenIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { AgentWelcome } from "@/components/layout/agent-panel";
import { PageHeader } from "@/components/layout/page-header";
import type { AgentStep } from "@/components/saella/agent-steps";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ApprovalQueue, type QueueHandlers, type QueueItem, isOpen } from "./approval-queue";
import { ChatComposer } from "./chat-composer";
import {
  ALL_GATES,
  type Approval,
  FLOW_STEPS,
  type FlowStep,
  type Message,
  NOW,
  type Part,
  REPO_GATES,
  type Script,
  type SendSplit,
  type Thread,
  followUpThread,
  planReply,
  seedThreads,
  splitOf,
  testSendRun,
  timeAgo,
  uid,
} from "./data";
import { FlowPanel, type StepState } from "./flow-panel";
import { MessageView, type PartHandlers } from "./message-view";
import { DeleteThreadDialog, RenameThreadDialog } from "./thread-dialogs";
import { ThreadList } from "./thread-list";

// Full-page agent (PRD-03 AC-AG-C-05, live app /dashboard/agent, 2026-10-28): history on the left, transcript in
// the middle, campaign flow with per-step "Always allow" on the right. Replies are scripted (data.ts planReply):
// steps play live, Stop cancels the turn, gated writes stop at an ApprovalCard (AC-AG-G-02/03) and continue
// once approved (AC-AG-G-04). A live send also needs the confirm tick (AC-AG-G-06).
// Preview states: ?state=loading | empty | error (thread didn't load in 15s, AC-AG-T-05) | offline (mid-stream
// failure, AC-AG-S-06) | busy (turn in progress) | safety (18-round cap, AC-AG-S-05) | rate (20 turns a minute,
// AC-AG-W-05). ?gates=all gates all five steps as PRD-03 says (default: the two the live app gates).
// ?t=<id> opens a thread.
// Studio Admin pass (2026-10-28, /chat): the conversation pane got a header (title, visibility, time, ⋯ with
// rename/delete, and a toggle for the Campaign flow panel), and the three pane headers share one 44px row.
// Approval queue (R17, 2026-10-29): "Approvals" in the conversation header opens every waiting approval across
// threads with a full preview (approval-queue.tsx). It reads and decides the same approval parts as the chat cards.
// ?queue=open | empty | done | error opens it in that state; it works with ?gates=all too.
// Send to a few first (R18, 2026-10-29): a large live send can go to the first 20 (data.ts LARGE_SEND,
// TEST_SEND_SIZE); approving that shows how they did and puts "Send the remaining N" back in the queue.
// ?send=tested opens "Hotel buyers – Vietnam results" after the first 20 went out; add &queue=open for the queue.
// ?prompt=<text> starts a new conversation with that text as the first message (Companies sends people here).

export function AgentScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const preview = params.get("state");
  const gates = params.get("gates") === "all" ? ALL_GATES : REPO_GATES;
  const queuePreview = params.get("queue");
  const prompt = params.get("prompt")?.trim();

  const [initial] = useState(() => seed(preview, queuePreview, gates, params.get("send")));
  const [threads, setThreads] = useState<Thread[]>(initial.threads);
  const [selectedId, setSelectedId] = useState<string | undefined>(() =>
    prompt ? undefined : (params.get("t") ?? (preview === "empty" ? undefined : initial.threads[0]?.id))
  );
  const [busy, setBusy] = useState<{ threadId: string; msgId: string } | null>(() =>
    preview === "busy" ? { threadId: "th1", msgId: "busy-m" } : null
  );
  const [alwaysAllowed, setAlwaysAllowed] = useState<FlowStep[]>([]);
  const [lastTurn, setLastTurn] = useState<string | undefined>("3 steps · 2.6s · 2,140 tokens");
  const [showFlow, setShowFlow] = useState(true);
  const [renaming, setRenaming] = useState<Thread | null>(null);
  const [deleting, setDeleting] = useState<Thread | null>(null);
  // Approval queue: open/closed, which item to show first, approvals decided this session (they stay listed as
  // Approved / Rejected), and the ones marked Ready for "Approve N ready".
  const [queueOpen, setQueueOpen] = useState(() => ["open", "empty", "done", "error"].includes(queuePreview ?? ""));
  const [queueFocus, setQueueFocus] = useState<string | undefined>(initial.focus);
  const [decided, setDecided] = useState<string[]>(initial.decided);
  const [ready, setReady] = useState<string[]>(initial.ready);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopRef = useRef<(() => void) | null>(preview === "busy" ? () => stopAt("th1", "busy-m", 1) : null);
  const allowedRef = useRef(alwaysAllowed);
  useEffect(() => {
    allowedRef.current = alwaysAllowed;
  }, [alwaysAllowed]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const thread = threads.find((t) => t.id === selectedId);

  // ---- state helpers ------------------------------------------------------------------------------------
  const patchThread = (id: string, fn: (t: Thread) => Thread) => setThreads((all) => all.map((t) => (t.id === id ? fn(t) : t)));
  const patchMessage = (threadId: string, msgId: string, fn: (m: Message) => Message) =>
    patchThread(threadId, (t) => ({ ...t, messages: t.messages.map((m) => (m.id === msgId ? fn(m) : m)) }));
  const append = (threadId: string, m: Message) =>
    setThreads((all) => {
      const t = all.find((x) => x.id === threadId);
      if (!t) return all;
      // Newest activity first (AC-AG-T-01).
      return [{ ...t, updatedAt: NOW, messages: [...t.messages, m] }, ...all.filter((x) => x.id !== threadId)];
    });
  const setStep = (threadId: string, msgId: string, i: number, patch: Partial<AgentStep>) =>
    patchMessage(threadId, msgId, (m) => ({
      ...m,
      parts: m.parts.map((p, pi) =>
        pi === 0 && p.kind === "steps" ? { ...p, steps: p.steps.map((s, si) => (si === i ? { ...s, ...patch } : s)) } : p
      ),
    }));

  /**
   * Approvals for steps that don't need asking (not gated, or always allowed) run straight away. The rest of a
   * send that went to the first few always waits: the user asked to look before it goes (R18).
   */
  function resolve(parts: Part[]): Part[] {
    return parts.flatMap((p) =>
      p.kind === "approval" &&
      p.state === "pending" &&
      !p.remainderOf &&
      (!gates.includes(p.step) || allowedRef.current.includes(p.step))
        ? [{ ...p, state: "approved" as const, auto: true }, ...resolve(p.after)]
        : [p]
    );
  }

  function stopAt(threadId: string, msgId: string, i: number) {
    clearTimeout(timer.current);
    setStep(threadId, msgId, i, { status: "error", title: "Stopped by you", duration: undefined });
    patchMessage(threadId, msgId, (m) => ({
      ...m,
      parts: [...m.parts, { kind: "notice", text: "You stopped this turn. Nothing after this step ran." }],
    }));
    setBusy(null);
    stopRef.current = null;
  }

  // ---- running a turn -----------------------------------------------------------------------------------
  function run(threadId: string, script: Script) {
    const msgId = uid("m");
    append(threadId, {
      id: msgId,
      role: "agent",
      at: NOW,
      parts: [{ kind: "steps", steps: script.steps.map((s) => ({ title: s.title, status: "pending", detail: s.detail })) }],
    });
    setBusy({ threadId, msgId });
    let i = 0;
    const total = script.steps.reduce((n, s) => n + s.ms, 0);
    const tick = () => {
      if (i >= script.steps.length) {
        const usage = `${script.steps.length} ${script.steps.length === 1 ? "step" : "steps"} · ${(total / 1000).toFixed(1)}s · ${script.tokens.toLocaleString("en-US")} tokens`;
        patchMessage(threadId, msgId, (m) => ({
          ...m,
          parts: [...m.parts.map((p, pi) => (pi === 0 && p.kind === "steps" ? { ...p, usage } : p)), ...resolve(script.parts)],
        }));
        setLastTurn(usage);
        setBusy(null);
        stopRef.current = null;
        return;
      }
      const step = script.steps[i];
      setStep(threadId, msgId, i, { status: "running" });
      stopRef.current = () => stopAt(threadId, msgId, i);
      timer.current = setTimeout(() => {
        setStep(threadId, msgId, i, { status: "done", duration: `${(step.ms / 1000).toFixed(1)}s` });
        i += 1;
        tick();
      }, step.ms);
    };
    tick();
  }

  function send(text: string, attachment?: string) {
    if (busy) return;
    let threadId = thread?.id;
    if (!threadId) {
      threadId = uid("th");
      const created: Thread = { id: threadId, title: "", visibility: "private", updatedAt: NOW, messages: [] };
      setThreads((all) => [created, ...all]);
      setSelectedId(threadId);
    }
    const id = threadId;
    // The first message names the thread until it is renamed.
    patchThread(id, (t) => (t.title ? t : { ...t, title: text.length > 48 ? `${text.slice(0, 47)}…` : text }));
    append(id, { id: uid("m"), role: "user", at: NOW, attachment, parts: [{ kind: "text", text }] });
    // Let the user message land before the agent turn starts.
    timer.current = setTimeout(() => run(id, planReply(text, gates)), 250);
  }

  // ---- approvals ----------------------------------------------------------------------------------------
  function findApproval(approvalId: string) {
    for (const t of threads)
      for (const m of t.messages) for (const p of m.parts) if (p.kind === "approval" && p.id === approvalId) return { t, m, p };
    return undefined;
  }
  const setApproval = (threadId: string, msgId: string, approvalId: string, patch: Partial<Extract<Part, { kind: "approval" }>>) =>
    patchMessage(threadId, msgId, (m) => ({
      ...m,
      parts: m.parts.map((p) => (p.kind === "approval" && p.id === approvalId ? { ...p, ...patch } : p)),
    }));

  function approve(approvalId: string) {
    const hit = findApproval(approvalId);
    if (!hit) return;
    setApproval(hit.t.id, hit.m.id, approvalId, { state: "running", error: undefined });
    settle(approvalId);
    const first = splitOf(hit.p) === "first";
    timer.current = setTimeout(() => {
      // Only the first few went out: report on them and ask again for the rest (R18).
      if (first) {
        const test = testSendRun(hit.p, uid("ap"));
        setApproval(hit.t.id, hit.m.id, approvalId, { state: "approved", result: test.result });
        append(hit.t.id, { id: uid("m"), role: "agent", at: NOW, parts: test.parts });
        return;
      }
      setApproval(hit.t.id, hit.m.id, approvalId, { state: "approved" });
      if (hit.p.after.length) append(hit.t.id, { id: uid("m"), role: "agent", at: NOW, parts: resolve(hit.p.after) });
    }, 1200);
  }

  function alwaysAllow(approvalId: string) {
    const hit = findApproval(approvalId);
    if (!hit) return;
    const next = [...new Set([...alwaysAllowed, hit.p.step])];
    allowedRef.current = next;
    setAlwaysAllowed(next);
    toast.success(`Always allowed: ${FLOW_STEPS.find((s) => s.step === hit.p.step)?.label}`, {
      description: "The agent won't ask again for this step. Turn it off in Campaign flow.",
    });
    approve(approvalId);
  }

  function decline(approvalId: string) {
    const hit = findApproval(approvalId);
    if (!hit) return;
    setApproval(hit.t.id, hit.m.id, approvalId, { state: "declined" });
    settle(approvalId);
    append(hit.t.id, {
      id: uid("m"),
      role: "agent",
      at: NOW,
      parts: [{ kind: "text", text: "OK, I didn't do it. Tell me what to change, or ask for something else." }],
    });
  }

  /** A decided approval stays in the queue as Approved / Rejected and is no longer Ready. */
  function settle(approvalId: string) {
    setDecided((d) => (d.includes(approvalId) ? d : [...d, approvalId]));
    setReady((r) => r.filter((x) => x !== approvalId));
  }

  function editDraft(approvalId: string, draft: { subject: string; body: string }) {
    const hit = findApproval(approvalId);
    if (!hit?.p.preview) return;
    // The chat card shows the same subject; an edited draft goes back to Waiting so it is checked again.
    setApproval(hit.t.id, hit.m.id, approvalId, {
      preview: { ...hit.p.preview, ...draft },
      details: hit.p.details.map((d) => (d.label === "Subject" ? { ...d, value: draft.subject } : d)),
      edited: true,
    });
    setReady((r) => r.filter((x) => x !== approvalId));
    toast.success("Draft updated", { description: "Nothing is saved until you approve it." });
  }

  /** "20 first" or "all N" on a large send. Changing it takes back "ready": the tick was for the other number. */
  function setSplit(approvalId: string, split: SendSplit) {
    const hit = findApproval(approvalId);
    if (!hit) return;
    setApproval(hit.t.id, hit.m.id, approvalId, { split });
    setReady((r) => r.filter((x) => x !== approvalId));
  }

  function openQueue(focus?: string) {
    setQueueFocus(focus);
    setQueueOpen(true);
  }

  function retry() {
    const lastUser = [...(thread?.messages ?? [])].reverse().find((m) => m.role === "user");
    const text = lastUser?.parts.find((p) => p.kind === "text");
    if (thread && text && text.kind === "text") run(thread.id, planReply(text.text.replace(/error|offline/gi, ""), gates));
  }

  const handlers: PartHandlers = {
    onApprove: approve,
    onAlwaysAllow: alwaysAllow,
    onDecline: decline,
    onPrompt: (t) => send(t),
    onRetry: retry,
    onOpenQueue: () => openQueue(),
    onSplit: setSplit,
  };

  // ?prompt= from other screens: send it once as the first message of a new conversation, then drop it from the
  // URL so a reload doesn't ask again.
  const prompted = useRef(false);
  useEffect(() => {
    if (!prompt || prompted.current) return;
    prompted.current = true;
    const rest = new URLSearchParams(params.toString());
    rest.delete("prompt");
    router.replace(rest.size ? `/agent?${rest}` : "/agent", { scroll: false });
    send(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for the prompt the page opened with
  }, []);

  // ---- approval queue -----------------------------------------------------------------------------------
  const queueItems = useMemo(() => {
    const out: QueueItem[] = [];
    for (const t of threads)
      for (const m of t.messages)
        for (const p of m.parts) {
          if (p.kind !== "approval" || p.auto) continue;
          const live = p.state === "pending" || p.state === "running";
          if (!live && !decided.includes(p.id)) continue;
          out.push({ approval: p, threadId: t.id, threadTitle: t.title || "Untitled", status: queueStatus(p, ready) });
        }
    return out;
  }, [threads, decided, ready]);
  const waitingCount = queueItems.filter((i) => isOpen(i.status)).length;

  const queueHandlers: QueueHandlers = {
    onApprove: approve,
    onApproveMany: (ids) => {
      ids.forEach(approve);
      toast.success(`Approving ${ids.length} ${ids.length === 1 ? "item" : "items"}`, {
        description: "Each one runs on its own; the chat shows how it went.",
      });
    },
    onReject: decline,
    onSetReady: (id, on) => setReady((r) => (on ? [...new Set([...r, id])] : r.filter((x) => x !== id))),
    onEdit: editDraft,
    onSplit: setSplit,
    onOpenThread: (id) => {
      if (busy && busy.threadId !== id) stopRef.current?.();
      setSelectedId(id);
      setQueueOpen(false);
    },
  };

  // ---- flow panel ---------------------------------------------------------------------------------------
  const flowStates = useMemo(() => {
    const s = Object.fromEntries(FLOW_STEPS.map((f) => [f.step, "idle"])) as Record<FlowStep, StepState>;
    const mark = (step: FlowStep, v: StepState) => (s[step] = v);
    for (const m of thread?.messages ?? [])
      for (const p of m.parts) {
        if (p.kind === "approval") mark(p.step, p.state === "approved" ? "done" : p.state === "declined" ? "declined" : "waiting");
        if (p.kind === "steps")
          for (const st of p.steps) {
            if (st.status !== "done") continue;
            if (st.title.startsWith("create_campaign")) mark("campaign", "done");
            if (st.title.startsWith("create_template")) mark("template", "done");
            if (st.title.startsWith("update_template · status active")) mark("activate", "done");
            if (st.title.startsWith("create_batch · live")) mark("send", "done");
          }
      }
    return s;
  }, [thread]);

  const rateLimited = preview === "rate" ? "20 messages a minute reached. Try again in 40 seconds." : undefined;
  const loading = preview === "loading";

  return (
    <>
      <PageHeader
        title="Agent"
        description="Ask in plain words. The agent finds, writes and sends; anything that changes your data waits for your approval."
      />

      <div
        className={cn(
          "grid h-[calc(100svh-11.5rem)] min-h-[520px] divide-x overflow-hidden rounded-card border bg-card",
          showFlow ? "grid-cols-[240px_minmax(0,1fr)_260px]" : "grid-cols-[240px_minmax(0,1fr)]"
        )}
      >
        <ThreadList
          threads={preview === "empty" ? [] : threads}
          selectedId={thread?.id}
          loading={loading}
          onSelect={(id) => {
            if (busy) stopRef.current?.();
            setSelectedId(id);
          }}
          onNew={() => {
            if (busy) stopRef.current?.();
            setSelectedId(undefined);
          }}
          onRename={setRenaming}
          onDelete={setDeleting}
        />

        <section aria-label={thread?.title || "New conversation"} className="flex min-h-0 min-w-0 flex-col">
          {/* Which conversation is open and what you can do with it (Studio Admin chat-thread header). */}
          <div className="flex h-11 shrink-0 items-center gap-2 border-b pr-2 pl-4">
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <h2 className="truncate text-sm font-medium">{loading ? "Loading…" : thread?.title || "New conversation"}</h2>
              {thread && !loading && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {thread.visibility === "private" ? "Private" : "Company"} · {timeAgo(thread.updatedAt)}
                </span>
              )}
            </div>
            {!loading && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={waitingCount ? `Approval queue, ${waitingCount} waiting` : "Approval queue"}
                onClick={() => openQueue()}
              >
                <ListChecksIcon data-icon="inline-start" />
                Approvals
                {waitingCount > 0 && (
                  <Badge variant="brand" className="tabular-nums">
                    {waitingCount}
                  </Badge>
                )}
              </Button>
            )}
            {thread && !loading && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Conversation actions">
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => setRenaming(thread)}>
                      <PencilIcon />
                      Rename
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(thread)}>
                      <Trash2Icon />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {/* Hiding the flow gives the transcript its full 768px column at 1440px. */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Campaign flow"
                  aria-pressed={showFlow}
                  onClick={() => setShowFlow((v) => !v)}
                >
                  {showFlow ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showFlow ? "Hide campaign flow" : "Show campaign flow"}</TooltipContent>
            </Tooltip>
          </div>
          <MessageScrollerProvider>
            <MessageScroller className="relative flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-6">
                  {loading ? (
                    <MessageScrollerItem className="flex flex-col gap-4" aria-busy>
                      <Skeleton className="h-9 w-2/5 self-end" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-32 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </MessageScrollerItem>
                  ) : preview === "error" ? (
                    <MessageScrollerItem>
                      <Alert variant="destructive">
                        <CircleAlertIcon />
                        <AlertTitle>This conversation is taking too long to load</AlertTitle>
                        <AlertDescription>It didn&apos;t open within 15 seconds. Your messages are safe.</AlertDescription>
                        <AlertAction>
                          <Button variant="outline" size="sm" onClick={() => router.replace("/agent")}>
                            Retry
                          </Button>
                        </AlertAction>
                      </Alert>
                    </MessageScrollerItem>
                  ) : !thread || thread.messages.length === 0 ? (
                    <AgentWelcome
                      suggestions={[
                        "How is Hotel buyers – Vietnam doing?",
                        "Find hotels in Vietnam",
                        "Set up a campaign for architects in Singapore",
                      ]}
                      onSuggestion={(s) => send(s)}
                    />
                  ) : (
                    thread.messages.map((m) => (
                      <MessageScrollerItem key={m.id}>
                        <MessageView message={m} handlers={handlers} busy={Boolean(busy)} />
                      </MessageScrollerItem>
                    ))
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton className="absolute bottom-3 left-1/2 -translate-x-1/2" />
            </MessageScroller>
          </MessageScrollerProvider>
          <div className="mx-auto w-full max-w-3xl px-6 pb-4">
            <ChatComposer busy={Boolean(busy)} disabled={rateLimited} onSend={send} onStop={() => stopRef.current?.()} />
          </div>
        </section>

        {showFlow && (
          <FlowPanel
            states={flowStates}
            gates={gates}
            alwaysAllowed={alwaysAllowed}
            lastTurn={lastTurn}
            onReview={(step) =>
              openQueue(queueItems.find((i) => i.threadId === thread?.id && i.approval.step === step && isOpen(i.status))?.approval.id)
            }
            onToggle={(step, on) => {
              const next = on ? [...new Set([...alwaysAllowed, step])] : alwaysAllowed.filter((s) => s !== step);
              allowedRef.current = next;
              setAlwaysAllowed(next);
            }}
          />
        )}
      </div>

      <ApprovalQueue
        open={queueOpen}
        onOpenChange={setQueueOpen}
        items={queueItems}
        gates={gates}
        focusId={queueFocus}
        handlers={queueHandlers}
      />

      <RenameThreadDialog
        thread={renaming}
        onOpenChange={(o) => !o && setRenaming(null)}
        onRename={(id, title) => {
          patchThread(id, (t) => ({ ...t, title }));
          setRenaming(null);
          toast.success("Conversation renamed");
        }}
      />
      <DeleteThreadDialog
        thread={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onDelete={(id) => {
          if (busy?.threadId === id) stopRef.current?.();
          setThreads((all) => all.filter((t) => t.id !== id));
          if (selectedId === id) setSelectedId(undefined);
          setDeleting(null);
          toast.success("Conversation deleted");
        }}
      />
    </>
  );
}

function queueStatus(p: Approval, ready: string[]): QueueItem["status"] {
  if (p.state === "running") return "running";
  if (p.state === "approved") return "approved";
  if (p.state === "declined") return "rejected";
  if (p.error) return "error";
  return ready.includes(p.id) ? "ready" : "waiting";
}

/** Approve every pending approval and what it unlocks, in place (the ?queue=done and ?queue=empty previews). */
function approveAll(parts: Part[]): Part[] {
  return parts.flatMap((p) =>
    p.kind === "approval" && p.state === "pending" ? [{ ...p, state: "approved" as const }, ...approveAll(p.after)] : [p]
  );
}

const approvalIds = (t: Thread) => t.messages.flatMap((m) => m.parts.flatMap((p) => (p.kind === "approval" ? [p.id] : [])));

/** Seed threads and approval-queue state, adjusted for the preview states. */
function seed(
  preview: string | null,
  queue: string | null,
  gates: FlowStep[],
  send: string | null
): { threads: Thread[]; decided: string[]; ready: string[]; focus?: string } {
  const out: { threads: Thread[]; decided: string[]; ready: string[]; focus?: string } = { threads: seedThreads(), decided: [], ready: [] };
  if (queue === "open" || queue === "error" || queue === "done") {
    const fu = followUpThread(gates);
    const turn = fu.messages[1];
    if (queue === "done") {
      turn.parts = approveAll(turn.parts);
      out.decided = [...approvalIds(fu), "ap-seed-send"];
    } else {
      // One item already marked Ready, so "Approve 1 ready" shows what it does.
      out.ready = [approvalIds(fu)[0]];
      if (queue === "error") {
        const focus = "ap-fu-danang-send";
        out.focus = focus;
        turn.parts = turn.parts.map((p) =>
          p.kind === "approval" && p.id === focus
            ? { ...p, error: "The connection dropped before Saella confirmed the batch, so nothing was sent." }
            : p
        );
      }
    }
    out.threads.unshift(fu);
  }
  // Nothing left waiting: the seeded send in "Hotel buyers – Vietnam results" counts as approved.
  if (queue === "empty" || queue === "done") {
    const th1 = out.threads.find((t) => t.id === "th1")!;
    th1.messages = th1.messages.map((m) => ({ ...m, parts: approveAll(m.parts) }));
  }
  // ?send=tested: the seeded 752-recipient send went to the first 20; the rest waits as a new approval (R18).
  if (send === "tested" && queue !== "empty" && queue !== "done") {
    const th1 = out.threads.find((t) => t.id === "th1")!;
    const sendPart = th1.messages.flatMap((m) => m.parts).find((p): p is Approval => p.kind === "approval" && p.id === "ap-seed-send")!;
    const test = testSendRun(sendPart, "ap-seed-send-rest");
    th1.messages = th1.messages.map((m) => ({
      ...m,
      parts: m.parts.map((p) => (p === sendPart ? { ...p, state: "approved" as const, result: test.result } : p)),
    }));
    th1.messages.push({ id: "m4-test", role: "agent", at: "2026-10-27T02:55:00Z", parts: test.parts });
    out.decided = [...out.decided, "ap-seed-send"];
    out.focus ??= "ap-seed-send-rest";
  }
  const threads = out.threads;
  const th1 = threads[0];
  if (preview === "offline") {
    th1.messages.push(
      { id: "off-u", role: "user", at: NOW, parts: [{ kind: "text", text: "Which hotels opened the intro twice?" }] },
      {
        id: "off-a",
        role: "agent",
        at: NOW,
        parts: [
          { kind: "steps", steps: [{ title: "Get opens per recipient", status: "error" }] },
          { kind: "error", text: "The connection dropped before I finished. You were not charged for this turn." },
        ],
      }
    );
  }
  if (preview === "busy") {
    th1.messages.push(
      { id: "busy-u", role: "user", at: NOW, parts: [{ kind: "text", text: "Which hotels opened the intro twice?" }] },
      {
        id: "busy-m",
        role: "agent",
        at: NOW,
        parts: [
          {
            kind: "steps",
            steps: [
              { title: "Find template “Intro – ceramics catalog”", status: "done", duration: "0.5s" },
              { title: "Get opens per recipient", status: "running" },
              { title: "Group by company", status: "pending" },
            ],
          },
        ],
      }
    );
  }
  if (preview === "safety") {
    th1.messages.push(
      { id: "saf-u", role: "user", at: NOW, parts: [{ kind: "text", text: "Compare every template we ever sent, one by one" }] },
      {
        id: "saf-a",
        role: "agent",
        at: NOW,
        parts: [
          {
            kind: "steps",
            steps: [{ title: "Get results per template", status: "done", duration: "14.2s" }],
            usage: "18 steps · 31.0s · 22,600 tokens",
          },
          {
            kind: "notice",
            text: "Stopped for safety after 18 steps. Nothing else ran. Ask again with a narrower question, for example one campaign.",
          },
        ],
      }
    );
  }
  return out;
}
