"use client";

import { useSyncExternalStore } from "react";
import { WORKSPACE } from "@/lib/mock/workspace";

// The workspace credit balance for the session (mock). One store so every place that shows or spends credits agrees:
// the sidebar, screens that charge (Leads unlock, PATTERNS 9.18) and Settings › Billing › Usage, which lists this
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

/** `cycleTotal`: credits available this cycle (plan grant + carried over + packs bought since the grant). */
type State = { balance: number; cycleTotal: number; ledger: readonly CreditEntry[] };

const SERVER_STATE: State = { balance: WORKSPACE.credits.balance, cycleTotal: WORKSPACE.credits.cycleTotal, ledger: [] };
/** Preview: `?credits=<n>` on the first page load starts the session with that balance (e.g. 0 to try "Not enough
 *  credits" in the agent panel). The server and hydration render the seeded balance; the client switches after. */
function previewBalance() {
  if (typeof window === "undefined") return undefined;
  const v = new URLSearchParams(window.location.search).get("credits");
  return v !== null && /^\d+$/.test(v) ? Number(v) : undefined;
}
let state: State = { ...SERVER_STATE, balance: previewBalance() ?? SERVER_STATE.balance };
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

/** Running low: under 20% of this cycle's credits. One rule for every place that warns: the
 *  sidebar credits block and Settings › Billing. */
export const LOW_SHARE = 0.2;

/** What is left of this cycle as a share (0–1, for the sidebar ring) and whether that is running low. */
export function creditStanding(balance: number, cycleTotal: number) {
  const share = cycleTotal > 0 ? Math.min(1, Math.max(0, balance / cycleTotal)) : 0;
  return { share, low: share < LOW_SHARE };
}

/** Balance, cycle total, share left and the low flag, live. */
export function useCreditStanding() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  return { balance: s.balance, cycleTotal: s.cycleTotal, ...creditStanding(s.balance, s.cycleTotal) };
}

let seq = 0;
function record(kind: string, label: string, amount: number, price?: string) {
  const entry: CreditEntry = { id: `session-${++seq}`, at: new Date().toISOString(), kind, label, amount, price };
  return [entry, ...state.ledger];
}

/** Add credits (a pack bought, a plan upgrade, or `kind: "refund"` for a charge given back). */
export function addCredits(
  amount: number,
  entry: { kind: string; label: string; price?: string } = { kind: "topup", label: "Credits added" }
) {
  // Bought and granted credits join this cycle's total, so the share left never passes 100%. A refund only gives back
  // what was spent from it, so the total stays.
  state = {
    balance: state.balance + amount,
    cycleTotal: entry.kind === "refund" ? state.cycleTotal : state.cycleTotal + amount,
    ledger: record(entry.kind, entry.label, amount, entry.price),
  };
  emit();
}

/** Take `amount` credits, all or nothing. Returns false (and changes nothing) when the balance is short. */
export function spendCredits(amount: number, entry: { kind: string; label: string } = { kind: "other", label: "Credits used" }) {
  if (amount > state.balance) return false;
  state = { ...state, balance: state.balance - amount, ledger: record(entry.kind, entry.label, -amount) };
  emit();
  return true;
}
