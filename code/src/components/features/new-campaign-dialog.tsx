"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { ArrowLeftIcon, ArrowRightIcon, PaletteIcon, PenLineIcon } from "lucide-react";
import { DesignGallery, designStartName } from "@/components/features/design-gallery";
import { MultiSelect } from "@/components/saella/multi-select";
import { DateRangePicker } from "@/components/saella/date-picker";
import { TreeSelect } from "@/components/saella/tree-select";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { INDUSTRY_TREE, MARKETS, TODAY, type Campaign, industryLabels } from "@/lib/mock/campaigns";
import { type DesignStart, type TemplateKind } from "@/lib/mock/templates";

// Create-campaign form, fields and copy from the live app (EmailCampaignBoard modal) and PRD-02 AC-EC-C-01. Only the
// name is required (live POST: "name is required"; trimmed; names may repeat, as in the live app). Description is
// PRD-02 AC-EC-C-01 (the live modal has no field, its API takes one).
// "Start with a template (optional)" (designer 2026-11-14, back to the live app's StarterPicker): Letter or Design;
// picking the chosen card again clears it. Design then needs a design: the dialog widens to a gallery step (live poster
// step: Blank poster + presets, "Back" keeps the form), and the form shows "Design · <name> · Change". With a starter, the caller opens the
// editor on a new template in the campaign (`starterHref`); without one the campaign starts empty.

/** The first template to open after the campaign is created (live app: TemplateStarter). */
export type CampaignStarter = { kind: TemplateKind; start?: DesignStart };

/** The editor URL for a new template in the campaign: the same one New template builds (name left "Untitled …"). */
export function starterHref(campaignId: string, starter: CampaignStarter) {
  const q = new URLSearchParams({ campaign: campaignId, kind: starter.kind });
  if (starter.kind === "design") q.set("start", starter.start ?? "blank");
  return `/templates/draft/edit?${q}`;
}

const toIso = (d?: Date) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : undefined;

