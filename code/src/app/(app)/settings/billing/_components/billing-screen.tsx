"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlertIcon, CreditCardIcon, InfoIcon, LandmarkIcon } from "lucide-react";
import { WORKSPACE } from "@/lib/mock/workspace";
import { KpiStrip, KpiStripItem } from "@/components/saella/kpi-strip";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDay } from "../../_components/data";
import { SectionHeader } from "../../_components/section-header";
import { Item } from "@/components/ui/item";

// Settings → Billing (PRD-05 Billing & Credits, read 2026-10-28; live app app/dashboard/billing/BillingClient.tsx,
// lib/credits/pricing.ts). The module is IN PLANNING: pricing isn't final, credit charging is built but off
// (CREDITS_ENFORCED), so this page says so first and nothing here takes money.
// - One wallet per workspace: plan credits + bought packs; the balance is the sum of an append-only ledger.
// - Metered: agent turn 5 credits flat (refunded if the turn fails); contact unlock and export are planned.
//   Below 5 credits an agent turn is refused (402 insufficient_credits) once charging is on.
// - Packs 250–250,000 credits (Free plan max 2,500), never below $0.05 a credit; base $0.10, cheaper by volume
//   and plan. Presets from the live app. Stripe Checkout exists in test mode only; the Vietnam local gateway is
//   planned, not built. Plan prices are not in the PRD (old prices from a retired product brief were never confirmed), so
//   plans show credits a month only.
// Preview with ?state= loading | error | low (charging on, balance under 5) | empty-ledger
const PRESETS = [250, 1000, 2500, 5000, 10000];
const MIN = 250;
const MAX = 250_000;
const BASE_USD = 0.1;
const AGENT_TURN = 5;

// Monthly plan credits from the live app (lib/credits/pricing.ts TIER_CREDITS).
const PLANS = [
  { name: "Free", credits: "10" },
  { name: "Starter", credits: "600" },
  { name: "Business", credits: "2,500" },
  { name: "Expansion", credits: "12,000" },
  { name: "Enterprise", credits: "Custom" },
];

const LEDGER = [
  { at: "2026-10-01", type: "Grant", reason: "Pilot credits from Saella", credits: 1200 },
];

const n = (v: number) => v.toLocaleString("en-US");
// Volume bands at the base rate (live app RATE table, Free/base row is flat $0.10).
const priceAtBase = (credits: number) => Math.round(credits * BASE_USD * 100) / 100;

