"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpIcon,
  Maximize2Icon,
  PaperclipIcon,
  SquareIcon,
  SquarePenIcon,
  XIcon,
} from "lucide-react";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
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

// Agent chat shell (PRD-03 AC-AG-C-02): right-hand panel on desktop, resizable 320–900px in the app
// (resize lives in the app shell, not here). Messages are passed as children so the same shell
// serves the sidebar, the full tab and the guided-start modal.
export function AgentPanel({
  title = "Agent",
  threadTitle,
  busy = false,
  onClose,
  onNewChat,
  onExpand,
  children,
  className,
}: {
  title?: string;
  /** Current conversation, shown under the title. */
  threadTitle?: string;
  /** The agent is answering: the composer shows Stop instead of Send. */
  busy?: boolean;
  onClose?: () => void;
  onNewChat?: () => void;
  onExpand?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label="Agent chat"
      className={cn("flex h-full min-h-0 flex-col bg-background text-foreground", className)}
    >
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <SaellaMini size={28} state={busy ? "thinking" : "idle"} />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <h2 className="font-heading text-sm font-semibold">{title}</h2>
          {threadTitle && <p className="truncate text-xs text-subtle-foreground">{threadTitle}</p>}
        </div>
        <HeaderButton label="New chat" onClick={onNewChat}>
          <SquarePenIcon />
        </HeaderButton>
        {/* Without a handler the button links to the full agent page (/agent, AC-AG-C-04/05). */}
        {onExpand ? (
          <HeaderButton label="Open full page" onClick={onExpand}>
            <Maximize2Icon />
          </HeaderButton>
        ) : (
          <HeaderButton label="Open full page" href="/agent">
            <Maximize2Icon />
          </HeaderButton>
        )}
        <HeaderButton label="Close" onClick={onClose}>
          <XIcon />
        </HeaderButton>
      </header>

      <MessageScrollerProvider>
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="px-4 py-4">{children}</MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton className="absolute bottom-3 left-1/2 -translate-x-1/2" />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="border-t p-3">
        <AgentComposer busy={busy} />
      </div>
    </section>
  );
}

function HeaderButton({
  label,
  onClick,
  href,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button variant="ghost" size="icon-sm" aria-label={label} asChild>
            <Link href={href}>{children}</Link>
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
            {children}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// Images, PDF, Word and Excel up to 5 MB, for this turn only (AC-AG-A-01..04).
export function AgentComposer({ busy = false }: { busy?: boolean }) {
  const [text, setText] = useState("");

  return (
    <InputGroup>
      <InputGroupTextarea
        aria-label="Message the agent"
        placeholder="Ask the agent…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="max-h-40 min-h-12"
      />
      <InputGroupAddon align="block-end">
        <InputGroupButton size="icon-sm" aria-label="Attach file (image, PDF, Word or Excel, up to 5 MB)">
          <PaperclipIcon />
        </InputGroupButton>
        <InputGroupText className="text-xs text-subtle-foreground">Writes wait for your approval</InputGroupText>
        {busy ? (
          <InputGroupButton variant="outline" size="sm" className="ml-auto">
            <SquareIcon data-icon="inline-start" />
            Stop
          </InputGroupButton>
        ) : (
          <InputGroupButton
            variant="default"
            size="icon-sm"
            className="ml-auto"
            aria-label="Send"
            disabled={!text.trim()}
          >
            <ArrowUpIcon />
          </InputGroupButton>
        )}
      </InputGroupAddon>
    </InputGroup>
  );
}

// First-run content of the panel: greeting + suggested actions (guided start, AC-AG-GS-01).
// Saella mini is the agent's face (user request 2026-10-28); the full-body character stays onboarding-only.
export function AgentWelcome({
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
        I can find companies, write emails and send campaigns. Anything that changes your data waits for your approval.
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

// Floating entry point on every dashboard route except the agent's own page (AC-AG-C-01). Soft orange, not solid:
// the page's own primary action keeps the only solid orange button (DESIGN.md). Floats, so it keeps a shadow.
export function AgentLauncher({ onClick, className }: { onClick?: () => void; className?: string }) {
  const pathname = usePathname();
  if (pathname === "/agent" || pathname?.startsWith("/agent/")) return null;
  return (
    <Button
      size="lg"
      onClick={onClick}
      className={cn(
        "rounded-full border-primary/20 bg-primary-soft text-primary-soft-foreground shadow-card hover:bg-[color-mix(in_oklch,var(--primary-soft),var(--primary)_14%)]",
        className
      )}
    >
      <SaellaMini size={24} data-icon="inline-start" className="-ml-1 size-6" />
      Ask the agent
    </Button>
  );
}
