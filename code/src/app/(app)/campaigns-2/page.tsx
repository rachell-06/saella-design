import { Suspense } from "react";
import type { Metadata } from "next";
import { CampaignsBoard } from "./_components/campaigns-board";

export const metadata: Metadata = { title: "Campaigns (option 2) · Saella" };

// Option 2 of the Campaigns layout, kept next to /campaigns so both can be compared (decisions.md, pending).
export default function CampaignsOptionTwoPage() {
  return (
    <Suspense>
      <CampaignsBoard />
    </Suspense>
  );
}
