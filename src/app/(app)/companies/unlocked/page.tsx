import { Suspense } from "react";
import type { Metadata } from "next";
import { CompaniesScreen } from "../_components/companies-screen";

export const metadata: Metadata = { title: "Unlocked · Leads · Saella" };

// Leads › Unlocked: the Find companies screen limited to the companies this
// workspace has unlocked. Same URL filters and ?state= previews (incl. ?state=no-unlocks for the empty view).
export default function UnlockedCompaniesPage() {
  return (
    <Suspense>
      <CompaniesScreen view="unlocked" />
    </Suspense>
  );
}
