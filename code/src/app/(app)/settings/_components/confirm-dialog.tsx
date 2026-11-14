"use client";

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

export type ConfirmRequest = {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  /** Defaults to "Cancel"; e.g. "Keep it" when removing a domain (PATTERNS 9.10). */
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

// One confirm dialog per screen, driven by a request object (null = closed).
export function ConfirmDialog({
  request,
  onClose,
  children,
  confirmDisabled,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
  /** Extra content, e.g. a type-to-confirm field. */
  children?: React.ReactNode;
  confirmDisabled?: boolean;
}) {
  return (
    <AlertDialog open={request !== null} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          <AlertDialogDescription>{request?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>{request?.cancelLabel ?? "Cancel"}</AlertDialogCancel>
          <AlertDialogAction
            variant={request?.destructive ? "destructive" : "default"}
            disabled={confirmDisabled}
            onClick={() => {
              request?.onConfirm();
              onClose();
            }}
          >
            {request?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
