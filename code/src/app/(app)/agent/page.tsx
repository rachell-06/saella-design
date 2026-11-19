"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { openAgent } from "@/components/features/agent-chat/agent-chat-provider";

// The agent has no page of its own (PATTERNS 9.4): it lives in the panel on every screen. Old links and bookmarks to
// /agent land here: open the panel and go back to the page the person came from, or Overview.
export default function AgentRedirect() {
  const router = useRouter();
  useEffect(() => {
    openAgent();
    router.replace(previousInAppPath() ?? "/overview");
  }, [router]);
  return null;
}

/** The page that linked here, when it is one of ours and not /agent itself. */
function previousInAppPath() {
  try {
    const from = new URL(document.referrer);
    if (from.origin !== window.location.origin || from.pathname === "/agent") return null;
    return from.pathname + from.search;
  } catch {
    return null;
  }
}
