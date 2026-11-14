import { Suspense } from "react";
import type { Metadata } from "next";
import { ContactsScreen } from "./_components/contacts-screen";

export const metadata: Metadata = { title: "Self-upload · Saella" };

// The screen reads ?state= for previews, so it renders in a Suspense boundary.
export default function ContactsPage() {
  return (
    <Suspense>
      <ContactsScreen />
    </Suspense>
  );
}
