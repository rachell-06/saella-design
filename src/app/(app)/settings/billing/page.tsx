import { Suspense } from "react";
import type { Metadata } from "next";
import { BillingScreen } from "./_components/billing-screen";

export const metadata: Metadata = { title: "Billing · Settings · Saella" };

export default function BillingSettingsPage() {
  return (
    <Suspense>
      <BillingScreen />
    </Suspense>
  );
}
