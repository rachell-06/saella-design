import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allTemplates, findTemplate } from "@/lib/mock/templates";
import { TemplateDetailScreen } from "../_components/template-detail";

// Known ids are prerendered, so the shared sidebar's usePathname() has a value at build time (cacheComponents).
export function generateStaticParams() {
  return [...allTemplates().map((t) => ({ id: t.id }))];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${findTemplate(id)?.template.name ?? "Template"} · Saella` };
}

// One template's results (live app /dashboard/email/templates/[id], EmailTemplateAnalytics).
// `params` is awaited inside Suspense: with cacheComponents a top-level await blocks the route's shell.
export default function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <Screen params={params} />
    </Suspense>
  );
}

async function Screen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!findTemplate(id)) notFound();
  return <TemplateDetailScreen id={id} />;
}
