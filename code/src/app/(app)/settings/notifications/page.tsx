import { Suspense } from "react";
import type { Metadata } from "next";
import { NotificationsScreen } from "./_components/notifications-screen";

export const metadata: Metadata = { title: "Notifications · Settings · Saella" };

export default function NotificationSettingsPage() {
  return (
    <Suspense>
      <NotificationsScreen />
    </Suspense>
  );
}
