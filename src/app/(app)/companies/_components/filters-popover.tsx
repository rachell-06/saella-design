"use client";

import { TreeSelect } from "@/components/saella/tree-select";
import { COUNTRIES, FOUNDED, ISIC, STATUSES, isicLabel } from "@/lib/mock/companies";
import { FilterCheckList, FilterField, FilterPopover, FilterSelect } from "@/components/saella/filter-popover";
import { EMPTY_FILTERS, type Filters, QUALITY } from "./searches";

// Find companies' five filters in the shared Filter popover, reusing the controls the
// toolbar had: Country, Industry, Status, Founded and Data. Active values show as chips under the card header.
// Compact: 4+ options → one control row (Select; the ISIC tree as its tree-select),
// 2–3 options → inline checkboxes (Data).

export function FiltersPopover({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters | ((f: Filters) => Filters)) => void;
}) {
  const count =
    (filters.country ? 1 : 0) +
    filters.isic.length +
    (filters.status ? 1 : 0) +
    (filters.founded ? 1 : 0) +
    filters.quality.length;

  return (
    <FilterPopover count={count} onClearAll={() => onChange({ ...EMPTY_FILTERS, isic: [], quality: [] })}>
      {/* Order: status first, other single choices, then the multi-pick tree, inline checks last. */}
      <FilterSelect
        label="Status"
        allLabel="Any status"
        value={filters.status}
        options={STATUSES}
        onChange={(status) => onChange((f) => ({ ...f, status }))}
      />
      <FilterSelect
        label="Country"
        allLabel="Any country"
        value={filters.country}
        options={COUNTRIES.map((c) => ({ value: c.code, label: c.label }))}
        onChange={(country) => onChange((f) => ({ ...f, country }))}
      />
      <FilterSelect
        label="Founded"
        allLabel="Any founding date"
        value={filters.founded}
        options={FOUNDED}
        onChange={(founded) => onChange((f) => ({ ...f, founded }))}
      />
      <FilterField label="Industry">
        {(id) => (
          <TreeSelect
            id={id}
            // First pick + "+N", like MultiSelect.
            label={filters.isic.length ? isicLabel(filters.isic[0]) : "Any industry"}
            groups={ISIC}
            value={filters.isic}
            onChange={(isic) => onChange((f) => ({ ...f, isic }))}
            searchPlaceholder="Search industries"
            emptyText="No industry matches"
          />
        )}
      </FilterField>
      <FilterCheckList
        label="Data"
        options={QUALITY}
        value={filters.quality}
        onChange={(quality) => onChange((f) => ({ ...f, quality: quality as Filters["quality"] }))}
      />
    </FilterPopover>
  );
}
