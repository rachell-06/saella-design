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
import type { Thread } from "./data";

// Rename and delete a conversation. Owned by the screen (2026-10-28) so both the history list and the
// conversation header can open them. Not in the live app or PRD-03 (ĐX, decisions.md).

export function RenameThreadDialog({
  thread,
  onOpenChange,
  onRename,
}: {
  thread: Thread | null;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, title: string) => void;
}) {
  return (
    <Dialog open={thread !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {thread && (
          <RenameForm
            key={thread.id}
            initial={thread.title}
            onCancel={() => onOpenChange(false)}
            onSave={(title) => onRename(thread.id, title)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DeleteThreadDialog({
  thread,
  onOpenChange,
  onDelete,
}: {
  thread: Thread | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <AlertDialog open={thread !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{thread?.title || "Untitled"}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The conversation is removed for everyone who can see it. Campaigns, templates and batches the agent made stay.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => thread && onDelete(thread.id)}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RenameForm({ initial, onCancel, onSave }: { initial: string; onCancel: () => void; onSave: (title: string) => void }) {
  const [title, setTitle] = useState(initial);
  const [error, setError] = useState(false);
  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return setError(true);
        onSave(title.trim());
      }}
    >
      <DialogHeader>
        <DialogTitle>Rename conversation</DialogTitle>
        <DialogDescription>Only the title changes.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={error || undefined}>
          <FieldLabel htmlFor="thread-title">Title</FieldLabel>
          <Input
            id="thread-title"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={error || undefined}
            autoFocus
          />
          {error && <FieldError>Give the conversation a title</FieldError>}
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
