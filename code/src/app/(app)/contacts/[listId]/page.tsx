import { Suspense } from "react";
import { redirect } from "next/navigation";

// Named lists are gone (decisions.md "Leads › Contacts", 2026-11-05: contacts are grouped by tag). Old links to the
// demo's former lists land on the contact book filtered by the tags those lists carried; anything else on the book.
// `params` is awaited inside Suspense: with cacheComponents a top-level await blocks the route's shell.
const OLD_LIST_TAGS: Record<string, string[]> = {
  l1: ["hotel"],
  l2: ["fair"],
  l3: ["distributor"],
  l4: ["architect"],
};

export default function OldContactListPage({ params }: { params: Promise<{ listId: string }> }) {
  return (
    <Suspense>
      <Redirect params={params} />
    </Suspense>
  );
}

async function Redirect({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const tags = OLD_LIST_TAGS[listId] ?? [];
  const query = new URLSearchParams(tags.map((t) => ["tag", t]));
  redirect(tags.length ? `/contacts?${query}` : "/contacts");
  return null;
}
