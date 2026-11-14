import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { socialCampaigns } from "@/lib/mock/social";

export function generateStaticParams() {
  return socialCampaigns.map((c) => ({ id: String(c.id) }));
}

// Campaigns have no page of their own in the live app: their posts live on the campaign list. Old links land on
// that campaign there (?campaign=).
export default function SocialCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <Go params={params} />
    </Suspense>
  );
}

async function Go({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactNode> {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  redirect(`/social?campaign=${id}`);
}
