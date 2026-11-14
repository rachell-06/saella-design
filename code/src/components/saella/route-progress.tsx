"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// Thin bar at the very top while a route loads (PATTERNS.md §9.17): it starts on the click of an in-app link and
// finishes when the new route renders. Mounted once in the root layout. No npm dependency.
// - 2px, `bg-brand`, fixed above everything; aria-hidden (Next announces the new page itself).
// - Creeps towards 90% while waiting, jumps to 100% and fades on arrival.
// - Reduced motion: a static full-width bar while waiting, no sweep, no fade.
// - The clicked link gets `data-nav-pending` until the route renders, so the sidebar can mark it selected at once
//   (globals.css styles the sidebar item from that attribute). `usePendingHref()` gives the same to components.
// Programmatic navigation (router.push from a button) does not start the bar.

const SAFETY_MS = 12_000; // a click that never changes the route (e.g. prevented by the page) stops here

let pendingHref: string | null = null;
const listeners = new Set<() => void>();
function setPending(href: string | null) {
  pendingHref = href;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Path of the in-app link the user just clicked, until its route renders; null otherwise. */
export function usePendingHref() {
  return useSyncExternalStore(
    subscribe,
    () => pendingHref,
    () => null
  );
}

export function RouteProgress() {
  // useSearchParams needs a Suspense boundary in the root layout.
  return (
    <Suspense>
      <Bar />
    </Suspense>
  );
}

type BarState = { phase: "idle" | "loading" | "done"; progress: number; reduced: boolean };

function Bar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [bar, setBar] = useState<BarState>({ phase: "idle", progress: 0, reduced: false });
  const anchor = useRef<HTMLAnchorElement | null>(null);
  const timers = useRef<number[]>([]);

  function clearTimers() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }

  function finish() {
    anchor.current?.removeAttribute("data-nav-pending");
    anchor.current = null;
    setPending(null);
    clearTimers();
    setBar((b) => (b.phase === "loading" ? { ...b, phase: "done", progress: 1 } : b));
    timers.current.push(window.setTimeout(() => setBar((b) => ({ ...b, phase: "idle", progress: 0 })), 300));
  }

  // Start on the click of an in-app link to another route.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page, or only the hash changes: nothing loads.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      clearTimers();
      anchor.current?.removeAttribute("data-nav-pending");
      a.setAttribute("data-nav-pending", "");
      anchor.current = a;
      setPending(url.pathname);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setBar({ phase: "loading", progress: reduced ? 1 : 0.08, reduced });
      if (!reduced) {
        // Creep towards 90%: fast at first, slower as it goes.
        const creep = () => {
          setBar((b) => (b.phase === "loading" ? { ...b, progress: b.progress + (0.9 - b.progress) * 0.1 } : b));
          timers.current.push(window.setTimeout(creep, 250));
        };
        timers.current.push(window.setTimeout(creep, 120));
      }
      timers.current.push(window.setTimeout(finish, SAFETY_MS));
    }
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
    // Mounted once: finish() and clearTimers() only touch refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The new route rendered.
  const route = `${pathname}?${search}`;
  const [prevRoute, setPrevRoute] = useState(route);
  if (route !== prevRoute) {
    setPrevRoute(route);
    if (bar.phase === "loading") setBar({ ...bar, phase: "done", progress: 1 });
  }
  useEffect(() => {
    if (bar.phase !== "done" || anchor.current === null) return;
    finish();
    // finish() only touches refs and state setters, so it need not re-run the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bar.phase]);

  if (bar.phase === "idle") return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5">
      <div
        className={cn(
          "h-full origin-left bg-brand",
          !bar.reduced && "transition-[transform,opacity] duration-200 ease-standard",
          bar.phase === "done" && !bar.reduced && "opacity-0 delay-100"
        )}
        style={{ transform: `scaleX(${bar.progress})` }}
      />
    </div>
  );
}
