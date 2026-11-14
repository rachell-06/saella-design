"use client";

import { useSyncExternalStore } from "react";
import { spendCredits, useCreditBalance } from "@/lib/mock/credits";
import { type Company, companies } from "@/lib/mock/companies";

// Company unlocks for the workspace (PRD Contacts US-CON-U, AC-CON-U-01..03, CO-UNLOCK-001; PRD-05 "Unlock a
// company's contact details: 1 credit"; live app #116: api/companies/unlock + unlock/quote, useCompanyUnlock.tsx).
// - An unlock belongs to the workspace and lasts: every member sees the company in full from then on.
// - 1 credit per company not unlocked yet; already unlocked costs nothing. All or nothing: short of credits →
//   nothing is unlocked (live 402 insufficient_credits, "Needs X credits, you have Y").
// - Only a company with an email can be unlocked; its phone and website show too once unlocked.
// Mock: unlocked ids are kept for the session in module state, so they survive moving between screens. The balance
// is the shared credit store (lib/mock/credits.ts), so the sidebar drops with every unlock.
// Backend: GET /api/companies/unlock/quote?ids= for the confirm, POST /api/companies/unlock { company_ids } (≤500).

export const UNLOCK_COST = 1;
export const UNLOCK_MAX = 500;

/** Companies the demo workspace unlocked earlier: a few anywhere, so a mixed selection shows "already unlocked", and
 *  most Vietnamese hotels, restaurants, builders and traders with an email (the demo campaigns' targeting), so a batch
 *  to unlocked companies has a sensible audience while some matches stay locked. */
const DEMO_ISIC = new Set(["5510", "5610", "4100", "4330", "4649", "4663", "4752"]);
const SEEDED = companies
  .filter((c, i) => hasContact(c) && (i % 9 === 4 || (c.email && c.country === "VN" && DEMO_ISIC.has(c.isic) && i % 4 !== 0)))
  .map((c) => c.id);

let state = { unlocked: new Set<string>(SEEDED) as ReadonlySet<string> };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

export function useUnlocks() {
  const { unlocked } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { unlocked, balance: useCreditBalance() };
}

/** Unlockable: has an email (Saella sends email, so a company without one isn't worth a credit;
 *  phone-only or website-only don't count). Phone and website show in full once unlocked. */
export function hasContact(c: Company) {
  return Boolean(c.email);
}

/** What unlocking these would cost, like the live quote route: new ones are charged, unlocked ones are free. */
export function quoteUnlock(rows: Company[], unlocked: ReadonlySet<string>) {
  const lockable = rows.filter(hasContact);
  const fresh = lockable.filter((c) => !unlocked.has(c.id));
  return {
    /** Companies that will be unlocked now and charged. */
    fresh,
    cost: fresh.length * UNLOCK_COST,
    alreadyUnlocked: lockable.length - fresh.length,
    /** Nothing hidden: no email, phone or website in the registry. */
    nothingToUnlock: rows.length - lockable.length,
  };
}

/** Charge and reveal, all or nothing. Returns false when the balance is short (nothing changes). */
export function unlockCompanies(rows: Company[], balance: number) {
  const { fresh, cost } = quoteUnlock(rows, state.unlocked);
  if (cost > balance || !spendCredits(cost, { kind: "unlock", label: `Unlocked ${fresh.length} ${fresh.length === 1 ? "company" : "companies"}` })) return false;
  const unlocked = new Set(state.unlocked);
  fresh.forEach((c) => unlocked.add(c.id));
  state = { unlocked };
  listeners.forEach((l) => l());
  return true;
}
