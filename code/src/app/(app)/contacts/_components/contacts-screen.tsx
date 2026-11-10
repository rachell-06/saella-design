"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2Icon,
  CircleAlertIcon,
  InfoIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { LEADS_DESCRIPTION, LEADS_TITLE, LeadsTabs } from "@/components/saella/leads-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type DataTableColumn, revealOnRowHover } from "@/components/saella/data-table";
import { FilterBar, type FilterValue } from "@/components/saella/filter-bar";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SOURCE_LABEL, deleteList, fmt, formatDate, type ListMeta, listStats, ownerName, renameList, useContactsStore } from "@/lib/mock/contacts";
import { ImportDialog } from "@/components/features/import-dialog";
import { DeleteListDialog, RenameListDialog } from "./list-dialogs";
import { Hint } from "@/components/saella/hint";

// Contacts (PRD Contacts + live app /dashboard/email/contacts, 2026-10-28): the workspace's own contact lists.
// A list is what a batch sends to; lists come from an upload, from Companies ("Save as contact list") or from
// the agent. Row: name + one line of source · owner · date; numbers; tags. Send and ⋯ appear on hover/focus.
// Preview states: ?state=loading | empty | error. ?import=review | done opens the upload on that step (sample file).
// Studio Admin pass (2026-10-28): the "Unreachable" footnote moved behind ⓘ in the column header.

type Row = ListMeta & { contacts: number; unreachable: number };

