"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleSlashIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  Trash2Icon,
  UploadIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type DataTableColumn, revealOnRowHover } from "@/components/saella/data-table";
import { FilterBar, type FilterValue } from "@/components/saella/filter-bar";
import { TableFill } from "@/components/saella/table-fill";
import { TagInput } from "@/components/saella/tag-input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SendButton } from "./contacts-screen";
import { ContactDialog } from "./contact-dialog";
import { type ActivityState, ContactSheet } from "./contact-sheet";
import {
  type Contact,
  type EmailSafety,
  SAFETY_LABEL,
  SOURCE_LABEL,
  deleteList,
  emailSafety,
  fmt,
  formatDate,
  listStats,
  maskEmail,
  normalizeTags,
  ownerName,
  removeContacts,
  renameList,
  safetyCounts,
  safetyReason,
  updateContacts,
  upsertContacts,
  useContactsStore,
} from "@/lib/mock/contacts";
import { SAFETY_RANK, SafetyBadge } from "./email-safety";
import { ImportDialog } from "@/components/features/import-dialog";
import { DeleteListDialog, RenameListDialog } from "./list-dialogs";

// One contact list (2026-10-28). Tabs All / Reachable / Unreachable with counts; one search across name, email,
// company and position (PRD Contacts AC-CON-L-01); tag filter, case-insensitive with sorted options (CON-SEQ-002).
// Select rows to tag, flag or remove them. "Send to this list" opens the batch wizard with the list picked.
// Preview states: ?state=loading | error. An unknown list id shows a not-found state.
// Contact profile (R8, 2026-10-29): the name opens a Sheet with the email activity timeline;
// ?contact=<id> opens it on load, &activity=loading | empty | error forces its state.
// ?import=review | done opens the upload on that step with the sample file (R9).
// Studio Admin pass (2026-10-28, /dashboard/users + products): full-height table with sticky header; the mostly
// empty Status column folded into an "Unreachable" badge beside the name.
// Email safety (R10, 2026-10-29, Apollo A1): the Reachable / Unreachable tabs and badge became three levels, Safe to
// send / Send with caution / Do not send, as tabs with counts and an "Email status" column (reason on hover).
// "Do not send" is the old unreachable flag, still what batches leave out. ?safety=safe | caution | do_not_send
// opens on that tab.

type StatusTab = "all" | EmailSafety;
const TABS: StatusTab[] = ["all", "safe", "caution", "do_not_send"];

/** Shown when a level's tab is empty and nothing else narrows it. */
const EMPTY_TAB: Record<EmailSafety, { title: string; description: string }> = {
  safe: { title: "No addresses confirmed yet", description: "An address moves here once one of your emails reaches it." },
  caution: {
    title: "Nothing to double-check",
    description: "Catch-all domains, shared inboxes and addresses no email has reached yet show up here.",
  },
  do_not_send: { title: "No addresses to skip", description: "Addresses that bounce, mark you as spam or that you flag show up here." },
};

