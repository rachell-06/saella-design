"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LockIcon, LockOpenIcon, SearchIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type FilterChip,
  FilterCheckList,
  FilterChips,
  FilterField,
  FilterMultiSelect,
  FilterPopover,
  FilterSelect,
} from "@/components/saella/filter-popover";
import { Hint } from "@/components/saella/hint";
import { TreeSelect } from "@/components/saella/tree-select";
import { cn } from "@/lib/utils";
import {
  type Company,
  COUNTRIES,
  type CountryCode,
  FOUNDED,
  ISIC,
  STATUSES,
  countryLabel,
  isicLabel,
  maskEmail,
} from "@/lib/mock/companies";
import { BATCH_CAP } from "@/lib/mock/batches";
import { industryLabels } from "@/lib/mock/campaigns";
import { leadsHref } from "@/lib/mock/company-audience";
import { creditsUsd } from "@/lib/mock/pricing";
import { UNLOCK_COST } from "@/lib/mock/unlocks";
import type { AudienceFilters } from "./company-audience";
import { BODY_CELL, HEAD_CELL, HEADER, TABLE, TableFrame, usePaging } from "./table-frame";

// Recipients › Unlocked companies, as the live EmailBatchWizard company mode: search + Filter (Countries, Industry,
// Founded, FDI only), a paged table (50 a page) with the header checkbox selecting the page. Ours adds "Select all N
// matching" across pages (PATTERNS 9.1) and one count line instead of the live stat tiles; quota and time to send are
// on Review. Unlike the live app: no Not sent / Sent split, and no filter pre-filled from the campaign's targeting
// (its matches come pre-selected instead). `summary` sits above the table (what Saella found). Locked matches
// (`lockedIds`) follow the unlocked ones under any filter or search: lock by the name, email masked, unticked at
// first; ticking one = unlocking it for a credit. The header checkbox and "Select all N" pick unlocked rows only, so
// one click never spends credits.

const n = (x: number) => x.toLocaleString("en-US");
// Locked rows read as disabled (every cell); the checkbox cell stays full strength because ticking one is how it
// gets unlocked.
const DIMMED = "opacity-55";

