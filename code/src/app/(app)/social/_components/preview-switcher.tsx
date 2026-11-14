"use client";

import { useEffect, useState } from "react";
import { SOCIAL_NETWORKS, type SocialNetwork } from "@/lib/mock/social";
import { cn } from "@/lib/utils";
import { ListRow } from "@/components/saella/list-row";
import { NetworkIcon } from "./network-icon";
import { brand } from "./rules";

export type SwitchItem = {
  key: string;
  network: SocialNetwork;
  title: string;
  sub?: string;
  /** The account's own picture; without it the row shows the network icon. */
  avatar?: React.ReactNode;
  /** Small state mark beside the name in the rail (ready, live, failed…). */
  badge?: React.ReactNode;
  /** Above the preview: status, link, what needs fixing. */
  head?: React.ReactNode;
  body: React.ReactNode;
};

// One preview at a time at the network's own width, with a rail on the right to move between networks or accounts
// (live PreviewSwitcher.tsx). ← → step through the rail unless the user is typing.
export function PreviewSwitcher({
  items: given,
  label,
  className,
  groupByNetwork,
}: {
  items: SwitchItem[];
  label: string;
  className?: string;
  /** Rail grouped under a header per network (icon + name + count); rows then show the account's avatar. */
  groupByNetwork?: boolean;
}) {
  // Grouped: rows in network order, so ← → walk the rail as it reads.
  const items = groupByNetwork ? SOCIAL_NETWORKS.flatMap((n) => given.filter((i) => i.network === n)) : given;
  const [active, setActive] = useState(items[0]?.key);
  const cur = items.find((i) => i.key === active) ?? items[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable || el.getAttribute("role") === "tab")) return;
      const i = items.findIndex((x) => x.key === cur?.key);
      const next = items[(i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
      if (next) setActive(next.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, cur?.key]);

  if (!cur) return null;
  const row = (i: SwitchItem) => (
    <ListRow key={i.key} selected={i.key === cur.key} onSelect={() => setActive(i.key)} className="gap-2.5 px-3 py-2">
      {i.avatar ?? <NetworkIcon network={i.network} size={24} />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{i.title}</span>
        {i.sub && <span className="truncate text-sm text-muted-foreground">{i.sub}</span>}
      </span>
      {i.badge}
    </ListRow>
  );
  return (
    // Standing on a page it takes rounded-card (pass className); inside a sheet it stays rounded-lg (DESIGN.md §6).
    <div className={cn("grid min-h-0 grid-cols-[minmax(0,1fr)_256px] divide-x overflow-hidden rounded-lg border", className)}>
      <div className="flex min-w-0 flex-col gap-4 bg-muted/40 p-6">
        {cur.head}
        <div key={cur.key}>{cur.body}</div>
      </div>
      <nav aria-label={label} className="flex flex-col py-2">
        {groupByNetwork
          ? SOCIAL_NETWORKS.filter((n) => items.some((i) => i.network === n)).map((n) => {
              const rows = items.filter((i) => i.network === n);
              return (
                <section key={n} aria-label={brand(n)} className="flex flex-col pb-1 [&+&]:border-t [&+&]:pt-1">
                  <h3 className="flex items-center gap-2 px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                    <NetworkIcon network={n} size={16} />
                    <span>
                      {brand(n)}
                      {rows.length > 1 && <span className="font-normal tabular-nums"> · {rows.length} accounts</span>}
                    </span>
                  </h3>
                  {rows.map((i) => row(i))}
                </section>
              );
            })
          : items.map((i) => row(i))}
      </nav>
    </div>
  );
}
