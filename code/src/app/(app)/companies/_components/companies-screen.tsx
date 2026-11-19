"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RowSelectionState } from "@tanstack/react-table";
import { CircleAlertIcon, DownloadIcon, LockIcon, LockOpenIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { LEADS_DESCRIPTION, LEADS_TITLE, LeadsTabs } from "@/components/saella/leads-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { FilterChips } from "@/components/saella/filter-popover";
import { Hint } from "@/components/saella/hint";
import { SelectionBar } from "@/components/saella/selection-bar";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { createCompaniesColumns } from "./companies-columns";
import { CompaniesTable, type CompaniesTableHandle } from "./companies-table";
import { CompanySheet } from "./company-sheet";
import { FiltersPopover } from "./filters-popover";
import {
  type Company,
  FOUNDED,
  ageYears,
  companies as allCompanies,
} from "@/lib/mock/companies";
import { ExportDialog } from "./export-dialog";
import { type UnlockAsk, UnlockDialog } from "@/components/features/unlock-dialog";
import { quoteUnlock, unlockCompanies, useUnlocks } from "@/lib/mock/unlocks";
import { readCreditBalance } from "@/lib/mock/credits";
import {
  DEFAULT_FILTERS,
  DEFAULT_STATUS,
  EMPTY_FILTERS,
  type Filters,
  type Search,
  activeFilters,
  withoutFilter,
} from "./searches";

// Companies (PRD-04 Company Data Hub + live app /dashboard/companies): search the SEA registry, filter by country,
// ISIC industry (country-independent, section → class), status bucket, founded and data quality, then unlock what
// is worth reaching. Nothing here saves to Self-upload (unlike the live app's "Save to contacts"). One search matches
// name, representative, tax code and email (live app companySearchOr). Contact details stay masked until unlocked.
// URL sets filters so the agent and Contacts can link here: ?country=VN&isic=5510,5610&q=...
// Preview states: ?state=loading | error | rate-limited | no-access. With no filter the table lists every company.
// Layout follows Studio Admin /dashboard/products: header, a toolbar with the search on the left and one Filter
// popover on the right, then a full-bleed table under a sticky header, with the count and paging in a footer. Every
// active filter value is a chip with Clear all (decisions.md). No saved searches (decisions.md).
// Unlock (PRD Contacts US-CON-U + live app #116): a lock on each masked email and "Unlock · 1 credit" in the sheet
// unlock one company at once; a selection gets "Unlock · N credits", priced and confirmed first. Already unlocked
// costs nothing; short of credits → nothing unlocked, "Not enough credits" tops up in place (PATTERNS 9.18).
// Preview: ?state=low-credits (balance 5), ?state=no-unlocks.

const NO_ROWS: Company[] = [];
const NO_UNLOCKS: ReadonlySet<string> = new Set();

/** "all" = Leads › Find companies (/companies); "unlocked" = Leads › Unlocked (/companies/unlocked): the same
 *  search and table, limited to companies the workspace has unlocked. */
export function CompaniesScreen({ view = "all" }: { view?: "all" | "unlocked" }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const previewState = params.get("state");
  // Old ?view=unlocked links move to the Unlocked tab.
  const legacyUnlocked = view === "all" && params.get("view") === "unlocked";
  useEffect(() => {
    if (!legacyUnlocked) return;
    const rest = new URLSearchParams(params.toString());
    rest.delete("view");
    const qs = rest.toString();
    router.replace(`/companies/unlocked${qs ? `?${qs}` : ""}`);
  }, [legacyUnlocked, params, router]);
  const [initial] = useState<Search>(() => {
    return {
      query: params.get("q") ?? "",
      filters: {
        ...EMPTY_FILTERS,
        country: params.get("country") ?? undefined,
        isic: params.get("isic")?.split(",").filter(Boolean) ?? [],
        // ?status=any: every status ("Any status" in the Filter popover).
        status: params.get("status") === "any" ? undefined : (params.get("status") ?? DEFAULT_STATUS),
      },
    };
  });
  const [query, setQuery] = useState(initial.query);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [open, setOpen] = useState<Company | null>(null);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [ask, setAsk] = useState<UnlockAsk | null>(null);
  const [exporting, setExporting] = useState<{ rows: Company[]; selection: boolean } | null>(null);
  const tableRef = useRef<CompaniesTableHandle>(null);
  const { unlocked: storedUnlocked, balance: storedBalance } = useUnlocks();
  // Preview ?state=no-unlocks: a workspace that hasn't unlocked anything yet (the empty Unlocked view).
  const unlocked = previewState === "no-unlocks" ? NO_UNLOCKS : storedUnlocked;
  const balance = previewState === "low-credits" ? 5 : storedBalance;

  const search: Search = { query, filters };
  const matches = useMemo(() => filterCompanies({ query, filters }), [filters, query]);
  const unlockedMatches = useMemo(() => matches.filter((c) => unlocked.has(c.id)), [matches, unlocked]);
  // Find companies lists what is still locked: an unlocked company moves to the Unlocked tab.
  const lockedMatches = useMemo(() => matches.filter((c) => !unlocked.has(c.id)), [matches, unlocked]);
  const results = view === "unlocked" ? unlockedMatches : lockedMatches;
  const searchKey = JSON.stringify([query, filters]);
  // The last unlock on this search: when it empties the list, the empty state says where they went.
  const [justUnlocked, setJustUnlocked] = useState<{ count: number; key: string } | null>(null);

  // The default Active status is no chip; "Any status" is (searches.ts DEFAULT_STATUS).
  const active = activeFilters(search);
  // A refused search (error, rate limit, no access) has no rows, so nothing can be saved from it.
  const refused = previewState === "error" || previewState === "rate-limited" || previewState === "no-access";
  const rows = refused ? NO_ROWS : results;

  // A new result set drops the selection (reset during render, not in an effect).
  const [prevRows, setPrevRows] = useState(rows);
  if (prevRows !== rows) {
    setPrevRows(rows);
    setSelection({});
  }
  const selected = rows.filter((c) => selection[c.id]);

  const applySearch = (s: Search) => {
    setQuery(s.query);
    setFilters({ ...s.filters, isic: [...s.filters.isic], quality: [...s.filters.quality] });
  };
  const clearAll = () => applySearch({ query: "", filters: DEFAULT_FILTERS });
  // Export in the table's order: the file follows the sort the user sees.
  const inTableOrder = (list: Company[]) => {
    const order = tableRef.current?.sortedRows();
    if (!order) return list;
    const ids = new Set(list.map((c) => c.id));
    return order.filter((c) => ids.has(c.id));
  };

  // One company: straight away, the cost is on the button (live unlockOne). Several: priced and confirmed
  // (live unlockMany). Short → the "Not enough credits" dialog, nothing charged; topping up there brings back the
  // confirm, so `run` reads the live balance.
  const unlock = (targets: Company[], confirm: boolean) => {
    const q = quoteUnlock(targets, unlocked);
    if (q.cost === 0) return;
    const run = () => {
      const now = readCreditBalance();
      if (!unlockCompanies(targets, now)) return setAsk({ kind: "short", cost: q.cost, balance: now, then: details });
      const left = now - q.cost;
      setJustUnlocked({ count: q.fresh.length, key: searchKey });
      toast.success(
        q.fresh.length === 1 ? `${q.fresh[0].name} unlocked` : `${q.fresh.length.toLocaleString("en-US")} companies unlocked`,
        {
          description: `Moved to Unlocked · ${left.toLocaleString("en-US")} credits left`,
          action: { label: "View unlocked", onClick: () => router.push("/companies/unlocked") },
        }
      );
    };
    const details = { companies: q.fresh.length, alreadyUnlocked: q.alreadyUnlocked, noEmail: q.nothingToUnlock, onConfirm: run };
    if (q.cost > balance) return setAsk({ kind: "short", cost: q.cost, balance, then: details });
    if (!confirm) return run();
    setAsk({ kind: "confirm", cost: q.cost, balance, ...details });
  };

  const columns = createCompaniesColumns({
    unlocked,
    onOpen: setOpen,
    onUnlock: (c) => unlock([c], false),
    selectable: true,
  });

  const selectedQuote = quoteUnlock(selected, unlocked);
  const unlockHint =
    selectedQuote.cost > 0
      ? undefined
      : selectedQuote.alreadyUnlocked > 0
        ? "Already unlocked"
        : "Nothing to unlock: no email";

  return (
    // Full height (Studio Admin products): 100svh minus header 3rem, page padding 2 × 1.5rem, and 2.5rem so the
    // paging footer ends above the floating "Ask the agent" button. -mb-8 takes back the 2rem the page's bottom
    // padding (pb-24, for that button) adds below, so only the table scrolls, not the page.
    <div className="-mb-8 flex h-[calc(100svh-8.5rem)] min-h-[560px] flex-col gap-4 md:gap-6">
      <PageHeader
        title={LEADS_TITLE}
        description={LEADS_DESCRIPTION}
        // No page action on Find companies and Unlocked: export is being removed (PRD Master "api/export"; live app
        // COMPANIES_EXPORT_ENABLED = false).
      />
      <LeadsTabs />

      {/* One card per Leads tab, built like Leads › Contacts. Search matches name, representative, tax code and email
          (PRD Master v1.5.0; AC-CON-B-01). */}
      <Card className="min-h-0 flex-1 gap-0 pb-0">
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          {/* No count here: the table's footer says it ("1 – 20 of N companies"). */}
          <CardTitle className="text-xl leading-none">{view === "unlocked" ? "Unlocked companies" : "Companies"}</CardTitle>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <SearchIcon className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                className="h-7"
                aria-label="Search companies"
                placeholder="Name, person, tax code, email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </InputGroup>
            <FiltersPopover filters={filters} onChange={setFilters} hasEmailOption={view === "all"} />
            {/* The live app exports the filtered list without a selection (CompaniesExportButton): here on Unlocked.
                Hidden while rows are selected: the selection bar's Export is the one then (PATTERNS 9.1). */}
            {view === "unlocked" && selected.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="font-normal"
                disabled={rows.length === 0}
                onClick={() => setExporting({ rows: inTableOrder(rows), selection: false })}
              >
                <DownloadIcon data-icon="inline-start" />
                Export
              </Button>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col px-0">
          {/* Filters only: the search box already shows the search (as on Self-upload). */}
          <FilterChips
            className="shrink-0 border-b px-4 py-3"
            chips={active.map((a) => ({ ...a, onRemove: () => applySearch(withoutFilter(search, a.key)) }))}
            onClearAll={() => applySearch({ query, filters: DEFAULT_FILTERS })}
          />
          {/* Registry answers said plainly (PRD Contacts "Error, Empty and Loading States"): 503 timeout, 429 rate
              limit or daily row budget, 403 account not linked. Preview: ?state=error | rate-limited | no-access. */}
          {previewState === "error" ? (
            <Alert variant="destructive" className="m-4 w-auto">
              <CircleAlertIcon />
              <AlertTitle>The search didn&apos;t finish</AlertTitle>
              <AlertDescription>Narrow the filters and try again.</AlertDescription>
              <AlertAction>
                {/* Same tab, same search and filters (they live in this screen's state), just the preview state dropped. */}
                <Button variant="outline" size="sm" onClick={() => router.replace(withoutState(pathname, params))}>
                  Retry
                </Button>
              </AlertAction>
            </Alert>
          ) : previewState === "rate-limited" ? (
            <Alert variant="destructive" className="m-4 w-auto">
              <CircleAlertIcon />
              <AlertTitle>Daily company-record limit reached</AlertTitle>
              <AlertDescription>Your workspace has viewed its company records for today. Search again tomorrow.</AlertDescription>
            </Alert>
          ) : previewState === "no-access" ? (
            <Alert variant="destructive" className="m-4 w-auto">
              <CircleAlertIcon />
              <AlertTitle>Your account isn&apos;t linked to a company</AlertTitle>
              <AlertDescription>Ask your workspace owner to add you, then reload this page.</AlertDescription>
            </Alert>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <CompaniesTable
                handle={tableRef}
                data={rows}
                columns={columns}
                loading={previewState === "loading"}
                rowSelection={selection}
                onRowSelectionChange={setSelection}
                onRowClick={setOpen}
                activeRowId={open?.id}
                emptyState={
                  view === "all" && justUnlocked?.key === searchKey ? (
                    // Everything this search found is unlocked now: point to where it went.
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <LockOpenIcon />
                        </EmptyMedia>
                        <EmptyTitle className="tabular-nums">
                          {justUnlocked.count.toLocaleString("en-US")} {justUnlocked.count === 1 ? "company" : "companies"} unlocked
                        </EmptyTitle>
                        <EmptyDescription>
                          {justUnlocked.count === 1 ? "It's" : "They're"} in Unlocked now, with full email and phone.
                          Nothing else here is left to unlock.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent className="flex-row justify-center">
                        <Button size="sm" asChild>
                          <Link href="/companies/unlocked">View unlocked</Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearAll}>
                          Find more
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : view === "all" && unlockedMatches.length > 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <LockOpenIcon />
                        </EmptyMedia>
                        <EmptyTitle>All of these are unlocked</EmptyTitle>
                        <EmptyDescription>
                          The {unlockedMatches.length.toLocaleString("en-US")} companies this search finds are in Unlocked.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent className="flex-row justify-center">
                        <Button size="sm" asChild>
                          <Link href="/companies/unlocked">View unlocked</Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearAll}>
                          Find more
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : view === "unlocked" && unlocked.size === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <LockOpenIcon />
                        </EmptyMedia>
                        <EmptyTitle>No unlocked companies yet</EmptyTitle>
                        <EmptyDescription>Unlock a company to see its full email and phone.</EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/companies">Find companies</Link>
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>No companies match</EmptyTitle>
                        <EmptyDescription>Try a wider industry, another country, or fewer filters.</EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button variant="outline" size="sm" onClick={clearAll}>
                          Clear filters
                        </Button>
                      </EmptyContent>
                    </Empty>
                  )
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selection actions float under the table: a flex child below the card, so the card shrinks and its paging row
          is never covered. */}
      {selected.length > 0 && (
        <SelectionBar count={selected.length} label="Selected companies" onClear={() => setSelection({})}>
          {view === "all" ? (
            <Hint label={unlockHint}>
              <span tabIndex={unlockHint ? 0 : undefined}>
                <Button size="sm" onClick={() => unlock(selected, true)} disabled={selectedQuote.cost === 0}>
                  <LockIcon data-icon="inline-start" />
                  {selectedQuote.cost > 0
                    ? `Unlock · ${selectedQuote.cost.toLocaleString("en-US")} ${selectedQuote.cost === 1 ? "credit" : "credits"}`
                    : "Unlock"}
                </Button>
              </span>
            </Hint>
          ) : (
            // Unlocked tab: export the selection, 1 credit a row (export-dialog.tsx); sending starts from a template.
            <Button size="sm" onClick={() => setExporting({ rows: inTableOrder(selected), selection: true })}>
              <DownloadIcon data-icon="inline-start" />
              Export
            </Button>
          )}
        </SelectionBar>
      )}

      <CompanySheet
        company={open}
        unlocked={open !== null && unlocked.has(open.id)}
        onOpenChange={(o) => !o && setOpen(null)}
        onUnlock={(c) => unlock([c], false)}
      />
      <UnlockDialog ask={ask} onOpenChange={(o) => !o && setAsk(null)} />
      <ExportDialog
        rows={exporting?.rows ?? null}
        selection={exporting?.selection ?? false}
        balance={balance}
        onOpenChange={(o) => !o && setExporting(null)}
      />
    </div>
  );
}

/** This URL without the preview ?state=. */
function withoutState(pathname: string, params: URLSearchParams) {
  const rest = new URLSearchParams(params.toString());
  rest.delete("state");
  const qs = rest.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Filters run before the table (patterns §1), so the agent and the URL share one matcher. */
function filterCompanies({ query, filters }: Search) {
  const q = query.trim().toLowerCase();
  const founded = FOUNDED.find((f) => f.value === filters.founded);
  return allCompanies.filter((c) => {
    if (q && ![c.name, c.representative ?? "", c.registrationNo, c.email ?? ""].some((f) => f.toLowerCase().includes(q))) return false;
    if (filters.country && c.country !== filters.country) return false;
    if (filters.isic.length && !filters.isic.includes(c.isic)) return false;
    if (filters.status && c.status !== filters.status) return false;
    if (founded) {
      const age = ageYears(c.incorporatedOn);
      if (age < founded.min || age >= founded.max) return false;
    }
    if (filters.quality.includes("email") && !c.email) return false;
    if (filters.quality.includes("phone") && !c.phone) return false;
    if (filters.quality.includes("fdi") && !c.fdi) return false;
    return true;
  });
}
