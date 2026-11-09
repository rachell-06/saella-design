"use client";

import { CheckIcon, ChevronDownIcon, LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// UI language (PRD-07 Language, read 2026-10-28): Vietnamese, English, Chinese Simplified (BR-LNG-01,
// BR-RULE-LNG-03). Written names, no flags (live app lib/i18n/messages.ts: a flag overstates a language).
// The picker sits in the header of every screen, sign-in and setup included (AC-LNG-U-02); the change applies
// at once. This prototype only stores the choice: the copy stays English.
export type Locale = "vi" | "en" | "zh";

export const LOCALES: { code: Locale; label: string; english: string }[] = [
  { code: "vi", label: "Tiếng Việt", english: "Vietnamese" },
  { code: "en", label: "English", english: "English" },
  { code: "zh", label: "中文", english: "Chinese (Simplified)" },
];

export function localeLabel(code: Locale) {
  return LOCALES.find((l) => l.code === code)?.label ?? "English";
}

export function LanguagePicker({ value, onChange }: { value: Locale; onChange: (locale: Locale) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label={`Language: ${localeLabel(value)}`}>
          <LanguagesIcon data-icon="inline-start" />
          {localeLabel(value)}
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          {LOCALES.map((l) => (
            <DropdownMenuItem key={l.code} lang={l.code} onSelect={() => onChange(l.code)}>
              {l.label}
              {l.code === value && <CheckIcon className="ml-auto text-brand" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
