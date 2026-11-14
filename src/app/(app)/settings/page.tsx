import { redirect } from "next/navigation";

// /settings opens on Sending, the section most users need first.
export default function SettingsPage() {
  redirect("/settings/sending");
}
