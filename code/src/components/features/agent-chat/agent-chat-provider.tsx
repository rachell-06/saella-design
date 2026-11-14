"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AgentStep } from "@/components/saella/agent-steps";
import {
  FLOW_STEPS,
  type FlowStep,
  type Message,
  NOW,
  type Part,
  REPO_GATES,
  type Script,
  type SendSplit,
  type SentFile,
  type Thread,
  planReply,
  seedThreads,
  splitOf,
  testSendRun,
  uid,
} from "./data";
import type { PartHandlers } from "./message-view";

// One agent engine for the whole app (PRD-03 AC-AG-C-01..05), shown in the docked side panel on every screen (the
// full page /agent was removed, designer 2026-11-13: decisions.md). Provided by AppShell. Other screens open the
// panel, optionally with a first message, through openAgent({ prompt }) below. Replies are scripted (data.ts planReply): steps play live, Stop cancels the turn, gated writes stop
// at an ApprovalCard (AC-AG-G-02/03) and continue once approved (AC-AG-G-04). One turn runs at a time.

type Busy = { threadId: string; msgId: string };

export type AgentChat = {
  threads: Thread[];
  busy: Busy | null;
  gates: FlowStep[];
  alwaysAllowed: FlowStep[];
  setAlwaysAllowed: (steps: FlowStep[]) => void;
  patchThread: (id: string, fn: (t: Thread) => Thread) => void;
  /** Sends into a thread; a new one when `threadId` is undefined or not there yet. Returns the thread's id. */
  send: (threadId: string | undefined, text: string, attachments?: SentFile[]) => string | undefined;
  stop: () => void;
  approve: (approvalId: string) => void;
  alwaysAllow: (approvalId: string) => void;
  decline: (approvalId: string) => void;
  setSplit: (approvalId: string, split: SendSplit) => void;
  retry: (threadId: string) => void;
  /** Handlers for the message view of one thread. */
  handlersFor: (threadId: string | undefined) => PartHandlers;
  /** The conversation open in the side panel; kept here so closing and reopening the panel keeps it. */
  panelThreadId: string | undefined;
  setPanelThreadId: (id: string | undefined) => void;
};

/** What another screen hands the agent: open the panel and, with a prompt, start a new conversation with it. */
export type OpenAgentRequest = { prompt?: string };
const OPEN_AGENT_EVENT = "saella:open-agent";

/**
 * Opens the docked agent panel from any screen, e.g. the Overview checklist's "Show me". With `prompt`, a new
 * conversation starts with it as the first message (replaces the old /agent?prompt= link).
 */
export function openAgent(request: OpenAgentRequest = {}) {
  window.dispatchEvent(new CustomEvent<OpenAgentRequest>(OPEN_AGENT_EVENT, { detail: request }));
}

const AgentChatContext = createContext<AgentChat | null>(null);

export function useAgentChat() {
  const chat = useContext(AgentChatContext);
  if (!chat) throw new Error("useAgentChat needs <AgentChatProvider> (AppShell provides it)");
  return chat;
}

