import { Suspense } from "react";
import type { Metadata } from "next";
import { OrganizationScreen } from "./_components/organization-screen";

export const metadata: Metadata = { title: "Organization · Settings · Saella" };

export default function OrganizationSettingsPage() {
  return (
    <Suspense>
      <OrganizationScreen />
    </Suspense>
  );
}
