import { Suspense } from "react";
import type { Metadata } from "next";
import { LanguageScreen } from "./_components/language-screen";

export const metadata: Metadata = { title: "Language · Settings · Saella" };

export default function LanguageSettingsPage() {
  return (
    <Suspense>
      <LanguageScreen />
    </Suspense>
  );
}