export function ContactListScreen({ listId }: { listId: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const previewState = params.get("state");
  const store = useContactsStore();
  const list = store.lists.find((l) => l.id === listId);
  const contacts = useMemo(() => store.contacts[listId] ?? [], [store, listId]);
  const stats = listStats(contacts);

  const [tab, setTab] = useState<StatusTab>(() => TABS.find((t) => t === params.get("safety")) ?? "all");
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
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const [toRemove, setToRemove] = useState<Contact[] | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(params.get("contact"));
  const activityParam = params.get("activity");
  const activityState = (["loading", "empty", "error"] as const).find((s) => s === activityParam) as ActivityState | undefined;
  const viewing = contacts.find((c) => c.id === viewingId) ?? null;

  const tagOptions = useMemo(
    () => [...new Map(contacts.flatMap((c) => c.tags).map((t) => [t.toLowerCase(), t])).values()].sort((a, b) => a.localeCompare(b)),
    [contacts]
  );

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tags = (filters.tag ?? []).map((t) => t.toLowerCase());
    return contacts.filter(
      (c) =>
        (!q || [`${c.firstName} ${c.lastName}`, c.email, c.company, c.position ?? ""].some((f) => f.toLowerCase().includes(q))) &&
        (tags.length === 0 || c.tags.some((t) => tags.includes(t.toLowerCase())))
    );
  }, [contacts, filters, query]);
  const counts: Record<StatusTab, number> = { all: searched.length, ...safetyCounts(searched) };
  const visible = tab === "all" ? searched : searched.filter((c) => emailSafety(c) === tab);

  if (!list) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>This list doesn&apos;t exist</EmptyTitle>
          <EmptyDescription>It may have been deleted, or you don&apos;t have access to it.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href="/contacts">Back to Contacts</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const flag = (rows: Contact[], on: boolean) => {
    updateContacts(
      listId,
      rows.map((r) => r.id),
      (c) => ({
        ...c,
        unreachable: on ? (c.unreachable ?? "flagged") : undefined,
      })
    );
    toast.success(
      on ? `${fmt(rows.length)} marked Do not send` : `${fmt(rows.length)} can be sent to again`,
      on
        ? { description: "They are left out when you send to this list." }
        : { description: "Saella moves them back to Do not send if an email bounces." }
    );
  };

  const columns: DataTableColumn<Contact>[] = [
    {
      id: "name",
      header: "Contact",
      accessorFn: (c) => `${c.firstName} ${c.lastName}`,
      cell: ({ row: { original: c } }) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setViewingId(c.id)}
              className="truncate text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {`${c.firstName} ${c.lastName}`.trim() || (c.masked ? c.company : c.email)}
            </button>
          </span>
          <span
            className="truncate text-sm text-muted-foreground"
            title={c.masked ? "Hidden until unlocked. Sending to it still works." : undefined}
          >
            {c.masked ? maskEmail(c.email) : c.email}
          </span>
        </div>
      ),
    },
    {
      // Label only when not normal (DESIGN §2, 2026-11-05): safe rows stay blank, caution / do not send get the
      // badge and its reason on hover. The filter chips above still count Safe to send.
      id: "safety",
      header: "Email status",
      accessorFn: (c) => SAFETY_RANK[emailSafety(c)],
      cell: ({ row: { original: c } }) =>
        emailSafety(c) !== "safe" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <SafetyBadge safety={emailSafety(c)} tabIndex={0} />
          </TooltipTrigger>
          <TooltipContent className="max-w-64">{safetyReason(c)}</TooltipContent>
        </Tooltip>
        ),
    },
    {
      id: "company",
      header: "Company",
      accessorFn: (c) => c.company,
      cell: ({ row: { original: c } }) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate">{c.company}</span>
          {c.position && <span className="truncate text-sm text-muted-foreground">{c.position}</span>}
        </div>
      ),
    },
    {
      id: "tags",
      header: "Tags",
      enableSorting: false,
      cell: ({ row: { original: c } }) => (
        <div className="flex max-w-64 flex-wrap gap-1">
          {c.tags.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "lastSent",
      header: "Last sent",
      accessorFn: (c) => c.lastSent?.on ?? "",
      cell: ({ row: { original: c } }) =>
        c.lastSent ? (
          <span className="text-muted-foreground" title={c.lastSent.template}>
            {formatDate(c.lastSent.on)}
          </span>
        ) : null,
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row: { original: c } }) => (
        <div className={`flex justify-end ${revealOnRowHover}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.email}`}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setViewingId(c.id)}>
                  <UserRoundIcon />
                  View profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditing(c)} disabled={c.masked}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                {c.unreachable ? (
                  <DropdownMenuItem onSelect={() => flag([c], false)}>
                    <CircleCheckIcon />
                    Allow sending
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => flag([c], true)}>
                    <CircleSlashIcon />
                    Mark Do not send
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onSelect={() => setToRemove([c])}>
                  <Trash2Icon />
                  Remove from list
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const row = { ...list, ...stats };

  return (
    // Full height (Studio Admin products): the contact table scrolls under a sticky header, so tabs, filters, the
    // selection bar and paging stay in view on 100-row pages. Same sizing as Companies.
    <div className="flex h-[calc(100svh-8.5rem)] min-h-[560px] flex-col gap-6">
      <PageHeader
        title={list.name}
        breadcrumbs={[
          { label: "Leads", href: "/companies" },
          { label: "Your lists", href: "/contacts" },
        ]}
        description={`${SOURCE_LABEL[list.source]} · created by ${ownerName(list.ownerId)} on ${formatDate(list.createdOn)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing("new")}>
              <PlusIcon data-icon="inline-start" />
              Add contact
            </Button>
            <Button variant="outline" onClick={() => setImporting(true)}>
              <UploadIcon data-icon="inline-start" />
              Upload
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More list actions">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => setRenaming(true)}>
                    <PencilIcon />
                    Rename list
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                    <Trash2Icon />
                    Delete list
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <SendButton list={row} variant="default" />
          </>
        }
      />

      {previewState === "error" ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>This list didn&apos;t load</AlertTitle>
          <AlertDescription>Check your connection and try again.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => router.replace(`/contacts/${listId}`)}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : contacts.length === 0 && previewState !== "loading" ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No contacts in this list</EmptyTitle>
            <EmptyDescription>Upload a file or add people one by one.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            <Button variant="outline" onClick={() => setEditing("new")}>
              <PlusIcon data-icon="inline-start" />
              Add contact
            </Button>
            <Button variant="outline" onClick={() => setImporting(true)}>
              <UploadIcon data-icon="inline-start" />
              Upload
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex shrink-0 flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
              <TabsList aria-label="Email status">
                {TABS.map((t) => (
                  <TabsTrigger key={t} value={t}>
                    {t === "all" ? "All" : SAFETY_LABEL[t]}
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 tabular-nums">
                      {fmt(counts[t])}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <FilterBar
              facets={[{ key: "tag", label: "Tag", options: tagOptions }]}
              value={filters}
              onChange={setFilters}
              query={query}
              onQueryChange={setQuery}
              searchPlaceholder="Search name, email, company"
            />
          </div>
          <TableFill className="flex-1">
            <DataTable
              label={`Contacts in ${list.name}`}
              data={visible}
              columns={columns}
              getRowId={(c) => c.id}
              selectable
              loading={previewState === "loading"}
              pageSizeOptions={[20, 50, 100]}
              bulkActions={(rows) => (
                <>
                  <BulkTagButton
                    suggestions={tagOptions}
                    onApply={(tags) => {
                      updateContacts(
                        listId,
                        rows.map((r) => r.id),
                        (c) => ({
                          ...c,
                          tags: normalizeTags([...c.tags, ...tags]),
                        })
                      );
                      toast.success(`Tagged ${fmt(rows.length)} contacts`, {
                        description: tags.join(", "),
                      });
                    }}
                  />
                  {rows.some((r) => !r.unreachable) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        flag(
                          rows.filter((r) => !r.unreachable),
                          true
                        )
                      }
                    >
                      <CircleSlashIcon data-icon="inline-start" />
                      Mark Do not send
                    </Button>
                  )}
                  {rows.some((r) => r.unreachable) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        flag(
                          rows.filter((r) => r.unreachable),
                          false
                        )
                      }
                    >
                      <CircleCheckIcon data-icon="inline-start" />
                      Allow sending
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => setToRemove(rows)}>
                    <Trash2Icon data-icon="inline-start" />
                    Remove
                  </Button>
                </>
              )}
              emptyState={
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{tab !== "all" && !query && !filters.tag?.length ? EMPTY_TAB[tab].title : "No contacts match"}</EmptyTitle>
                    <EmptyDescription>
                      {tab !== "all" && !query && !filters.tag?.length ? EMPTY_TAB[tab].description : "Try another tab, tag or search term."}
                    </EmptyDescription>
                  </EmptyHeader>
                  {(query || filters.tag?.length) && (
                    <EmptyContent>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setQuery("");
                          setFilters({});
                        }}
                      >
                        Clear filters
                      </Button>
                    </EmptyContent>
                  )}
                </Empty>
              }
            />
          </TableFill>
        </div>
      )}

      <ImportDialog
        open={importing}
        onOpenChange={setImporting}
        listId={listId}
        preview={importPreview}
        // The dialog ends on its own result screen (R9), so no toast here.
        onImported={() => undefined}
      />
      <ContactSheet
        contact={viewing}
        listId={listId}
        listSize={contacts.length}
        activityState={activityState}
        onOpenChange={(o) => !o && setViewingId(null)}
        onEdit={(c) => {
          setViewingId(null);
          setEditing(c);
        }}
        onRetry={() => router.replace(`/contacts/${listId}?contact=${viewingId ?? ""}`)}
      />
      <ContactDialog
        open={editing !== null}
        contact={editing && editing !== "new" ? editing : undefined}
        tagSuggestions={tagOptions}
        onOpenChange={(o) => !o && setEditing(null)}
        onSave={(draft) => {
          if (editing && editing !== "new") {
            // A changed address hasn't been checked: drop the caution reason that belonged to the old one.
            updateContacts(listId, [editing.id], (c) => ({ ...c, ...draft, caution: draft.email === c.email ? c.caution : undefined }));
            toast.success("Contact saved");
          } else {
            const { added } = upsertContacts(listId, [draft]);
            toast.success(
              added ? "Contact added" : "Contact updated",
              added
                ? undefined
                : {
                    description: "This email was already in the list for the same company.",
                  }
            );
          }
          setEditing(null);
        }}
      />
      <RenameListDialog
        list={renaming ? list : null}
        onOpenChange={setRenaming}
        onRename={(id, name) => {
          renameList(id, name);
          setRenaming(false);
          toast.success("List renamed");
        }}
      />
      <DeleteListDialog
        list={deleting ? list : null}
        count={contacts.length}
        onOpenChange={setDeleting}
        onDelete={(id) => {
          router.push("/contacts");
          deleteList(id);
          toast.success("List deleted");
        }}
      />
      <AlertDialog open={toRemove !== null} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {toRemove?.length === 1 ? toRemove[0].email : `${fmt(toRemove?.length ?? 0)} contacts`} from this list?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Past sends and reports are kept. If you upload them again later, they come back as new contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!toRemove) return;
                removeContacts(
                  listId,
                  toRemove.map((c) => c.id)
                );
                toast.success(`Removed ${fmt(toRemove.length)} ${toRemove.length === 1 ? "contact" : "contacts"}`);
                setToRemove(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BulkTagButton({ suggestions, onApply }: { suggestions: string[]; onApply: (tags: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTags([]);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <TagIcon data-icon="inline-start" />
          Add tags
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-80 flex-col gap-3">
        <TagInput value={tags} onChange={(t) => setTags(normalizeTags(t))} suggestions={suggestions} />
        <Button
          disabled={tags.length === 0}
          onClick={() => {
            onApply(tags);
            setOpen(false);
            setTags([]);
          }}
        >
          Add to selected
        </Button>
      </PopoverContent>
    </Popover>
  );
}
