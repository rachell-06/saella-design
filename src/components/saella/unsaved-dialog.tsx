"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

// "Save your changes?" before leaving a page with unsaved work (pair with useLeaveGuard in
// lib/leave-guard.ts). Button order ("Keep editing" alone on the left read wrong):
//   [Discard]                      [Keep editing] [Save]
// Discard, the one that loses work, stands apart on the left so it isn't hit by accident; the safe pair sits
// together on the right with Save as the main button (the usual Don't Save · Cancel · Save order). Opening moves
// focus into the dialog without a focus ring on a button; Esc or the overlay keeps editing.
export function UnsavedDialog({
  open,
  title,
  description,
  saveLabel = "Save changes",
  discardLabel = "Discard",
  saving = false,
  onKeepEditing,
  onDiscard,
  onSave,
}: {
  open: boolean;
  title: string;
  /** One line: what is lost if they leave, e.g. "“Spring catalog” hasn't been saved yet." */
  description: React.ReactNode;
  saveLabel?: string;
  discardLabel?: string;
  saving?: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !saving && onKeepEditing()}>
      <AlertDialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
        tabIndex={-1}
        // Three buttons in one row: wider than the default alert (384px) so "Discard changes" fits.
        className="outline-none data-[size=default]:sm:max-w-md"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="ghost"
            className="text-destructive-soft-foreground hover:text-destructive-soft-foreground sm:mr-auto"
            disabled={saving}
            onClick={onDiscard}
          >
            {discardLabel}
          </Button>
          <Button variant="outline" disabled={saving} onClick={onKeepEditing}>
            Keep editing
          </Button>
          <Button disabled={saving} aria-busy={saving || undefined} onClick={onSave}>
            {saving && <Spinner data-icon="inline-start" />}
            {saveLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
