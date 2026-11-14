import { Suspense } from "react";
import type { Metadata } from "next";
import { WorkspaceScreen } from "./_components/workspace-screen";

export const metadata: Metadata = { title: "Company · Settings · Saella" };

export default function WorkspaceSettingsPage() {
  return (
    <Suspense>
      <WorkspaceScreen />
    </Suspense>
  );
}
