"use client";

import Image from "next/image";
import { type Locale, LanguagePicker } from "@/components/saella/language-picker";
import { cn } from "@/lib/utils";

// Frame for sign-in, the lock screens and onboarding: logo left, language picker right (AC-LNG-U-02: the
// picker is on every screen, sign-in and setup included). No app sidebar: the user has no workspace yet.
export function AuthFrame({
  locale,
  onLocaleChange,
  children,
  className,
}: {
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between px-6">
        <span className="flex items-center gap-2 font-heading text-base font-semibold tracking-title">
          <Image src="/brand/saella-mark.png" alt="" width={24} height={24} className="size-6" priority />
          Saella
        </span>
        <LanguagePicker value={locale} onChange={onLocaleChange} />
      </header>
      <main className={cn("flex flex-1 flex-col items-center justify-center px-6 pb-16", className)}>{children}</main>
    </div>
  );
}
