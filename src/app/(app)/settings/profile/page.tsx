import type { Metadata } from "next";
import { ProfileScreen } from "./_components/profile-screen";

export const metadata: Metadata = { title: "Profile · Settings · Saella" };

export default function ProfileSettingsPage() {
  return <ProfileScreen />;
}
