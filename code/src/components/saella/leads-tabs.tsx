"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Leads = Companies + Contacts under one sidebar entry (user request 2026-10-29): "Find companies" searches Saella's
// company data, "Your lists" is the old Contacts page (lists, people, import). The routes stay /companies and
// /contacts so every existing link keeps working; these tabs are links between them.
export const LEADS_TITLE = "Leads";
export const LEADS_DESCRIPTION = "Find companies across Southeast Asia and keep your own contact lists.";

const TABS = [
  { href: "/companies", label: "Find companies" },
  { href: "/contacts", label: "Your lists" },
] as const;

export function LeadsTabs() {
  const pathname = usePathname();
  const current = pathname.startsWith("/contacts") ? "/contacts" : "/companies";
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
