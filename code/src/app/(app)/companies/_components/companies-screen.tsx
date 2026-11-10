"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookmarkCheckIcon,
  BookmarkPlusIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  DownloadIcon,
  ListPlusIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createList, upsertContacts, useContactsStore } from "@/lib/mock/contacts";
import { ImportDialog } from "@/components/features/import-dialog";
import { LEADS_DESCRIPTION, LEADS_TITLE, LeadsTabs } from "@/components/saella/leads-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { SaellaMini } from "@/components/saella/saella-mini";
import { DataTable, type DataTableColumn } from "@/components/saella/data-table";
import { TableFill } from "@/components/saella/table-fill";
import { TreeSelect } from "@/components/saella/tree-select";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CompanySheet } from "./company-sheet";
import {
  COUNTRIES,
  type Company,
  EXPORT_MAX_ROWS,
  FOUNDED,
  ISIC,
  SEEDED_IN_LIST,
  STATUSES,
  ageYears,
  companies as allCompanies,
  countryLabel,
  formatDate,
  isicLabel,
} from "./data";
import { SaveListDialog } from "./save-list-dialog";
import { SaveSearchDialog } from "./save-search-dialog";
import { SavedSearchesMenu } from "./saved-searches-menu";
import {
  EMPTY_FILTERS,
  type Filters,
  QUALITY,
  type Search,
  activeFilters,
  agentHref,
  deleteSavedSearch,
  getSavedSearch,
  sameSearch,
  saveSearch,
  useSavedSearches,
  withoutFilter,
  workSearchPrompt,
} from "./searches";
import { StartPanel } from "./start-panel";
import { Hint } from "@/components/saella/hint";
import { ChipRemove } from "@/components/saella/chip-remove";

// Companies (PRD-04 Company Data Hub + live app /dashboard/companies, 2026-10-28): search the SEA registry,
// filter by country, ISIC industry (country-independent, section → class), status bucket, founded and data
// quality, then save the result as a contact list or export it. One search matches name, representative,
// registration no. and email (live app companySearchOr). Contact details stay masked until unlocked.
// URL sets filters so the agent and Contacts can link here: ?country=VN&isic=5510,5610&q=...
// Preview states: ?state=loading | error | no-saved (no saved searches). ?view=all skips the start panel,
// ?search=<id> opens a saved search (s1, s2).
// Studio Admin pass (2026-10-28, /dashboard/products): full-height page, the table scrolls under a sticky header
// so filters, the selection bar and paging stay in view; single-choice filters show their value in the trigger
// ("Country: Vietnam") instead of a chip; "Clear filters" only while filtering; the masking note moved behind ⓘ.
// Competitor pass (2026-10-29, Competitor.md R11–R13, Apollo A1): an active filter gets a brand dot (a count for
// multi-value ones) and every value is a removable chip, with Clear all; tabs Total / New / Already saved split
// the matches, New = not in any list of the workspace; filters save as a named search that reopens or goes to the
// agent; with nothing filtered the screen starts on a prompt for the agent plus quick filters (start-panel).

type Scope = "all" | "new" | "listed";

const SCOPES = [
  { value: "all", label: "Total" },
  { value: "new", label: "New" },
  { value: "listed", label: "Already saved" },
] as const;

const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label])) as Record<Company["status"], string>;
const STATUS_BADGE: Record<Company["status"], "secondary" | "warning" | "destructive"> = {
  active: "secondary",
  inactive: "warning",
  suspended: "warning",
  ceased: "destructive",
  unknown: "secondary",
};

