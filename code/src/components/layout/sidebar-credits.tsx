"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Item } from "@/components/ui/item";
import { formatDate } from "@/lib/mock/campaigns";
import { useCreditBalance } from "@/lib/mock/credits";
import { WORKSPACE } from "@/lib/mock/workspace";

// Workspace credits at the foot of the sidebar (decisions.md "Credits", user requests 2026-11-11): a ring for what
// is left of this cycle, the balance, the next monthly grant when running low, and a way to top up.
// The ring is part of a whole (PATTERNS 9.7: a bar or ring only for a real share, drawn to the exact value):
// balance ÷ credits available this cycle (plan grant + carried over + packs bought), so it can never pass 100%.
// Hidden when the sidebar is collapsed to icons.
const LOW_SHARE = 0.1;

export function SidebarCredits() {
  // Live balance: drops when a screen spends credits (Leads unlock).
  const balance = useCreditBalance();
  const { cycleTotal, monthlyGrant, renewsOn } = WORKSPACE.credits;
  const share = cycleTotal > 0 ? Math.min(1, Math.max(0, balance / cycleTotal)) : 0;
  return (
    <Item
      variant="outline"
      className="flex-row flex-nowrap items-center gap-3 rounded-card bg-background p-3.5 group-data-[collapsible=icon]:hidden"
    >
      <CreditRing share={share} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Remaining only, no cycle total (dev suggestion, designer decision 2026-11-12); the ring keeps the share. */}
        <span className="tabular-nums">
          <span className="font-semibold">{balance.toLocaleString("en-US")}</span>
          <span className="text-muted-foreground"> credits left</span>
        </span>
        {/* The next grant only when running low (under 10% of the cycle): then "wait or top up?" is the question.
            Plan name and renewal live on Settings › Billing (designer decision 2026-11-12). */}
        {share < LOW_SHARE && (
          <span className="text-xs text-muted-foreground">
            +{monthlyGrant.toLocaleString("en-US")} on {formatDate(renewsOn)}
          </span>
        )}
        <Button variant="link" size="xs" className="h-auto justify-start self-start border-0 p-0 text-xs" asChild>
          <Link href="/settings/billing">Top up credits</Link>
        </Button>
      </div>
    </Item>
  );
}

/** Ring drawn to the exact share; the number next to it carries the meaning, the ring is a reading aid. */
function CreditRing({ share }: { share: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const pct = Math.round(share * 100);
  return (
    <div className="relative size-11 shrink-0" role="img" aria-label={`${pct}% of this cycle's credits left`}>
      <svg viewBox="0 0 40 40" className="size-11 -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - share)}
          className="stroke-brand"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[length:var(--text-xs)] font-semibold tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
