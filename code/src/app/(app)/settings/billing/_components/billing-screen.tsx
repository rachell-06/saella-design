"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlertIcon, CreditCardIcon, ExternalLinkIcon, InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { addCredits, creditStanding, useCreditStanding } from "@/lib/mock/credits";
import { setPlanTier, usePlanTier } from "@/lib/mock/pricing";
import { TopUpDialog } from "@/components/features/top-up-dialog";
import { WORKSPACE, members as WORKSPACE_MEMBERS } from "@/lib/mock/workspace";
import { Hint } from "@/components/saella/hint";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Item } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog, type ConfirmRequest } from "../../_components/confirm-dialog";
import {
  CREDIT_COST,
  PLANS,
  type Tier,
  formatDay,
  packPrice,
  packsForTier,
} from "../../_components/data";
import { InfoTip, SectionHeader } from "../../_components/section-header";
import { type UsageRow, UsageTab } from "./usage-tab";

// Settings → Billing (PRD-05 Billing & Credits; live app app/dashboard/billing/BillingClient.tsx, lib/credits/plans.ts,
// pricing.ts, meter.ts, api/billing/subscribe + portal, api/credits/checkout).
// Two tabs: Plans & credits (plans, packs, How you'll pay) and Usage (the ledger with period and filters;
// usage-tab.tsx).
// - Plans: Free, Starter $25 / 600, Business $50 / 2,500, Expansion $100 / 12,000 credits a month. Only the admin
//   changes the plan (live app bill.plans.adminonly). Plan credits roll over while subscribed.
// - Payment: Saella stores no card. Cards, invoices, plan switch and cancel live in Stripe's hosted Billing Portal (live app
//   POST /api/billing/portal, admin only; PRD Master: "Credit wallet, plans, Stripe and a local payment gateway").
// - Packs: PRD-05 500 / 1,000 / 2,000 / 5,000 (Free up to 2,000), one price a credit per plan ($0.09 on Starter),
//   so no "Save x%" unless the per-credit price really drops. Bought credits never expire. Bought through the shared
//   Top up dialog, the same one the sidebar and "Not enough credits" open. Any signed-in member buys (PRD-05
//   BILL-SEQ-003: checkout needs only a signed-in user; the live app limits it to the admin, #168); plan changes and
//   the Stripe portal stay admin-only.
// - The plan is the session's plan tier (usePlanTier), so the Top up dialog prices at the plan just switched to.
// - Running low: the shared rule (under 20% of this cycle, creditStanding), the same as the sidebar.
// - 1 credit each: unlock a company, export a record, a billable agent action (PATTERNS 9.18); failed prompts are refunded.
// - The ledger is append-only; the live app's Usage tab lists a chosen period, 50 rows a page.
// Preview with ?state= loading | error | low | member | empty-ledger | cancelled
const LEDGER: UsageRow[] = [
  { at: "2026-10-26T09:10:00Z", what: "Agent actions", kind: "agent", who: "Linh Tran", credits: -18, status: "Completed" },
  { at: "2026-10-25T08:00:00Z", what: "Exported 25 records", kind: "export", who: "An Vo", credits: -25, status: "Completed" },
  { at: "2026-10-24T03:30:00Z", what: "Unlocked 12 companies", kind: "unlock", who: "Minh Pham", credits: -12, status: "Completed" },
  { at: "2026-10-23T05:15:00Z", what: "Unlocked 5 companies", kind: "unlock", who: "Linh Tran", credits: -5, status: "Completed" },
  { at: "2026-10-22T07:45:00Z", what: "Agent prompt failed", kind: "refund", who: "Linh Tran", credits: 1, status: "Refunded" },
  { at: "2026-10-21T04:20:00Z", what: "Agent actions", kind: "agent", who: "Minh Pham", credits: -9, status: "Completed" },
  { at: "2026-10-20T02:05:00Z", what: "Credit pack · 1,000 credits", kind: "topup", who: "Linh Tran", credits: 1000, amount: 90, status: "Completed" },
  { at: "2026-10-18T08:20:00Z", what: "Exported 40 records", kind: "export", who: "Linh Tran", credits: -40, status: "Completed" },
  { at: "2026-10-15T04:00:00Z", what: "Credit pack · 500 credits", kind: "topup", who: "Linh Tran", credits: null, amount: 45, status: "Failed" },
  { at: "2026-10-12T00:00:00Z", what: "Starter plan · monthly credits", kind: "plan", who: null, credits: 600, amount: 25, status: "Completed" },
  { at: "2026-10-01T02:00:00Z", what: "Welcome credits from Saella", kind: "welcome", who: null, credits: 200, status: "Completed" },
];

