"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  Building2Icon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  GlobeIcon,
  LanguagesIcon,
  LockOpenIcon,
  SearchIcon,
  SendIcon,
  UploadIcon,
  UserIcon,
  UsersIcon,
  LayoutTemplateIcon,
  LineChartIcon,
  LogOutIcon,
  MailIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  Share2Icon,
  AtSignIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { SidebarCredits } from "@/components/layout/sidebar-credits";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Same entries as the live app's DashboardSidebar (Repo), grouped under labels like Studio Admin's nav. Overview has
// no label: it is the home of the app.
/** `match`: other route prefixes that also highlight this entry (Leads covers /companies and /contacts). */
/** `matchRe`: a route shape that also highlights it (a batch report sits under its template). */
/** `keywords`: other words people search for in the command palette (Ctrl K): old names, tab names, sub-pages. */
type NavItem = {
  href: string;
  label: string;
  icon: typeof MailIcon;
  match?: string[];
  matchRe?: RegExp;
  exact?: boolean;
  keywords?: string[];
};
export const navGroups: { label?: string; items: NavItem[] }[] = [
  // Grouped by product area: email outreach (campaigns, templates and the leads they go to) and social posting. The
  // agent opens from the launcher, not the nav.
  {
    items: [{ href: "/overview", label: "Overview", icon: LineChartIcon, keywords: ["Home", "Dashboard"] }],
  },
  {
    label: "Email outreach",
    items: [
      // Leads first: find who to write to, then campaigns and templates. Companies and Contacts are one "Leads" entry with
      // tabs (leads-tabs.tsx).
      {
        href: "/companies",
        label: "Leads",
        icon: Building2Icon,
        match: ["/contacts"],
        keywords: ["Companies"],
      },
      { href: "/campaigns", label: "Campaigns", icon: MailIcon, keywords: ["Email campaigns"] },
      {
        href: "/templates",
        label: "Templates",
        icon: LayoutTemplateIcon,
        matchRe: /^\/batches\/(?!new(?:\/|$))[^/]+\/report/,
        keywords: ["Emails", "Batches", "Reports", "Automation", "Follow-up"],
      },
    ],
  },
  {
    label: "Social",
    items: [
      // Social posting (live app origin/development: nav.social → /dashboard/social).
      // Two entries, "Posts" (not "Campaigns", so it doesn't read like the email campaigns above) and Accounts.
      { href: "/social", label: "Posts", icon: Share2Icon, exact: true, match: ["/social/campaigns"], keywords: ["Social"] },
      { href: "/social/accounts", label: "Accounts", icon: AtSignIcon, keywords: ["Social accounts", "Connections"] },
    ],
  },
];
// Settings lives in the account menu, not the nav; search (Ctrl K) still lists it.
const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: SettingsIcon,
};
export const navItems = [...navGroups.flatMap((g) => g.items), SETTINGS_ITEM];

/** Tabs and sub-pages the command palette (Ctrl K) opens directly: "billing" goes to Billing, "contacts" to
 *  Self-upload, not to their parent page. `parent` is shown next to the label. */
export const subPages: (NavItem & { parent: string })[] = [
  { href: "/companies", label: "Find companies", parent: "Leads", icon: SearchIcon, keywords: ["Search companies"] },
  { href: "/companies/unlocked", label: "Unlocked", parent: "Leads", icon: LockOpenIcon, keywords: ["Unlocked companies"] },
  { href: "/contacts", label: "Self-upload", parent: "Leads", icon: UploadIcon, keywords: ["Contacts", "Import", "Upload"] },
  { href: "/settings/profile", label: "Profile", parent: "Settings", icon: UserIcon, keywords: ["Account", "Password"] },
  { href: "/settings/notifications", label: "Notifications", parent: "Settings", icon: BellIcon, keywords: ["Emails", "Alerts"] },
  { href: "/settings/language", label: "Language", parent: "Settings", icon: LanguagesIcon },
  { href: "/settings/workspace", label: "Company", parent: "Settings", icon: Building2Icon, keywords: ["Workspace", "Logo"] },
  { href: "/settings/domain", label: "Domain", parent: "Settings", icon: GlobeIcon, keywords: ["DNS", "DKIM", "Verify"] },
  { href: "/settings/sending", label: "Sending", parent: "Settings", icon: SendIcon, keywords: ["Senders", "Sending health"] },
  { href: "/settings/organization", label: "Members", parent: "Settings", icon: UsersIcon, keywords: ["Team", "Invite", "Users"] },
  { href: "/settings/billing", label: "Billing", parent: "Settings", icon: CreditCardIcon, keywords: ["Credits", "Plan", "Top up", "Invoices"] },
];

