"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Ask before leaving a page with unsaved work. One hook covers every way out:
//   - closing or reloading the tab: the browser's own prompt (beforeunload)
//   - in-app links (sidebar, crumbs, any <a>): caught in the capture phase, before Next's Link
//   - the top bar's "← Back" (TopbarCrumbs calls requestBack())
//   - the browser's Back button: while guarded, the page keeps one extra history entry of itself, so Back lands
//     on the same URL and we ask instead of leaving
// The page shows its own dialog (Save / Discard / Keep editing) from onBlock, then calls leave(target).

export type LeaveTarget =
  /** replace: the page itself goes out of history (e.g. a new draft's URL once it is saved under its own URL). */
  | { kind: "href"; href: string; replace?: boolean }
  | { kind: "back" };

const LEAVE_EVENT = "saella:leave";
const SENTINEL = "__saellaGuard";
/** Fired just before a leave with `replace`: the top bar's page stack (topbar-crumbs.tsx) swaps its top entry too. */
export const REPLACE_EVENT = "saella:replace-visit";

/** The top bar's Back: false when a page with unsaved work took over (it will ask, then leave itself). */
export function requestBack(): boolean {
  return window.dispatchEvent(new CustomEvent<LeaveTarget>(LEAVE_EVENT, { cancelable: true, detail: { kind: "back" } }));
}

export function useLeaveGuard(active: boolean, onBlock: (target: LeaveTarget) => void) {
  const router = useRouter();
  const activeRef = useRef(active);
  const blockRef = useRef(onBlock);
  // Whether this page pushed its extra history entry (see above).
  const sentinel = useRef(false);
  // leave() with replace while the extra entry exists: step back over it first, then replace (see popstate).
  const pendingReplace = useRef<string | null>(null);
  // Set by leave(): the page is on its way out, so it neither asks nor re-adds its extra entry (a save right before
  // leave() re-renders the page while it is still guarded, which would push a second extra entry).
  const left = useRef(false);
  const routerRef = useRef(router);

  useEffect(() => {
    activeRef.current = active && !left.current;
    blockRef.current = onBlock;
    routerRef.current = router;
    if (activeRef.current && !sentinel.current) {
      // Keep Next's own state on the entry so its router treats it as one of its own.
      window.history.pushState({ ...window.history.state, [SENTINEL]: true }, "", window.location.href);
      sentinel.current = true;
    }
  });

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeRef.current) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (!activeRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.origin !== window.location.origin) return;
      if (a.pathname === window.location.pathname && a.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      blockRef.current({ kind: "href", href: a.pathname + a.search + a.hash });
    };
    const onLeave = (e: Event) => {
      if (!activeRef.current) return;
      e.preventDefault();
      blockRef.current((e as CustomEvent<LeaveTarget>).detail);
    };
    const onPopState = (e: PopStateEvent) => {
      if (pendingReplace.current) {
        const href = pendingReplace.current;
        pendingReplace.current = null;
        routerRef.current.replace(href);
        return;
      }
      // Back from the extra entry lands on this same page.
      if (!sentinel.current || (e.state as Record<string, unknown> | null)?.[SENTINEL]) return;
      sentinel.current = false;
      if (activeRef.current) {
        window.history.pushState({ ...window.history.state, [SENTINEL]: true }, "", window.location.href);
        sentinel.current = true;
        blockRef.current({ kind: "back" });
      } else {
        // Saved since: nothing to ask, finish the Back the user pressed.
        window.history.back();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    window.addEventListener(LEAVE_EVENT, onLeave);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(LEAVE_EVENT, onLeave);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  /** Leave without asking again (after Save or Discard in the page's dialog). */
  const leave = useCallback(
    (target: LeaveTarget) => {
      left.current = true;
      activeRef.current = false;
      const extra = sentinel.current;
      sentinel.current = false;
      if (target.kind === "back") {
        if (extra) window.history.go(-2);
        else router.back();
      } else if (target.replace) {
        window.dispatchEvent(new Event(REPLACE_EVENT));
        if (extra) {
          pendingReplace.current = target.href;
          window.history.back();
        } else {
          router.replace(target.href);
        }
      } else if (extra) {
        // Replace the extra entry, so Back from the next page comes here once, not twice.
        router.replace(target.href);
      } else {
        router.push(target.href);
      }
    },
    [router]
  );

  return leave;
}