export function ContactsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const previewState = params.get("state");
  const store = useContactsStore();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterValue>({});
  const importPreview = (["review", "done"] as const).find((s) => s === params.get("import"));
  const [importing, setImporting] = useState(false);
  // A preview-opened dialog opens a tick after load: opened during hydration, Radix marks the still-hydrating
  // agent launcher aria-hidden and React reports a hydration mismatch (2026-10-29).
  useEffect(() => {
    if (!importPreview) return;
    const t = window.setTimeout(() => setImporting(true), 0);
    return () => window.clearTimeout(t);
  }, [importPreview]);
  const [toRename, setToRename] = useState<ListMeta | null>(null);
  const [toDelete, setToDelete] = useState<ListMeta | null>(null);

  const all: Row[] = useMemo(
    () => (previewState === "empty" ? [] : store.lists.map((l) => ({ ...l, ...listStats(store.contacts[l.id]) }))),
    [store, previewState]
  );
  const tagOptions = useMemo(() => [...new Set(all.flatMap((l) => l.tags))].sort(), [all]);
  const sourceOptions = Object.values(SOURCE_LABEL);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tags = filters.tag ?? [];
    const sources = filters.source ?? [];
    return all.filter(
      (l) =>
        (!q || l.name.toLowerCase().includes(q)) &&
        (tags.length === 0 || l.tags.some((t) => tags.includes(t))) &&
        (sources.length === 0 || sources.includes(SOURCE_LABEL[l.source]))
    );
  }, [all, filters, query]);

  const columns: DataTableColumn<Row>[] = [
    {
      id: "name",
      header: "List",
      accessorFn: (r) => r.name,
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={`/contacts/${row.original.id}`}
            className="truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {row.original.name}
          </Link>
          <span className="truncate text-sm text-muted-foreground">
            {SOURCE_LABEL[row.original.source]} · {ownerName(row.original.ownerId)} · {formatDate(row.original.createdOn)}
          </span>
        </div>
      ),
    },
    {
      id: "contacts",
      header: "Contacts",
      accessorFn: (r) => r.contacts,
      meta: { align: "end" },
      cell: ({ row }) => fmt(row.original.contacts),
    },
    {
      id: "unreachable",
      // The meaning sits behind ⓘ instead of a footnote under the table (DESIGN.md). Not sortable, so the
      // ⓘ button isn't nested in the sort button. Header renamed to the email status level it counts (R10, 2026-10-29).
      enableSorting: false,
      header: () => (
        <span className="inline-flex items-center gap-1">
          Do not send
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label="What Do not send means">
                <InfoIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 font-normal">
              Addresses that bounced, marked you as spam or were flagged by you. They are left out when you send.
            </TooltipContent>
          </Tooltip>
        </span>
      ),
      accessorFn: (r) => r.unreachable,
      meta: { align: "end" },
      cell: ({ row }) =>
        row.original.unreachable > 0 ? (
          <Hint label={`${((row.original.unreachable / Math.max(row.original.contacts, 1)) * 100).toFixed(1)}% of the list. Left out when you send.`}>
            <span>
              {fmt(row.original.unreachable)}
            </span>
          </Hint>
        ) : null,
    },
    {
      id: "tags",
      header: "Tags",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tags.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className={`flex items-center justify-end gap-1 ${revealOnRowHover}`}>
          <SendButton list={row.original} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${row.original.name}`}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => router.push(`/contacts/${row.original.id}`)}>
                  <UsersIcon />
                  Open list
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setToRename(row.original)}>
                  <PencilIcon />
                  Rename
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(row.original)}>
                  <Trash2Icon />
                  Delete list
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const uploadButton = (
    <Button size="sm" onClick={() => setImporting(true)}>
      <UploadIcon data-icon="inline-start" />
      Upload contacts
    </Button>
  );
  const findButton = (
    <Button variant="outline" asChild>
      <Link href="/companies">
        <Building2Icon data-icon="inline-start" />
        Find companies
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader title={LEADS_TITLE} description={LEADS_DESCRIPTION} actions={uploadButton} />
      {/* "Find companies" left the header: the Leads tab right below goes there (2026-10-29). */}
      <LeadsTabs />

      {previewState === "error" ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Contacts didn&apos;t load</AlertTitle>
          <AlertDescription>Check your connection and try again. Your lists are safe.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => router.replace("/contacts")}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : all.length === 0 && previewState !== "loading" ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No contact lists yet</EmptyTitle>
            <EmptyDescription>
              Upload a CSV or Excel file of people you already know, or find companies in Southeast Asia and save them as a list.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            {findButton}
            {uploadButton}
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          <FilterBar
            facets={[
              { key: "tag", label: "Tag", options: tagOptions },
              { key: "source", label: "Source", options: sourceOptions },
            ]}
            value={filters}
            onChange={setFilters}
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search lists"
            resultCount={rows.length}
            resultNoun={rows.length === 1 ? "list" : "lists"}
          />
          <DataTable
            label="Contact lists"
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            loading={previewState === "loading"}
            emptyState={
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No lists match</EmptyTitle>
                  <EmptyDescription>Try another tag, source or search term.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilters({});
                      setQuery("");
                    }}
                  >
                    Clear filters
                  </Button>
                </EmptyContent>
              </Empty>
            }
          />
        </div>
      )}

      <ImportDialog
        open={importing}
        onOpenChange={setImporting}
        preview={importPreview}
        // The dialog ends on its own result screen (R9), so no toast here; "View list" opens the list.
        onImported={() => undefined}
        onViewList={(id) => router.push(`/contacts/${id}`)}
      />
      <RenameListDialog
        list={toRename}
        onOpenChange={(o) => !o && setToRename(null)}
        onRename={(id, name) => {
          renameList(id, name);
          setToRename(null);
          toast.success("List renamed");
        }}
      />
      <DeleteListDialog
        list={toDelete}
        count={toDelete ? (store.contacts[toDelete.id]?.length ?? 0) : 0}
        onOpenChange={(o) => !o && setToDelete(null)}
        onDelete={(id) => {
          deleteList(id);
          setToDelete(null);
          toast.success("List deleted");
        }}
      />
    </>
  );
}

/** Starts a batch to this list (batch wizard, agent B). Disabled with a reason when nobody is reachable. */
export function SendButton({ list, variant = "outline" }: { list: Row; variant?: "outline" | "default" }) {
  const reachable = list.contacts - list.unreachable;
  if (reachable <= 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* span keeps the tooltip working on a disabled button */}
          <span tabIndex={0}>
            <Button variant={variant} size="sm" disabled>
              <SendIcon data-icon="inline-start" />
              {variant === "default" ? "Send to this list" : "Send"}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{list.contacts === 0 ? "This list is empty" : "Nobody in this list can be reached"}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Button variant={variant} size="sm" asChild>
      <Link href={`/batches/new?list=${list.id}`}>
        <SendIcon data-icon="inline-start" />
        {variant === "default" ? "Send to this list" : "Send"}
      </Link>
    </Button>
  );
}
