"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { addCredits, useCreditBalance } from "@/lib/mock/credits";
import { creditsUsd, packsForTier, usePlanTier } from "@/lib/mock/pricing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFocusReturn } from "@/lib/use-focus-return";
import { cn } from "@/lib/utils";

// Top up where credits ran short (buying shouldn't send the user to Billing and back). Packs are PRD-05's (500 /
// 1,000 / 2,000 / 5,000 at the plan's price a credit). Saella stores no card: payment goes through Stripe (Billing's
// note), so the mock confirms in place. With `runCosts` (credits each remaining run needs, in order) every pack says how far it
// gets the schedule, and the smallest pack that covers the next run is picked. With `need` (credits short for one
// action: an unlock, an export) the smallest pack that covers it is picked, times as many as it takes.
// Opened from: a schedule's Buy credits, Not enough credits (unlock, export), the sidebar credits block and Settings ›
// Billing's Top up (one way to buy a pack). Plans and the ledger stay on Billing. Prices follow the current plan
// (usePlanTier, the same value Billing switches), so they match Billing after an upgrade.

const n = (x: number) => x.toLocaleString("en-US");
const MAX_QTY = 10;

/** How many of the runs (in order) a balance pays for. */
function runsCovered(runCosts: number[], credits: number) {
  let left = credits;
  let k = 0;
  for (const c of runCosts) {
    if (c > left) break;
    left -= c;
    k++;
  }
  return k;
}

