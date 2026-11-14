import { Suspense } from "react";
import type { Metadata } from "next";
import { CampaignsBoard } from "./_components/campaigns-board";

export const metadata: Metadata = { title: "Campaigns · Saella" };

// One collapsible card per campaign. The board reads ?c=, ?new= and
// ?state= on the client, so it renders in a Suspense boundary.
export default function CampaignsPage() {
  return (
    <Suspense>
      <CampaignsBoard />
    </Suspense>
  );
}
