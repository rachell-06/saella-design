import { Suspense } from "react";
import type { Metadata } from "next";
import { ReportRoute } from "../../_components/report-screen";

export const metadata: Metadata = { title: "Batch report · Saella" };

// The id is read on the client (useParams) inside Suspense, like every screen that reads the URL.
export default function BatchReportPage() {
  return (
    <Suspense>
      <ReportRoute />
    </Suspense>
  );
}
