"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Item } from "@/components/ui/item";
import { formatDate } from "@/lib/mock/campaigns";
import { useCreditStanding } from "@/lib/mock/credits";
import { cn } from "@/lib/utils";
import { WORKSPACE } from "@/lib/mock/workspace";
import { TopUpDialog } from "@/components/features/top-up-dialog";

// Workspace credits at the foot of the sidebar: a ring for what is left of this cycle, the
// balance, the next monthly grant when running low, and a way to top up: Top up credits
// opens the top-up dialog in place; plans and the ledger stay on Settings › Billing.
// The ring is part of a whole (a bar or ring only for a real share, drawn to the exact value):
// balance ÷ credits available this cycle (plan grant + carried over + packs bought), so it can never pass 100%.
// Hidden when the sidebar is collapsed to icons.
// Running low: under 20% of the cycle the ring, the % and the balance turn red and the next grant shows. The rule is
// shared with Billing (creditStanding, lib/mock/credits).

export function SidebarCredits() {
  // Live balance: drops when a screen spends credits (Leads unlock).
  const { balance, share, low } = useCreditStanding();
  const { monthlyGrant, renewsOn } = WORKSPACE.credits;
  const [topUp, setTopUp] = useState(false);
  return (
    <Item
      variant="outline"
      className="flex-row flex-nowrap items-center gap-3 rounded-card bg-background p-3.5 group-data-[collapsible=icon]:hidden"
    >
      <CreditRing share={share} low={low} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Remaining only, no cycle total; the ring keeps the share. */}
        <span className="tabular-nums">
          <span className={cn("font-semibold", low && "text-destructive")}>{balance.toLocaleString("en-US")}</span>
          <span className="text-muted-foreground"> credits left</span>
        </span>
        {/* The next grant only when running low (under 20% of the cycle): then "wait or top up?" is the question.
            Plan name and renewal live on Settings › Billing. */}
        {low && (
          <span className="text-xs text-muted-foreground">
            +{monthlyGrant.toLocaleString("en-US")} on {formatDate(renewsOn)}
          </span>
        )}
        {/* Clickable text is never 12px (DESIGN §5). */}
        <Button
          variant="link"
          size="xs"
          className="h-auto justify-start self-start border-0 p-0 text-sm"
          onClick={() => setTopUp(true)}
        >
          Top up credits
        </Button>
      </div>
      <TopUpDialog open={topUp} onOpenChange={setTopUp} />
    </Item>
  );
}

/** The ring fills with what has been used this cycle, so it grows red as credits run out; the number inside stays
 *  what is left, matching "N credits left" beside it. Drawn to the exact share. */
function CreditRing({ share, low }: { share: number; low: boolean }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const pct = Math.round(share * 100);
  return (
    <div className="relative size-12 shrink-0" role="img" aria-label={`${pct}% of this cycle's credits left${low ? ", running low" : ""}`}>
      <svg viewBox="0 0 40 40" className="size-12 -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3.5" className="stroke-muted" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * share}
          className={low ? "stroke-destructive" : "stroke-brand"}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold tabular-nums",
          // text-xs, the smallest DS size (DESIGN §5: counters); "100%" also tightens its tracking to fit the ring.
          "text-xs",
          pct === 100 && "tracking-tight",
          low && "text-destructive",
        )}
      >
        {/* The % sign in a lighter weight, same size (no off-scale sizes); "100%" also tightens its tracking to fit. */}
        {pct}
        <span className="font-normal">%</span>
      </span>
    </div>
  );
}
