import { Suspense } from "react";
import type { Metadata } from "next";
import { BatchWizard } from "../_components/batch-wizard";

export const metadata: Metadata = { title: "New batch · Saella" };

export default function NewBatchPage() {
  return (
    <Suspense>
      <BatchWizard />
    </Suspense>
  );
}
