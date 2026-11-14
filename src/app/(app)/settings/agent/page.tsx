import { redirect } from "next/navigation";

// The Agent tab merged into Company: old links land on the instructions there.
export default function AgentSettingsPage() {
  redirect("/settings/workspace");
}
