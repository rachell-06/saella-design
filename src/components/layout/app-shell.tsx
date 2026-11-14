"use client";

import { useState, useSyncExternalStore } from "react";
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

// Frame for every product screen.
// Inset variant: the sidebar sits on the page background and
// the content is a bordered, rounded panel beside it; no shadow.
// collapsible sidebar (icon rail), header with sidebar toggle + quick search, page content, and the agent.
// The agent opens as a floating chat window bottom-right;
// ?agent=dock shows the earlier panel docked on the right, resizable 320–900px (PRD-03 AC-AG-C-02), to compare.
// The launcher shows while the agent is closed (AC-AG-C-01). Persisting open/width (AC-AG-C-03) is left to the app.
// The panel is the agent's only home (the full page /agent was removed). Other screens open it, with a
// first message if they like, through openAgent from the chat engine (AgentChatProvider).
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

  return (
    <AgentChatProvider onOpenRequest={() => setAgentOpen(true)}>
      <TopbarCrumbsProvider>
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
              {/* Centered content: header contents and the page share a 1536px
                  max width; the header bar and its bottom line stay full width so the line meets the sidebar. */}
              <header className="flex h-12 shrink-0 border-b">
                <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-2 px-4 lg:px-6">
                  {/* Top bar: the way back on the left (back button + parent pages); the sidebar
                      toggle lives in the sidebar; the quick-search box is gone, Ctrl+K still opens it. */}
                  <TopbarCrumbs />
                  <SearchCommand onAskAgent={() => setAgentOpen(true)} showTrigger={false} />
                  <div className="ml-auto">
                    <NotificationsMenu />
                  </div>
                </div>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {/* Full width up to 1536px. pb-24 keeps the floating "Ask the agent"
                    button from covering the last row or button on the page. */}
                <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 p-4 pb-24 md:gap-6 md:p-6 md:pb-24">
                  {children}
                </div>
              </div>
            </ResizablePanel>
            {docked && agentOpen && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel id="agent" defaultSize={400} minSize={320} maxSize={900} className="min-w-0">
                  <AgentPanel onClose={() => setAgentOpen(false)} />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
          {!docked && <AgentFloat open={agentOpen} onClose={() => setAgentOpen(false)} />}
          {!agentOpen && (
            <AgentLauncher
              onClick={() => setAgentOpen(true)}
              className="fixed right-6 bottom-6 z-20"
            />
          )}
        </SidebarInset>
      </SidebarProvider>
      </TopbarCrumbsProvider>
    </AgentChatProvider>
  );
}

/**
 * ?agent=dock: the docked panel instead of the floating window, for comparing the two. Read from the address on
 * the client only (the server renders the default), so the closed state is the same markup in both.
 * The rest of the session keeps it.
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
