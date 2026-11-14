"use client";

import Link from "next/link";
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
//   unlocked (cost only, no balance row:) (the question states the consequence).
// - "short": the balance doesn't cover it. Nothing is unlocked (all or nothing); the way out is Billing.
// Spending credits is not destructive, so the confirm button is the dialog's one solid button.
export type UnlockAsk =
  | { kind: "confirm"; companies: number; cost: number; alreadyUnlocked: number; balance: number; onConfirm: () => void }
  | { kind: "short"; cost: number; balance: number };

const n = (x: number) => x.toLocaleString("en-US");
const credits = (x: number) => `${n(x)} ${x === 1 ? "credit" : "credits"}`;

export function UnlockDialog({ ask, onOpenChange }: { ask: UnlockAsk | null; onOpenChange: (open: boolean) => void }) {
  return (
    <AlertDialog open={ask !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {ask?.kind === "confirm" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Unlock {n(ask.companies)} {ask.companies === 1 ? "company" : "companies"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Full email, phone and website, kept for everyone in your workspace.
                {ask.alreadyUnlocked > 0 && ` ${n(ask.alreadyUnlocked)} already unlocked aren't charged again.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 rounded-lg border px-4 py-3 text-sm tabular-nums">
              <dt className="text-muted-foreground">Cost</dt>
              <dd className="text-right font-medium">{credits(ask.cost)}</dd>
            </dl>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={ask.onConfirm}>Unlock for {credits(ask.cost)}</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
        {ask?.kind === "short" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Not enough credits</AlertDialogTitle>
              <AlertDialogDescription className="tabular-nums">
                This unlock needs {credits(ask.cost)}. You have {n(ask.balance)}. Top up, or select fewer companies.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Link href="/settings/billing">Top up credits</Link>
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
