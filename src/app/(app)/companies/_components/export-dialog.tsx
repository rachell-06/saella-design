"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlertIcon, DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type Company, STATUSES, formatDate, isicLabel } from "@/lib/mock/companies";
import { spendCredits } from "@/lib/mock/credits";

// Export from Leads › Unlocked, after the live app's
// CompaniesExportButton.tsx + api/export/companies (#116):
// - One file, one row per company, the live columns: Company Name, Representative, Phone, Email, Status, Date Founded,
//   Main Industry, Tax Code, Address. Live writes .xlsx (ExcelJS); the mock writes CSV (no package), UTF-8 with BOM so
//   Excel opens Vietnamese names right.
// - At most 10,000 rows a call (live EXPORT_MAX_ROWS); the dialog asks how many, capped.
// - Cost (PRD-05 "Export a record": 1 credit, plus 1 to unlock if not unlocked yet): every row here is unlocked, so
//   1 credit a row. Priced before, all or nothing; short → say so and point to Billing (live 402).
// - Downloads at once, toast with the result; no "we'll notify you".
export const EXPORT_MAX_ROWS = 10_000;
const DEFAULT_ROWS = 1_000;

const n = (x: number) => x.toLocaleString("en-US");
const credits = (x: number) => `${n(x)} ${x === 1 ? "credit" : "credits"}`;

export function ExportDialog({
  rows,
  selection,
  balance,
  onOpenChange,
}: {
  /** The companies to export, in table order; null = closed. */
  rows: Company[] | null;
  /** True when `rows` is the user's selection (exported as is, no row count to choose). */
  selection: boolean;
  balance: number;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={rows !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {rows && <ExportForm rows={rows} selection={selection} balance={balance} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ExportForm({
  rows,
  selection,
  balance,
  onDone,
}: {
  rows: Company[];
  selection: boolean;
  balance: number;
  onDone: () => void;
}) {
  const cap = Math.min(rows.length, EXPORT_MAX_ROWS);
  const [draft, setDraft] = useState(String(Math.min(cap, DEFAULT_ROWS)));
  const parsed = Math.floor(Number(draft));
  const count = selection ? rows.length : Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, cap)) : 0;
  const invalid = !selection && (!Number.isFinite(parsed) || parsed < 1 || parsed > cap);
  const cost = count;
  const short = cost > balance;

  const run = () => {
    const picked = rows.slice(0, count);
    if (!spendCredits(cost, { kind: "export", label: `Exported ${n(picked.length)} ${picked.length === 1 ? "company" : "companies"}` })) return;
    download(picked);
    toast.success(`Exported ${n(picked.length)} ${picked.length === 1 ? "company" : "companies"}`, {
      description: `${n(balance - cost)} credits left`,
    });
    onDone();
  };

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid && !short && count > 0) run();
      }}
    >
      <DialogHeader>
        <DialogTitle>Export companies</DialogTitle>
        <DialogDescription>
          {selection
            ? `${n(rows.length)} selected ${rows.length === 1 ? "company" : "companies"}, one row each.`
            : "The current list, newest first, one row per company."}
        </DialogDescription>
      </DialogHeader>
      {!selection && (
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor="export-rows">How many companies</FieldLabel>
          <Input
            id="export-rows"
            type="number"
            inputMode="numeric"
            min={1}
            max={cap}
            step={100}
            value={draft}
            aria-invalid={invalid || undefined}
            onChange={(e) => setDraft(e.target.value)}
            className="tabular-nums"
          />
          <FieldDescription>
            {invalid ? `Enter 1 to ${n(cap)}.` : `Up to ${n(cap)}${cap === EXPORT_MAX_ROWS ? " per export" : ""}.`}
          </FieldDescription>
        </Field>
      )}
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 rounded-lg border px-4 py-3 text-sm tabular-nums">
        <dt className="text-muted-foreground">Cost</dt>
        <dd className="text-right font-medium">{credits(cost)}</dd>
      </dl>
      {short && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Not enough credits</AlertTitle>
          <AlertDescription>
            This export needs {credits(cost)}. You have {n(balance)}.{" "}
            <Link href="/settings/billing" className="underline underline-offset-3">
              Top up credits
            </Link>
          </AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={invalid || short || count === 0}>
          <DownloadIcon data-icon="inline-start" />
          Export for {credits(cost)}
        </Button>
      </DialogFooter>
    </form>
  );
}

const COLUMNS: [string, (c: Company) => string][] = [
  ["Company Name", (c) => c.name],
  ["Representative", (c) => c.representative ?? ""],
  ["Phone", (c) => c.phone ?? ""],
  ["Email", (c) => c.email ?? ""],
  ["Status", (c) => STATUSES.find((s) => s.value === c.status)?.label ?? c.status],
  ["Date Founded", (c) => formatDate(c.incorporatedOn)],
  ["Main Industry", (c) => isicLabel(c.isic)],
  ["Tax Code", (c) => c.registrationNo],
  ["Address", (c) => c.address],
];

function download(rows: Company[]) {
  const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [COLUMNS.map(([h]) => h), ...rows.map((c) => COLUMNS.map(([, get]) => get(c)))].map((r) => r.map(cell).join(","));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `unlocked-companies-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
