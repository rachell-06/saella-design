"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2Icon } from "lucide-react";
import type { Locale } from "@/components/saella/language-picker";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import {
  type MockSession,
  clearSession,
  isPublicDomain,
  parseSession,
  readSession,
  readSessionRaw,
  saveSession,
} from "../../_components/auth-data";
import { AuthFrame } from "../../_components/auth-frame";
import { SaellaCharacter } from "../../_components/saella-character";

// First run after sign-up (PRD Onboarding US-ONB-G/W; live app app/onboarding/page.tsx + OnboardingFlow.tsx on
// origin/development 2026-11-12).
// - Sign-in first, as the live app: nobody signed in → /login; a workspace already onboarded → Overview
//   (AC-ONB-G-01/02). Mocked with the session that /login writes (auth-data.ts).
// - No company questions (user decision 2026-11-12, decisions.md "Onboarding"). The live wizard asks for website,
//   name, logo and targeting; all of it lives in Settings › Company, so asking twice is dropped. Language is the
//   header picker (the live welcome screen's flag pick). What is left: a welcome naming the workspace, one pointer
//   to Company, and one button into the app.
// - Either button marks the workspace onboarded. "Open my workspace" lands on the Overview with the first-run tour
//   (AC-ONB-W-02, live ?tour=1). No skip or bypass is needed because nothing is asked (AC-ONB-G-03 holds).
// - The character waves above the title (DESIGN.md §2); the panel card says "You're in".
// Preview with ?state= welcome | welcome-personal (gmail sign-up) | opening (otherwise the real mock session decides)

// Fictional new sign-up (not a real customer), used by the previews.
const PREVIEW: MockSession = { email: "hoa@kestrel-logistics.vn", onboarded: false };
const PREVIEW_PERSONAL: MockSession = { email: "minhanh.tran@gmail.com", onboarded: false };

const noSubscribe = () => () => {};

export function WelcomeScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const preview = params.get("state") ?? "";
  const isPreview = preview === "welcome" || preview === "welcome-personal" || preview === "opening";

  const [locale, setLocale] = useState<Locale>("en");
  // The session lives in sessionStorage, so the server render and the first client render see nobody (null).
  const raw = useSyncExternalStore(noSubscribe, readSessionRaw, () => null);
  const stored = useMemo(() => parseSession(raw), [raw]);
  const session = isPreview ? (preview === "welcome-personal" ? PREVIEW_PERSONAL : PREVIEW) : stored && !stored.onboarded ? stored : null;
  const [leaving, setLeaving] = useState<"open" | "company" | null>(preview === "opening" ? "open" : null);

  // Gate, run after mount once storage is readable.
  useEffect(() => {
    if (isPreview) return;
    const s = readSession();
    if (!s) router.replace("/login");
    else if (s.onboarded) router.replace("/overview");
  }, [isPreview, router]);

  function leave(to: "open" | "company") {
    if (!session) return;
    setLeaving(to);
    if (!isPreview) saveSession({ ...session, onboarded: true });
    setTimeout(() => router.push(to === "open" ? "/overview?tour=1" : "/settings/workspace"), 700);
  }

  function signOut() {
    clearSession();
    router.push("/login");
  }

  if (!session) return null;

  const domain = session.email.split("@")[1];
  const busy = leaving !== null;

  return (
    <AuthFrame
      locale={locale}
      onLocaleChange={setLocale}
      card={{
        title: "You're in",
        body: "Your agent is ready to find buyers.",
      }}
    >
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <SaellaCharacter pose="wave" className="mb-2 w-24" />
          <h1 className="font-heading text-3xl font-medium tracking-title">Welcome to Saella</h1>
          <p className="text-muted-foreground">
            {isPublicDomain(domain) ? "Your workspace is ready." : `Your workspace for ${domain} is ready.`}
          </p>
        </div>

        <Item variant="outline" className="gap-x-3 rounded-card px-4 py-3 text-[length:inherit]">
          <ItemMedia variant="icon" className="text-muted-foreground">
            <Building2Icon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Company details</ItemTitle>
            <ItemDescription>Name, logo and who you sell to. The agent writes your emails from them.</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              aria-busy={leaving === "company" || undefined}
              onClick={() => leave("company")}
            >
              {leaving === "company" && <Spinner data-icon="inline-start" />}
              Add details
            </Button>
          </ItemActions>
        </Item>

        <div className="flex flex-col items-center gap-4">
          <Button className="w-full" disabled={busy} aria-busy={leaving === "open" || undefined} onClick={() => leave("open")}>
            {leaving === "open" && <Spinner data-icon="inline-start" />}
            Open my workspace
          </Button>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{session.email}</span>
            {" · "}
            <Button variant="link" className="h-auto border-0 p-0 text-sm" disabled={busy} onClick={signOut}>
              Sign out
            </Button>
          </p>
        </div>
      </div>
    </AuthFrame>
  );
}
