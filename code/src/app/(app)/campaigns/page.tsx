import { Suspense } from "react";
import type { Metadata } from "next";
import { CampaignsScreen } from "./_components/campaigns-screen";

export const metadata: Metadata = { title: "Campaigns · Saella" };

// The screen reads ?state= for previews, so it renders in a Suspense boundary.
export default function CampaignsPage() {
  return (
    <Suspense>
      <CampaignsScreen />
    </Suspense>
  );
}
