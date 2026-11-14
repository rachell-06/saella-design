import { Suspense } from "react";
import type { Metadata } from "next";
import { TemplatesScreen } from "./_components/templates-screen";

export const metadata: Metadata = { title: "Templates · Saella" };

// All templates across campaigns (PRD-02 Email Campaigns, live app /dashboard/email/templates).
export default function TemplatesPage() {
  return (
    <Suspense>
      <TemplatesScreen />
    </Suspense>
  );
}