export function CompaniesScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const previewState = params.get("state");
  const { lists, contacts } = useContactsStore();
  const storedSearches = useSavedSearches();
  const savedSearches = previewState === "no-saved" ? [] : storedSearches;
  const [initial] = useState<Search>(() => {
    const saved = getSavedSearch(params.get("search") ?? "");
    if (saved) return saved;
    return {
      query: params.get("q") ?? "",
      filters: {
        ...EMPTY_FILTERS,
        country: params.get("country") ?? undefined,
        isic: params.get("isic")?.split(",").filter(Boolean) ?? [],
        status: params.get("status") ?? undefined,
      },
    };
  });
  const [query, setQuery] = useState(initial.query);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [scope, setScope] = useState<Scope>("all");
  const [browse, setBrowse] = useState(params.get("view") === "all");
  const [open, setOpen] = useState<Company | null>(null);
  const [saving, setSaving] = useState<Company[] | null>(null);
  const [savingSearch, setSavingSearch] = useState<Search | null>(null);
  const [importing, setImporting] = useState(false);

  // Lists each company is in: saved from this screen (matched by name, like the contacts dedupe) or seeded.
  const listsOf = useMemo(() => {
    const byName = new Map<string, Set<string>>();
    for (const [listId, cs] of Object.entries(contacts)) {
      for (const c of cs) {
        const key = c.company.trim().toLowerCase();
        byName.set(key, (byName.get(key) ?? new Set<string>()).add(listId));
      }
    }
    return (c: Company) => {
      const ids = new Set(byName.get(c.name.toLowerCase()));
      const seeded = SEEDED_IN_LIST.get(c.id);
      if (seeded) ids.add(seeded);
      return [...ids];
    };
  }, [contacts]);

  const search: Search = { query, filters };
  const results = useMemo(() => filterCompanies({ query, filters }), [filters, query]);
  const counts = useMemo(() => {
    const listed = results.filter((c) => listsOf(c).length > 0).length;
    return { all: results.length, new: results.length - listed, listed };
  }, [results, listsOf]);
  const scoped = useMemo(
    () => (scope === "all" ? results : results.filter((c) => (listsOf(c).length > 0) === (scope === "listed"))),
    [results, scope, listsOf]
  );

  const active = activeFilters(search);
  const filtering = active.length > 0;
  const activeSaved = filtering ? savedSearches.find((s) => sameSearch(s, search)) : undefined;
  // Nothing filtered and not browsing: start on the agent prompt + quick filters (R13). The loading preview keeps the table.
  const starting = !filtering && !browse && previewState !== "loading";
  const rows = starting ? [] : scoped;

  const applySearch = (s: Search) => {
    setQuery(s.query);
    setFilters({ ...s.filters, isic: [...s.filters.isic], quality: [...s.filters.quality] });
  };
  const clearAll = () => applySearch({ query: "", filters: EMPTY_FILTERS });
  const newCount = (s: Search) => filterCompanies(s).filter((c) => listsOf(c).length === 0).length;

  function exportRows(rows: Company[]) {
    const n = Math.min(rows.length, EXPORT_MAX_ROWS);
    toast.success(`Exporting ${n.toLocaleString("en-US")} companies to Excel`, {
      description:
        rows.length > EXPORT_MAX_ROWS
          ? `Exports stop at ${EXPORT_MAX_ROWS.toLocaleString("en-US")} rows. Narrow the filters to get the rest.`
          : "The file downloads when it's ready. Contact details stay masked.",
    });
  }

  function addOne(c: Company, listId: string) {
    const { added } = upsertContacts(listId, [toContact(c)]);
    const name = lists.find((l) => l.id === listId)?.name;
    toast.success(added ? `Added to “${name}”` : `Already in “${name}”, updated`, {
      action: {
        label: "Open list",
        onClick: () => router.push(`/contacts/${listId}`),
      },
    });
  }

  const columns: DataTableColumn<Company>[] = [
    {
      id: "name",
      header: "Company",
      accessorFn: (c) => c.name,
      cell: ({ row: { original: c } }) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <Button variant="link" className="h-auto max-w-full justify-start border-0 p-0 text-foreground" onClick={() => setOpen(c)}>
            <span className="truncate">{c.name}</span>
          </Button>
          <span className="truncate text-sm text-muted-foreground">{c.city}</span>
        </div>
      ),
    },
    {
      // Label only when not active (DESIGN §2): active rows stay blank, so a ceased or inactive company stands out.
      id: "status",
      header: "Status",
      accessorFn: (c) => (c.status === "active" ? "" : STATUS_LABEL[c.status]),
      cell: ({ row: { original: c } }) =>
        c.status !== "active" && <Badge variant={STATUS_BADGE[c.status]}>{STATUS_LABEL[c.status]}</Badge>,
    },
    {
      id: "country",
      header: "Country",
      accessorFn: (c) => countryLabel(c.country),
    },
    {
      id: "industry",
      header: "Industry",
      accessorFn: (c) => isicLabel(c.isic),
      cell: ({ row: { original: c } }) => (
        <span className="flex flex-col gap-0.5">
          <span>{isicLabel(c.isic)}</span>
          <span className="text-sm text-muted-foreground tabular-nums">ISIC {c.isic}</span>
        </span>
      ),
    },
    {
      id: "founded",
      header: "Founded",
      accessorFn: (c) => c.incorporatedOn,
      cell: ({ row: { original: c } }) => <span className="text-muted-foreground tabular-nums">{formatDate(c.incorporatedOn)}</span>,
    },
    {
      id: "contact",
      header: "Contact",
      enableSorting: false,
      // Only whether the registry has it; the value is masked (see the Sheet).
      cell: ({ row: { original: c } }) => (
        <span className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">
          {c.email && (
            <Hint label="Email on file (masked)">
              <span tabIndex={0} className="flex items-center gap-1">
                <MailIcon aria-hidden />
                <span className="sr-only">Email on file</span>
              </span>
            </Hint>
          )}
          {c.phone && (
            <Hint label="Phone on file (masked)">
              <span tabIndex={0} className="flex items-center gap-1">
                <PhoneIcon aria-hidden />
                <span className="sr-only">Phone on file</span>
              </span>
            </Hint>
          )}
        </span>
      ),
    },
  ];

  const withEmail = rows.filter((c) => c.email).length;

  return (
    // Full height (Studio Admin products): 100svh minus header 3rem, page padding 2 × 1.5rem, and 2.5rem so the
    // paging row ends above the floating "Ask the agent" button.
    <div className="flex h-[calc(100svh-8.5rem)] min-h-[560px] flex-col gap-6">
      <PageHeader
        title={LEADS_TITLE}
        description={LEADS_DESCRIPTION}
        actions={
          <>
            <Button variant="outline" onClick={() => exportRows(rows)} disabled={rows.length === 0}>
              <DownloadIcon data-icon="inline-start" />
              Export
            </Button>
            {/* Outline while the start panel shows: its "Build search" is then the page's one solid button. */}
            <Button variant={starting ? "outline" : "default"} onClick={() => setSaving(rows)} disabled={withEmail === 0}>
              <ListPlusIcon data-icon="inline-start" />
              Save as contact list
            </Button>
          </>
        }
      />
      <LeadsTabs />

      <div className="flex shrink-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="w-full sm:w-72">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search companies"
              placeholder="Name, person, registration no."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>
          <LabelledSelect
            label="Country"
            value={filters.country}
            options={COUNTRIES.map((c) => ({ value: c.code, label: c.label }))}
            onChange={(v) => setFilters({ ...filters, country: v })}
          />
          <TreeSelect
            label="Industry"
            groups={ISIC}
            value={filters.isic}
            onChange={(isic) => setFilters({ ...filters, isic })}
            searchPlaceholder="Search industries"
            emptyText="No industry matches"
            className="font-normal"
          />
          <LabelledSelect
            label="Status"
            value={filters.status}
            options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            onChange={(v) => setFilters({ ...filters, status: v })}
          />
          <LabelledSelect
            label="Founded"
            value={filters.founded}
            options={FOUNDED.map((s) => ({ value: s.value, label: s.label }))}
            onChange={(v) => setFilters({ ...filters, founded: v })}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="font-normal">
                {/* Same count badge as the Industry tree: the values themselves are chips below. */}
                Data
                {filters.quality.length > 0 && (
                  <Badge variant="brand" className="tabular-nums">
                    {filters.quality.length}
                  </Badge>
                )}
                <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                {QUALITY.map((q) => (
                  <DropdownMenuCheckboxItem
                    key={q.value}
                    checked={filters.quality.includes(q.value)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(on) =>
                      setFilters((f) => ({
                        ...f,
                        quality: on ? [...f.quality, q.value] : f.quality.filter((x) => x !== q.value),
                      }))
                    }
                  >
                    {q.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto">
            <SavedSearchesMenu
              searches={savedSearches}
              activeId={activeSaved?.id}
              newCount={newCount}
              onOpen={(s) => {
                applySearch(s);
                setScope("all");
              }}
            />
          </div>
        </div>

        {/* Every active value as a chip with its own ×, then Clear all; right: save the search or work it with the agent. */}
        {filtering && (
          <div className="flex flex-wrap items-center gap-2">
            {active.map((a) => (
              <Badge
                key={a.key}
                variant="outline"
                className="h-6 gap-1 border-primary-soft bg-primary-subtle pr-0.5 font-medium text-foreground"
              >
                <span className="text-muted-foreground">{a.label}:</span>
                {a.value}
                <ChipRemove
                  label={`Remove ${a.label.toLowerCase()} ${a.value}`}
                  onClick={() => applySearch(withoutFilter(search, a.key))}
                  className="hover:bg-primary-soft"
                />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear all
            </Button>
            <div className="ml-auto flex items-center gap-2">
              {activeSaved ? (
                <>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <BookmarkCheckIcon className="size-4" aria-hidden />
                    <span className="max-w-56 truncate">
                      Saved as <span className="font-medium text-foreground">{activeSaved.name}</span>
                    </span>
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete saved search ${activeSaved.name}`}
                        onClick={() => {
                          deleteSavedSearch(activeSaved.id);
                          toast(`Deleted “${activeSaved.name}”`, { description: "The filters stay on until you clear them." });
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete saved search</TooltipContent>
                  </Tooltip>
                  <Button variant="outline" size="sm" onClick={() => router.push(agentHref(workSearchPrompt(activeSaved)))}>
                    <SaellaMini size={20} data-icon="inline-start" className="size-5" />
                    Ask the agent to work this search
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setSavingSearch(search)}>
                  <BookmarkPlusIcon data-icon="inline-start" />
                  Save search
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {previewState === "error" ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The search didn&apos;t finish</AlertTitle>
          <AlertDescription>
            The company registry took too long to answer. Try again, or narrow the filters to one country.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => router.replace("/companies")}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : starting ? (
        <StartPanel
          total={allCompanies.length}
          saved={savedSearches}
          onSearch={applySearch}
          onOpenSaved={applySearch}
          onBrowseAll={() => setBrowse(true)}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* Total / New / Already saved (Apollo Total · Net New · Saved): New = in no list of this workspace yet.
              Chips, not tabs (2026-11-05): LeadsTabs above is the page's only underline tab row. */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              aria-label="Which matches to show"
              className="flex-wrap"
              value={scope}
              onValueChange={(v) => setScope((v || "all") as Scope)}
            >
              {SCOPES.map((tab) => (
                <ToggleGroupItem key={tab.value} value={tab.value} aria-label={`${tab.label}, ${counts[tab.value].toLocaleString("en-US")}`}>
                  {tab.label}
                  {previewState === "loading" ? (
                    <Skeleton className="h-4 w-6" />
                  ) : (
                    <span className="text-muted-foreground tabular-nums">{counts[tab.value].toLocaleString("en-US")}</span>
                  )}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="flex items-center gap-1">
              {/* The "N in your lists · N with email" line and its ⓘ were removed (user request 2026-10-30): the tab
                  badges already give the counts. */}
              {/* Already saved also holds the user's own contacts (user request 2026-10-30): import them from here,
                  same dialog as Contacts. Rows here are matched by company name, so imported people whose company is
                  in the registry show up in this tab. Outline: the page keeps one solid button. */}
              {scope === "listed" && (
                <Button variant="outline" size="sm" onClick={() => setImporting(true)}>
                  <UploadIcon data-icon="inline-start" />
                  Import your contacts
                </Button>
              )}
            </div>
          </div>
          <TableFill className="flex-1">
            <DataTable
              label="Companies"
              data={rows}
              columns={columns}
              getRowId={(c) => c.id}
              selectable
              loading={previewState === "loading"}
              pageSizeOptions={[20, 50, 100]}
              bulkActions={(selected) => (
                <>
                  <Button variant="outline" size="sm" onClick={() => setSaving(selected)} disabled={!selected.some((r) => r.email)}>
                    <ListPlusIcon data-icon="inline-start" />
                    Save as contact list
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportRows(selected)}>
                    <DownloadIcon data-icon="inline-start" />
                    Export
                  </Button>
                </>
              )}
              emptyState={
                results.length > 0 && scope === "new" ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>Every match is already saved</EmptyTitle>
                      <EmptyDescription>Widen the filters to find companies you haven&apos;t saved yet.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button variant="outline" onClick={() => setScope("all")}>
                        Show all matches
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : results.length > 0 && scope === "listed" ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>None of these are saved yet</EmptyTitle>
                      <EmptyDescription>Save the ones you want to reach as a contact list, or import contacts you already have.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="flex-row justify-center">
                      <Button variant="outline" onClick={() => setImporting(true)}>
                        <UploadIcon data-icon="inline-start" />
                        Import your contacts
                      </Button>
                      <Button variant="ghost" onClick={() => setScope("new")}>
                        Show new companies
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
                      <Button variant="outline" onClick={clearAll}>
                        Clear filters
                      </Button>
                    </EmptyContent>
                  </Empty>
                )
              }
            />
          </TableFill>
        </div>
      )}

      <CompanySheet
        company={open}
        lists={lists}
        onOpenChange={(o) => !o && setOpen(null)}
        onAddToList={addOne}
        onNewList={(c) => setSaving([c])}
      />
      <ImportDialog
        open={importing}
        onOpenChange={setImporting}
        onImported={() => undefined}
        onViewList={(id) => router.push(`/contacts/${id}`)}
      />
      <SaveListDialog
        companies={saving}
        defaultName={suggestName(filters)}
        onOpenChange={(o) => !o && setSaving(null)}
        onSave={(name, rows) => {
          const id = createList({ name, source: "companies", tags: [] });
          upsertContacts(id, rows.map(toContact));
          setSaving(null);
          setOpen(null);
          toast.success(`Saved “${name}”`, {
            description: `${rows.length.toLocaleString("en-US")} contacts from Companies`,
            action: {
              label: "Open list",
              onClick: () => router.push(`/contacts/${id}`),
            },
          });
        }}
      />
      <SaveSearchDialog
        search={savingSearch}
        defaultName={suggestName(filters)}
        existing={savedSearches}
        onOpenChange={(o) => !o && setSavingSearch(null)}
        onSave={(name) => {
          if (!savingSearch) return;
          const saved = saveSearch(name, savingSearch);
          setSavingSearch(null);
          toast.success(`Saved search “${name}”`, {
            description: "Reopen it from Saved searches, or hand it to the agent.",
            action: {
              label: "Ask the agent",
              onClick: () => router.push(agentHref(workSearchPrompt(saved))),
            },
          });
        }}
      />
    </div>
  );
}

/** Filters run before the table (patterns §1), so the agent, the URL and saved searches share one matcher. */
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

function toContact(c: Company) {
  return {
    firstName: "",
    lastName: "",
    email: c.email ?? "",
    company: c.name,
    tags: [],
    masked: true,
  };
}

function suggestName(f: Filters) {
  const parts = [
    f.isic.length === 1 ? isicLabel(f.isic[0]) : f.isic.length > 1 ? `${f.isic.length} industries` : "Companies",
    f.country ? countryLabel(f.country) : undefined,
  ];
  return parts.filter(Boolean).join(" – ");
}

/** Single-choice filter that shows its value in the trigger, "Country: All" (Studio Admin users/products).
 *  While set, a brand dot leads the trigger (R11) so active filters read at a glance next to the Industry count. */
function LabelledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: { value: string; label: string }[];
  onChange: (value?: string) => void;
}) {
  return (
    <Select value={value ?? "__all"} onValueChange={(v) => onChange(v === "__all" ? undefined : v)}>
      <SelectTrigger aria-label={`Filter by ${label.toLowerCase()}`}>
        {value && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-brand" />}
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        <SelectGroup>
          <SelectItem value="__all">All</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
