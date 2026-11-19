"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { MultiSelect } from "@/components/saella/multi-select";
import { DateRangePicker } from "@/components/saella/date-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MARKETS, TODAY, type Campaign } from "@/lib/mock/campaigns";
import { IndustryPicker } from "@/components/features/new-campaign-dialog";

// Edit campaign (live app: the same modal as New campaign, without "Start with"; PATCH /api/email/campaigns/:id).
// Same fields and copy as NewCampaignDialog. TODO: fold into NewCampaignDialog as an edit mode (shared component,
// owned elsewhere) and delete this file.
export type CampaignFields = Pick<Campaign, "name" | "description" | "countries" | "industries" | "startsOn" | "endsOn">;

const toIso = (d?: Date) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : undefined;
const toDate = (iso?: string) => (iso ? new Date(`${iso}T00:00:00`) : undefined);

export function EditCampaignDialog({
  campaign,
  onOpenChange,
  onSave,
}: {
  /** The campaign being edited; null closes the dialog. */
  campaign: Campaign | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, fields: CampaignFields) => void;
}) {
  return (
    <Dialog open={campaign !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
        {/* Keyed so the form starts from the campaign each time it opens. */}
        {campaign && <EditForm key={campaign.id} campaign={campaign} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ campaign, onSave }: { campaign: Campaign; onSave: (id: string, fields: CampaignFields) => void }) {
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description ?? "");
  const [countries, setCountries] = useState(campaign.countries);
  const [industries, setIndustries] = useState(campaign.industries);
  const [period, setPeriod] = useState<DateRange | undefined>(
    campaign.startsOn || campaign.endsOn ? { from: toDate(campaign.startsOn), to: toDate(campaign.endsOn) } : undefined
  );
  const [showError, setShowError] = useState(false);
  const today = new Date(`${TODAY}T00:00:00`);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setShowError(true);
      return;
    }
    onSave(campaign.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      countries,
      industries,
      startsOn: toIso(period?.from),
      endsOn: toIso(period?.to),
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <DialogHeader>
        <DialogTitle>Edit campaign</DialogTitle>
      </DialogHeader>

      <FieldGroup>
        <Field data-invalid={(showError && !name.trim()) || undefined}>
          <FieldLabel htmlFor="ec-name">Name</FieldLabel>
          <Input
            id="ec-name"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={(showError && !name.trim()) || undefined}
            autoFocus
          />
          {showError && !name.trim() && <FieldError>Give the campaign a name</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="ec-desc">Description (optional)</FieldLabel>
          <Textarea
            id="ec-desc"
            placeholder="Who it is for and what you offer"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-16"
          />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="ec-countries">Countries (optional)</FieldLabel>
            <MultiSelect
              id="ec-countries"
              options={MARKETS}
              value={countries}
              onChange={setCountries}
              placeholder="Any country"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ec-industries">Industry (optional)</FieldLabel>
            <IndustryPicker id="ec-industries" value={industries} onChange={setIndustries} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="ec-period">Campaign period (optional)</FieldLabel>
          {/* Live app: the start stays free so a running campaign can be edited; the end can't be in the past. */}
          <DateRangePicker
            id="ec-period"
            value={period}
            onChange={setPeriod}
            endMin={today}
            optional
            placeholder="Pick a start and end date"
            className="w-full"
          />
        </Field>
      </FieldGroup>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}
