import { Suspense } from "react";
import type { Metadata } from "next";
import { SocialCampaignsScreen } from "./_components/campaigns-screen";

export const metadata: Metadata = { title: "Posts · Saella" };

// Social home = campaigns; posts are written inside a campaign (live app /dashboard/social, SocialCampaigns).
// The screen reads ?state=, ?campaign= and ?new=, so it renders in a Suspense boundary.
export default function SocialPage() {
  return (
    <Suspense>
      <SocialCampaignsScreen />
    </Suspense>
  );
}
