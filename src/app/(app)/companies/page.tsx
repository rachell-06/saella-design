import { Suspense } from "react";
import type { Metadata } from "next";
import { CompaniesScreen } from "./_components/companies-screen";

export const metadata: Metadata = { title: "Companies · Saella" };

// The screen reads filters and ?state= from the URL, so it renders in a Suspense boundary.
export default function CompaniesPage() {
  return (
    <Suspense>
      <CompaniesScreen />
    </Suspense>
  );
}
