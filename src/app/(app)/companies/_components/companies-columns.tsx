"use client";

import { SCROLL_POPOVER_LIST } from "@/lib/scroll";
import { LockIcon } from "lucide-react";
import { type DataTableColumn } from "@/components/saella/data-table";
import { Hint } from "@/components/saella/hint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { type Company, STATUSES, countryLabel, formatDate, isicLabel, maskEmail, maskPhone } from "@/lib/mock/companies";

// Columns of the companies table, laid out like Studio Admin /dashboard/products (products-columns.tsx): checkbox,
// one-line cells, a status badge on every row (DESIGN §2 exception for this table). Email and phone show masked until
// unlocked (PRD Contacts AC-CON-B-02), the website in the sheet. Sortable like the live app's table
// (CompaniesTable.tsx sorters): name, tax code, industry, founding date, email; default newest first. Tax code is
// its own column like the live app (hidden by default): users tell look-alike companies apart by it.

const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label])) as Record<Company["status"], string>;
// Every row shows its status, as Studio Admin's status badge, in Saella's -soft tokens.
const STATUS_TONE: Record<Company["status"], { pill: string; dot: string }> = {
  active: { pill: "border-success/20 bg-success-soft text-success-soft-foreground", dot: "bg-success" },
  inactive: { pill: "border-warning/20 bg-warning-soft text-warning-soft-foreground", dot: "bg-warning" },
  suspended: { pill: "border-warning/20 bg-warning-soft text-warning-soft-foreground", dot: "bg-warning" },
  ceased: { pill: "border-destructive/20 bg-destructive-soft text-destructive-soft-foreground", dot: "bg-destructive" },
  unknown: { pill: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

/** The company's status pill, the same in the table and the sheet. */
export function CompanyStatusBadge({ status }: { status: Company["status"] }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 px-2", STATUS_TONE[status].pill)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_TONE[status].dot)} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

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
  /** Checkbox column (Unlock on Find companies, Export on Unlocked). */
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
        <div className="flex min-w-0 flex-col gap-0.5">
          <Button
            variant="link"
            className="h-auto max-w-full justify-start border-0 p-0 font-medium text-foreground hover:no-underline"
            onClick={() => onOpen(c)}
          >
            <span className="truncate" title={c.name}>
              {c.name}
            </span>
          </Button>
          <span className="truncate text-sm text-muted-foreground" title={location(c)}>
            {location(c)}
          </span>
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
      // Main industry, then the count of other registered business lines (live app "Sub industries" column) as "+27";
      // the names show on hover or focus.
      id: "industry",
      header: "Industry",
      accessorFn: (c) => isicLabel(c.isic),
      cell: ({ row: { original: c } }) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="block min-w-0 truncate" title={isicLabel(c.isic)}>
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
              <HoverCardContent side="bottom" align="start" className={cn("w-72 p-3", SCROLL_POPOVER_LIST)}>
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
      cell: ({ row: { original: c } }) => <CompanyStatusBadge status={c.status} />,
    },
    {
      id: "founded",
      header: "Founded",
      accessorFn: (c) => c.incorporatedOn,
      cell: ({ row: { original: c } }) => <span className="tabular-nums">{formatDate(c.incorporatedOn)}</span>,
    },
    {
      // Masked as the registry serves it (AC-CON-B-02, BR-RULE-CON-01), with a lock that unlocks the company for 1 credit
      // in one click (live app #116 lockButton). Blank when the registry has none (DESIGN §2).
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
            email
          />
        ),
    },
    {
      // One lock per row, on Email: only a company with an email can be unlocked. Masked like the live app's
      // lib/companies/mask.ts maskPhone: "+" and the first 2 digits, 5 stars, the last 2 digits ("+84*****67").
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
          />
        ),
    },
  ];
  // No row "…" menu: the row click opens the sheet and unlock is the row's lock or the sheet's button.
  return selectable ? columns : columns.filter((col) => col.id !== "select");
}

/** A contact value: masked with a lock (1 credit, one click) until the workspace unlocks the company, then in
 *  full. It fills its column; cut text keeps title=. */
function ContactCell({
  value,
  masked,
  isUnlocked,
  name,
  onUnlock,
  email,
}: {
  value: string;
  masked: string;
  isUnlocked: boolean;
  name: string;
  /** No button when another cell of the row already has the lock. */
  onUnlock?: () => void;
  /** An email is cut in its name, never its domain: the domain tells the company apart. */
  email?: boolean;
}) {
  const shown = isUnlocked ? value : masked;
  return (
    <div className="flex min-w-0 items-center gap-1">
      <ContactText value={shown} email={email} className={cn(!isUnlocked && "text-muted-foreground")} />
      {onUnlock && !isUnlocked && (
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

function ContactText({ value, email, className }: { value: string; email?: boolean; className?: string }) {
  const at = email ? value.lastIndexOf("@") : -1;
  if (at <= 0)
    return (
      <span className={cn("block min-w-0 truncate tabular-nums", className)} title={value}>
        {value}
      </span>
    );
  // The name gives way first (its first two letters and an ellipsis stay), then the domain.
  const head = value.slice(0, Math.min(2, at));
  const rest = value.slice(head.length, at);
  return (
    <span className={cn("flex min-w-0 tabular-nums", className)}>
      <span className="shrink-0">{head}</span>
      {rest && (
        <span className={cn("shrink-[999] truncate", rest.length > 1 ? "min-w-3" : "min-w-0")} title={value}>
          {rest}
        </span>
      )}
      <span className="min-w-0 truncate" title={value}>
        {value.slice(at)}
      </span>
    </span>
  );
}
