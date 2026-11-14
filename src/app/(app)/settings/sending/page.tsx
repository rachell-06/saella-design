import { Suspense } from "react";
import type { Metadata } from "next";
import { SendingScreen } from "./_components/sending-screen";

export const metadata: Metadata = { title: "Sending · Settings · Saella" };

export default function SendingSettingsPage() {
  return (
    <Suspense>
      <SendingScreen />
    </Suspense>
  );
}
