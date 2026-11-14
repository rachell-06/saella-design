import { Suspense } from "react";
import type { Metadata } from "next";
import { socialPosts } from "@/lib/mock/social";
import { PostBuilder } from "../../../../../_components/post-builder";

export const metadata: Metadata = { title: "Edit post · Saella" };

export function generateStaticParams() {
  return socialPosts.map((p) => ({ id: String(p.campaignId), postId: String(p.id) }));
}

// Rewrite a post that hasn't gone out, or change the text of a live one where the network allows it
// (live /dashboard/social/campaigns/[id]/posts/[postId]/edit).
export default function SocialEditPostPage({ params }: { params: Promise<{ id: string; postId: string }> }) {
  return (
    <Suspense>
      <Screen params={params} />
    </Suspense>
  );
}

async function Screen({ params }: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await params;
  return <PostBuilder campaignId={Number(id)} postId={Number(postId)} />;
}
