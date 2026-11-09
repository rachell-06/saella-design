"use client";

import { useState } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { SHARED_MONTHLY_CAP } from "../../_components/data";

// Add domain (AC-EC-D-01, AC-EC-D-05): normalise and validate, max 3 per workspace, no duplicates.
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
            <DialogTitle>Add a sending domain</DialogTitle>
            <DialogDescription>
              Use a domain your company owns. You&apos;ll add a few DNS records at your DNS host to prove it.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="add-domain">Domain</FieldLabel>
            <Input
              id="add-domain"
              placeholder="yourcompany.com"
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
              <FieldDescription>Without https:// or www. A subdomain such as mail.yourcompany.com works too.</FieldDescription>
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

export type NewSender = { name: string; local: string; domain: string; replyTo: string };

// Add sender (AC-EC-S-01/02/05): only on a verified domain; starts pending and gets a confirmation email.
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
            <DialogDescription>
              We email a confirmation link to the address. It can send once someone clicks the link.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="snd-name">Display name</FieldLabel>
              <Input
                id="snd-name"
                placeholder="Sales team"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={errors.name ? true : undefined}
                autoFocus
              />
              {errors.name ? <FieldError>{errors.name}</FieldError> : <FieldDescription>Shown as the sender.</FieldDescription>}
            </Field>
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
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>@</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
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
              </div>
              {errors.local ? (
                <FieldError>{errors.local}</FieldError>
              ) : (
                <FieldDescription>Only verified domains are listed.</FieldDescription>
              )}
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
            <Button type="submit">Add and send confirmation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Shared sender (US-EC-I): one click, no DNS, no mailbox round trip; capped at 1,000 sends a month.
export function SharedSenderDialog({
  open,
  onOpenChange,
  address,
  replyTo,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  address: string;
  replyTo: string;
  onCreate: () => void;
}) {
  const [ack, setAck] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setAck(false);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start sending now</DialogTitle>
          <DialogDescription>
            We&apos;ll set you up to send from Saella&apos;s shared domain right away: no DNS records, no waiting. Emails go
            out as <span className="font-medium text-foreground">{address}</span>, with replies routed to {replyTo}.
          </DialogDescription>
        </DialogHeader>
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertDescription>
            The shared domain&apos;s reputation is shared across all workspaces, so it&apos;s held to{" "}
            {SHARED_MONTHLY_CAP.toLocaleString("en-US")} sends a month, and high bounce or spam rates can limit it.
            Verify your own domain for your branding and the best deliverability.
          </AlertDescription>
        </Alert>
        <Field orientation="horizontal">
          <Checkbox id="shared-ack" checked={ack} onCheckedChange={(v) => setAck(v === true)} />
          <FieldLabel htmlFor="shared-ack" className="font-normal">
            I understand emails will send from the shared domain and share its reputation.
          </FieldLabel>
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!ack}
            onClick={() => {
              onCreate();
              onOpenChange(false);
              setAck(false);
            }}
          >
            Create shared sender
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
