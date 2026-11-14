"use client";

import { useSyncExternalStore } from "react";
import { WORKSPACE } from "@/lib/mock/workspace";

// The workspace credit balance for the session (mock). One store so every place that shows or spends credits agrees:
// the sidebar, screens that charge (Leads unlock) and Settings › Billing › Usage, which lists this
// session's entries on top of its seeded history. Starts from WORKSPACE.credits.balance and lives in module state, so
// it survives moving between screens and resets on reload.
// Backend: the balance and ledger come from the credits API; spending happens server-side in the charging route.

/** One movement of credits made in this session. `amount` is negative for a spend. */
export type CreditEntry = {
  id: string;
  at: string;
  /** Usage kinds as Billing › Usage names them ("unlock", "topup", "plan"…). */
  kind: string;
  /** Short description, e.g. "Unlocked 3 companies". */
  label: string;
  amount: number;
  /** What was paid, for purchases (e.g. "$90.00"). */
  price?: string;
};

type State = { balance: number; ledger: readonly CreditEntry[] };

let state: State = { balance: WORKSPACE.credits.balance, ledger: [] };
const SERVER_STATE: State = state;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());

export function useCreditBalance() {
  return useSyncExternalStore(subscribe, () => state.balance, () => SERVER_STATE.balance);
}

/** This session's entries, newest first. */
export function useCreditLedger() {
  return useSyncExternalStore(subscribe, () => state.ledger, () => SERVER_STATE.ledger);
}

export function readCreditBalance() {
  return state.balance;
}

let seq = 0;
function record(kind: string, label: string, amount: number, price?: string) {
  const entry: CreditEntry = { id: `session-${++seq}`, at: new Date().toISOString(), kind, label, amount, price };
  return [entry, ...state.ledger];
}

/** Add credits (a pack bought, a plan upgrade). */
export function addCredits(
  amount: number,
  entry: { kind: string; label: string; price?: string } = { kind: "topup", label: "Credits added" }
) {
  state = { balance: state.balance + amount, ledger: record(entry.kind, entry.label, amount, entry.price) };
  emit();
}

/** Take `amount` credits, all or nothing. Returns false (and changes nothing) when the balance is short. */
export function spendCredits(amount: number, entry: { kind: string; label: string } = { kind: "other", label: "Credits used" }) {
  if (amount > state.balance) return false;
  state = { balance: state.balance - amount, ledger: record(entry.kind, entry.label, -amount) };
  emit();
  return true;
}
