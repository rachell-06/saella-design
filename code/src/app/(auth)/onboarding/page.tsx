import { Suspense } from "react";
import type { Metadata } from "next";
import { OnboardingWizard } from "./_components/onboarding-wizard";

export const metadata: Metadata = { title: "Set up your workspace · Saella" };

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingWizard />
    </Suspense>
  );
}
