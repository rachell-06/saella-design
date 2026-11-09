"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LOCALES, type Locale, localeLabel } from "@/components/saella/language-picker";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SectionHeader } from "../../_components/section-header";

// Settings → Language (PRD-07 Language, read 2026-10-28; live app components/layout/LanguageSwitcher.tsx).
// - Vietnamese, English, Chinese Simplified (BR-LNG-01, BR-RULE-LNG-03). Stored per account; empty = follow the
//   browser, which falls back to English (BR-RULE-LNG-01, AC-LNG-U-01).
// - Applies at once and is saved to the account (AC-LNG-U-02). If saving fails, the choice is kept on this
//   device and applied at the next signed-in load (PRD §Persistence).
// - User content is never translated (BR-LNG-02, AC-LNG-U-04); notification emails use this language
//   (AC-LNG-R-02); the agent follows the language you write in (BR-RULE-LNG-02).
// - The PRD moved the picker to the header of every screen (AC-LNG-U-02). Sign-in and onboarding have it; the
//   app header is shared with other screens, so this page is the in-app place for now.
// Preview with ?state= save-error
type Choice = Locale | "browser";
const BROWSER_LOCALE: Locale = "en"; // what this browser reports, for the preview

export function LanguageScreen() {
  const preview = useSearchParams().get("state") ?? "";
  const [choice, setChoice] = useState<Choice>("browser");

  function change(v: string) {
    const next = v as Choice;
    setChoice(next);
    const name = next === "browser" ? `your browser's language (${localeLabel(BROWSER_LOCALE)})` : localeLabel(next);
    if (preview === "save-error") {
      toast.warning("Saved on this device only", {
        description: "We couldn't reach your account. Saella applies it next time you sign in.",
      });
      return;
    }
    toast.success(`Saella now uses ${name}`, { description: "This prototype keeps its English copy." });
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="lang-title">
      <SectionHeader
        id="lang-title"
        title="Language"
        description="The language of menus, messages and emails Saella sends you. Saved to your account."
        info="Your templates, campaigns and contact data are never translated. The agent answers in the language you write to it in."
      />
      <RadioGroup value={choice} onValueChange={change} className="grid gap-3 sm:grid-cols-2">
        <LangOption
          value="browser"
          title="Follow my browser"
          description={`Right now: ${localeLabel(BROWSER_LOCALE)}. Anything other than Vietnamese or Chinese shows English.`}
        />
        {LOCALES.map((l) => (
          // No subtitle when the native name is already the English one ("English / English").
          <LangOption key={l.code} value={l.code} title={l.label} description={l.english === l.label ? undefined : l.english} lang={l.code} />
        ))}
      </RadioGroup>
    </section>
  );
}

function LangOption({ value, title, description, lang }: { value: Choice; title: string; description?: string; lang?: string }) {
  return (
    <FieldLabel htmlFor={`lang-${value}`}>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle lang={lang}>{title}</FieldTitle>
          {description && <FieldDescription>{description}</FieldDescription>}
        </FieldContent>
        <RadioGroupItem value={value} id={`lang-${value}`} />
      </Field>
    </FieldLabel>
  );
}
