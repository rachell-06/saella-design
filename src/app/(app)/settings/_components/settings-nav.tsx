"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BellIcon,
  Building2Icon,
  CreditCardIcon,
  GlobeIcon,
  LanguagesIcon,
  SendIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { domainForState } from "./data";
import { useGuardedNavigate } from "./unsaved-guard";

// Settings sub-nav. The live app keeps these as tabs inside one Settings modal (Workspace, Profile, Domain, Agent,
// Users; billing is its own page and language sits in the header); here each is a page so notifications can link
// to it. Grouped: what belongs to you, then what belongs to the workspace.
const GROUPS = [
  {
    label: "Your account",
    items: [
      { href: "/settings/profile", label: "Profile", icon: UserIcon },
      { href: "/settings/notifications", label: "Notifications", icon: BellIcon },
      { href: "/settings/language", label: "Language", icon: LanguagesIcon },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings/workspace", label: "Company", icon: Building2Icon },
      { href: "/settings/domain", label: "Domain", icon: GlobeIcon },
      { href: "/settings/sending", label: "Sending", icon: SendIcon },
      { href: "/settings/organization", label: "Members", icon: UsersIcon },
      { href: "/settings/billing", label: "Billing", icon: CreditCardIcon },
    ],
  },
];

export function SettingsNav() {
  const path = usePathname();
  const guarded = useGuardedNavigate();
  return (
    <nav aria-label="Settings" className="flex flex-col gap-4">
      {GROUPS.map((g) => (
        <div key={g.label} className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1 text-sm text-muted-foreground">{g.label}</p>
          {g.items.map(({ href, label, icon: Icon }) => {
            const active = path === href || path.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={(e) => {
                  if (!active && guarded(href)) e.preventDefault();
                }}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-md px-2.5 text-sm outline-none transition-colors duration-150 ease-standard focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
                {href === "/settings/domain" && (
                  <Suspense>
                    <DomainDot />
                  </Suspense>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// Warning dot on Domain while the workspace domain isn't verified (follows the ?state= preview in this mock).
function DomainDot() {
  const domain = domainForState(useSearchParams().get("state") ?? "");
  if (domain?.status === "verified") return null;
  return (
    <>
      <span className="ml-auto size-2 rounded-full bg-warning" aria-hidden />
      <span className="sr-only">{domain ? "(not verified)" : "(not set up)"}</span>
    </>
  );
}
