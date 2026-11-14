"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2Icon,
  ChevronsUpDownIcon,
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

// Same entries as the live app's DashboardSidebar (Repo, 2026-10-27), grouped under labels like Studio Admin's
// nav (user request 2026-10-29). Overview has no label: it is the home of the app.
/** `match`: other route prefixes that also highlight this entry (Leads covers /companies and /contacts). */
type NavItem = { href: string; label: string; icon: typeof MailIcon; match?: string[]; exact?: boolean };
export const navGroups: { label?: string; items: NavItem[] }[] = [
  // Grouped by product area (designer 2026-11-12): email outreach (campaigns, templates and the leads they go to)
  // and social posting, a separate, newer feature. The agent opens from the launcher, not the nav (its page is gone).
  {
    items: [{ href: "/overview", label: "Overview", icon: LineChartIcon }],
  },
  {
    label: "Email outreach",
    items: [
      // Leads first: find who to write to, then campaigns and templates (designer 2026-11-12).
      // Contacts merged into Companies as one "Leads" entry with tabs (user request 2026-10-29, leads-tabs.tsx).
      { href: "/companies", label: "Leads", icon: Building2Icon, match: ["/contacts"] },
      { href: "/campaigns", label: "Campaigns", icon: MailIcon },
      { href: "/templates", label: "Templates", icon: LayoutTemplateIcon },
    ],
  },
  {
    label: "Social",
    items: [
      // Social posting (live app origin/development: nav.social → /dashboard/social).
      // Two entries replace the page's Campaigns · Accounts tabs (designer 2026-11-12). "Posts", not "Campaigns", so it
      // doesn't read like the email campaigns above.
      { href: "/social", label: "Posts", icon: Share2Icon, exact: true, match: ["/social/campaigns"] },
      { href: "/social/accounts", label: "Accounts", icon: AtSignIcon },
    ],
  },
];
// Settings lives in the account menu, not the nav (user request 2026-11-11); search (Ctrl K) still lists it.
const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: SettingsIcon };
export const navItems = [...navGroups.flatMap((g) => g.items), SETTINGS_ITEM];

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
          (item.match ?? []).some((h) => current === h || current.startsWith(`${h}/`))
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
        {/* The collapse toggle sits in the sidebar (designer 2026-11-12): beside the logo when open; when collapsed to
            icons the logo hides and the toggle takes its place. */}
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

      {/* No "Ask the agent" entry here (removed on request 2026-10-29): the agent opens from the floating
          launcher at the bottom right and from search (Ctrl K). */}
      <SidebarContent>
        {/* The route is only known at request time on dynamic routes (cacheComponents), so the part that
            reads it suspends on its own; the fallback is the same list without a highlight. */}
        <Suspense fallback={<NavGroups current="" />}>
          <RouteNavGroups />
        </Suspense>
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
              className="truncate text-xs text-subtle-foreground"
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
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {/* One entry (designer decision 2026-11-12): Profile is the first Settings tab, so a separate Profile item led
              to the same screen. */}
          <DropdownMenuItem asChild>
            <Link href="/settings/profile">
              <SettingsIcon />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-subtle-foreground">
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
