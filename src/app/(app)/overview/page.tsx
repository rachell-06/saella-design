import { Suspense } from "react";
import type { Metadata } from "next";
import { OverviewScreen } from "./_components/overview-screen";

export const metadata: Metadata = { title: "Overview · Saella" };

// Email metrics dashboard. Filters live in the URL so Campaigns, notifications and the agent can link
// straight to a view, e.g. /overview?campaign=c1&window=90.
export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewScreen />
    </Suspense>
  );
}
