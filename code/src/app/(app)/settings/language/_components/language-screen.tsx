"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LOCALES, type Locale, localeLabel } from "@/components/saella/language-picker";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const browserLabel = `Follow my browser (${localeLabel(BROWSER_LOCALE)})`;

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
        description="For menus, messages and the emails Saella sends you."
        info="Your content is never translated. The agent replies in your language."
      />
      <Field className="w-72">
        <FieldLabel htmlFor="lang-select">Display language</FieldLabel>
        <Select value={choice} onValueChange={change}>
          <SelectTrigger id="lang-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="browser">{browserLabel}</SelectItem>
              {LOCALES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  <span lang={l.code}>{l.label}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {choice === "browser" && (
          <FieldDescription>Other languages show as English.</FieldDescription>
        )}
      </Field>
    </section>
  );
}
