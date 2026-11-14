import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { RouteProgress } from "@/components/saella/route-progress";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { cn } from "@/lib/utils";

// Brand font is Geist (shared with the LP). shadcn's globals.css reads
// --font-sans and --font-heading; both point at Geist.
const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Saella Platform",
  description: "Saella app UI and design system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the `dark` class before hydration, so <html> differs from the server markup.
    <html
      lang="en"
      className={cn("h-full antialiased font-sans", geist.variable, geistMono.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {/* Top bar while a route loads. */}
          <RouteProgress />
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
