"use client";

import { useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fmt, type ListMeta } from "@/lib/mock/contacts";

// Rename and delete for a contact list, used on /contacts and /contacts/[listId].
export function RenameListDialog({
  list,
  onOpenChange,
  onRename,
}: {
  list: ListMeta | null;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, name: string) => void;
}) {
  return (
    <Dialog open={list !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed by list so the draft name resets for each list. */}
        {list && <RenameForm key={list.id} list={list} onCancel={() => onOpenChange(false)} onRename={onRename} />}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({ list, onCancel, onRename }: { list: ListMeta; onCancel: () => void; onRename: (id: string, name: string) => void }) {
  const [name, setName] = useState(list.name);
  const [error, setError] = useState(false);
  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return setError(true);
        onRename(list.id, name.trim());
      }}
    >
      <DialogHeader>
        <DialogTitle>Rename list</DialogTitle>
        <DialogDescription>Batches already sent keep the old name in their reports.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={error || undefined}>
          <FieldLabel htmlFor="rename-list">Name</FieldLabel>
          <Input id="rename-list" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={error || undefined} autoFocus />
          {error && <FieldError>Give the list a name</FieldError>}
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteListDialog({
  list,
  count,
  onOpenChange,
  onDelete,
}: {
  list: ListMeta | null;
  count: number;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <AlertDialog open={list !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{list?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The list and its {fmt(count)} contacts are removed. Past sends and reports are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => list && onDelete(list.id)}>
            Delete list
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
