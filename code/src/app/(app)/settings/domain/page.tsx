import { Suspense } from "react";
import type { Metadata } from "next";
import { DomainScreen } from "./_components/domain-screen";

export const metadata: Metadata = { title: "Domain · Settings · Saella" };

export default function DomainSettingsPage() {
  return (
    <Suspense>
      <DomainScreen />
    </Suspense>
  );
}
