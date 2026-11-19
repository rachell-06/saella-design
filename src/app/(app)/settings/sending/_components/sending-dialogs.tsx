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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type NewSender = { name: string; local: string; domain: string; replyTo: string };

// Add a sender (AC-EC-S-01/02/05; live app EmailSendersSection.tsx): only on the verified domain; starts pending
// and gets a confirmation email. Display name and reply-to are optional (API from_name optional).
export function AddSenderDialog({
  open,
  onOpenChange,
  domains,
  validate,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Verified domains only. */
  domains: string[];
  validate: (s: NewSender) => Partial<Record<keyof NewSender, string>>;
  onAdd: (s: NewSender) => void;
}) {
  const blank: NewSender = { name: "", local: "", domain: domains[0] ?? "", replyTo: "" };
  const [form, setForm] = useState<NewSender>(blank);
  const [errors, setErrors] = useState<Partial<Record<keyof NewSender, string>>>({});
  const set = (k: keyof NewSender, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setForm(blank);
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const filled = { ...form, domain: form.domain || domains[0] || "" };
            const errs = validate(filled);
            if (Object.values(errs).some(Boolean)) return setErrors(errs);
            onAdd(filled);
            close(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a sender</DialogTitle>
            <DialogDescription>We email a confirmation link to the address. It can send once the link is clicked.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errors.local ? true : undefined}>
              <FieldLabel htmlFor="snd-local">Address</FieldLabel>
              <div className="flex gap-2">
                <InputGroup>
                  <InputGroupInput
                    id="snd-local"
                    placeholder="contact"
                    value={form.local}
                    onChange={(e) => set("local", e.target.value)}
                    aria-invalid={errors.local ? true : undefined}
                    autoFocus
                  />
                  {/* One domain (the usual case): it reads as part of the address, not a cut-off disabled field. */}
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>{domains.length > 1 ? "@" : `@${domains[0] ?? ""}`}</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {domains.length > 1 ? (
                  <Select value={form.domain || domains[0]} onValueChange={(v) => set("domain", v)}>
                    <SelectTrigger className="w-56" aria-label="Domain">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {domains.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
              {errors.local && <FieldError>{errors.local}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="snd-name">Display name (optional)</FieldLabel>
              <Input id="snd-name" placeholder="Sales team" value={form.name} onChange={(e) => set("name", e.target.value)} />
              <FieldDescription>Shown as the sender.</FieldDescription>
            </Field>
            <Field data-invalid={errors.replyTo ? true : undefined}>
              <FieldLabel htmlFor="snd-reply">Reply-to (optional)</FieldLabel>
              <Input
                id="snd-reply"
                type="email"
                placeholder="replies@yourcompany.com"
                value={form.replyTo}
                onChange={(e) => set("replyTo", e.target.value)}
                aria-invalid={errors.replyTo ? true : undefined}
              />
              {errors.replyTo && <FieldError>{errors.replyTo}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Add sender</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
