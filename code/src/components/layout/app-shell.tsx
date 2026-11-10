"use client";

import { Suspense, useState } from "react";
import { AgentLauncher, AgentPanel } from "@/components/layout/agent-panel";
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
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Frame for every product screen (layout learned from Studio Admin's dashboard layout, 2026-10-27).
// Inset variant (user request 2026-10-29, Studio Admin's default): the sidebar sits on the page background and
// the content is a bordered, rounded panel beside it; no shadow (DESIGN.md: no drop shadows on surfaces).
// collapsible sidebar (icon rail), header with sidebar toggle + quick search, page content, and the
// agent panel docked on the right, resizable 320–900px (PRD-03 AC-AG-C-02). The launcher shows while
// the panel is closed (AC-AG-C-01). Persisting open/width across loads (AC-AG-C-03) is left to the app.
export function AppShell({
  user,
  defaultAgentOpen = false,
  agentContent,
  children,
}: {
  user: AppSidebarUser;
  defaultAgentOpen?: boolean;
  /** Messages shown in the agent panel. */
  agentContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [agentOpen, setAgentOpen] = useState(defaultAgentOpen);

  return (
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
            {/* Centered content like Studio Admin (user request 2026-10-28): header contents and the page share a 1536px
                max width; the header bar and its bottom line stay full width so the line meets the sidebar. */}
            <header className="flex h-12 shrink-0 border-b">
              <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-2 px-4 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mx-1 data-[orientation=vertical]:h-4"
                />
                <SearchCommand onAskAgent={() => setAgentOpen(true)} />
                <div className="ml-auto">
                  <NotificationsMenu />
                </div>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Full width up to 1536px (DESIGN.md). pb-24 keeps the floating "Ask the agent"
                  button from covering the last row or button on the page. */}
              <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 p-4 pb-24 md:gap-6 md:p-6 md:pb-24">
                {children}
              </div>
            </div>
          </ResizablePanel>
          {agentOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                id="agent"
                defaultSize={400}
                minSize={320}
                maxSize={900}
                className="min-w-0"
              >
                <AgentPanel onClose={() => setAgentOpen(false)}>
                  {agentContent}
                </AgentPanel>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
        {!agentOpen && (
          // The launcher reads the route (hidden on /agent), so it suspends on its own on dynamic routes.
          <Suspense fallback={null}>
            <AgentLauncher
              onClick={() => setAgentOpen(true)}
              className="fixed right-6 bottom-6 z-20"
            />
          </Suspense>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
