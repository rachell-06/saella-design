"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2Icon,
  CircleAlertIcon,
  CircleCheckIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  TagIcon,
  Trash2Icon,
  UploadIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { LEADS_DESCRIPTION, LEADS_TITLE, LeadsTabs } from "@/components/saella/leads-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { type DataTableColumn, revealOnRowHover } from "@/components/saella/data-table";
import { Hint } from "@/components/saella/hint";
import { FilterChips } from "@/components/saella/filter-popover";
import { UpdatedIndicator } from "@/components/saella/loading-status";
import { SectionLoader, combineLoads, useSectionLoad } from "@/components/saella/section-loader";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fmt, formatDate } from "@/lib/mock/contacts";
import { slowDelay, slowModeOf } from "@/lib/mock/delay";
import { ImportDialog } from "@/components/features/import-dialog";
import { type BookContact, addContact, deleteContact, editContact, invalidReason, isInvalid, useContactBook } from "./contact-book";
import { ContactDialog } from "./contact-dialog";
import { type ActivityState, ContactSheet } from "./contact-sheet";
import { CONTACT_SKELETON_ROWS, contactSkeletonCell } from "./contacts-skeleton";
import { ContactsBulkBar } from "./contacts-bulk";
import { ContactsTableView, useContactsTable } from "./contacts-table";
import { InvalidBadge, ValidBadge } from "./email-safety";
import {
  ContactFiltersPopover,
  NO_CONTACT_FILTERS,
  type ContactFilters,
  activeChips,
  filterCount,
  filtersFromParams,
  filtersToParams,
  matchesFilters,
} from "./contact-filters";

// Self-upload, tab label and card title (PRD Contacts "Self-upload", live app /dashboard/email/contacts "Individuals"): the workspace's own
// contact book, grouped by tag, no named lists.
// - Search: one box over first/last name, email, company, position and tags (AC-CON-L-01; tags added).
// - Filter popover: tags (several, a contact must carry all of them), email status, last sent,
//   company. Tags come from the whole book, case-insensitive and sorted (CON-SEQ-002). A tag chip in a row filters
//   by it (live app). ?tag=a&tag=b&status=invalid&sent=7d&company=... on load.
// - Add / edit (AC-CON-M-01..03), delete with confirmation (AC-CON-D-01/02), Excel/CSV upload with review
//   (AC-CON-I-01..04), profile in a Sheet with the email activity.
// - Email status Valid / Invalid with reason, only Invalid shown.
// Preview: ?state=loading | empty | error; ?import=review | done; ?contact=<id> (&activity=loading | empty | error).
// Loading: header, tabs, search and buttons render at once; the count and tags load first, the
// table on its own. ?slow=1 simulates a large book (count 1.5s, table 8s); ?slow=fail fails the table once.
// Layout: one Card; header = title + count, search and Filter (as
// Find companies); filter chips; the table flush in the card with numbered paging. Add / Upload in the page header.

const PAGE_SIZES = [20, 50, 100];
// Column icons as on Find companies.
const HEADER_ICONS = { name: UserRoundIcon, company: Building2Icon, status: CircleCheckIcon, tags: TagIcon, lastSent: SendIcon };

