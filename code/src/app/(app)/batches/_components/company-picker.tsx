"use client";

import Link from "next/link";
import { LockOpenIcon, SearchIcon } from "lucide-react";
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
} from "@/lib/mock/companies";
import { BATCH_CAP } from "@/lib/mock/batches";
import { industryLabels } from "@/lib/mock/campaigns";
import { leadsHref } from "@/lib/mock/company-audience";
import type { AudienceFilters } from "./company-audience";
import { BODY_CELL, HEAD_CELL, HEADER, TABLE, TableFrame, usePaging } from "./table-frame";

// Recipients › Unlocked companies. Back to the live app's audience step (PM proposal, designer approved 2026-11-14):
// sending starts only from a template, so this is again the one place to choose companies. Live EmailBatchWizard
// company mode: search + Filter (Countries, Industry, Founded, FDI only), a
// paged table (50 a page) with the header checkbox selecting the page. Ours adds "Select all N matching" across pages
// (PATTERNS 9.1) and one count line instead of the live stat tiles; quota and time to send moved to Review.
// No Not sent / Sent split (designer 2026-11-14, unlike the live app): every unlocked company is listed and pickable.
// No filter is pre-filled (designer 2026-11-14; the live app seeds the campaign's targeting): the user adds them.

const n = (x: number) => x.toLocaleString("en-US");

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
// Campaign targeting can hold classes the registry tree lacks (campaign tree, 2026-11-14): name them from that tree.
const industryName = (code: string) => (isicLabel(code) !== code ? isicLabel(code) : (industryLabels([code])[0] ?? code));
const COUNTRY_LABEL = (code: string) => COUNTRIES.find((c) => c.code === code)?.label ?? code;

export function CompanyPicker({
  rows: all,
  query,
  onQuery,
  filters,
  onFilters,
  selected,
  onSelected,
}: {
  /** Unlocked companies with an email matching the filters and search. */
  rows: Company[];
  query: string;
  onQuery: (q: string) => void;
  filters: AudienceFilters;
  onFilters: (f: AudienceFilters) => void;
  selected: ReadonlySet<string>;
  onSelected: (next: Set<string>) => void;
}) {
  const paging = usePaging(all);
  const rows = paging.rows;

  const pageIds = rows.map((c) => c.id);
  const pagePicked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const pageSome = pageIds.some((id) => selected.has(id));
  const allIds = all.map((c) => c.id);
  const allPicked = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const filterCount =
    filters.countries.length + filters.isic.length + (filters.founded ? 1 : 0) + (filters.fdiOnly ? 1 : 0);
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
    // `contents`: the toolbar joins the wizard's grid, on the source tabs' row (designer 2026-11-14); the tabs stay put
    // in the wizard, so switching source never remounts them (focus stays on the tab).
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
      <FilterChips chips={chips} onClearAll={clearFilters} />

      {all.length === 0 && !query.trim() ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LockOpenIcon />
            </EmptyMedia>
            <EmptyTitle>No unlocked companies match</EmptyTitle>
            <EmptyDescription>Change the filters, or unlock companies in Leads.</EmptyDescription>
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
              <span>
                <span className="font-medium text-foreground">{n(selected.size)}</span> of{" "}
                <span className="font-medium text-foreground">{n(all.length)}</span> selected
                {selected.size > BATCH_CAP && ` (first ${n(BATCH_CAP)} sent)`}
              </span>
              {pagePicked && !allPicked && all.length > rows.length && (
                <Button variant="link" className="h-auto border-0 p-0" onClick={() => setMany(allIds, true)}>
                  Select all {n(all.length)} matching
                </Button>
              )}
              {selected.size > 0 && (
                <Button variant="link" className="h-auto border-0 p-0" onClick={() => onSelected(new Set())}>
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
                      aria-label="Select this page"
                      checked={pagePicked ? true : pageSome ? "indeterminate" : false}
                      onCheckedChange={(v) => setMany(pageIds, v === true)}
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
                rows.map((c) => (
                  <TableRow key={c.id} className="border-0" data-state={selected.has(c.id) ? "selected" : undefined}>
                    <TableCell className={cn(BODY_CELL, "w-10 min-w-10 px-0 text-center")}>
                      <div className="flex justify-center">
                        <Checkbox
                          aria-label={`Select ${c.name}`}
                          checked={selected.has(c.id)}
                          onCheckedChange={(v) => setMany([c.id], v === true)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className={cn(BODY_CELL, "max-w-72")}>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-medium" title={c.name}>
                          {c.name}
                        </span>
                        <span className="truncate text-sm text-muted-foreground">{location(c)}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(BODY_CELL, "max-w-56")}>
                      <span className="block truncate" title={isicLabel(c.isic)}>
                        {isicLabel(c.isic)}
                      </span>
                    </TableCell>
                    <TableCell className={BODY_CELL}>{c.email}</TableCell>
                    <TableCell className={BODY_CELL}>
                      <Badge variant="outline" className={cn("gap-1.5 px-2", STATUS_TONE[c.status].pill)}>
                        <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_TONE[c.status].dot)} />
                        {STATUS_LABEL[c.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableFrame>
      )}
      </div>
    </div>
  );
}
