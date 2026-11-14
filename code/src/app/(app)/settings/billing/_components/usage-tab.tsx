"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Item } from "@/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WINDOWS, resolveSpan, type WindowKey } from "@/lib/period";
import { PeriodPicker } from "@/components/saella/period-picker";
import { TODAY } from "@/lib/mock/constants";
import { useCreditLedger } from "@/lib/mock/credits";
import { cn } from "@/lib/utils";
import { formatDay } from "../../_components/data";

// Billing › Usage (PRD-05; live app app/dashboard/billing/UsageTab.tsx + api/credits/usage, Repo origin/development 2026-11-12):
// who spent the workspace's credits and on what, merged with the old Recent activity so the ledger is one table.
// - Live app: period picker, action filter, member filter (admin only), summary Used / Added / by action, table with
//   date, member (admin only), what, credits. A member sees only their own spending; plan grants and purchases with no
//   member are the admin's. No balance-after column in the live app, so none here.
// - Credits used/added are flows over the period, not a balance; the remaining balance stays in the sidebar and on
//   Plans & credits (no X/Y of a total, PATTERNS 9.7). Status column and amounts come from the old Recent activity.
// - This session's movements (Leads unlocks, packs bought, plan upgrades) come from the shared credit store
//   (useCreditLedger) and sit on top of the seeded history; they follow the same period, filters and summary.

export type UsageKind = "agent" | "unlock" | "export" | "plan" | "topup" | "refund" | "welcome" | "other";
export type UsageRow = {
  at: string;
  what: string;
  kind: UsageKind;
  /** Member who did it; null for plan grants and gifts (the admin's to see). */
  who: string | null;
  credits: number | null;
  amount?: number;
  /** Price text from this session's purchase (the store keeps it as a string). */
  price?: string;
  status: "Completed" | "Refunded" | "Failed";
};

const KIND_LABEL: Record<UsageKind, string> = {
  agent: "Agent actions",
  unlock: "Unlocks",
  export: "Exports",
  plan: "Monthly credits",
  topup: "Top-ups",
  refund: "Refunds",
  welcome: "Gifts",
  other: "Other",
};
const KINDS = Object.keys(KIND_LABEL) as UsageKind[];
const STATUS_VARIANT: Record<UsageRow["status"], "success" | "secondary" | "destructive"> = {
  Completed: "success",
  Refunded: "secondary",
  Failed: "destructive",
};
const SHOWN = 8;
/** The signed-in user in the mock; a non-admin sees only their own rows. */
const ME = "Linh Tran";
const PRESETS = WINDOWS.filter((w) => w.value !== "range");

