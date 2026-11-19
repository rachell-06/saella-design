"use client";

import { useRef } from "react";

/**
 * Focus back to what opened a controlled dialog. Radix returns focus only to a `DialogTrigger`; dialogs opened from a
 * button elsewhere or a menu item (Buy credits, ⋯ › Edit) would drop focus on <body>. Spread the result on
 * `DialogContent`. A menu item that opened it is gone by then, so its menu's trigger takes the focus instead.
 */
export function useFocusReturn() {
  const from = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      const el = document.activeElement as HTMLElement | null;
      // Opened from a menu: remember the menu's trigger (the item unmounts with the menu).
      const menu = el?.closest<HTMLElement>("[role=menu]");
      const trigger = menu?.id ? document.querySelector<HTMLElement>(`[aria-controls="${menu.id}"]`) : null;
      from.current = trigger ?? el;
    },
    onCloseAutoFocus: (e: Event) => {
      const el = from.current;
      if (el?.isConnected) {
        e.preventDefault();
        el.focus();
      }
    },
  };
}