export function BillingScreen() {
  const preview = useSearchParams().get("state") ?? "";
  const loading = preview === "loading";
  const [loadError, setLoadError] = useState(preview === "error");
  const [pack, setPack] = useState("1000");
  const [custom, setCustom] = useState("");

  const chargingOn = preview === "low" ? true : WORKSPACE.credits.chargingOn;
  const balance = preview === "low" ? 3 : WORKSPACE.credits.balance;
  const ledger = preview === "empty-ledger" ? [] : LEDGER;

  const customN = Number(custom.replace(/[,\s]/g, ""));
  const customError =
    pack === "custom" && custom !== ""
      ? !Number.isInteger(customN) || customN < MIN || customN > MAX
        ? `Choose between ${n(MIN)} and ${n(MAX)} credits.`
        : null
      : null;
  const chosen = pack === "custom" ? (customError || !custom ? null : customN) : Number(pack);

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <span className="sr-only">Loading billing</span>
        <Skeleton className="h-14 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>
    );
  }
  if (loadError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Couldn&apos;t load your credits</AlertTitle>
        <AlertDescription>Your balance is safe. Check your connection and try again.</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => setLoadError(false)}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  return (
    <>
      {chargingOn ? (
        balance < AGENT_TURN && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Not enough credits for the agent</AlertTitle>
            <AlertDescription>
              Each agent turn needs {AGENT_TURN} credits and you have {balance}. Buy a pack to keep using the agent.
            </AlertDescription>
          </Alert>
        )
      ) : (
        <Alert variant="info">
          <InfoIcon />
          <AlertTitle>Billing is in planning</AlertTitle>
          <AlertDescription>
            Credits aren&apos;t charged yet: the agent, unlocks and exports run free and nothing is deducted. Prices
            below are drafts and may change before billing goes live.
          </AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="wallet-title">
        <SectionHeader id="wallet-title" title="Credits" description="One balance for the whole workspace." />
        {/* Studio pass 2026-10-28: the shared KpiStrip instead of a one-off grid, same as campaign detail. */}
        <KpiStrip className="rounded-card">
          <KpiStripItem label="Balance" value={n(balance)} note="credits" tone={chargingOn && balance < AGENT_TURN ? "danger" : undefined} />
          <KpiStripItem label="Plan credits a month" value={n(WORKSPACE.credits.monthlyGrant)} note="credits" />
          <KpiStripItem label="Agent turns left" value={n(Math.floor(balance / AGENT_TURN))} note={`at ${AGENT_TURN} credits a turn`} />
        </KpiStrip>
        <div className="rounded-card border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>What uses credits</TableHead>
                <TableHead className="w-40 text-right">Cost</TableHead>
                <TableHead className="w-40">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  Agent turn
                  <span className="block text-sm text-muted-foreground">Refunded if the turn fails.</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{AGENT_TURN} credits</TableCell>
                <TableCell>
                  <Badge variant="secondary">{chargingOn ? "Charged" : "Free for now"}</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Unlock a contact</TableCell>
                <TableCell className="text-right tabular-nums">1 credit</TableCell>
                <TableCell>
                  <Badge variant="info">Planned</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Export records</TableCell>
                <TableCell className="text-right text-muted-foreground">To be set</TableCell>
                <TableCell>
                  <Badge variant="info">Planned</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="buy-title">
        <SectionHeader
          id="buy-title"
          title="Buy a credit pack"
          description={`Base price $${BASE_USD.toFixed(2)} a credit. Bigger packs and higher plans cost less, never under $0.05.`}
        />
        <RadioGroup value={pack} onValueChange={setPack} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PRESETS.map((c) => (
            <PackOption key={c} value={String(c)} title={`${n(c)}`} description={`$${n(priceAtBase(c))}`} />
          ))}
          <PackOption value="custom" title="Custom" description={`${n(MIN)}–${n(MAX)}`} />
        </RadioGroup>
        {pack === "custom" && (
          <Field data-invalid={customError ? true : undefined} className="max-w-xs">
            <FieldLabel htmlFor="pack-custom">Credits</FieldLabel>
            <Input
              id="pack-custom"
              inputMode="numeric"
              placeholder="e.g. 7,500"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-invalid={customError ? true : undefined}
            />
            {customError ? (
              <FieldError>{customError}</FieldError>
            ) : (
              <FieldDescription>Free plan packs stop at 2,500 credits.</FieldDescription>
            )}
          </Field>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button disabled>
                  <CreditCardIcon data-icon="inline-start" />
                  {chosen ? `Buy ${n(chosen)} credits · $${n(priceAtBase(chosen))}` : "Buy credits"}
                </Button>
              </span>
            </TooltipTrigger>
            {/* The banner above says billing isn't live; the tooltip only explains the disabled button. */}
            <TooltipContent>Checkout isn&apos;t open yet.</TooltipContent>
          </Tooltip>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="pay-title">
        <SectionHeader id="pay-title" title="How you'll pay" />
        <ul className="flex flex-col divide-y rounded-card border">
          <li className="flex flex-wrap items-center gap-3 px-4 py-3">
            <CreditCardIcon className="size-4 text-muted-foreground" aria-hidden />
            <span className="flex flex-col">
              <span className="font-medium">Card, through Stripe</span>
              <span className="text-sm text-muted-foreground">Built and tested with test cards; not live.</span>
            </span>
            <Badge variant="secondary" className="ml-auto">
              Test mode
            </Badge>
          </li>
          <li className="flex flex-wrap items-center gap-3 px-4 py-3">
            <LandmarkIcon className="size-4 text-muted-foreground" aria-hidden />
            <span className="flex flex-col">
              <span className="font-medium">Vietnam local payment gateway</span>
              <span className="text-sm text-muted-foreground">Bank transfer and local wallets.</span>
            </span>
            <Badge variant="info" className="ml-auto">
              Planned
            </Badge>
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="plans-title">
        <SectionHeader
          id="plans-title"
          title="Plans"
          description="Each plan adds credits every month."
        />
        {/* Studio pass 2026-10-28: a KPI strip of credits a month. The old five cards repeated "Price to be
            confirmed" in every cell and wrapped "600 credits a month" over two lines; the header already says it. */}
        <KpiStrip className="rounded-card">
          {PLANS.map((p) => (
            <KpiStripItem
              key={p.name}
              label={p.name}
              value={p.credits}
              note={p.credits === "Custom" ? "contract" : "credits a month"}
            />
          ))}
        </KpiStrip>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="ledger-title">
        <SectionHeader id="ledger-title" title="Recent activity" />
        {ledger.length === 0 ? (
          <Item variant="outline" className="block rounded-card px-4 py-3 text-muted-foreground text-[length:inherit]" asChild><p>
            No transactions yet. Grants, purchases and charges show here.
          </p></Item>
        ) : (
          <div className="rounded-card border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">When</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-32 text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((l) => (
                  <TableRow key={l.at + l.reason}>
                    <TableCell className="tabular-nums">{formatDay(l.at, true)}</TableCell>
                    <TableCell>{l.type}</TableCell>
                    <TableCell className="text-muted-foreground">{l.reason}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.credits > 0 ? "+" : ""}
                      {n(l.credits)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  );
}

function PackOption({ value, title, description }: { value: string; title: string; description: string }) {
  return (
    <FieldLabel htmlFor={`pack-${value}`}>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle className="tabular-nums">{title}</FieldTitle>
          <FieldDescription className="tabular-nums">{description}</FieldDescription>
        </FieldContent>
        <RadioGroupItem value={value} id={`pack-${value}`} />
      </Field>
    </FieldLabel>
  );
}
