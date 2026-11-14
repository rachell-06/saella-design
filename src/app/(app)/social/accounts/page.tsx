import { Suspense } from "react";
import type { Metadata } from "next";
import { SocialAccountsScreen } from "../_components/accounts-screen";

export const metadata: Metadata = { title: "Social accounts · Saella" };

// Connected pages, profiles and channels (live /dashboard/social/accounts, SocialConnections). Reads ?state= and the
// connect callback's ?connect=…, so it renders in a Suspense boundary.
export default function SocialAccountsPage() {
  return (
    <Suspense>
      <SocialAccountsScreen />
    </Suspense>
  );
}