const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label])) as Record<Company["status"], string>;
// Same pill as Find companies (dot + word on the -soft tint). Candidate for components/saella.
const STATUS_TONE: Record<Company["status"], { pill: string; dot: string }> = {
  active: { pill: "border-success/20 bg-success-soft text-success-soft-foreground", dot: "bg-success" },
  inactive: { pill: "border-warning/20 bg-warning-soft text-warning-soft-foreground", dot: "bg-warning" },
  suspended: { pill: "border-warning/20 bg-warning-soft text-warning-soft-foreground", dot: "bg-warning" },
  ceased: { pill: "border-destructive/20 bg-destructive-soft text-destructive-soft-foreground", dot: "bg-destructive" },
  unknown: { pill: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

const location = (c: Company) => (c.city === countryLabel(c.country) ? c.city : `${c.city}, ${countryLabel(c.country)}`);
// Campaign targeting can hold classes the registry tree lacks: name them from the campaign tree.
const industryName = (code: string) => (isicLabel(code) !== code ? isicLabel(code) : (industryLabels([code])[0] ?? code));
const COUNTRY_LABEL = (code: string) => COUNTRIES.find((c) => c.code === code)?.label ?? code;
const NONE: ReadonlySet<string> = new Set();

export function CompanyPicker({
  rows: all,
  query,
  onQuery,
  filters,
  onFilters,
  selected,
  onSelected,
  lockedIds = NONE,
  summary,
  status,
  empty,
}: {
  /** Companies with an email matching the filters and search: unlocked ones, then locked ones. */
  rows: Company[];
  query: string;
  onQuery: (q: string) => void;
  filters: AudienceFilters;
  onFilters: (f: AudienceFilters) => void;
  /** Ticked rows, unlocked and locked. */
  selected: ReadonlySet<string>;
  onSelected: (next: Set<string>) => void;
  /** Rows still locked: masked email, never ticked by the header checkbox or "Select all". */
  lockedIds?: ReadonlySet<string>;
  /** Above the table: what Saella found. */
  summary?: ReactNode;
  /** After "N of M selected" on the selection line (what the ticked locked rows cost). */
  status?: ReactNode;
  /** Shown instead of the table when there are no rows at all, search or not (no campaign match). */
  empty?: ReactNode;
}) {
  const paging = usePaging(all);
  const rows = paging.rows;

  const pageIds = rows.map((c) => c.id);
  // The header ticks the free (unlocked) rows when the list has any: one click never adds credits next to free picks.
  // A list of locked rows only ("See locked") is one the user chose to look at, so there it ticks them; the cost shows
  // on this line and Continue still asks before unlocking.
  const allIds = all.map((c) => c.id);
  const allFreeIds = allIds.filter((id) => !lockedIds.has(id));
  const onlyLocked = allFreeIds.length === 0;
  const pageFree = onlyLocked ? pageIds : pageIds.filter((id) => !lockedIds.has(id));
  const pagePicked = pageFree.length > 0 && pageFree.every((id) => selected.has(id));
  const pageSome = pageIds.some((id) => selected.has(id));
  const allFree = onlyLocked ? allIds : allFreeIds;
  const allPicked = allFree.length > 0 && allFree.every((id) => selected.has(id));
  const anyLocked = !onlyLocked && all.length > allFreeIds.length;
  const shownSelected = all.reduce((k, c) => k + (selected.has(c.id) ? 1 : 0), 0);

  const filterCount =
    filters.countries.length +
    filters.isic.length +
    (filters.founded ? 1 : 0) +
    (filters.fdiOnly ? 1 : 0);
  const clearFilters = () => onFilters({ countries: [], isic: [], fdiOnly: false });
  const chips: FilterChip[] = [
    ...filters.countries.map((c) => ({
      key: `country:${c}`,
      label: "Country",
      value: COUNTRY_LABEL(c),
      onRemove: () => onFilters({ ...filters, countries: filters.countries.filter((x) => x !== c) }),
    })),
    ...filters.isic.map((code) => ({
      key: `isic:${code}`,
      label: "Industry",
      value: industryName(code),
      onRemove: () => onFilters({ ...filters, isic: filters.isic.filter((x) => x !== code) }),
    })),
    ...(filters.founded
      ? [
          {
            key: "founded",
            label: "Founded",
            value: FOUNDED.find((f) => f.value === filters.founded)?.label ?? filters.founded,
            onRemove: () => onFilters({ ...filters, founded: undefined }),
          },
        ]
      : []),
    ...(filters.fdiOnly ? [{ key: "fdi", label: "FDI only", onRemove: () => onFilters({ ...filters, fdiOnly: false }) }] : []),
  ];


  function setMany(ids: string[], on: boolean) {
    const next = new Set(selected);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onSelected(next);
  }

  return (
    // `contents`: the toolbar joins the wizard's grid, on the source tabs' row; the tabs stay put in the wizard, so
    // switching source never remounts them (focus stays on the tab).
    <div className="contents">
      <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-2">
          <InputGroup className="h-8 w-64">
            <InputGroupAddon align="inline-start">
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search companies"
              placeholder="Search companies"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
            />
          </InputGroup>
          <FilterPopover count={filterCount} onClearAll={clearFilters} size="default">
            <FilterSelect
              label="Founded"
              allLabel="Any founding date"
              value={filters.founded}
              options={FOUNDED}
              onChange={(founded) => onFilters({ ...filters, founded })}
            />
            <FilterMultiSelect
              label="Country"
              options={COUNTRIES.map((c) => c.label)}
              value={filters.countries.map(COUNTRY_LABEL)}
              onChange={(labels) =>
                onFilters({
                  ...filters,
                  countries: COUNTRIES.filter((c) => labels.includes(c.label)).map((c) => c.code as CountryCode),
                })
              }
              placeholder="Any country"
            />
            <FilterField label="Industry">
              {(id) => (
                <TreeSelect
                  id={id}
                  label={filters.isic.length ? industryName(filters.isic[0]) : "Any industry"}
                  groups={ISIC}
                  value={filters.isic}
                  onChange={(isic) => onFilters({ ...filters, isic })}
                  searchPlaceholder="Search industries"
                  emptyText="No industry matches"
                />
              )}
            </FilterField>
            <FilterCheckList
              label="Ownership"
              options={[{ value: "fdi", label: "FDI only" }]}
              value={filters.fdiOnly ? ["fdi"] : []}
              onChange={(v) => onFilters({ ...filters, fdiOnly: v.includes("fdi") })}
            />
          </FilterPopover>
      </div>
      <div className="col-span-2 flex min-h-0 flex-col gap-3 self-stretch">
      {summary}
      <FilterChips chips={chips} onClearAll={clearFilters} />

      {empty && all.length === 0 ? (
        empty
      ) : all.length === 0 && !query.trim() ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LockOpenIcon />
            </EmptyMedia>
            <EmptyTitle>No companies match</EmptyTitle>
            <EmptyDescription>Change the filters, or find more companies in Leads.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" asChild>
              <Link href={leadsHref(filters)}>Find companies to unlock</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <TableFrame
          paging={paging}
          noun="companies"
          label="Company pages"
          status={
            <>
              {/* Selection line above the rows (PATTERNS 9.1): "12 of 36 selected", then every match across pages. */}
              {/* Counts the rows shown only; picks hidden by a filter or search still go. */}
              <span>
                <span className="font-medium text-foreground">{n(shownSelected)}</span>
                {/* Locked view: "2 selected", the box above already says how many there are. */}
                {!(onlyLocked && lockedIds.size > 0) && (
                  <>
                    {" "}
                    of <span className="font-medium text-foreground">{n(all.length)}</span>
                  </>
                )}{" "}
                selected
                {selected.size > BATCH_CAP && ` (first ${n(BATCH_CAP)} sent)`}
                {status}
              </span>
              {pagePicked && !allPicked && allFree.length > pageFree.length && (
                <Button variant="link" className="h-auto min-h-6 border-0 p-0" onClick={() => setMany(allFree, true)}>
                  {/* Unlocked rows only: the locked ones cost credits. */}
                  Select all {n(allFree.length)} {anyLocked ? "unlocked" : onlyLocked && lockedIds.size > 0 ? "locked" : "matching"}
                </Button>
              )}
              {/* Only when a row shown is ticked: picks hidden by "See locked" or a filter don't count. */}
              {shownSelected > 0 && (
                // Secondary: quieter than "Select all", still underlined on hover.
                <Button
                  variant="link"
                  className="h-auto min-h-6 border-0 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => onSelected(new Set())}
                >
                  {/* × icon: reads as an action, not more of the count text. */}
                  <XIcon data-icon="inline-start" />
                  Clear selection
                </Button>
              )}
            </>
          }
        >
          <Table aria-label="Companies to send to" className={TABLE}>
            <TableHeader className={HEADER}>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(HEAD_CELL, "w-10 min-w-10 px-0 text-center")}>
                  <div className="flex justify-center">
                    <Checkbox
                      aria-label={anyLocked ? "Select the unlocked companies on this page" : "Select this page"}
                      checked={pagePicked ? true : pageSome ? "indeterminate" : false}
                      // Ticks the page's unlocked rows (or its locked ones when the list has nothing else); unticking clears the whole
                      // page, locked ticks too.
                      disabled={pageFree.length === 0 && !pageSome}
                      onCheckedChange={() =>
                        pagePicked || pageFree.length === 0 ? setMany(pageIds, false) : setMany(pageFree, true)
                      }
                    />
                  </div>
                </TableHead>
                <TableHead className={HEAD_CELL}>Company</TableHead>
                <TableHead className={HEAD_CELL}>Industry</TableHead>
                <TableHead className={HEAD_CELL}>Email</TableHead>
                <TableHead className={HEAD_CELL}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className={cn(BODY_CELL, "h-24 text-center text-muted-foreground")}>
                    No results.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c) => {
                  const masked = lockedIds.has(c.id);
                  return (
                  <TableRow key={c.id} className="border-0" data-state={selected.has(c.id) ? "selected" : undefined}>
                    <TableCell className={cn(BODY_CELL, "w-10 min-w-10 px-0 text-center")}>
                      <div className="flex justify-center">
                        <Checkbox
                          aria-label={masked ? `Unlock and select ${c.name}` : `Select ${c.name}`}
                          checked={selected.has(c.id)}
                          onCheckedChange={(v) => setMany([c.id], v === true)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className={cn(BODY_CELL, "max-w-72 max-[1440px]:max-w-56", masked && DIMMED)}>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex min-w-0 items-center gap-1.5">
                          {/* Locked rows read as greyed out; the checkbox stays at full strength. */}
                          <span className={cn("truncate font-medium", masked && "text-muted-foreground")} title={c.name}>
                            {c.name}
                          </span>
                          {masked && (
                            <Hint label={`Locked. Tick it to unlock it for ${UNLOCK_COST} credit (${creditsUsd(UNLOCK_COST)}).`}>
                              <LockIcon
                                role="img"
                                aria-label="Locked"
                                tabIndex={0}
                                className="size-3.5 shrink-0 text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                              />
                            </Hint>
                          )}
                        </span>
                        <span className="truncate text-sm text-muted-foreground">{location(c)}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(BODY_CELL, "max-w-56 max-[1440px]:max-w-40", masked && DIMMED)}>
                      <span className={cn("block truncate", masked && "text-muted-foreground")} title={isicLabel(c.isic)}>
                        {isicLabel(c.isic)}
                      </span>
                    </TableCell>
                    <TableCell className={cn(BODY_CELL, "max-w-72 max-[1440px]:max-w-52", masked && DIMMED)}>
                      {masked ? (
                        // The lock sits by the name; here only the masked address.
                        <span className="block truncate text-muted-foreground">{maskEmail(c.email ?? "")}</span>
                      ) : (
                        <span className="block truncate" title={c.email}>
                          {c.email}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={cn(BODY_CELL, masked && DIMMED)}>
                      <Badge variant="outline" className={cn("gap-1.5 px-2", STATUS_TONE[c.status].pill)}>
                        <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_TONE[c.status].dot)} />
                        {STATUS_LABEL[c.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableFrame>
      )}
      </div>
    </div>
  );
}
