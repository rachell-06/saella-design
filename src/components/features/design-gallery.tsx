"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import { EmailBody } from "@/components/features/email-body";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DESIGN_STARTS, type DesignStart, SAMPLE_VALUES, starterBlocks } from "@/lib/mock/templates";
import { cn } from "@/lib/utils";

// Pick how a Design template starts (live app StarterPicker poster step / TemplateGalleryPicker): "Blank poster" first,
// then one card per preset with a real thumbnail (the preset's blocks through EmailBody, scaled down, not interactive).
// Cards are a radio group (shadcn choice cards, as New template's Kind); the picked card gets a ring and a check.

export const designStartName = (key: DesignStart) =>
  key === "blank" ? "Blank poster" : (DESIGN_STARTS.find((s) => s.key === key)?.name ?? key);

export function DesignGallery({
  value,
  onChange,
  idPrefix = "dg",
}: {
  value?: DesignStart;
  onChange: (start: DesignStart) => void;
  idPrefix?: string;
}) {
  return (
    <RadioGroup
      value={value ?? ""}
      onValueChange={(v) => onChange(v as DesignStart)}
      aria-label="Design"
      // One row of five on laptops so the dialog fits any laptop screen (designer 2026-11-14); thumbnails shrink on
      // short screens.
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {DESIGN_STARTS.map((s) => (
        <FieldLabel
          key={s.key}
          htmlFor={`${idPrefix}-${s.key}`}
          className="relative has-data-checked:ring-2 has-data-checked:ring-brand/40"
        >
          <Field className="gap-2">
            <div
              aria-hidden
              className={cn(
                "pointer-events-none relative h-32 overflow-hidden rounded-md border select-none [@media(max-height:820px)]:h-24",
                s.key === "blank" ? "flex items-center justify-center border-dashed bg-card" : "email-canvas"
              )}
            >
              {s.key === "blank" ? (
                <PlusIcon className="size-6 text-muted-foreground" strokeWidth={1.75} />
              ) : (
                // Rendered at 300% width and scaled to a third: the email at its real layout, small.
                <div className="absolute top-0 left-0 w-[300%] origin-top-left scale-[0.3333] p-6">
                  <EmailBody blocks={starterBlocks("design", s.key)} kind="design" mode="preview" values={SAMPLE_VALUES} footer={false} />
                </div>
              )}
            </div>
            <FieldContent>
              <FieldTitle>{designStartName(s.key)}</FieldTitle>
              <FieldDescription className="line-clamp-2">
                {s.description}
              </FieldDescription>
            </FieldContent>
            <RadioGroupItem value={s.key} id={`${idPrefix}-${s.key}`} className="sr-only" />
          </Field>
          {/* Outside Field: Field stretches its children to full width. */}
          <span
            aria-hidden
            className="absolute top-3 right-3 z-10 hidden size-5 items-center justify-center rounded-full bg-primary text-primary-foreground group-has-data-checked/field-label:flex"
          >
            <CheckIcon className="size-3.5" />
          </span>
        </FieldLabel>
      ))}
    </RadioGroup>
  );
}
