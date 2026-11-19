"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Leads = Companies + Contacts under one sidebar entry: "Find companies" searches Saella's
// company data, "Contacts" is your own contact book, grouped by tag. The routes stay /companies and
// /contacts so every existing link keeps working; these tabs are links between them.
export const LEADS_TITLE = "Leads";
export const LEADS_DESCRIPTION = "Discover new companies and manage your own contacts.";

const TABS = [
  { href: "/companies", label: "Find companies" },
  // Companies the workspace has unlocked: its own tab, same table as Find companies.
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
  // Links between pages, not Tabs: tabs need panels; these change the route. Same look as line tabs.
  return (
    <nav aria-label="Leads" className="flex h-8 w-fit items-center gap-1 p-[3px]">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={current === t.href ? "page" : undefined}
          className="relative inline-flex h-full items-center rounded-md px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:bg-brand after:opacity-0 after:transition-opacity hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:text-foreground aria-[current=page]:after:opacity-100"
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
