"use client";

import { Fragment, Suspense, createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Crumb } from "@/components/layout/page-header";
import { requestBack } from "@/lib/leave-guard";

// The way back, in the app's top bar (designer request 2026-11-12: the quick-search box there went unused).
// Back goes to the page the user came from (designer 2026-11-14: Campaigns → a template → back landed on Templates,
// a page they never opened). The app keeps its own short history of pages; when there is a previous page, the bar
// shows "← <that page>" and Back returns to it (browser back, so its scroll and filters come back too). Opened
// straight from a link, with no page before it, the bar falls back to the page's parents (PageHeader `breadcrumbs`):
// a back button to the nearest one and the trail. Top-level pages with neither show nothing.

type Visit = { href: string; title: string };
type Ctx = {
  crumbs: Crumb[];
  setCrumbs: (c: Crumb[]) => void;
  /** The page before this one in the app, if any. */
  previous: Visit | null;
};
const TopbarCrumbsContext = createContext<Ctx | null>(null);

/** "Campaigns · Saella" → "Campaigns"; Leads' tabs read as Leads. */
function pageName(v: Visit) {
  const name = v.title.split(" · ")[0]?.trim();
  if (v.href.startsWith("/companies") || v.href.startsWith("/contacts")) return "Leads";
  return name || "previous page";
}

export function TopbarCrumbsProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [previous, setPrevious] = useState<Visit | null>(null);
  return (
    <TopbarCrumbsContext.Provider value={{ crumbs, setCrumbs, previous }}>
      {/* The route is only known at request time on dynamic routes (cacheComponents), so the tracker suspends alone. */}
      <Suspense fallback={null}>
        <HistoryTracker onPrevious={setPrevious} />
      </Suspense>
      {children}
    </TopbarCrumbsContext.Provider>
  );
}

/** Keeps the pages visited in this tab: a new page is pushed; going back to the one before pops. */
function HistoryTracker({ onPrevious }: { onPrevious: (v: Visit | null) => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const stack = useRef<Visit[]>([]);
  const href = search ? `${pathname}?${search}` : pathname;

  useEffect(() => {
    const s = stack.current;
    const top = s[s.length - 1];
    if (top?.href === href) return;
    // Same page with other filters (?tab=, ?view=…): replace, so Back leaves the page rather than undoing a filter.
    if (top && top.href.split("?")[0] === pathname) s[s.length - 1] = { href, title: document.title };
    else if (s.length > 1 && s[s.length - 2].href === href) s.pop();
    else s.push({ href, title: document.title });
    if (s.length > 30) s.splice(0, s.length - 30);
    onPrevious(s.length > 1 ? s[s.length - 2] : null);
  }, [href, pathname, onPrevious]);

  // The tab title settles after the route changes: keep the current page's entry in step with it.
  useEffect(() => {
    const sync = () => {
      const s = stack.current;
      if (s.length) s[s.length - 1] = { ...s[s.length - 1], title: document.title };
    };
    sync();
    // The whole head: Next may swap the <title> element rather than change its text.
    const mo = new MutationObserver(sync);
    mo.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  }, [href]);
  return null;
}

/** Registers the page's parent pages for the top bar; clears them when the page unmounts. */
export function useTopbarCrumbs(crumbs: Crumb[] | undefined) {
  const ctx = useContext(TopbarCrumbsContext);
  const key = JSON.stringify(crumbs ?? []);
  useEffect(() => {
    if (!ctx) return;
    ctx.setCrumbs(JSON.parse(key) as Crumb[]);
    return () => ctx.setCrumbs([]);
    // ctx.setCrumbs is stable (useState setter); key carries the crumbs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return Boolean(ctx);
}

export function TopbarCrumbs() {
  const ctx = useContext(TopbarCrumbsContext);
  const router = useRouter();
  const crumbs = ctx?.crumbs ?? [];
  const previous = ctx?.previous ?? null;

  // A page with parents, reached from another page of the app: back to where the user was.
  if (crumbs.length > 0 && previous) {
    const name = pageName(previous);
    return (
      <Button variant="ghost" size="sm" className="font-normal text-muted-foreground" onClick={() => requestBack() && router.back()} aria-label={`Back to ${name}`}>
        <ArrowLeftIcon data-icon="inline-start" />
        {name}
      </Button>
    );
  }
  if (crumbs.length === 0) return null;
  const back = [...crumbs].reverse().find((c) => c.href);
  return (
    <div className="flex min-w-0 items-center gap-1">
      {back?.href && (
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={back.href} aria-label={`Back to ${back.label}`}>
            <ArrowLeftIcon />
          </Link>
        </Button>
      )}
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.label}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  crumb.label
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
