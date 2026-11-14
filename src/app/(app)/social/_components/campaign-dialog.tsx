"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type CampaignFields = { name: string; brief: string };

// New / edit social campaign (live SocialCampaigns.tsx CampaignForm): a name and the brief Saella drafts posts from.
// Creating one goes straight on to writing its first post.
export function CampaignDialog({
  open,
  initial,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  /** Present = editing that campaign. */
  initial?: CampaignFields;
  onOpenChange: (open: boolean) => void;
  onSave: (fields: CampaignFields) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Keyed so each open starts from the campaign's current values. */}
        {open && <Form key={initial?.name ?? "new"} initial={initial} onCancel={() => onOpenChange(false)} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function Form({ initial, onCancel, onSave }: { initial?: CampaignFields; onCancel: () => void; onSave: (f: CampaignFields) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [brief, setBrief] = useState(initial?.brief ?? "");
  const [tried, setTried] = useState(false);
  const bad = tried && !name.trim();
  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (name.trim()) onSave({ name: name.trim(), brief: brief.trim() });
      }}
    >
      <DialogHeader>
        <DialogTitle>{initial ? "Edit collection" : "New collection"}</DialogTitle>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={bad || undefined}>
          <FieldLabel htmlFor="sc-name">Collection name</FieldLabel>
          <Input
            id="sc-name"
            value={name}
            maxLength={120}
            placeholder="e.g. October product launch"
            aria-invalid={bad || undefined}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          {bad && <FieldError>Give the collection a name</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="sc-brief">Brief</FieldLabel>
          <Textarea
            id="sc-brief"
            value={brief}
            maxLength={4000}
            placeholder="What are you promoting, to whom, and what should people do next?"
            className="min-h-28"
            onChange={(e) => setBrief(e.target.value)}
          />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save" : "Create and write a post"}</Button>
      </DialogFooter>
    </form>
  );
}
