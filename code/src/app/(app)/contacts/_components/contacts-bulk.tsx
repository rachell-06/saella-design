"use client";

import { useState } from "react";
import { TagIcon, TagsIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { SelectionBar } from "@/components/saella/selection-bar";
import { TagInput } from "@/components/saella/tag-input";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmt, normalizeTags, removeContacts, tagsOf, updateContacts } from "@/lib/mock/contacts";
import type { BookContact } from "./contact-book";

// Bulk actions for the selected Self-upload contacts (designer decision 2026-11-13), in the shared floating
// SelectionBar like Find companies. PRD Contacts has no bulk actions and forbids none; the live app has none
// (decisions.md). Each action is the one-contact rule applied to many:
// - Add tags: merged into each contact's tags (like Add contact, CON-SEQ-003 union).
// - Remove tag: one of the tags the selection carries.
// - Delete: confirmed; hard delete, past sends and reports kept (AC-CON-D-01/02, CON-DELETE-001).
const word = (n: number) => `${fmt(n)} ${n === 1 ? "contact" : "contacts"}`;

export function ContactsBulkBar({
  selected,
  bookTags,
  onClear,
}: {
  selected: BookContact[];
  /** Every tag in the book, offered when adding. */
  bookTags: string[];
  onClear: () => void;
}) {
  const [adding, setAdding] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ids = selected.map((c) => c.id);
  const selectedTags = tagsOf(selected);

  const addTags = () => {
    const tags = normalizeTags(adding);
    if (!tags.length) return;
    updateContacts(ids, (c) => ({ ...c, tags: normalizeTags([...c.tags, ...tags]) }));
    toast.success(`Tags added to ${word(ids.length)}`, { description: tags.join(", ") });
    setAdding([]);
    setAddOpen(false);
    onClear();
  };
  const removeTag = (tag: string) => {
    const lower = tag.toLowerCase();
    const hit = selected.filter((c) => c.tags.some((t) => t.toLowerCase() === lower)).length;
    updateContacts(ids, (c) => ({ ...c, tags: c.tags.filter((t) => t.toLowerCase() !== lower) }));
    toast.success(`“${tag}” removed from ${word(hit)}`);
    onClear();
  };
  const remove = () => {
    removeContacts(ids);
    toast.success(`${word(ids.length)} deleted`);
    onClear();
  };

  return (
    <>
      <SelectionBar count={selected.length} label="Selected contacts" onClear={onClear}>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <TagsIcon data-icon="inline-start" />
              Add tags
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" className="flex w-72 flex-col gap-3">
            <TagInput value={adding} onChange={(t) => setAdding(normalizeTags(t))} suggestions={bookTags} placeholder="Pick a tag or type a new one" listSide="top" />
            <Button size="sm" className="self-end" disabled={adding.length === 0} onClick={addTags}>
              Add to {word(ids.length)}
            </Button>
          </PopoverContent>
        </Popover>
        {selectedTags.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <TagIcon data-icon="inline-start" />
                Remove tag
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="max-h-72 w-56 overflow-y-auto">
              <DropdownMenuLabel>Remove from the selection</DropdownMenuLabel>
              <DropdownMenuGroup>
                {selectedTags.map((t) => (
                  <DropdownMenuItem key={t} onSelect={() => removeTag(t)}>
                    {t}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
          <Trash2Icon data-icon="inline-start" />
          Delete
        </Button>
      </SelectionBar>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {word(ids.length)}?</AlertDialogTitle>
            <AlertDialogDescription>
              They leave your book. Past sends and reports are kept. If you upload them again later, they come back as new
              contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Delete {word(ids.length)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
