import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allTemplates, findTemplate, isSessionTemplateId } from "@/lib/mock/templates";
import { TemplateEditor } from "../../_components/editor/template-editor";

// Known ids are prerendered, so the shared sidebar's usePathname() has a value at build time (cacheComponents).
export function generateStaticParams() {
  return [...allTemplates().map((t) => ({ id: t.id })), { id: "draft" }];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Edit ${findTemplate(id)?.template.name ?? "new template"} · Saella` };
}

// The email editor (live app /dashboard/email/templates/[id]/edit, EmailTemplateEditor).
// `draft` is a new, unsaved template opened from "New template" (?name, ?campaign, ?kind).
// `params` is awaited inside Suspense: with cacheComponents a top-level await blocks the route's shell.
export default function TemplateEditPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <Screen params={params} />
    </Suspense>
  );
}

async function Screen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== "draft" && !findTemplate(id) && !isSessionTemplateId(id)) notFound();
  return <TemplateEditor id={id} />;
}
