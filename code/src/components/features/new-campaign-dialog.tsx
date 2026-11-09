"use client";

import { useState } from "react";
import { CalendarIcon, FileTextIcon, LayoutTemplateIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { MultiSelect } from "@/components/saella/multi-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRIES, INDUSTRIES, TODAY, type Campaign, formatDate } from "@/lib/mock/campaigns";

// Create-campaign form, fields and copy from the live app (EmailCampaignBoard modal) and PRD-02 AC-EC-C-01.
export type StartWith = "empty" | "letter" | "poster";

const toIso = (d?: Date) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : undefined;

export function NewCampaignDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (campaign: Omit<Campaign, "id" | "templates">, startWith: StartWith) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [startWith, setStartWith] = useState<StartWith>("empty");
  const [showError, setShowError] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setCountries([]);
    setIndustries([]);
    setPeriod(undefined);
    setStartWith("empty");
    setShowError(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setShowError(true);
      return;
    }
    onCreate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        countries,
        industries,
        startsOn: toIso(period?.from),
        endsOn: toIso(period?.to),
      },
      startWith
    );
    reset();
  };

  const periodLabel = period?.from
    ? `${formatDate(toIso(period.from)!, true)} → ${period.to ? formatDate(toIso(period.to)!, true) : "…"}`
    : "Pick a start and end date";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
          <DialogHeader>
            <DialogTitle>New campaign</DialogTitle>
            <DialogDescription>
              A campaign groups templates that target the same countries and industries.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={(showError && !name.trim()) || undefined}>
              <FieldLabel htmlFor="nc-name">Name</FieldLabel>
              <Input
                id="nc-name"
                placeholder="e.g. Summer 2026 Push"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={(showError && !name.trim()) || undefined}
                autoFocus
              />
              {showError && !name.trim() && <FieldError>Give the campaign a name</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="nc-desc">Description (optional)</FieldLabel>
              <Textarea
                id="nc-desc"
                placeholder="Who it is for and what you offer"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-16"
              />
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="nc-countries">Countries (optional)</FieldLabel>
                <MultiSelect
                  id="nc-countries"
                  options={COUNTRIES}
                  value={countries}
                  onChange={setCountries}
                  placeholder="Any country — pick one or more"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="nc-industries">Industry (optional)</FieldLabel>
                <MultiSelect
                  id="nc-industries"
                  options={INDUSTRIES}
                  value={industries}
                  onChange={setIndustries}
                  placeholder="Any industry"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="nc-period">Campaign period (optional)</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="nc-period"
                    variant="outline"
                    className={period?.from ? "justify-start font-normal" : "justify-start font-normal text-subtle-foreground"}
                  >
                    <CalendarIcon data-icon="inline-start" />
                    {periodLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    selected={period}
                    onSelect={setPeriod}
                    defaultMonth={new Date(`${TODAY}T00:00:00`)}
                    // The end date can't be in the past (live app).
                    disabled={{ before: new Date(`${TODAY}T00:00:00`) }}
                  />
                </PopoverContent>
              </Popover>
              <FieldDescription>
                Batches pre-filter the audience by country and industry. After the period ends, scheduled sends stop;
                follow-ups keep running.
              </FieldDescription>
            </Field>
            <FieldSet>
              <FieldLegend variant="label">Start with</FieldLegend>
              <RadioGroup
                value={startWith}
                onValueChange={(v) => setStartWith(v as StartWith)}
                className="grid gap-3 sm:grid-cols-3"
              >
                <StartOption value="empty" title="Empty campaign" description="Add templates later." />
                <StartOption
                  value="letter"
                  title="Letter"
                  description="Rich text with fonts, colours, links and images."
                  icon={<FileTextIcon />}
                />
                <StartOption
                  value="poster"
                  title="Poster"
                  description="A designed HTML poster you edit in place."
                  icon={<LayoutTemplateIcon />}
                />
              </RadioGroup>
            </FieldSet>
          </FieldGroup>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">{startWith === "poster" ? "Next: choose design" : "Create campaign"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Choice card: the whole card is the label for its radio (shadcn "choice card" pattern).
function StartOption({
  value,
  title,
  description,
  icon,
}: {
  value: StartWith;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <FieldLabel htmlFor={`nc-start-${value}`}>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>
            {icon}
            {title}
          </FieldTitle>
          <FieldDescription>{description}</FieldDescription>
        </FieldContent>
        <RadioGroupItem value={value} id={`nc-start-${value}`} />
      </Field>
    </FieldLabel>
  );
}
