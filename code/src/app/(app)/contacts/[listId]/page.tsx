import { Suspense } from "react";
import type { Metadata } from "next";
import { ContactListScreen } from "../_components/contact-list-screen";

export const metadata: Metadata = { title: "Contact list · Saella" };

// `params` is awaited inside Suspense: with cacheComponents a top-level await blocks the route's shell
// ("runtime data during prerendering"), same fix as /templates/[id].
export default function ContactListPage({ params }: { params: Promise<{ listId: string }> }) {
  return (
    <Suspense>
      <Screen params={params} />
    </Suspense>
  );
}

async function Screen({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  return <ContactListScreen listId={listId} />;
}
