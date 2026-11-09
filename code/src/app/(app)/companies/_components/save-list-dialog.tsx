"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Company } from "./data";

// Save companies as a contact list (2026-10-28). Only companies with an email become contacts (live app v1.2.7:
// the Contacts list counts only companies with an email); the dialog says how many are left out.
export function SaveListDialog({
  companies,
  defaultName,
  onOpenChange,
  onSave,
}: {
  companies: Company[] | null;
  defaultName: string;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, withEmail: Company[]) => void;
}) {
  return (
    <Dialog open={companies !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {companies && <SaveForm companies={companies} defaultName={defaultName} onCancel={() => onOpenChange(false)} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function SaveForm({
  companies,
  defaultName,
  onCancel,
  onSave,
}: {
  companies: Company[];
  defaultName: string;
  onCancel: () => void;
  onSave: (name: string, withEmail: Company[]) => void;
}) {
  const [name, setName] = useState(companies.length === 1 ? companies[0].name : defaultName);
  const [error, setError] = useState(false);
  const withEmail = companies.filter((c) => c.email);
  const without = companies.length - withEmail.length;
  const n = (x: number) => x.toLocaleString("en-US");

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return setError(true);
        onSave(name.trim(), withEmail);
      }}
    >
      <DialogHeader>
        <DialogTitle>Save as contact list</DialogTitle>
        <DialogDescription>
          {n(withEmail.length)} {withEmail.length === 1 ? "company" : "companies"} with an email become contacts you can send to.
          {without > 0 && ` ${n(without)} without an email are left out.`}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={error || undefined}>
          <FieldLabel htmlFor="save-list-name">List name</FieldLabel>
          <Input id="save-list-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={error || undefined} autoFocus />
          {error ? <FieldError>Name the list</FieldError> : <FieldDescription>Addresses stay masked in the list. Sending to them works.</FieldDescription>}
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={withEmail.length === 0}>
          Save {n(withEmail.length)} contacts
        </Button>
      </DialogFooter>
    </form>
  );
}