export function TopUpDialog({
  open,
  onOpenChange,
  runCosts,
  need: short,
  balance,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Credits each remaining run of a schedule needs, next run first. */
  runCosts?: number[];
  /** Without `runCosts`: the credits still missing for what the user was doing (an unlock, an export). */
  need?: number;
  /** The balance the asking screen showed, when it isn't the store's (a ?state= preview), so the numbers agree. */
  balance?: number;
  /** After paying, with the credits bought, before the dialog closes (the unlock dialog goes back to its confirm). */
  onPaid?: (credits: number) => void;
}) {
  const focus = useFocusReturn();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" {...focus}>
        {/* Inside the content, so it mounts fresh on every open (no remount key: focus goes back to the trigger). */}
        <TopUpBody
          runCosts={runCosts}
          short={short}
          shownBalance={balance}
          onDone={(paid) => {
            if (paid) onPaid?.(paid);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function TopUpBody({
  runCosts,
  short = 0,
  shownBalance,
  onDone,
}: {
  runCosts?: number[];
  short?: number;
  shownBalance?: number;
  onDone: (paid: number) => void;
}) {
  const stored = useCreditBalance();
  const balance = shownBalance ?? stored;
  const tier = usePlanTier();
  const packs = packsForTier(tier);
  const biggest = packs[packs.length - 1];
  const total = runCosts?.reduce((a, b) => a + b, 0) ?? 0;
  const need = runCosts?.length ? Math.max(0, total - balance) : Math.max(0, short);
  const firstFit = () => {
    if (!runCosts?.length) return need > 0 ? (packs.find((p) => p >= need) ?? biggest) : (packs[1] ?? packs[0]);
    return packs.find((p) => runsCovered(runCosts, balance + p) > runsCovered(runCosts, balance)) ?? biggest;
  };
  const [pick, setPick] = useState<number>(firstFit);
  // How many of the chosen pack (a schedule can need more than the biggest pack). Short by more than the biggest pack
  // for an unlock or export: as many of it as cover the gap.
  const [qty, setQty] = useState(() => (!runCosts?.length && need > biggest ? Math.min(MAX_QTY, Math.ceil(need / biggest)) : 1));
  const credits = pick * qty;
  // One click to enough for the whole schedule, in the biggest pack.
  const wholeQty = runCosts?.length && need > 0 ? Math.ceil(need / biggest) : 0;
  const covered = runCosts ? runsCovered(runCosts, balance + credits) : 0;

  function pay() {
    addCredits(credits, { kind: "topup", label: `Bought ${n(credits)} credits`, price: creditsUsd(credits, tier) });
    // "Credits never expire" is said once, in the dialog.
    toast.success(`${n(credits)} credits added`, {
      description: runCosts?.length ? "The schedule carries on at its next run." : undefined,
    });
    onDone(credits);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Top up credits</DialogTitle>
        <DialogDescription className="tabular-nums">
          Balance {n(balance)}
          {/* The shortfall in bold: the number the user acts on. */}
          {need > 0 && (
            <>
              {runCosts?.length ? " · this schedule needs " : " · you need "}
              <span className="font-semibold text-foreground">{n(need)}</span> more
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <RadioGroup value={String(pick)} onValueChange={(v) => setPick(Number(v))} aria-label="Credit pack" className="gap-2">
        {packs.map((p) => {
          const covered = runCosts ? runsCovered(runCosts, balance + p) : 0;
          const note = !runCosts?.length
            ? null
            : covered >= runCosts.length
              ? "Covers the whole schedule"
              : covered === 0
                ? "Not enough for the next run"
                : `Covers ${covered === 1 ? "the next run" : `the next ${n(covered)} runs`}`;
          return (
            <label
              key={p}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm tabular-nums",
                pick === p && "border-primary bg-primary-subtle dark:bg-primary/10",
              )}
            >
              <RadioGroupItem value={String(p)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{n(p)} credits</span>
                {note && <span className="text-muted-foreground">{note}</span>}
              </span>
              <span className="font-medium">{creditsUsd(p, tier)}</span>
            </label>
          );
        })}
      </RadioGroup>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm tabular-nums">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Quantity</span>
          <div role="group" aria-label="Quantity" className="flex items-center rounded-lg border">
            <Button variant="ghost" size="icon-sm" aria-label="Fewer" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>
              <MinusIcon />
            </Button>
            <span className="flex w-8 items-center justify-center text-sm font-medium" aria-live="polite">
              {qty}
            </span>
            <Button variant="ghost" size="icon-sm" aria-label="More" disabled={qty >= MAX_QTY} onClick={() => setQty(qty + 1)}>
              <PlusIcon />
            </Button>
          </div>
        </div>
        {wholeQty > 1 && !(pick === biggest && qty === wholeQty) && (
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => {
              setPick(biggest);
              setQty(Math.min(MAX_QTY, wholeQty));
            }}
          >
            Enough for the whole schedule
          </Button>
        )}
      </div>

      {/* The total only says something new with more than one pack, or while still short. */}
      {(qty > 1 || (!runCosts?.length && need > credits)) && (
        <div className="flex flex-col gap-0.5 rounded-lg border p-3 text-sm tabular-nums">
          <div className="flex items-baseline justify-between gap-3 font-medium">
            <span>
              {qty > 1 ? `${qty} × ${n(pick)} = ` : ""}
              {n(credits)} credits
            </span>
            <span>{creditsUsd(credits, tier)}</span>
          </div>
          {runCosts?.length ? (
            <span className="text-muted-foreground">
              {covered >= runCosts.length
                ? "Covers the whole schedule"
                : covered === 0
                  ? "Not enough for the next run"
                  : `Covers ${covered === 1 ? "the next run" : `the next ${n(covered)} of ${n(runCosts.length)} runs`}`}
            </span>
          ) : need > credits ? (
            <span className="text-muted-foreground">Still {n(need - credits)} short</span>
          ) : null}
        </div>
      )}

      <p className="text-sm text-muted-foreground">Paid securely through Stripe. Credits never expire.</p>

      <DialogFooter>
        <Button variant="outline" onClick={() => onDone(0)}>
          Cancel
        </Button>
        <Button onClick={pay} className="tabular-nums">
          Pay {creditsUsd(credits, tier)}
        </Button>
      </DialogFooter>
    </>
  );
}
