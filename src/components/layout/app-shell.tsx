"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AgentChatProvider } from "@/components/features/agent-chat/agent-chat-provider";
import { AgentFloat, AgentLauncher, AgentPanel } from "@/components/layout/agent-panel";
import {
  AppSidebar,
  type AppSidebarUser,
} from "@/components/layout/app-sidebar";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { SearchCommand } from "@/components/layout/search-command";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TopbarCrumbs, TopbarCrumbsProvider } from "@/components/layout/topbar-crumbs";

// Frame for every product screen (Studio Admin's dashboard layout, inset variant): the sidebar sits on the page
// background and the content is a bordered, rounded panel beside it; no shadow (no drop shadows on
// surfaces). Collapsible sidebar (icon rail), top bar, page content, and the agent.
// The agent opens as a floating chat window bottom-right; preview ?agent=dock shows it
// docked on the right instead, resizable 320–900px (PRD-03 AC-AG-C-02), to compare. The launcher shows while the
// agent is closed (AC-AG-C-01). Persisting open/width (AC-AG-C-03) is left to the app. Other screens open the agent,
// with a first message if they like, through openAgent() from the chat engine (AgentChatProvider).
export function AppShell({
  user,
  defaultAgentOpen = false,
  children,
}: {
  user: AppSidebarUser;
  defaultAgentOpen?: boolean;
  children: React.ReactNode;
}) {
  const [agentOpen, setAgentOpen] = useState(defaultAgentOpen);
  const docked = useDockPreview();
  // Closing the agent (Esc or Close) puts focus back on "Ask the agent", so keyboard users don't land on <body>.
  const launcherRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const closeAgent = useCallback(() => {
    returnFocus.current = true;
    setAgentOpen(false);
  }, []);
  useEffect(() => {
    if (agentOpen || !returnFocus.current) return;
    returnFocus.current = false;
    launcherRef.current?.focus();
  }, [agentOpen]);
  const lift = useStickyBarLift(launcherRef, !agentOpen);

  return (
    <AgentChatProvider onOpenRequest={() => setAgentOpen(true)}>
      <TopbarCrumbsProvider>
      {/* First thing Tab reaches: jumps past the sidebar and top bar to the page (WCAG 2.4.1). */}
      <a
        href="#page-content"
        className="sr-only rounded-md bg-background text-sm font-medium text-foreground shadow-float ring-2 ring-ring focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <SidebarProvider>
        <AppSidebar
          variant="sidebar"
          collapsible="icon"
          user={user}
        />
        <SidebarInset className="h-svh min-w-0 overflow-hidden md:peer-data-[variant=inset]:h-[calc(100svh-1rem)] md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:shadow-none">
          <ResizablePanelGroup
            orientation="horizontal"
            className="min-h-0 flex-1"
          >
            <ResizablePanel
              id="content"
              minSize={480}
              className="flex min-w-0 flex-col"
            >
              {/* Centered content like Studio Admin: header contents and the page share a 1536px max width; the header bar and
                  its bottom line stay full width so the line meets the sidebar. */}
              <header className="flex h-12 shrink-0 border-b">
                <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-2 px-4 lg:px-6">
                  {/* Top bar: the way back on the left (back button + parent pages); the sidebar toggle lives in the sidebar;
                      Ctrl+K opens quick search. */}
                  <TopbarCrumbs />
                  <SearchCommand onAskAgent={() => setAgentOpen(true)} showTrigger={false} />
                  <div className="ml-auto">
                    <NotificationsMenu />
                  </div>
                </div>
              </header>
              <div id="page-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
                {/* Full width up to 1536px. pb-24 keeps the floating "Ask the agent" button from covering the last row
                    or button on the page. */}
                <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 p-4 pb-24 md:gap-6 md:p-6 md:pb-24">
                  {children}
                </div>
              </div>
            </ResizablePanel>
            {docked && agentOpen && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel id="agent" defaultSize={400} minSize={320} maxSize={900} className="min-w-0">
                  <AgentPanel onClose={closeAgent} />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
          {!docked && <AgentFloat open={agentOpen} onClose={closeAgent} />}
          {!agentOpen && (
            <AgentLauncher
              ref={launcherRef}
              onClick={() => setAgentOpen(true)}
              className="fixed right-6 bottom-6 z-20"
              style={lift > 0 ? { bottom: LAUNCHER_INSET + lift } : undefined}
            />
          )}
        </SidebarInset>
      </SidebarProvider>
      </TopbarCrumbsProvider>
    </AgentChatProvider>
  );
}

/** The launcher's distance from the window's right and bottom edges (right-6 bottom-6). */
const LAUNCHER_INSET = 24;

/**
 * How far to lift the "Ask the agent" pill so it never covers a sticky action bar (Settings › Company's Save, New
 * batch › Review's Send now). Any element marked `data-sticky-actions` counts, wherever it sits:
 * the pill moves up just above the bar only while the bar is under the pill's usual spot (stuck to the bottom of the
 * window), and comes back down when the bar scrolls away or sits elsewhere (a side column).
 */
function useStickyBarLift(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const [lift, setLift] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const pill = ref.current;
        if (!pill) return;
        // The pill's usual box, whatever the current lift.
        const right = window.innerWidth - LAUNCHER_INSET;
        const bottom = window.innerHeight - LAUNCHER_INSET;
        const left = right - pill.offsetWidth;
        const top = bottom - pill.offsetHeight;
        let need = 0;
        for (const bar of document.querySelectorAll("[data-sticky-actions]")) {
          const r = bar.getBoundingClientRect();
          if (r.right > left && r.left < right && r.bottom > top && r.top < bottom)
            need = Math.max(need, bottom - r.top + 12);
        }
        setLift(need);
      });
    };
    check();
    // Scrolling (any scroller), resizing, and bars coming and going with the page.
    document.addEventListener("scroll", check, true);
    window.addEventListener("resize", check);
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributeFilter: ["data-sticky-actions"] });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("scroll", check, true);
      window.removeEventListener("resize", check);
      observer.disconnect();
    };
  }, [ref, enabled]);
  return enabled ? lift : 0;
}

/**
 * Preview ?agent=dock: the docked panel instead of the floating window, for comparing the two. Read from the address
 * on the client only (the server renders the default), so the closed state is the same markup in both. The rest of
 * the session keeps it.
 */
function useDockPreview() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => {
      // Sticks for the session once seen, so moving between pages keeps the docked preview; ?agent=float undoes it.
      const asked = new URLSearchParams(window.location.search).get("agent");
      if (asked) dockPreview = asked === "dock";
      return dockPreview;
    },
    () => false
  );
}
const subscribeToNothing = () => () => {};
let dockPreview = false;
