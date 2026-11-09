import { Suspense } from "react";
import type { Metadata } from "next";
import { AgentScreen } from "./_components/agent-screen";

export const metadata: Metadata = { title: "Agent · Saella" };

// The screen reads ?state=, ?gates= and ?t= from the URL, so it renders in a Suspense boundary.
export default function AgentPage() {
  return (
    <Suspense>
      <AgentScreen />
    </Suspense>
  );
}
