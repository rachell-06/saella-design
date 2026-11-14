import { Suspense } from "react";
import type { Metadata } from "next";
import { WelcomeScreen } from "./_components/welcome-screen";

export const metadata: Metadata = { title: "Welcome · Saella" };

export default function OnboardingPage() {
  return (
    <Suspense>
      <WelcomeScreen />
    </Suspense>
  );
}
