"use client";

import { SCROLL_POPOVER_LIST } from "@/lib/scroll";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CheckIcon, HistoryIcon, Maximize2Icon, Minimize2Icon, SquarePenIcon, XIcon } from "lucide-react";
import { useAgentChat } from "@/components/features/agent-chat/agent-chat-provider";
import { ChatComposer } from "@/components/features/agent-chat/chat-composer";
import { ASK_RATING_AFTER, type SentFile, type Thread, timeAgo } from "@/components/features/agent-chat/data";
import { MessageView, type PartHandlers, RatingPrompt } from "@/components/features/agent-chat/message-view";
import { OpenAtLatest } from "@/components/features/agent-chat/open-at-latest";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { SaellaMini } from "@/components/saella/saella-mini";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The transcript scrolls by keyboard too, so its viewport takes focus. Show the focus ring for keyboard focus only,
 * never after a mouse click (the browser outline otherwise draws on click).
 */
const TRANSCRIPT_VIEWPORT_FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

// Agent chat (PRD-03 AC-AG-C-01..05): a floating window bottom-right by default, or the right-hand panel docked and
// resizable 320–900px with ?agent=dock (app-shell.tsx). Same content in both. The agent's only home (no /agent page).
// History menu: every conversation (AC-AG-T-01/02). Approvals happen on the cards in the
// conversation; an auto-approved card offers "Ask me again" to take back "Always allow" (AC-AG-P-02). The one-tap
// rating shows under the transcript (AC-AG-Q-05). Live AgentChatCore in its compact form.
export function AgentPanel({
  onClose,
  expanded,
  onToggleExpand,
  className,
}: {
  onClose?: () => void;
  /** Floating window only: shows the Expand / Shrink toggle. */
  expanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}) {
  const chat = useAgentChat();
  const thread = chat.threads.find((t) => t.id === chat.panelThreadId);
  const busy = Boolean(chat.busy);
  // Opening the panel shows the most recent conversation (newest first); with none yet it shows the welcome.
  // "New chat" clears it until the panel is opened again.
  useEffect(() => {
    chat.setPanelThreadId(chat.threads[0]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the panel opens
  }, []);

  function open(id: string | undefined) {
    if (chat.busy && chat.busy.threadId !== id) chat.stop();
    chat.setPanelThreadId(id);
  }

  function send(text: string, attachments?: SentFile[]) {
    const id = chat.send(thread?.id, text, attachments);
    if (id) chat.setPanelThreadId(id);
  }

  const handlers: PartHandlers = { ...chat.handlersFor(thread?.id), onPrompt: (t) => send(t) };

  // One-tap rating once the conversation has ASK_RATING_AFTER answers (live AgentChatCore ASK_AFTER_TURNS).
  const answers = thread?.messages.filter((m) => m.role === "agent").length ?? 0;
  const askRating = Boolean(thread) && !busy && answers >= ASK_RATING_AFTER && thread?.rating !== "dismissed";

  return (
    <section
      aria-label="Agent chat"
      className={cn("flex h-full min-h-0 flex-col bg-background text-foreground", className)}
    >
      <header className="flex items-center gap-1 border-b py-2 pr-2 pl-3">
        <SaellaMini size={28} state={busy ? "thinking" : "idle"} />
        <div className="ml-1 flex min-w-0 flex-1 flex-col leading-tight">
          <h2 className="font-heading text-sm font-semibold">Agent</h2>
          {/* The name the agent gave the conversation; none until its first answer. 14px: a title. */}
          {thread?.title && <p className="truncate text-sm text-muted-foreground">{thread.title}</p>}
        </div>
        <HistoryMenu current={thread?.id} threads={chat.threads} onPick={open} />
        <HeaderButton label="New chat" onClick={() => open(undefined)}>
          <SquarePenIcon />
        </HeaderButton>
        {onToggleExpand && (
          <HeaderButton label={expanded ? "Shrink" : "Expand"} onClick={onToggleExpand} pressed={expanded}>
            {expanded ? <Minimize2Icon /> : <Maximize2Icon />}
          </HeaderButton>
        )}
        <HeaderButton label="Close" onClick={onClose}>
          <XIcon />
        </HeaderButton>
      </header>

      {/* A new question scrolls to the top and the answer grows under it. */}
      <MessageScrollerProvider defaultScrollPosition="start">
        <MessageScroller className="relative flex-1">
          <MessageScrollerViewport className={TRANSCRIPT_VIEWPORT_FOCUS}>
            {/* pb-14: room under the last message for the scroll-to-latest button, so it never sits on text at the end. */}
            <MessageScrollerContent className="flex flex-col gap-5 px-4 pt-4 pb-14">
              {!thread || thread.messages.length === 0 ? (
                <AgentWelcome onSuggestion={(s) => send(s)} />
              ) : (
                <>
                  {thread.messages.map((m) => (
                    <MessageScrollerItem key={m.id} messageId={m.id} scrollAnchor={m.role === "user"}>
                      <MessageView message={m} handlers={handlers} busy={busy} />
                    </MessageScrollerItem>
                  ))}
                  {askRating && (
                    <MessageScrollerItem>
                      <RatingPrompt
                        rated={thread.rating === "dismissed" ? undefined : thread.rating}
                        onRate={(r) => chat.patchThread(thread.id, (t) => ({ ...t, rating: r }))}
                        onDismiss={() => chat.patchThread(thread.id, (t) => ({ ...t, rating: "dismissed" }))}
                      />
                    </MessageScrollerItem>
                  )}
                </>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          {/* A floating control: border, card shadow and a ring of the window colour as a gap, so it reads as above the
              text it passes over. */}
          <MessageScrollerButton aria-label="Scroll to latest" className="absolute bottom-3 left-1/2 -translate-x-1/2 border shadow-card ring-4 ring-popover" />
        </MessageScroller>
        <OpenAtLatest threadId={thread?.id} lastId={thread?.messages.findLast((m) => m.role === "user")?.id} />
      </MessageScrollerProvider>

      <div className="border-t p-3">
        <ChatComposer busy={busy} onSend={send} onStop={chat.stop} />
      </div>
    </section>
  );
}

/** A conversation the agent hasn't named yet is listed by what was asked. */
function firstPrompt(t: Thread) {
  const first = t.messages.find((m) => m.role === "user")?.parts.find((p) => p.kind === "text");
  return first?.kind === "text" ? first.text : undefined;
}

/** Every conversation, newest first, up to 50 (AC-AG-T-01/02: title, visibility, last active). */
function HistoryMenu({ current, threads, onPick }: { current?: string; threads: Thread[]; onPick: (id: string) => void }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Chat history">
              <HistoryIcon />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Chat history</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Chats</DropdownMenuLabel>
        <DropdownMenuGroup className={SCROLL_POPOVER_LIST}>
          {threads.length === 0 ? (
            <DropdownMenuItem disabled>No chats yet</DropdownMenuItem>
          ) : (
            threads.slice(0, 50).map((t) => (
              <DropdownMenuItem key={t.id} onSelect={() => onPick(t.id)} className="gap-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{t.title || firstPrompt(t) || "New chat"}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.visibility === "private" ? "Private" : "Company"} · {timeAgo(t.updatedAt)}
                  </span>
                </span>
                {t.id === current && <CheckIcon className="text-brand" aria-label="Open now" />}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} aria-pressed={pressed} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Floating window widths (Expand toggles between them); the user can also drag the window to any size in bounds. */
const FLOAT_WIDTH = { normal: 400, expanded: 560 } as const;
const MIN_W = 340;
const MIN_H = 360;
/** Top bar 3rem + 0.5rem, bottom 1rem: the tallest the window gets (it starts that tall). */
const TOP_GAP = 56;
const BOTTOM_GAP = 16;
const SIZE_KEY = "saella.agentFloat.size";
type FloatSize = { w: number; h: number | null };
/** The tallest the window can be in this browser window (the window only renders on the client). */
const maxHeight = () => (typeof window === "undefined" ? undefined : window.innerHeight - TOP_GAP - BOTTOM_GAP);

const DEFAULT_SIZE: FloatSize = { w: FLOAT_WIDTH.normal, h: null };
// The saved size as an external store: the server and first paint use the default, then the saved one (no mismatch).
const sizeListeners = new Set<() => void>();
function subscribeSize(fn: () => void) {
  sizeListeners.add(fn);
  return () => sizeListeners.delete(fn);
}
function savedSizeRaw() {
  try {
    return localStorage.getItem(SIZE_KEY) ?? "";
  } catch {
    return "";
  }
}
function parseSize(raw: string): FloatSize {
  try {
    const v = JSON.parse(raw || "null") as FloatSize | null;
    if (v && typeof v.w === "number") return { w: v.w, h: typeof v.h === "number" ? v.h : null };
  } catch {
    // Bad value: defaults.
  }
  return DEFAULT_SIZE;
}
function writeSize(next: FloatSize) {
  try {
    localStorage.setItem(SIZE_KEY, JSON.stringify(next));
  } catch {
    // Not remembered; the drag state below still holds it for this visit.
  }
  sizeListeners.forEach((fn) => fn());
}

/**
 * The agent as a floating chat window: anchored bottom-right
 * where the launcher was, over the page (the page does not shrink), below dialogs and sheets (z-40 < z-50). Grows
 * from the corner in 150ms and shrinks back on close; instant with reduced motion. Esc closes it while focus is
 * inside (an open menu takes Esc first). Toasts move to its left while it is open, so neither covers the other.
 */
export function AgentFloat({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Width and height the user dragged to ("let users size it freely"), remembered per browser.
  // h = null: full height (top bar to bottom), the default.
  const saved = parseSize(useSyncExternalStore(subscribeSize, savedSizeRaw, () => ""));
  // The live size while dragging, and the last size set this visit (kept if storage is blocked).
  const [local, setLocal] = useState<FloatSize | null>(null);
  const size = local ?? saved;
  const expanded = size.w >= FLOAT_WIDTH.expanded;
  const save = (next: FloatSize) => {
    setLocal(next);
    writeSize(next);
  };
  const clamp = (w: number, h: number | null): FloatSize => {
    const maxW = Math.min(960, window.innerWidth - 32);
    const maxH = window.innerHeight - TOP_GAP - BOTTOM_GAP;
    return {
      w: Math.round(Math.min(Math.max(w, MIN_W), maxW)),
      h: h === null ? null : Math.round(Math.min(Math.max(h, MIN_H), maxH)),
    };
  };
  /** Drag from the left edge (x), the top edge (y) or the top-left corner (both); the window stays anchored bottom-right. */
  const startDrag = (axis: "x" | "y" | "xy") => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget.parentElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
    let latest = size;
    const move = (ev: PointerEvent) => {
      const w = axis === "y" ? start.w : start.w + (start.x - ev.clientX);
      const h = axis === "x" ? size.h : start.h + (start.y - ev.clientY);
      latest = clamp(w, h);
      setLocal(latest);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.removeProperty("user-select");
      save(latest);
    };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const keyResize = (axis: "x" | "y") => (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 64 : 16;
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    if (axis === "x" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      save(clamp(rect.width + (e.key === "ArrowLeft" ? step : -step), size.h));
    }
    if (axis === "y" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      save(clamp(size.w, rect.height + (e.key === "ArrowUp" ? step : -step)));
    }
  };
  // Stays mounted for the closing animation, then unmounts so the next open starts on the newest conversation.
  const [shown, setShown] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setShown(true);
  }
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open || !shown) return;
    const t = setTimeout(() => setShown(false), 150);
    return () => clearTimeout(t);
  }, [open, shown]);

  // Focus the message box on open, so typing starts straight away.
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.contains(document.activeElement)) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!shown) return null;
  // Width the open window takes from the right edge (window + 16px margin + 16px gap), for the toast offset.
  const inset = size.w + 32;
  return (
    <>
      {open && (
        <style>{`[data-sonner-toaster][data-x-position="right"]{--offset-right:${inset}px!important;--mobile-offset-right:${inset}px!important}`}</style>
      )}
      <div
        ref={ref}
        role="dialog"
        aria-modal="false"
        aria-label="Agent"
        data-state={open ? "open" : "closed"}
        className={cn(
          "fixed right-4 bottom-4 z-40 flex max-h-[calc(100dvh-4.5rem)] max-w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-card border bg-popover shadow-float",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:fill-mode-forwards duration-150 motion-reduce:animate-none",
          size.h === null && "top-14"
        )}
        style={{ width: size.w, height: size.h ?? undefined }}
      >
        {/* Resize handles: left edge (width), top edge (height), top-left corner (both). Keyboard: focus a handle and
            use the arrow keys (Shift for bigger steps). */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize width"
          aria-valuenow={size.w}
          aria-valuemin={MIN_W}
          aria-valuemax={960}
          aria-valuetext={`${size.w} pixels wide`}
          tabIndex={0}
          onPointerDown={startDrag("x")}
          onKeyDown={keyResize("x")}
          className="absolute inset-y-0 left-0 z-20 w-1.5 cursor-ew-resize outline-none hover:bg-brand/30 focus-visible:bg-brand/40"
        />
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize height"
          aria-valuenow={size.h ?? maxHeight()}
          aria-valuemin={MIN_H}
          aria-valuemax={maxHeight()}
          aria-valuetext={size.h === null ? "Full height" : `${size.h} pixels tall`}
          tabIndex={0}
          onPointerDown={startDrag("y")}
          onKeyDown={keyResize("y")}
          className="absolute inset-x-0 top-0 z-20 h-1.5 cursor-ns-resize outline-none hover:bg-brand/30 focus-visible:bg-brand/40"
        />
        <div aria-hidden onPointerDown={startDrag("xy")} className="absolute top-0 left-0 z-30 size-3 cursor-nwse-resize" />
        {/* bg-popover like sheets and dialogs: in dark mode the window lifts off the page. */}
        <AgentPanel
          onClose={onClose}
          expanded={expanded}
          onToggleExpand={() => save(clamp(expanded ? FLOAT_WIDTH.normal : FLOAT_WIDTH.expanded, size.h))}
          className="bg-popover"
        />
      </div>
    </>
  );
}

// First-run content of the panel: greeting + suggested actions (guided start, AC-AG-GS-01).
// Saella mini is the agent's face; the full-body character stays on sign-in and the onboarding welcome.
function AgentWelcome({
  suggestions = ["Find buyers for my products", "Write my first campaign", "Verify my sending domain"],
  onSuggestion,
}: {
  suggestions?: string[];
  onSuggestion?: (text: string) => void;
}) {
  return (
    <MessageScrollerItem className="flex flex-1 flex-col justify-end gap-3">
      <SaellaMini size={56} />
      <p className="font-heading text-lg font-medium tracking-title">What should we work on?</p>
      <p className="text-muted-foreground">
        I can find companies, write emails and send campaigns.
      </p>
      <div className="flex flex-col items-start gap-2">
        {suggestions.map((s) => (
          <Bubble key={s} variant="outline">
            <BubbleContent asChild>
              <button type="button" onClick={() => onSuggestion?.(s)}>
                {s}
              </button>
            </BubbleContent>
          </Bubble>
        ))}
      </div>
    </MessageScrollerItem>
  );
}

// Floating entry point on every dashboard route (AC-AG-C-01). Large and high-contrast: an ink pill, 48px tall, with
// the Saella mini face. Ink, not solid orange: the page's own primary action keeps the only solid orange button
//. Floats, so it has the float shadow.
export function AgentLauncher({
  ref,
  onClick,
  className,
  style,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  onClick?: () => void;
  className?: string;
  /** Inline position, e.g. lifted above a sticky action bar (app-shell.tsx). */
  style?: React.CSSProperties;
}) {
  return (
    <Button
      ref={ref}
      onClick={onClick}
      style={style}
      className={cn(
        "h-12 gap-2.5 rounded-full border-0 bg-foreground pr-5 pl-1.5 text-[length:var(--text-sm)] font-semibold text-background shadow-float transition-transform hover:-translate-y-0.5 hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:hover:translate-y-0",
        className
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-background">
        <SaellaMini size={30} className="size-7.5" />
      </span>
      Ask the agent
    </Button>
  );
}
