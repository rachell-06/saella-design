"use client";

import { cn } from "@/lib/utils";

import { useTopbarCrumbs } from "@/components/layout/topbar-crumbs";

// Top of every product screen: title (24px weight 500), one line of context, and the screen's
// main actions on the right. Parent pages (`breadcrumbs`) are shown in the app's top bar with a back button, not
// above the title; the trail never repeats this page's title.
export type Crumb = { label: string; href?: string };

type PageHeaderProps = {
  title: string;
  /** Parent pages only; shown in the top bar with a back button to the nearest one. */
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  /** Centre the actions against the title block instead of its top (editor headers). */
  centerActions?: boolean;
} & (
  // Every page title has a line under it: a short description, or, on detail pages, a line of its own facts (status
  // badge, campaign…) passed as children. Never both unless each says something new. A description says what the page
  // is for in one line: it never repeats the title or restates the tabs or stepper below it.
  | { description: string; children?: React.ReactNode }
  | { description?: string; children: React.ReactNode }
);

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  centerActions,
  children,
}: PageHeaderProps) {
  useTopbarCrumbs(breadcrumbs);
  return (
    <header className="flex flex-col gap-3">
      <div className={cn("flex flex-wrap justify-between gap-4", centerActions ? "items-center" : "items-start")}>
        <div className="flex min-w-0 flex-col gap-1">
          {/* 24px medium, an app title (not a landing page's 30px). */}
          <h1 className="font-heading text-2xl font-medium tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {children}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