export function ContactsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const previewState = params.get("state");
  const book = useContactBook();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ContactFilters>(() => filtersFromParams(params));
  const importPreview = (["review", "done"] as const).find((s) => s === params.get("import"));
  const [importing, setImporting] = useState(false);
  // A preview-opened dialog opens a tick after load: opened during hydration, Radix marks the still-hydrating
  // agent launcher aria-hidden and React reports a hydration mismatch.
  useEffect(() => {
    if (!importPreview) return;
    const t = window.setTimeout(() => setImporting(true), 0);
    return () => window.clearTimeout(t);
  }, [importPreview]);
  const [editing, setEditing] = useState<BookContact | "new" | null>(null);
  const [toDelete, setToDelete] = useState<BookContact | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(params.get("contact"));
  const activityState = (["loading", "empty", "error"] as const).find((s) => s === params.get("activity")) as ActivityState | undefined;

  const all = useMemo(() => (previewState === "empty" ? [] : book.contacts), [book, previewState]);

  // The count and tags are one quick query; the rows are the slow one.
  const slow = slowModeOf(params.get("slow"));
  const forceLoading = previewState === "loading";
  const summaryLoad = useSectionLoad("contacts:summary", { delayMs: slowDelay(slow, "quick"), forceLoading });
  const summaryReady = summaryLoad.status === "ready";
  const tableLoad = useSectionLoad("contacts:table", {
    delayMs: slowDelay(slow, "table"),
    fail: slow === "fail" ? "error" : undefined,
    forceLoading,
    // Rows arrive page by page, so the count gives real progress.
    total: summaryReady ? { count: all.length, unit: "contacts" } : undefined,
  });
  const viewing = all.find((c) => c.id === viewingId) ?? null;

  // Filters live in the URL so the agent and notifications can link to a filtered book.
  const applyFilters = (next: ContactFilters) => {
    setFilters(next);
    const q = filtersToParams(next);
    router.replace(q.size ? `/contacts?${q}` : "/contacts", { scroll: false });
  };
  const addTag = (t: string) =>
    !filters.tags.some((x) => x.toLowerCase() === t.toLowerCase()) && applyFilters({ ...filters, tags: [...filters.tags, t] });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (c) =>
        (!q ||
          [`${c.firstName} ${c.lastName}`, c.email, c.company, c.position ?? "", ...c.tags].some((f) =>
            f.toLowerCase().includes(q)
          )) &&
        matchesFilters(c, filters)
    );
  }, [all, filters, query]);

  const columns: DataTableColumn<BookContact>[] = [
    {
      id: "name",
      header: "Contact",
      accessorFn: (c) => `${c.firstName} ${c.lastName}`.trim() || c.email,
      cell: ({ row: { original: c } }) => {
        const name = `${c.firstName} ${c.lastName}`.trim();
        return (
          // Name, then the email: two lines like Find companies' name + location, no avatar
          // (the Leads tables match). Cut text keeps title=.
          <div className="flex min-w-0 max-w-56 flex-col gap-0.5">
            <Button
              variant="link"
              className="h-auto max-w-full justify-start border-0 p-0 font-medium text-foreground hover:no-underline"
              onClick={() => setViewingId(c.id)}
            >
              <span className="truncate">{name || c.email}</span>
            </Button>
            {name && (
              <span className="truncate text-sm text-muted-foreground" title={c.email}>
                {c.email}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "company",
      header: "Company",
      accessorFn: (c) => c.company,
      cell: ({ row: { original: c } }) => (
        <div className="flex min-w-0 max-w-48 flex-col gap-0.5">
          <span className="truncate">{c.company}</span>
          {c.position && <span className="truncate text-sm text-muted-foreground">{c.position}</span>}
        </div>
      ),
    },
    {
      id: "status",
      header: "Email status",
      accessorFn: (c) => (isInvalid(c) ? 0 : 1),
      // Every row carries a badge, Valid by default, so the column reads the same down the page.
      cell: ({ row: { original: c } }) =>
        isInvalid(c) ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <InvalidBadge tabIndex={0} />
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{invalidReason(c)}</TooltipContent>
          </Tooltip>
        ) : (
          <ValidBadge />
        ),
    },
    {
      id: "tags",
      header: "Tags",
      enableSorting: false,
      cell: ({ row: { original: c } }) => {
        // One line: two tags, the rest behind "+N". Tags being filtered
        // on come first and in the brand tint (a "vip" filter must show "vip", not hide it in +N).
        const picked = new Set(filters.tags.map((t) => t.toLowerCase()));
        const isPicked = (t: string) => picked.has(t.toLowerCase());
        const tags = [...c.tags.filter(isPicked), ...c.tags.filter((t) => !isPicked(t))];
        return (
        <div className="flex items-center gap-1">
          {tags.slice(0, 2).map((t) => (
            <Hint key={t} label={`Show contacts tagged “${t}”`}>
              <Badge variant={isPicked(t) ? "brand" : "secondary"} asChild>
                <Link
                  href={`/contacts?tag=${encodeURIComponent(t)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    addTag(t);
                  }}
                >
                  {t}
                </Link>
              </Badge>
            </Hint>
          ))}
          {tags.length > 2 && (
            <Hint label={tags.slice(2).join(", ")}>
              <Badge variant="outline" tabIndex={0} className="tabular-nums">
                +{tags.length - 2}
              </Badge>
            </Hint>
          )}
        </div>
        );
      },
    },
    {
      id: "lastSent",
      header: "Last sent",
      accessorFn: (c) => c.lastSent?.on ?? "",
      cell: ({ row: { original: c } }) =>
        c.lastSent ? (
          <Hint label={c.lastSent.template}>
            <span tabIndex={0}>{formatDate(c.lastSent.on)}</span>
          </Hint>
        ) : null,
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row: { original: c } }) => (
        // Same "…" as the app's other row menus: centred, ghost, revealOnRowHover.
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className={revealOnRowHover} aria-label={`Actions for ${c.email}`}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setViewingId(c.id)}>
                  <UserRoundIcon />
                  View profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditing(c)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(c)}>
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const table = useContactsTable({ data: rows, columns, getRowId: (c) => c.id, pageSizeOptions: PAGE_SIZES, selectable: true });
  const selectedIds = table.state.rowSelection as Record<string, boolean>;
  const selected = rows.filter((c) => selectedIds[c.id]);

  const filtered = Boolean(query.trim() || filterCount(filters));
  const chips = activeChips(filters);
  const addButton = (
    <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
      <PlusIcon data-icon="inline-start" />
      Add contact
    </Button>
  );
  const uploadButton = (
    <Button size="sm" onClick={() => setImporting(true)}>
      <UploadIcon data-icon="inline-start" />
      Upload contacts
    </Button>
  );

  return (
    // Full height like Find companies: 100svh minus header 3rem, page padding 2 × 1.5rem, and 2.5rem so the
    // paging footer ends above the floating "Ask the agent" button.
    <div className="flex h-[calc(100svh-8.5rem)] min-h-[560px] flex-col gap-4 md:gap-6">
      {/* The tab's main actions sit in the page header.
          An empty book shows them in its empty state instead, so the page keeps one solid button. */}
      <PageHeader
        title={LEADS_TITLE}
        description={LEADS_DESCRIPTION}
        actions={
          !(summaryReady && all.length === 0) && (
            <>
              {addButton}
              {uploadButton}
            </>
          )
        }
      />
      <LeadsTabs />

      {previewState === "error" ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Contacts didn&apos;t load</AlertTitle>
          <AlertDescription>Check your connection and try again. Your contacts are safe.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => router.replace("/contacts")}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : summaryReady && all.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No contacts yet</EmptyTitle>
            <EmptyDescription>Upload an Excel or CSV file of people you already know, or add them one by one.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            {addButton}
            {uploadButton}
          </EmptyContent>
        </Empty>
      ) : (
        <Card className="min-h-0 flex-1 gap-0 pb-0">
          <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
            <CardTitle className="text-xl leading-none">Self-upload</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-2 tabular-nums">
              {!summaryReady ? (
                <Skeleton className="my-0.5 h-4 w-24" />
              ) : filtered ? (
                `${fmt(rows.length)} of ${fmt(all.length)} contacts`
              ) : (
                `${fmt(all.length)} contacts`
              )}
              <UpdatedIndicator {...combineLoads([summaryLoad, tableLoad])} />
            </CardDescription>
            <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
              <InputGroup className="h-7 w-full md:w-64">
                <InputGroupAddon align="inline-start">
                  <SearchIcon className="size-3.5" />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  className="h-7"
                  aria-label="Search name, email, company, position, tag"
                  placeholder="Name, email, company, tag"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </InputGroup>
              {/* Next to search, as on Find companies. Disabled while the tags load. */}
              <ContactFiltersPopover
                contacts={all}
                tags={book.tags}
                value={filters}
                onChange={applyFilters}
                disabled={!summaryReady}
              />
            </CardAction>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col px-0">
            {/* Active filters as chips under the header, same as Find companies. */}
            <FilterChips
              className="shrink-0 border-b px-4 py-3"
              chips={chips.map((chip) => ({ ...chip, onRemove: () => applyFilters(chip.remove) }))}
              onClearAll={() => applyFilters(NO_CONTACT_FILTERS)}
            />
            <SectionLoader
              load={tableLoad}
              label="Contacts table"
              className="flex min-h-0 flex-1 flex-col"
              errorTitle="Contacts didn't load"
              alertClassName="m-4 w-auto"
              status={
                summaryReady
                  ? `Loading ${fmt(all.length)} contacts…`
                  : "Loading contacts…"
              }
              skeleton={
                <ContactsTableView
                  table={table}
                  label="Contacts"
                  headerIcons={HEADER_ICONS}
                  loading
                  pageSizeOptions={PAGE_SIZES}
                  skeletonCell={contactSkeletonCell}
                  skeletonRows={CONTACT_SKELETON_ROWS}
                />
              }
            >
            <ContactsTableView
              table={table}
              label="Contacts"
              headerIcons={HEADER_ICONS}
              pageSizeOptions={PAGE_SIZES}
              onRowClick={(c) => setViewingId(c.id)}
              activeRowId={viewingId}
              emptyState={
                <Empty className="py-10">
                  <EmptyHeader>
                    <EmptyTitle>No contacts match</EmptyTitle>
                    <EmptyDescription>Try another tag or search term.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setQuery("");
                        applyFilters(NO_CONTACT_FILTERS);
                      }}
                    >
                      Clear filters
                    </Button>
                  </EmptyContent>
                </Empty>
              }
            />
            </SectionLoader>
          </CardContent>
        </Card>
      )}
      {/* Bulk actions float under the card, as on Find companies. */}
      {selected.length > 0 && (
        <ContactsBulkBar selected={selected} bookTags={book.tags} onClear={() => table.resetRowSelection()} />
      )}

      <ImportDialog
        open={importing}
        onOpenChange={setImporting}
        preview={importPreview}
        // The dialog ends on its own result screen, so no toast here; "View contacts" filters by the upload's tags.
        onImported={() => undefined}
        onViewContacts={(t) => applyFilters({ ...NO_CONTACT_FILTERS, tags: t })}
      />
      <ContactSheet
        contact={viewing}
        activityState={activityState}
        onOpenChange={(o) => !o && setViewingId(null)}
        onEdit={(c) => {
          setViewingId(null);
          setEditing(all.find((x) => x.id === c.id) ?? null);
        }}
        onRetry={() => router.replace(`/contacts?contact=${viewingId ?? ""}`)}
      />
      <ContactDialog
        open={editing !== null}
        contact={editing && editing !== "new" ? editing : undefined}
        tagSuggestions={book.tags}
        onOpenChange={(o) => !o && setEditing(null)}
        onSave={(draft) => {
          if (editing && editing !== "new") {
            editContact(editing, draft);
            toast.success("Contact saved");
          } else {
            const outcome = addContact(book.contacts, draft);
            toast.success(
              outcome === "added" ? "Contact added" : "Contact updated",
              outcome === "added" ? undefined : { description: "This email was already saved for the same company." }
            );
          }
          setEditing(null);
        }}
      />
      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Past sends and reports are kept. If you upload this person again later, they come back as a new contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!toDelete) return;
                deleteContact(toDelete);
                if (viewingId === toDelete.id) setViewingId(null);
                toast.success("Contact deleted");
                setToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