const n = (v: number) => v.toLocaleString("en-US");
const usd = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function UsageTab({ rows: seeded, isAdmin, members }: { rows: UsageRow[]; isAdmin: boolean; members: string[] }) {
  // Session entries are stamped with the mock clock's today so the period picker (fixed "today") includes them.
  const session = useCreditLedger();
  const rows: UsageRow[] = [
    ...session.map((e): UsageRow => ({
      at: `${TODAY}T${e.at.slice(11)}`,
      what: e.label,
      kind: e.kind in KIND_LABEL ? (e.kind as UsageKind) : "other",
      who: ME,
      credits: e.amount,
      price: e.price,
      status: "Completed",
    })),
    ...seeded,
  ];
  const [win, setWin] = useState<WindowKey>("30");
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [kind, setKind] = useState<"all" | UsageKind>("all");
  const [member, setMember] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const span = win === "range" && range ? resolveSpan("range", range.from, range.to) : resolveSpan(win === "range" ? "30" : win);
  const since = new Date(span.since).getTime();
  const until = new Date(span.until).getTime();

  // A member sees only their own rows (live app); the admin sees everyone's and can narrow to one member.
  const inPeriod = rows.filter((r) => {
    const t = new Date(r.at).getTime();
    return t >= since && t <= until && (isAdmin || r.who === ME);
  });
  const used = inPeriod.reduce((s, r) => s + (r.credits && r.credits < 0 ? -r.credits : 0), 0);
  const added = inPeriod.reduce((s, r) => s + (r.credits && r.credits > 0 && r.status !== "Failed" ? r.credits : 0), 0);
  const byKind = new Map<UsageKind, number>();
  for (const r of inPeriod) if (r.credits && r.credits < 0) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) - r.credits);
  const top = [...byKind.entries()].sort((a, b) => b[1] - a[1])[0];

  const list = inPeriod.filter(
    (r) => (kind === "all" || r.kind === kind) && (member === "all" || (member === "none" ? r.who === null : r.who === member))
  );
  const visible = showAll ? list : list.slice(0, SHOWN);
  const filtered = kind !== "all" || member !== "all";

  return (
    <section className="flex flex-col gap-4" aria-label="Usage">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <SelectTrigger className="w-44" aria-label="Action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={member} onValueChange={setMember}>
            <SelectTrigger className="w-44" aria-label="Member">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
              <SelectItem value="none">Saella (grants)</SelectItem>
            </SelectContent>
          </Select>
        )}
        <PeriodPicker
          presets={PRESETS}
          value={win}
          from={range?.from}
          to={range?.to}
          label={win === "range" ? span.label : (WINDOWS.find((w) => w.value === win)?.label ?? "Last 30 days")}
          today={TODAY}
          className="ml-auto w-44"
          onPreset={(v) => setWin(v as WindowKey)}
          onRange={(from, to) => {
            setRange({ from, to });
            setWin("range");
          }}
        />
      </div>

      <dl className="grid grid-cols-3 divide-x rounded-card border">
        <Stat label="Credits used" value={n(used)} tone="out" />
        <Stat label="Credits added" value={n(added)} tone="in" />
        <Stat label="Most used on" value={top ? KIND_LABEL[top[0]] : "–"} note={top ? `${n(top[1])} credits` : undefined} small />
      </dl>

      {list.length === 0 ? (
        <Item variant="outline" className="block rounded-card px-4 py-3 text-muted-foreground text-[length:inherit]" asChild>
          <p>
            {rows.length === 0
              ? "No activity yet. Purchases, monthly credits and usage show here."
              : filtered
                ? "Nothing matches these filters in this period."
                : "No activity in this period."}
          </p>
        </Item>
      ) : (
        <div className="rounded-card border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Date</TableHead>
                <TableHead>What</TableHead>
                {isAdmin && <TableHead className="w-36">Member</TableHead>}
                <TableHead className="w-24">Credits</TableHead>
                <TableHead className="w-24">Amount</TableHead>
                <TableHead className="w-32">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.at + r.what}>
                  <TableCell className="tabular-nums">{formatDay(r.at)}</TableCell>
                  <TableCell>{r.what}</TableCell>
                  {isAdmin && <TableCell>{r.who ?? ""}</TableCell>}
                  <TableCell
                    className={cn(
                      "tabular-nums",
                      r.credits !== null && (r.credits > 0 ? "text-success-soft-foreground" : "text-destructive-soft-foreground")
                    )}
                  >
                    {r.credits === null ? "" : `${r.credits > 0 ? "+" : "−"}${n(Math.abs(r.credits))}`}
                  </TableCell>
                  <TableCell className="tabular-nums">{r.price ?? (r.amount === undefined ? "" : usd(r.amount))}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {list.length > SHOWN && (
            <div className="flex justify-center border-t py-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAll((s) => !s)}>
                {showAll ? "Show less" : `View all ${list.length}`}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, note, small, tone }: { label: string; value: string; note?: string; small?: boolean; tone?: "in" | "out" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex flex-col gap-1.5">
        <span
          className={cn(
            "leading-none font-medium tracking-display tabular-nums",
            small ? "text-lg" : "text-2xl",
            tone === "in" && "text-success-soft-foreground",
            tone === "out" && "text-destructive-soft-foreground"
          )}
        >
          {value}
        </span>
        <span className="text-sm text-muted-foreground">{note ?? " "}</span>
      </dd>
    </div>
  );
}