const n = (v: number) => v.toLocaleString("en-US");
const rate = (tier: Tier) => `$${(packPrice(tier, 1_000) / 1_000).toFixed(2)} per credit`;
/** Stripe Billing Portal (mock link; live app creates a session per workspace). */
const STRIPE_PORTAL = "https://billing.stripe.com/";
const RANK: Tier[] = ["free", "starter", "business", "expansion"];
const ADMIN_NAME = WORKSPACE_MEMBERS.find((m) => m.role === "admin")?.name;
/** Locked-for-members hint, naming who can do it (PATTERNS 9.12). */
const adminOnly = (what: string) => (ADMIN_NAME ? `Only ${ADMIN_NAME} (admin) can ${what}.` : `Only the admin can ${what}.`);

export function BillingScreen() {
  const params = useSearchParams();
  const preview = params.get("state") ?? "";
  const [loading, setLoading] = useState(preview === "loading");
  const [loadError, setLoadError] = useState(preview === "error");
  const isAdmin = preview !== "member";
  const tier = usePlanTier();
  // Session balance from the shared store, so the sidebar and Leads agree.
  const stored = useCreditStanding();
  const balance = preview === "low" ? 3 : stored.balance;
  const low = preview === "low" ? creditStanding(balance, stored.cycleTotal).low : stored.low;
  const ledger = preview === "empty-ledger" ? [] : LEDGER;
  const [tab, setTab] = useState(params.get("tab") === "usage" ? "usage" : "plans");
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [topUp, setTopUp] = useState(false);

  const plan = PLANS.find((p) => p.tier === tier) ?? PLANS[0];
  const packs = packsForTier(tier);
  const packRange = `${n(packs[0])} to ${n(packs[packs.length - 1])}`;

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <span className="sr-only">Loading billing</span>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>
    );
  }
  if (loadError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Couldn&apos;t load billing</AlertTitle>
        <AlertDescription>Your balance is safe. Check your connection and try again.</AlertDescription>
        <AlertAction>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoadError(false);
              setLoading(true);
              setTimeout(() => setLoading(false), 700);
            }}
          >
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  function changePlan(to: (typeof PLANS)[number]) {
    const up = RANK.indexOf(to.tier) > RANK.indexOf(tier);
    setConfirm({
      title: `${up ? "Upgrade" : "Switch"} to ${to.name}?`,
      description: up
        ? `${to.price} a month through Stripe, starting today. You get ${n(to.credits ?? 0)} credits now and every month.`
        : `From your next renewal, ${to.credits ? `${n(to.credits)} credits a month` : "no monthly credits"}. Credits you have stay.`,
      confirmLabel: up ? `Upgrade to ${to.name}` : `Switch to ${to.name}`,
      onConfirm: () => {
        setPlanTier(to.tier);
        if (up && to.credits) addCredits(to.credits ?? 0, { kind: "plan", label: `Upgraded to ${to.name}`, price: to.price });
        toast.success(`You're on ${to.name}`, { description: up ? "Your new credits are in your balance." : undefined });
      },
    });
  }

  return (
    <>
      {preview === "cancelled" && (
        <Alert variant="info">
          <InfoIcon />
          <AlertTitle>Payment cancelled</AlertTitle>
          <AlertDescription>No credits were added and nothing was charged.</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Billing sections">
          <TabsTrigger value="plans">Plans &amp; credits</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "usage" ? (
        <UsageTab
          rows={ledger}
          isAdmin={isAdmin}
          members={WORKSPACE_MEMBERS.filter((m) => m.status === "active").map((m) => m.name)}
          onTopUp={() => setTopUp(true)}
        />
      ) : (
        <>
      {/* 1 · Plans & credits. The tab already names it, so no section title: the balance line leads. */}
      <section className="flex flex-col gap-4" aria-label="Plans and credits">
        {low && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>You&apos;re running low on credits</AlertTitle>
            <AlertDescription>
              Top up now, or wait for +{n(WORKSPACE.credits.monthlyGrant)} on {formatDay(WORKSPACE.credits.renewsOn)}.
            </AlertDescription>
            <AlertAction>
              {/* While low, Top up is the page's one solid button (DESIGN §2), not the next plan's Upgrade. */}
              <Button size="sm" onClick={() => setTopUp(true)}>
                Top up credits
              </Button>
            </AlertAction>
          </Alert>
        )}
        <div className="flex items-center gap-1">
          <p className="text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">{n(balance)}</span> credits left · {plan.name} renews{" "}
            {formatDay(WORKSPACE.credits.renewsOn)}
          </p>
          <InfoTip label="What credits pay for">
            <ul className="flex list-disc flex-col gap-0.5 pl-4">
              <li>Unlock a company: {CREDIT_COST.unlock} credit</li>
              <li>Export a record: {CREDIT_COST.exportPerRecord} credit</li>
              <li>Agent action: {CREDIT_COST.agentAction} credit, refunded if it fails</li>
            </ul>
          </InfoTip>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const current = p.tier === tier;
            const up = RANK.indexOf(p.tier) > RANK.indexOf(tier);
            // The one solid button on the page: the next plan up, unless credits are low (then Top up is).
            const primary = !low && RANK.indexOf(p.tier) === RANK.indexOf(tier) + 1;
            return (
              <Card key={p.tier} size="sm" className={current ? "ring-2 ring-primary" : undefined}>
                <div className="flex flex-col gap-3 px-(--card-spacing)">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.name}</span>
                    {current && <Badge variant="brand">Current plan</Badge>}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="tabular-nums">
                      <span className="font-heading text-2xl font-medium tracking-title">{p.price}</span>
                      <span className="text-muted-foreground"> / month</span>
                    </span>
                    <span className="text-sm text-muted-foreground tabular-nums">{n(p.credits ?? 0)} credits a month</span>
                  </div>
                  {/* The current plan is marked once (ring + badge); no disabled "Your plan" button. */}
                  {!current && (
                    <Hint label={isAdmin ? undefined : adminOnly("change the plan")}>
                      <span tabIndex={isAdmin ? undefined : 0} className="flex">
                        <Button
                          className="flex-1"
                          variant={primary ? "default" : "outline"}
                          disabled={!isAdmin}
                          onClick={() => changePlan(p)}
                        >
                          {up ? "Upgrade" : "Switch"}
                        </Button>
                      </span>
                    </Hint>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Packs are bought in the shared Top up dialog: one way to buy everywhere. */}
        <Item variant="outline" className="justify-between gap-3 rounded-card px-4 py-3 text-base">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-heading text-base font-medium">Credit packs</h3>
            <p className="text-muted-foreground tabular-nums">
              Packs of {packRange} credits. One-time, never expire. {rate(tier)}.
            </p>
          </div>
          {/* Any signed-in member buys packs (PRD-05 BILL-SEQ-003); plans stay admin-only. */}
          <Button variant="outline" onClick={() => setTopUp(true)}>
            Top up credits
          </Button>
        </Item>
      </section>

      {/* 2 · Payment: Stripe hosted (live app: POST /api/billing/portal -> Stripe Billing Portal; admin only) */}
      <section className="flex flex-col gap-4" aria-labelledby="pay-title">
        <SectionHeader id="pay-title" title="How you'll pay" />
        <Item variant="outline" className="justify-between gap-3 rounded-card px-4 py-3 text-base">
          <div className="flex items-center gap-3">
            <CreditCardIcon className="size-4 text-muted-foreground" aria-hidden />
            <div className="flex flex-col">
              <span className="font-medium">Cards and invoices</span>
              <span className="text-sm text-muted-foreground">
                Managed securely by Stripe. Bank transfer and e-wallets (Vietnam) are picked at checkout.
              </span>
            </div>
          </div>
          <Hint label={isAdmin ? undefined : adminOnly("manage billing")}>
            <span tabIndex={isAdmin ? undefined : 0} className="flex">
              <Button variant="outline" disabled={!isAdmin} asChild={isAdmin}>
                {isAdmin ? (
                  <a href={STRIPE_PORTAL} target="_blank" rel="noopener noreferrer">
                    Manage in Stripe
                    <ExternalLinkIcon data-icon="inline-end" />
                  </a>
                ) : (
                  <span>
                    Manage in Stripe
                    <ExternalLinkIcon data-icon="inline-end" />
                  </span>
                )}
              </Button>
            </span>
          </Hint>
        </Item>
      </section>
        </>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
      <TopUpDialog open={topUp} onOpenChange={setTopUp} />
    </>
  );
}
