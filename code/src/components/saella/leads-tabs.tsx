"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Leads = Companies + Contacts under one sidebar entry (user request 2026-10-29): "Find companies" searches Saella's
// company data, "Contacts" is your own contact book, grouped by tag (decisions.md, 2026-11-05). The routes stay /companies and
// /contacts so every existing link keeps working; these tabs are links between them.
export const LEADS_TITLE = "Leads";
export const LEADS_DESCRIPTION = "Find the companies you want to reach and keep your own contacts.";

const TABS = [
  { href: "/companies", label: "Find companies" },
  // Companies the workspace has unlocked (designer decision 2026-11-12): its own tab, same table as Find companies.
  { href: "/companies/unlocked", label: "Unlocked" },
  { href: "/contacts", label: "Self-upload" },
] as const;

export function LeadsTabs() {
  const pathname = usePathname();
  const current = pathname.startsWith("/contacts")
    ? "/contacts"
    : pathname.startsWith("/companies/unlocked")
      ? "/companies/unlocked"
      : "/companies";
  return (
    <Tabs value={current}>
      <TabsList aria-label="Leads">
        {TABS.map((t) => (
          <TabsTrigger key={t.href} value={t.href} asChild>
            <Link href={t.href}>{t.label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
