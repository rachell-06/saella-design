import { Suspense } from "react";
import type { Metadata } from "next";
import { socialCampaigns } from "@/lib/mock/social";
import { PostBuilder } from "../../../_components/post-builder";

export const metadata: Metadata = { title: "New post · Saella" };

export function generateStaticParams() {
  return socialCampaigns.map((c) => ({ id: String(c.id) }));
}

// Write → Preview → Send, for one campaign (live /dashboard/social/campaigns/[id]/new, SocialPostBuilder).
export default function SocialNewPostPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <Screen params={params} />
    </Suspense>
  );
}

async function Screen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostBuilder campaignId={Number(id)} />;
}
