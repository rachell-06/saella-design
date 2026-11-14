"use client";

import Image from "next/image";
import { type Locale, LanguagePicker } from "@/components/saella/language-picker";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WarpBackground } from "@/components/ui/warp-background";
import { cn } from "@/lib/utils";

// Frame for sign-in, sign-up, the lock screens and onboarding. Layout: Studio Admin auth v2 (src/app/(main)/auth/v2
// layout.tsx), designer decision 2026-11-12: form column on the left, a rounded dark brand panel on the right.
// - Left: header with the Saella mark (same lockup as the app sidebar) and the language picker (AC-LNG-U-02); the
//   screen's content centred below. Screen actions such as "Sign up" live in the column, not the header.
// - Right (lg and up): dark panel (`deep`, `deep-2` in dark mode so it still stands off the page) with Magic UI's
//   WarpBackground: faint light grid and orange beams flying out of the core, each led by a light envelope at its tip
//   (the beam is the envelope's trail). Reduced motion: grid only. A welcome `card` in the
//   centre (as the Magic UI demo) and two `notes` at the bottom split by a vertical rule, as in Studio Admin. No
//   mark or name in the panel: the brand already shows in the left header.
// No app sidebar: the user has no workspace yet.
type PanelNote = { title: string; body: string };

export function AuthFrame({
  locale,
  onLocaleChange,
  card,
  notes,
  children,
  className,
}: {
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
  /** Welcome card centred in the panel: a short title and one line (≤10 words, one idea). */
  card?: { title: string; body: string };
  /** Bottom of the brand panel. */
  notes?: [PanelNote, PanelNote];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="grid min-h-svh p-2 lg:grid-cols-2">
      <aside
        className="relative order-2 hidden overflow-hidden rounded-card bg-deep text-background lg:flex lg:flex-col dark:bg-deep-2 dark:text-foreground"
      >
        <WarpBackground
          aria-hidden
          className="absolute inset-0 rounded-none border-0 p-0"
          gridColor="color-mix(in oklab, currentColor 10%, transparent)"
          beamColor="color-mix(in oklab, var(--brand) 75%, transparent)"
          beamsPerSide={2}
          beamDuration={4}
          beamHead={
            <svg viewBox="0 0 24 24" className="h-auto w-full" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          }
        >
          {null}
        </WarpBackground>
        <div className="relative flex flex-1 items-center justify-center p-10">
          {card && (
            // Lighter than the panel in both themes: a tint of the panel's light text, blurred over the beams.
            <Card className="w-80 gap-2 bg-current/5 py-6 text-current ring-current/10 backdrop-blur-sm">
              <CardContent className="flex flex-col gap-2 px-6 text-center">
                <CardTitle className="text-2xl tracking-title">{card.title}</CardTitle>
                <CardDescription className="text-current/70">{card.body}</CardDescription>
              </CardContent>
            </Card>
          )}
        </div>
        {notes && (
          // Fade from the panel colour behind the notes so the warp beams never cross the text.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-deep from-40% to-transparent dark:from-deep-2"
          />
        )}
        {notes && (
          <div className="relative flex px-10 pb-10">
            {notes.map((n, i) => (
              <div key={n.title} className="flex flex-1">
                {i > 0 && <Separator orientation="vertical" className="mx-6 h-auto bg-current opacity-30" />}
                <div className="flex flex-col gap-1">
                  <h2 className="font-medium">{n.title}</h2>
                  <p className="text-sm opacity-90">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
      <div className="relative order-1 flex flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end gap-4 px-4 lg:px-8">
          {/* Same lockup as the app sidebar (app-sidebar.tsx); the mark is 2:1. */}
          <span className="mr-auto flex items-center gap-2 font-heading text-base font-semibold tracking-title text-foreground">
            <Image src="/brand/saella-mark.png" alt="" width={32} height={16} className="h-auto w-8" priority />
            Saella
          </span>
          <LanguagePicker value={locale} onChange={onLocaleChange} />
        </header>
        <main className={cn("flex flex-1 flex-col items-center justify-center px-6 pb-14", className)}>{children}</main>
      </div>
    </div>
  );
}