export type AppSidebarUser = {
  name: string;
  email: string;
  /** Photo URL; the initials show while it loads or if it fails. */
  avatar?: string;
};

function RouteNavGroups() {
  return <NavGroups current={usePathname()} />;
}

function NavGroups({ current }: { current: string }) {
  return navGroups.map((group) => (
    <SidebarGroup key={group.label ?? "home"} className="py-0">
      {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          <NavItems items={group.items} current={current} />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}

function NavItems({ items, current }: { items: NavItem[]; current: string }) {
  return items.map((item) => (
    <SidebarMenuItem key={item.href}>
      <SidebarMenuButton
        asChild
        isActive={
          current === item.href ||
          (!item.exact && current.startsWith(`${item.href}/`)) ||
          (item.match ?? []).some((h) => current === h || current.startsWith(`${h}/`)) ||
          Boolean(item.matchRe?.test(current))
        }
        tooltip={item.label}
      >
        <Link href={item.href}>
          <item.icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  ));
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: AppSidebarUser;
}) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        {/* The collapse toggle sits beside the logo when open; collapsed to icons, the toggle takes the logo's place. */}
        <SidebarMenu className="flex-row items-center gap-1">
          <SidebarMenuItem className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <SidebarMenuButton size="lg" asChild>
              <Link href="/overview">
                <Image
                  src="/brand/saella-mark.png"
                  alt=""
                  width={32}
                  height={16}
                  className="w-8"
                />
                <span className="font-heading text-base font-semibold tracking-title text-foreground">
                  Saella
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarTrigger className="shrink-0 text-muted-foreground group-data-[collapsible=icon]:mx-auto" />
        </SidebarMenu>
      </SidebarHeader>

      {/* No "Ask the agent" entry here: the agent opens from the floating launcher and from search (Ctrl K). */}
      <SidebarContent>
        {/* The route is only known at request time on dynamic routes (cacheComponents), so the part that reads it
            suspends on its own; the fallback is the same list without a highlight. */}
        <nav aria-label="Main" className="flex flex-col">
          <Suspense fallback={<NavGroups current="" />}>
            <RouteNavGroups />
          </Suspense>
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <SidebarCredits />
        <SidebarMenu>
          <SidebarMenuItem>
            <AccountMenu user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Account menu: Settings, the theme switch (Light / Dark / System, default light), Log out.
function AccountMenu({ user }: { user: AppSidebarUser }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg">
          <Avatar>
            {user.avatar && <AvatarImage src={user.avatar} alt="" />}
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
            <span className="truncate font-medium text-foreground">
              {user.name}
            </span>
            <span
              className="truncate text-xs text-muted-foreground"
              title={user.email}
            >
              {user.email}
            </span>
          </span>
          <ChevronsUpDownIcon className="text-subtle-foreground" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
      >
        {/* The email shows once, on the trigger above. */}
        <DropdownMenuGroup>
          {/* One entry: Profile is the first Settings tab. */}
          <DropdownMenuItem asChild>
            <Link href="/settings/profile">
              <SettingsIcon />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <SunIcon />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {/* Mock: goes to sign-in; signing in again overwrites the preview session. */}
          <DropdownMenuItem asChild>
            <Link href="/login">
              <LogOutIcon />
              Log out
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
