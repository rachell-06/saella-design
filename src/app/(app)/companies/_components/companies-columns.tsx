"use client";

import { LockIcon } from "lucide-react";
import { type DataTableColumn } from "@/components/saella/data-table";
import { Hint } from "@/components/saella/hint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { type Company, STATUSES, countryLabel, formatDate, isicLabel, maskEmail, maskPhone } from "@/lib/mock/companies";

// Columns of the companies table: checkbox, one-line cells, a status badge, a "…" row menu in the last column.
// Saella data rules: status shows only when the company is not active; the email shows masked until
// unlocked (PRD Contacts AC-CON-B-02), phone and website masked in the sheet (one contact column keeps the table
// within the page). Sortable like the live app's table (CompaniesTable.tsx sorters): name, tax code, industry,
// founding date, email; default newest first. Tax code is its own column like the live app: users tell
// look-alike companies apart and match paperwork by it.

const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label])) as Record<Company["status"], string>;
// Every row shows its status as a status badge: outlined pill, tinted
// fill, dot + word, in Saella's -soft tokens.
const STATUS_TONE: Record<Company["status"], { pill: string; dot: string }> = {
  active: { pill: "border-success/20 bg-success-soft text-success-soft-foreground", dot: "bg-success" },
  inactive: { pill: "border-warning/20 bg-warning-soft text-warning-soft-foreground", dot: "bg-warning" },
  suspended: { pill: "border-warning/20 bg-warning-soft text-warning-soft-foreground", dot: "bg-warning" },
  ceased: { pill: "border-destructive/20 bg-destructive-soft text-destructive-soft-foreground", dot: "bg-destructive" },
  unknown: { pill: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

// City-states read once: "Singapore", not "Singapore, Singapore".
const location = (c: Company) => (c.city === countryLabel(c.country) ? c.city : `${c.city}, ${countryLabel(c.country)}`);

export function createCompaniesColumns({
  unlocked,
  onOpen,
  onUnlock,
  selectable,
}: {
  /** Companies the workspace has unlocked: their contact shows in full. */
  unlocked: ReadonlySet<string>;
  onOpen: (c: Company) => void;
  /** Unlocks this one company (1 credit). */
  onUnlock: (c: Company) => void;
  /** Checkbox column (both tabs Unlock on Find companies, Export on Unlocked ). */
  selectable: boolean;
}): DataTableColumn<Company>[] {
  const columns: DataTableColumn<Company>[] = [
    {
      id: "select",
      enableSorting: false,
      header: ({ table }) =>
        table.getRowModel().rows.length > 0 && (
          <Checkbox
            aria-label="Select all companies on this page"
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
          />
        ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${row.original.name}`}
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(v === true)}
        />
      ),
    },
    {
      id: "name",
      header: "Company",
      accessorFn: (c) => c.name,
      // Two lines: the name, then where it is. Location stays off its own column so the table fits.
      cell: ({ row: { original: c } }) => (
        <div className="flex min-w-0 max-w-48 flex-col gap-0.5">
          <Button
            variant="link"
            className="h-auto max-w-full justify-start border-0 p-0 font-medium text-foreground hover:no-underline"
            onClick={() => onOpen(c)}
          >
            <span className="truncate">{c.name}</span>
          </Button>
          <span className="truncate text-sm text-muted-foreground">{location(c)}</span>
        </div>
      ),
    },
    {
      id: "taxCode",
      header: "Tax code",
      accessorFn: (c) => c.registrationNo,
      cell: ({ row: { original: c } }) => <span className="tabular-nums">{c.registrationNo}</span>,
    },
    {
      // Main industry, then the count of other registered business lines (live app "Sub industries" column)
      // as "+27"; the names show on hover or focus. Folded into this column so the table fits the page.
      id: "industry",
      header: "Industry",
      accessorFn: (c) => isicLabel(c.isic),
      cell: ({ row: { original: c } }) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="block max-w-36 truncate" title={isicLabel(c.isic)}>
            {isicLabel(c.isic)}
          </span>
          {c.subIndustries.length > 0 && (
            <HoverCard openDelay={150} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Badge
                  variant="outline"
                  tabIndex={0}
                  data-no-row-click
                  className="shrink-0 cursor-default tabular-nums"
                  aria-label={`${c.subIndustries.length} other industries`}
                >
                  +{c.subIndustries.length}
                </Badge>
              </HoverCardTrigger>
              <HoverCardContent side="bottom" align="start" className="max-h-80 w-72 overflow-y-auto p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Other industries</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {c.subIndustries.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      accessorFn: (c) => STATUS_LABEL[c.status],
      cell: ({ row: { original: c } }) => (
        <Badge variant="outline" className={cn("gap-1.5 px-2", STATUS_TONE[c.status].pill)}>
          <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_TONE[c.status].dot)} />
          {STATUS_LABEL[c.status]}
        </Badge>
      ),
    },
    {
      id: "founded",
      header: "Founded",
      accessorFn: (c) => c.incorporatedOn,
      cell: ({ row: { original: c } }) => <span className="tabular-nums">{formatDate(c.incorporatedOn)}</span>,
    },
    {
      // Masked as the registry serves it (AC-CON-B-02, BR-RULE-CON-01): it shows the record has an address
      // without giving it away, with a lock that unlocks the company for 1 credit in one click (live app #116
      // lockButton). Unlocked: the full address in body colour. Blank when the registry has none.
      id: "email",
      header: "Email",
      accessorFn: (c) => c.email ?? "",
      cell: ({ row: { original: c } }) =>
        c.email && (
          <ContactCell
            value={c.email}
            masked={maskEmail(c.email)}
            isUnlocked={unlocked.has(c.id)}
            name={c.name}
            onUnlock={() => onUnlock(c)}
            width="max-w-32"
          />
        ),
    },
    {
      // One lock per row: on Email, or here when the company has no email.
      // Same as Email. Masked like the live app's lib/companies/mask.ts maskPhone:
      // "+" and the first 2 digits, 5 stars, the last 2 digits ("+84*****67").
      id: "phone",
      header: "Phone",
      accessorFn: (c) => c.phone ?? "",
      cell: ({ row: { original: c } }) =>
        c.phone && (
          <ContactCell
            value={c.phone}
            masked={maskPhone(c.phone)}
            isUnlocked={unlocked.has(c.id)}
            name={c.name}
            onUnlock={c.email ? undefined : () => onUnlock(c)}
            width="max-w-32"
          />
        ),
    },
  ];
  // No row "…" menu: the row click opens the sheet and unlock is the row's lock or the sheet's button.
  return selectable ? columns : columns.filter((col) => col.id !== "select");
}

/** A contact value: masked with a lock (1 credit, one click) until the workspace unlocks the company, then in
 *  full. Cut text keeps title=. */
function ContactCell({
  value,
  masked,
  isUnlocked,
  name,
  onUnlock,
  width,
}: {
  value: string;
  masked: string;
  isUnlocked: boolean;
  name: string;
  /** No button when another cell of the row already has the lock. */
  onUnlock?: () => void;
  /** max-w-* of the text; the lock adds 1.5rem. */
  width: string;
}) {
  if (isUnlocked)
    return (
      <span className={cn("block truncate tabular-nums", width)} title={value}>
        {value}
      </span>
    );
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className={cn("block truncate text-muted-foreground tabular-nums", width)} title={masked}>
        {masked}
      </span>
      {onUnlock && (
        <Hint label="Unlock for 1 credit">
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-primary-soft-foreground hover:text-primary-soft-foreground"
            aria-label={`Unlock ${name} for 1 credit`}
            onClick={onUnlock}
          >
            <LockIcon />
          </Button>
        </Hint>
      )}
    </div>
  );
}
