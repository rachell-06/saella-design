import { useSyncExternalStore } from "react";
import { WORKSPACE } from "@/lib/mock/workspace";

// What a credit costs in money, so screens that spend credits can also say it in dollars ("$0.54" reads more easily
// than "6 credits"). PRD-05 pack price a credit by plan, the same for
// every pack size (live app lib/credits/pricing.ts). Settings › Billing sells packs at these rates.

export type Tier = "free" | "starter" | "business" | "expansion" | "enterprise";

export const PACK_RATE: Record<Tier, number> = { free: 0.1, starter: 0.09, business: 0.08, expansion: 0.07, enterprise: 0.07 };

/** The workspace's plan as a tier ("Starter" → "starter") when the session starts. */
export const WORKSPACE_TIER = WORKSPACE.credits.plan.toLowerCase() as Tier;

// The plan for the session (mock): one value that Settings › Billing changes on a plan switch and every price reads
// (Billing's packs, the Top up dialog, "$" next to credit costs), so prices match after an upgrade.
// Resets on reload. Backend: the workspace's subscription tier.
let tier: Tier = WORKSPACE_TIER;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The plan tier now (outside React, or for a one-off price). */
export const readPlanTier = () => tier;

/** The plan tier, re-rendering when it changes. */
export function usePlanTier() {
  return useSyncExternalStore(subscribe, () => tier, () => WORKSPACE_TIER);
}

/** Switch the session's plan (Billing's Upgrade / Switch). */
export function setPlanTier(next: Tier) {
  tier = next;
  listeners.forEach((l) => l());
}

/** PRD-05 credit packs, smallest first (live app lib/credits/pricing.ts PACK_SIZES; nothing in between). Free can't buy
 *  5,000 (FREE_PACK_MAX 2,000). Shared by Settings › Billing and the Top up dialog. */
export const PACK_SIZES = [500, 1_000, 2_000, 5_000] as const;
const FREE_PACK_MAX = 2_000;
/** The packs a plan may buy (live app packsForTier). */
export const packsForTier = (tier: Tier): number[] => PACK_SIZES.filter((c) => tier !== "free" || c <= FREE_PACK_MAX);

/** "$0.54": credits at the workspace plan's pack price (the current plan unless one is given). */
export function creditsUsd(credits: number, plan: Tier = tier) {
  return (credits * PACK_RATE[plan]).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
