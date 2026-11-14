"use client";

import { useEffect } from "react";
import { useMessageScroller } from "@/components/ui/message-scroller";

/**
 * Opening a conversation shows its last question with the answer under it. The scroller itself starts at the top
 * (MessageScrollerProvider defaultScrollPosition="start") and each user message is a scroll anchor, so a new
 * question scrolls to the top and its answer grows under it. Used by the side panel and /agent.
 */
export function OpenAtLatest({ threadId, lastId }: { threadId?: string; lastId?: string }) {
  const { scrollToMessage } = useMessageScroller();
  useEffect(() => {
    if (lastId) scrollToMessage(lastId, { align: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when another conversation opens
  }, [threadId, Boolean(lastId)]);
  return null;
}
