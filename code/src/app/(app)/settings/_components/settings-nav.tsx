"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon, Building2Icon, CreditCardIcon, LanguagesIcon, SendIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Settings sub-nav (2026-10-28). The live app keeps these as tabs inside one Settings modal
// (Profile, Workspace, Domain, Agent, Users); here each is a page so it can be linked from notifications.
const ITEMS = [
  { href: "/settings/sending", label: "Sending", icon: SendIcon },
  { href: "/settings/organization", label: "Organization", icon: Building2Icon },
  { href: "/settings/notifications", label: "Notifications", icon: BellIcon },
  { href: "/settings/language", label: "Language", icon: LanguagesIcon },
  { href: "/settings/billing", label: "Billing", icon: CreditCardIcon },
];

export function SettingsNav() {
  const path = usePathname();
  return (
    <nav aria-label="Settings" className="flex flex-col gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md px-2.5 text-sm outline-none transition-colors duration-150 ease-standard focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