export function AgentChatProvider({ children, onOpenRequest }: { children: React.ReactNode; onOpenRequest?: () => void }) {
  // Seeds have fixed ids: they render on the server too, so they must match on hydration.
  const [threads, setThreads] = useState<Thread[]>(seedThreads);
  const [busy, setBusy] = useState<Busy | null>(null);
  // Which steps stop for approval: the live app's two (data.ts REPO_GATES). The /agent ?gates=all preview is gone.
  const gates = REPO_GATES;
  const [alwaysAllowed, setAllowed] = useState<FlowStep[]>([]);
  // The panel opens on the most recent conversation (threads are newest first); "New chat" clears it.
  const [panelThreadId, setPanelThreadId] = useState<string | undefined>(() => seedThreads()[0]?.id);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const allowedRef = useRef(alwaysAllowed);
  useEffect(() => () => clearTimeout(timer.current), []);

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

  const setAlwaysAllowed = (next: FlowStep[]) => {
    allowedRef.current = next;
    setAllowed(next);
  };

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

  /** Stops the running turn at the step that is running now. */
  function stop() {
    if (!busy) return;
    const m = threads.find((t) => t.id === busy.threadId)?.messages.find((x) => x.id === busy.msgId);
    const steps = m?.parts[0]?.kind === "steps" ? m.parts[0].steps : [];
    const i = Math.max(0, steps.findIndex((s) => s.status === "running"));
    clearTimeout(timer.current);
    setStep(busy.threadId, busy.msgId, i, { status: "error", title: "Stopped by you", duration: undefined });
    patchMessage(busy.threadId, busy.msgId, (msg) => ({
      ...msg,
      parts: [...msg.parts, { kind: "notice", text: "You stopped this turn. Nothing after this step ran." }],
    }));
    setBusy(null);
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
        setBusy(null);
        return;
      }
      const step = script.steps[i];
      setStep(threadId, msgId, i, { status: "running" });
      timer.current = setTimeout(() => {
        setStep(threadId, msgId, i, { status: "done", duration: `${(step.ms / 1000).toFixed(1)}s` });
        i += 1;
        tick();
      }, step.ms);
    };
    tick();
  }

  function send(threadId: string | undefined, text: string, attachments?: SentFile[]) {
    if (busy) return undefined;
    const id = threadId ?? uid("th");
    if (!threads.some((t) => t.id === id)) setThreads((all) => [{ id, title: "", visibility: "private", updatedAt: NOW, messages: [] }, ...all]);
    // The first message names the thread until it is renamed.
    patchThread(id, (t) => (t.title ? t : { ...t, title: text.length > 48 ? `${text.slice(0, 47)}…` : text }));
    append(id, { id: uid("m"), role: "user", at: NOW, attachments, parts: [{ kind: "text", text }] });
    // Let the user message land before the agent turn starts.
    timer.current = setTimeout(() => run(id, planReply(text, gates)), 250);
    return id;
  }

  function retry(threadId: string) {
    const lastUser = [...(threads.find((t) => t.id === threadId)?.messages ?? [])].reverse().find((m) => m.role === "user");
    const text = lastUser?.parts.find((p) => p.kind === "text");
    if (text && text.kind === "text") run(threadId, planReply(text.text.replace(/error|offline/gi, ""), gates));
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
    setAlwaysAllowed([...new Set([...allowedRef.current, hit.p.step])]);
    toast.success(`Always allowed: ${FLOW_STEPS.find((s) => s.step === hit.p.step)?.label}`, {
      description: "The agent won't ask again for this step. Undo it with “Ask me again” under the step in the chat.",
    });
    approve(approvalId);
  }

  function decline(approvalId: string) {
    const hit = findApproval(approvalId);
    if (!hit) return;
    setApproval(hit.t.id, hit.m.id, approvalId, { state: "declined" });
    append(hit.t.id, {
      id: uid("m"),
      role: "agent",
      at: NOW,
      parts: [{ kind: "text", text: "OK, I didn't do it. Tell me what to change, or ask for something else." }],
    });
  }

  /** "20 first" or "all N" on a large send. The card remounts, so the confirm tick is given again for the new number. */
  function setSplit(approvalId: string, split: SendSplit) {
    const hit = findApproval(approvalId);
    if (!hit) return;
    setApproval(hit.t.id, hit.m.id, approvalId, { split });
  }

  const chat: AgentChat = {
    threads,
    busy,
    gates,
    alwaysAllowed,
    setAlwaysAllowed,
    patchThread,
    send,
    stop,
    approve,
    alwaysAllow,
    decline,
    setSplit,
    retry,
    handlersFor: (threadId) => ({
      onApprove: approve,
      onAlwaysAllow: alwaysAllow,
      onDecline: decline,
      onPrompt: (t) => void send(threadId, t),
      onRetry: () => threadId && retry(threadId),
      onSplit: setSplit,
      alwaysAllowed,
      onAskAgain: (step) => {
        setAlwaysAllowed(allowedRef.current.filter((s) => s !== step));
        toast.success(`The agent will ask again before: ${FLOW_STEPS.find((s) => s.step === step)?.label}`);
      },
    }),
    panelThreadId,
    setPanelThreadId,
  };

  // openAgent(): open the panel; with a prompt, start a new conversation with it and show it there. The listener
  // reads the latest send through a ref, so a request made while a turn runs is not lost silently.
  const sendRef = useRef(send);
  const openRef = useRef(onOpenRequest);
  useEffect(() => {
    sendRef.current = send;
    openRef.current = onOpenRequest;
  });
  useEffect(() => {
    const onOpen = (e: Event) => {
      const prompt = (e as CustomEvent<OpenAgentRequest>).detail?.prompt?.trim();
      if (prompt) {
        const id = sendRef.current(undefined, prompt);
        if (id) setPanelThreadId(id);
        else toast.info("The agent is still answering", { description: "Ask again once this turn finishes, or press Stop." });
      }
      openRef.current?.();
    };
    window.addEventListener(OPEN_AGENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_AGENT_EVENT, onOpen);
  }, []);

  return <AgentChatContext.Provider value={chat}>{children}</AgentChatContext.Provider>;
}
