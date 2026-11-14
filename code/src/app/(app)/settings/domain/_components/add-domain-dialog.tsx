"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// Add the sending domain (AC-EC-D-01): normalised and validated; one per workspace (live app API).
export function AddDomainDialog({
  open,
  onOpenChange,
  validate,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Returns an error message, or null when the domain can be added. */
  validate: (domain: string) => string | null;
  onAdd: (domain: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setValue("");
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const err = validate(value);
            if (err) return setError(err);
            onAdd(value);
            close(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Add your sending domain</DialogTitle>
            <DialogDescription>Use a domain your company owns. You prove it with a few DNS records.</DialogDescription>
          </DialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="add-domain">Domain</FieldLabel>
            <Input
              id="add-domain"
              placeholder="mail.yourcompany.com"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              autoFocus
            />
            {error ? (
              <FieldError>{error}</FieldError>
            ) : (
              <FieldDescription>A subdomain such as send.yourcompany.com keeps your main domain&apos;s mail apart.</FieldDescription>
            )}
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Add domain</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
