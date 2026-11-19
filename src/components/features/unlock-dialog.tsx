"use client";

import { useState } from "react";
import { creditsUsd } from "@/lib/mock/pricing";
import { TopUpDialog } from "@/components/features/top-up-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// The two dialogs of an unlock (live app useCompanyUnlock.tsx, #116):
// - "confirm": several companies are priced first. Says what is charged, what is free because it is already
//   unlocked (cost only, no balance row) (the question states the consequence).
// - "short": the balance doesn't cover it. Nothing is unlocked (all or nothing). Top up opens the top-up dialog in
//   place, the shortfall preselected; once paid, the dialog comes back as the confirm with the new balance (`then`),
//   so the unlock carries on with one more click. Cancelling the top-up comes back to "short".
// Spending credits is not destructive, so the confirm button is the dialog's one solid button.
// Shared by Leads (unlock selected) and New batch (unlock the campaign's locked matches now or on Send now), which
// passes its own title and label ("Unlock 3 and send to 20 companies?", "Unlock and send").
type ConfirmAsk = {
  kind: "confirm";
  companies: number;
  cost: number;
  alreadyUnlocked: number;
  /** Selected companies with no email: never unlocked or charged. */
  noEmail?: number;
  balance: number;
  /** Reads the live balance: it may have been topped up since the ask was made. */
  onConfirm: () => void;
  /** Defaults to "Unlock for N credits". */
  confirmLabel?: string;
  /** Defaults to "Unlock N companies?". New batch's Send now says the whole step. */
  title?: string;
};

export type UnlockAsk =
  | ConfirmAsk
  | {
      kind: "short";
      cost: number;
      balance: number;
      /** The confirm to show once a top-up covers the cost. */
      then?: Omit<ConfirmAsk, "kind" | "cost" | "balance">;
    };

const n = (x: number) => x.toLocaleString("en-US");
const credits = (x: number) => `${n(x)} ${x === 1 ? "credit" : "credits"}`;

export function UnlockDialog({ ask: asked, onOpenChange }: { ask: UnlockAsk | null; onOpenChange: (open: boolean) => void }) {
  const [topUp, setTopUp] = useState(false);
  // Credits bought from this ask's top-up, on top of the balance it was made with (a preview balance stays a preview).
  const [added, setAdded] = useState(0);
  const [prevAsked, setPrevAsked] = useState(asked);
  if (prevAsked !== asked) {
    setPrevAsked(asked);
    setAdded(0);
  }
  const balance = (asked?.balance ?? 0) + added;
  // Topped up enough: the short ask turns into its confirm.
  const ask: UnlockAsk | null =
    asked?.kind === "short" && asked.then && balance >= asked.cost
      ? { kind: "confirm", ...asked.then, cost: asked.cost, balance }
      : asked;
  return (
    <>
      {/* Hidden while the top-up dialog is up (one dialog at a time), not closed: the ask is kept. */}
      <AlertDialog open={ask !== null && !topUp} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          {ask?.kind === "confirm" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="tabular-nums">
                  {ask.title ?? `Unlock ${n(ask.companies)} ${ask.companies === 1 ? "company" : "companies"}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Full email, phone and website, kept for everyone in your workspace.
                  {ask.alreadyUnlocked > 0 && ` ${n(ask.alreadyUnlocked)} already unlocked aren't charged again.`}
                  {!!ask.noEmail && ` ${n(ask.noEmail)} ${ask.noEmail === 1 ? "has" : "have"} no email and ${ask.noEmail === 1 ? "isn't" : "aren't"} unlocked.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 rounded-lg border px-4 py-3 text-sm tabular-nums">
                <dt className="text-muted-foreground">Cost</dt>
                {/* Credits and their worth in dollars at the plan's pack price. */}
                <dd className="text-right">
                  <span className="font-medium">{credits(ask.cost)}</span>
                  <span className="text-muted-foreground"> · {creditsUsd(ask.cost)}</span>
                </dd>
              </dl>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={ask.onConfirm}>{ask.confirmLabel ?? `Unlock for ${credits(ask.cost)}`}</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {ask?.kind === "short" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Not enough credits</AlertDialogTitle>
                <AlertDialogDescription className="tabular-nums">
                  This unlock needs {credits(ask.cost)}. You have {n(balance)}. Top up, or select fewer companies.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    // Keep the ask: the top-up opens in its place and hands back to it.
                    e.preventDefault();
                    setTopUp(true);
                  }}
                >
                  Top up credits
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
      <TopUpDialog
        open={topUp && asked !== null}
        onOpenChange={setTopUp}
        need={asked ? Math.max(0, asked.cost - balance) : 0}
        // The balance this ask was made with (a ?state= preview's too), so "you need N more" matches.
        balance={balance}
        // No confirm to come back to: paying ends it (the top-up toast says the credits were added).
        onPaid={(credits) => {
          setAdded((a) => a + credits);
          if (asked?.kind === "short" && !asked.then) onOpenChange(false);
        }}
      />
    </>
  );
}
