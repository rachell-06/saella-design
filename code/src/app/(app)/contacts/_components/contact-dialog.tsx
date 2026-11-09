"use client";

import { useState } from "react";
import { TagInput } from "@/components/saella/tag-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type Contact, normalizeTags } from "./data";

// Add or edit one contact (PRD Contacts AC-CON-M-01 name, email, company, position; AC-CON-M-03 edit any
// field). Email is the only required field (CON-SEQ-004). On edit, tags are replaced, not merged (CON-SEQ-003).
export type ContactDraft = Omit<Contact, "id" | "addedOn" | "unreachable" | "caution" | "lastSent">;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactDialog({
  open,
  contact,
  tagSuggestions,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  /** Edit this contact; empty = add. */
  contact?: Contact;
  tagSuggestions: string[];
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ContactDraft) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {open && <ContactForm key={contact?.id ?? "new"} contact={contact} tagSuggestions={tagSuggestions} onCancel={() => onOpenChange(false)} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function ContactForm({
  contact,
  tagSuggestions,
  onCancel,
  onSave,
}: {
  contact?: Contact;
  tagSuggestions: string[];
  onCancel: () => void;
  onSave: (draft: ContactDraft) => void;
}) {
  const [d, setD] = useState<ContactDraft>({
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    email: contact?.email ?? "",
    company: contact?.company ?? "",
    position: contact?.position ?? "",
    phone: contact?.phone ?? "",
    tags: contact?.tags ?? [],
  });
  const [touched, setTouched] = useState(false);
  const emailError = !d.email.trim() ? "Enter an email address" : !EMAIL_RE.test(d.email.trim()) ? "This doesn't look like an email address" : undefined;
  const set = (k: keyof ContactDraft) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value });

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (emailError) return;
        onSave({
          ...d,
          email: d.email.trim().toLowerCase(),
          firstName: d.firstName.trim(),
          lastName: d.lastName.trim(),
          company: d.company.trim(),
          position: d.position?.trim() || undefined,
          phone: d.phone?.trim() || undefined,
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{contact ? "Edit contact" : "Add contact"}</DialogTitle>
        <DialogDescription>
          {contact ? "Changes apply to this list only." : "If this email is already in the list for the same company, it is updated instead."}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="ct-first">First name</FieldLabel>
            <Input id="ct-first" value={d.firstName} onChange={set("firstName")} autoFocus />
          </Field>
          <Field>
            <FieldLabel htmlFor="ct-last">Last name</FieldLabel>
            <Input id="ct-last" value={d.lastName} onChange={set("lastName")} />
          </Field>
        </div>
        <Field data-invalid={(touched && emailError) || undefined}>
          <FieldLabel htmlFor="ct-email">Email</FieldLabel>
          <Input id="ct-email" type="email" placeholder="name@company.com" value={d.email} onChange={set("email")} onBlur={() => setTouched(true)} aria-invalid={(touched && Boolean(emailError)) || undefined} />
          {touched && emailError && <FieldError>{emailError}</FieldError>}
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="ct-company">Company</FieldLabel>
            <Input id="ct-company" value={d.company} onChange={set("company")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ct-position">Position</FieldLabel>
            <Input id="ct-position" placeholder="e.g. Purchasing manager" value={d.position} onChange={set("position")} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="ct-phone">Phone</FieldLabel>
          <Input id="ct-phone" type="tel" value={d.phone} onChange={set("phone")} />
        </Field>
        <Field>
          <FieldLabel htmlFor="ct-tags">Tags</FieldLabel>
          <TagInput id="ct-tags" value={d.tags} onChange={(t) => setD({ ...d, tags: normalizeTags(t) })} suggestions={tagSuggestions} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{contact ? "Save changes" : "Add contact"}</Button>
      </DialogFooter>
    </form>
  );
}
