"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Dark mode (2026-10-27): next-themes puts class `dark` on <html>; tokens.css
// swaps every color under `.dark`. Default is light (user request 2026-10-28; was "follow the OS"). People can
// still pick Dark or System in the account menu; their choice is remembered.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
