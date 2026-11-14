import { redirect } from "next/navigation";

// Same as the live app: a batch has no page of its own, the report is the batch.
export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/batches/${id}/report`);
}