export function NewCampaignDialog({
  open,
  onOpenChange,
  onCreate,
  offerStarter = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `starter` is set when the user picked a first template to start with. */
  onCreate: (campaign: Omit<Campaign, "id" | "templates">, starter?: CampaignStarter) => void;
  /** false where a template is already being made (New template's "+ New campaign"). */
  offerStarter?: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [kind, setKind] = useState<TemplateKind | undefined>();
  // The design a Design starter opens with; chosen in the gallery step (live StarterPicker "Choose a design").
  const [start, setStart] = useState<DesignStart | undefined>();
  const [step, setStep] = useState<"form" | "gallery">("form");
  const [showError, setShowError] = useState(false);
  // Design picked but no design chosen yet: the main button goes to the gallery first (live "Next: choose design").
  // From the form, Design always goes through the gallery (designer report 2026-11-14: after Back, picking Design again
  // created the campaign straight away). The earlier pick stays selected there; only the gallery step creates.
  const needsDesign = offerStarter && kind === "design" && step === "form";

  const reset = () => {
    setName("");
    setDescription("");
    setCountries([]);
    setIndustries([]);
    setPeriod(undefined);
    setKind(undefined);
    setStart(undefined);
    setStep("form");
    setShowError(false);
  };

  // The gallery needs a valid form first, as the live modal validates before "Next: choose design".
  const openGallery = () => {
    if (!name.trim()) {
      setShowError(true);
      document.getElementById("nc-name")?.focus();
      return;
    }
    setStart((s) => s ?? "blank");
    setStep("gallery");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setShowError(true);
      setStep("form");
      document.getElementById("nc-name")?.focus();
      return;
    }
    if (needsDesign) return openGallery();
    onCreate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        countries,
        industries,
        startsOn: toIso(period?.from),
        endsOn: toIso(period?.to),
      },
      offerStarter && kind ? { kind, start: kind === "design" ? start : undefined } : undefined
    );
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className={step === "gallery" ? "sm:max-w-5xl" : "sm:max-w-2xl"}>
        <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
          <DialogHeader>
            {step === "gallery" && (
              <Button type="button" variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => setStep("form")}>
                <ArrowLeftIcon data-icon="inline-start" />
                Back
              </Button>
            )}
            <DialogTitle>New campaign</DialogTitle>
            <DialogDescription>
              {step === "gallery"
                ? "Pick a design for the first template. You can change everything in the editor."
                : "A campaign groups templates that target the same countries and industries."}
            </DialogDescription>
          </DialogHeader>

          {step === "gallery" ? (
            <DesignGallery value={start} onChange={setStart} idPrefix="nc-design" />
          ) : (
          <FieldGroup>
            {/* Two columns like the live modal (Name | Period, Countries | Industry), so the starter fits on screen. */}
            <div className="grid gap-6 sm:grid-cols-2">
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
                <FieldLabel htmlFor="nc-period">Campaign period (optional)</FieldLabel>
                {/* Same range picker as everywhere (designer 2026-11-13). Live app (RangePicker disabledDate, the same
                    in New and Edit): the start is free, so a campaign already under way can be logged; only the end
                    can't be in the past. PRD-02 AC-EC-C-01: a period has a start and an end, so both or neither. */}
                <DateRangePicker
                  id="nc-period"
                  value={period}
                  onChange={setPeriod}
                  endMin={new Date(`${TODAY}T00:00:00`)}
                  optional
                  placeholder="Pick a start and end date"
                  className="w-full"
                />              </Field>
            </div>
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
                  options={MARKETS}
                  value={countries}
                  onChange={setCountries}
                  placeholder="Any country — pick one or more"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="nc-industries">Industry (optional)</FieldLabel>
                <IndustryPicker id="nc-industries" value={industries} onChange={setIndustries} />
              </Field>
            </div>

            {offerStarter && (
              <FieldSet>
                <FieldLegend variant="label">Start with a template (optional)</FieldLegend>
                {/* Picking the chosen card again clears it (live StarterPicker): no starter = an empty campaign. */}
                <RadioGroup
                  value={kind ?? ""}
                  onValueChange={(v) => setKind(v as TemplateKind)}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <StarterOption
                    value="letter"
                    picked={kind}
                    onClear={() => setKind(undefined)}
                    title="Letter"
                    description="Reads like a personal email: text, an image, a button."
                    icon={<PenLineIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />}
                  />
                  <StarterOption
                    value="design"
                    picked={kind}
                    onClear={() => setKind(undefined)}
                    title="Design"
                    description="A poster: a hero, images and a button, centred."
                    icon={<PaletteIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />}
                  />
                </RadioGroup>
                {/* No "Choose a design" link (designer 2026-11-14): the main button "Choose design" leads there.
                    Once a design is chosen, it shows here with Change. */}
                {kind === "design" && start && (
                  <p className="flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">Design ·</span>
                    <span className="font-medium">{designStartName(start)}</span>
                    <span className="text-muted-foreground">·</span>
                    <Button type="button" variant="link" className="h-auto border-0 p-0" onClick={openGallery}>
                      Change
                    </Button>
                  </p>
                )}
              </FieldSet>
            )}
          </FieldGroup>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">
              {needsDesign ? (
                <>
                  Choose design
                  <ArrowRightIcon data-icon="inline-end" />
                </>
              ) : (
                "Create campaign"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Campaign Industry (designer 2026-11-14, live campaign modal): ISIC sections → classes, search, Select all / Clear.
 *  The value is ISIC classes; the button names a fully checked section once (first name + "+N"). Shared with Edit. */
export function IndustryPicker({ id, value, onChange }: { id: string; value: string[]; onChange: (v: string[]) => void }) {
  const names = industryLabels(value);
  return (
    <TreeSelect
      id={id}
      label={names[0] ?? "Any industry"}
      more={names.length - 1}
      groups={INDUSTRY_TREE}
      value={value}
      onChange={onChange}
      selectAll
      searchPlaceholder="Search industries"
      emptyText="No industry matches"
    />
  );
}

// Same card as New template's Kind option; clicking the picked card again clears the starter.
function StarterOption({
  value,
  picked,
  onClear,
  title,
  description,
  icon,
}: {
  value: TemplateKind;
  picked?: TemplateKind;
  onClear: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <FieldLabel htmlFor={`nc-kind-${value}`} className="has-data-checked:ring-1 has-data-checked:ring-primary">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>
            {icon}
            {title}
          </FieldTitle>
          <FieldDescription>{description}</FieldDescription>
        </FieldContent>
        <RadioGroupItem
          value={value}
          id={`nc-kind-${value}`}
          // No visible dot (designer 2026-11-14): the card's orange border shows the pick.
          className="sr-only"
          onClick={(e) => {
            if (picked !== value) return;
            e.preventDefault();
            onClear();
          }}
        />
      </Field>
    </FieldLabel>
  );
}
