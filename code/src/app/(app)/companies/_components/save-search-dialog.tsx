"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type SavedSearch, type Search, describeSearch } from "./searches";

// Save the current filters as a search (R12, 2026-10-29). Names are unique per workspace, case-insensitive.
export function SaveSearchDialog({
  search,
  defaultName,
  existing,
  onOpenChange,
  onSave,
}: {
  search: Search | null;
  defaultName: string;
  existing: SavedSearch[];
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}) {
  return (
    <Dialog open={search !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {search && (
          <SaveForm search={search} defaultName={defaultName} existing={existing} onCancel={() => onOpenChange(false)} onSave={onSave} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SaveForm({
  search,
  defaultName,
  existing,
  onCancel,
  onSave,
}: {
  search: Search;
  defaultName: string;
  existing: SavedSearch[];
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const n = name.trim();
        if (!n) return setError("Name the search");
        if (existing.some((s) => s.name.toLowerCase() === n.toLowerCase())) return setError("You already have a search with this name");
        onSave(n);
      }}
    >
      <DialogHeader>
        <DialogTitle>Save search</DialogTitle>
        <DialogDescription>{describeSearch(search)}</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="save-search-name">Name</FieldLabel>
          <Input
            id="save-search-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            autoFocus
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>Saves the filters, not the results. Reopen it to see companies added since.</FieldDescription>
          )}
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save search</Button>
      </DialogFooter>
    </form>
  );
}
