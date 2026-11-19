"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlertIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { type Locale } from "@/components/saella/language-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { type AccountState, AccountStatePanel } from "../../_components/account-state";
import {
  EXPIRED_CODE,
  RESEND_AFTER_S,
  VERDICT_MESSAGE,
  WRONG_CODE,
  checkEmail,
  domainOwner,
  lookupAccount,
  saveSession,
} from "../../_components/auth-data";
import { AuthFrame } from "../../_components/auth-frame";
import { SaellaCharacter } from "../../_components/saella-character";

// Sign-in and sign-up (PRD Authentication; live app components/auth/LoginForm.tsx on origin/master).
// Layout: Studio Admin auth v2 login (title, provider buttons, "or" divider, labelled form, full-width submit); the
// switch to the other tab sits under the form.
// - Any email works, personal ones included (PRD BR-AU-01 / AC-AU-S-01 and the live app refuse free-mail;
//   not settled yet). Only the format is checked, after blur or submit.
// - Sign-up asks for full name and email; the name is required (live msg.login.fullname).
// - Passwordless: Google, Microsoft or a 6-digit email code (BR-AU-02). Resend unlocks after 60s.
// - Sign-in never creates an account: an unknown email is told to sign up first, on the code and the OAuth path
//   (AC-AU-L-03).
// - Verifying the code opens the Overview on sign-in, onboarding on sign-up (AC-AU-L-02). A sign-up on a domain
//   that already has a workspace lands on request-to-join (AC-ORG-3-01, supersedes the live "domain taken" error).
// - OAuth errors come back to /login with a reason (AC-AU-O-02/03, live ?error=…); the tab the user left from is
//   restored (live saella_oauth_mode cookie).
// - Accounts that can't enter (pending join, locked workspace, disabled) get their lock screen.
// Mock: members in lib/mock/workspace sign in; thu@northwind-ceramics.com is disabled; bao@… has a pending
// request. Code 000000 is wrong, 999999 is expired, any other 6 digits verify.
//
// Preview with ?state=
//   signup | code | code-wrong | code-expired | no-account | loading                                (form)
//   rate-limited | unavailable | signup-failed | oauth-cancelled | oauth-failed | oauth-link-used |
//   oauth-no-account                                                                               (returned errors)
//   join-pending | invited | join-none | claimed | workspace-locked | account-disabled             (lock screens)
type Mode = "signin" | "signup" | "code";
type Intent = "signin" | "signup";

// Brand panel notes (Studio Admin v2 bottom block): the two rules people hit at sign-in (BR-AU-01, BR-AU-02).
const PANEL_NOTES: [{ title: string; body: string }, { title: string; body: string }] = [
  { title: "Any email works", body: "Use your work or personal address. Colleagues on your company domain can join you." },
  { title: "No password", body: "Continue with Google or Microsoft, or get a one-time code by email." },
];

const LOCK_STATES: Record<string, AccountState> = {
  "join-pending": "requested",
  invited: "invited",
  "join-none": "none",
  claimed: "claimed",
  "workspace-locked": "locked",
  "account-disabled": "disabled",
};

// Page-level errors from the server or the OAuth callback (PRD Authentication §4; live LoginForm ?error= codes).
// oauth_provider, oauth_exchange and oauth_nosession read the same to the user, so they share one message.
type Banner = {
  tone: "destructive" | "warning" | "default";
  title: string;
  body: string;
  intent?: Intent;
  /** Offer the other tab, e.g. "Sign up" after an OAuth sign-in found no account. */
  switchTo?: Intent;
};
const BANNERS: Record<string, Banner> = {
  "rate-limited": {
    tone: "destructive",
    title: "Too many sign-ups from this network",
    body: "Try again in 42 minutes.",
    intent: "signup",
  },
  unavailable: {
    tone: "destructive",
    title: "We couldn't check your email right now",
    body: "Nothing was created. Try again shortly.",
  },
  "signup-failed": {
    tone: "destructive",
    title: "We couldn't finish creating your workspace",
    body: "Nothing was kept. Try again.",
    intent: "signup",
  },
  "oauth-cancelled": {
    tone: "default",
    title: "Sign-in was cancelled",
    body: "Pick an account to continue, or use an email code.",
  },
  "oauth-failed": {
    tone: "destructive",
    title: "We couldn't finish signing you in",
    body: "Try again, or use an email code.",
  },
  "oauth-link-used": {
    tone: "warning",
    title: "That sign-in link was already used",
    body: "Start sign-in again.",
  },
  "oauth-no-account": {
    tone: "destructive",
    title: "No account for that email",
    body: "",
    switchTo: "signup",
  },
};
const BANNER_ICON = { destructive: CircleAlertIcon, warning: TriangleAlertIcon, default: InfoIcon };

const PREVIEW_EMAIL: Record<string, string> = {
  code: "linh@northwind-ceramics.com",
  "code-wrong": "linh@northwind-ceramics.com",
  "code-expired": "linh@northwind-ceramics.com",
  "no-account": "hoa@kestrel-logistics.vn",
  loading: "linh@northwind-ceramics.com",
};

export function LoginScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const preview = params.get("state") ?? "";
  const previewBanner = BANNERS[preview];

  const [locale, setLocale] = useState<Locale>("en");
  const [lock, setLock] = useState<AccountState | null>(LOCK_STATES[preview] ?? null);
  const [intent, setIntent] = useState<Intent>(
    preview === "signup" || previewBanner?.intent === "signup" ? "signup" : "signin"
  );
  const [mode, setMode] = useState<Mode>(
    preview.startsWith("code") ? "code" : preview === "signup" || previewBanner?.intent === "signup" ? "signup" : "signin"
  );
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [email, setEmail] = useState(PREVIEW_EMAIL[preview] ?? "");
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    preview === "no-account" ? "No account with that email." : null
  );
  const [banner, setBanner] = useState<Banner | null>(previewBanner ?? null);
  const [code, setCode] = useState(preview === "code-wrong" ? WRONG_CODE : preview === "code-expired" ? EXPIRED_CODE : "");
  const [codeError, setCodeError] = useState<"wrong" | "expired" | null>(
    preview === "code-wrong" ? "wrong" : preview === "code-expired" ? "expired" : null
  );
  const [fieldFocus, setFieldFocus] = useState(false);
  const [busy, setBusy] = useState<"email" | "google" | "microsoft" | "verify" | "resend" | null>(
    preview === "loading" ? "email" : null
  );
  const [resendIn, setResendIn] = useState(preview.startsWith("code") ? 42 : 0);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const signup = intent === "signup";
  const verdict = checkEmail(email);
  // Format only, shown after blur or submit.
  const emailError = email.trim() !== "" && touched && !verdict.ok ? VERDICT_MESSAGE[verdict.reason] : null;
  const nameError = signup && nameTouched && !name.trim() ? "Enter your full name." : null;

  function switchIntent(next: Intent) {
    setIntent(next);
    setMode(next);
    setFormError(null);
    setBanner(null);
    setNameTouched(false);
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setFormError(null);
    if (signup) setNameTouched(true);
    // Focus the first field with an error.
    if (signup && !name.trim()) return nameRef.current?.focus();
    if (!verdict.ok) return emailRef.current?.focus();
    const account = lookupAccount(email);
    // Sign-in never creates an account (AC-AU-L-03); sign-up on an existing account goes to sign-in.
    if (intent === "signin" && account.kind === "none") {
      setFormError("No account with that email.");
      return emailRef.current?.focus();
    }
    if (intent === "signup" && account.kind !== "none") {
      setFormError("There's already an account for this email.");
      return emailRef.current?.focus();
    }
    setBusy("email");
    setTimeout(() => {
      setBusy(null);
      setMode("code");
      setCode("");
      setCodeError(null);
      setResendIn(RESEND_AFTER_S);
    }, 700);
  }

  // Where a verified user lands.
  function enter(target: Intent, address: string) {
    const account = lookupAccount(address);
    if (account.kind === "disabled") return setLock("disabled");
    if (account.kind === "requested") return setLock("requested");
    if (target === "signup") {
      const domain = address.split("@")[1] ?? "";
      if (domainOwner(domain)) return setLock("claimed");
      // A new workspace isn't onboarded yet, so the gate sends it to /onboarding (AC-ONB-G-01).
      saveSession({ email: address, onboarded: false });
      return router.push("/onboarding");
    }
    saveSession({ email: address, onboarded: true });
    router.push("/overview");
  }

  function verify(value = code) {
    if (value.length < 6) return;
    setBusy("verify");
    setCodeError(null);
    setTimeout(() => {
      setBusy(null);
      if (value === WRONG_CODE) return setCodeError("wrong");
      if (value === EXPIRED_CODE) return setCodeError("expired");
      enter(intent, email.trim().toLowerCase());
    }, 600);
  }

  function resend() {
    setBusy("resend");
    setTimeout(() => {
      setBusy(null);
      setResendIn(RESEND_AFTER_S);
      setCode("");
      setCodeError(null);
      toast.success("New code sent");
    }, 600);
  }

  // OAuth: intent travels with the click so a sign-in can never create a workspace (AC-AU-O-04).
  function oauth(provider: "google" | "microsoft") {
    setBusy(provider);
    setBanner(null);
    setTimeout(() => {
      setBusy(null);
      enter(intent, signup ? "hoa@kestrel-logistics.vn" : "linh@northwind-ceramics.com");
    }, 800);
  }

  if (lock) {
    return (
      <AuthFrame locale={locale} onLocaleChange={setLocale}>
        <AccountStatePanel initial={lock} email={email.trim() || undefined} />
      </AuthFrame>
    );
  }

  const BannerIcon = banner ? BANNER_ICON[banner.tone] : null;

  return (
    <AuthFrame
      locale={locale}
      onLocaleChange={setLocale}
      notes={PANEL_NOTES}
      card={
        signup
          ? {
              title: "Start with one email",
              body: "Your agent finds buyers for you.",
            }
          : {
              title: "Welcome to Saella",
              body: "Find buyers and reach them by email.",
            }
      }
    >
      {/* Brand character beside the form, pointing at it. In the column's flow, so the pair is centred in the form
          column and the character never runs off its left edge. Shown from xl, where the column fits both. */}
      <div className="flex w-full items-center justify-center gap-6">
        <SaellaCharacter
          entrance
          pose="point"
          mood={emailError || formError || nameError || codeError ? "error" : fieldFocus ? "focus" : "idle"}
          cheerKey={intent}
          className="hidden w-36 shrink-0 xl:block"
        />
        <div className="relative flex w-full flex-col gap-8 sm:w-88">
          {mode === "code" ? (
            <CodeStep
              email={email}
              code={code}
              error={codeError}
              busy={busy}
              resendIn={resendIn}
              onChange={(v) => {
                setCode(v);
                setCodeError(null);
                if (v.length === 6) verify(v);
              }}
              onVerify={() => verify()}
              onResend={resend}
              onBack={() => setMode(intent)}
            />
          ) : (
            <>
              <h1 className="text-center font-heading text-3xl font-medium tracking-title">
                {signup ? "Create your account" : "Sign in"}
              </h1>

              <div className="flex flex-col gap-4">
                {banner && BannerIcon && (
                  <Alert variant={banner.tone}>
                    <BannerIcon />
                    <AlertTitle>{banner.title}</AlertTitle>
                    <AlertDescription>
                      <p>
                        {banner.body}
                        {banner.switchTo && (
                          <>
                            {" "}
                            <Button
                              variant="link"
                              className="h-auto border-0 p-0"
                              onClick={() => switchIntent(banner.switchTo!)}
                            >
                              {banner.switchTo === "signup" ? "Sign up instead" : "Sign in instead"}
                            </Button>
                          </>
                        )}
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="w-full" disabled={busy !== null} onClick={() => oauth("google")}>
                    {busy === "google" ? <Spinner data-icon="inline-start" /> : <GoogleMark />}
                    {signup ? "Sign up with Google" : "Sign in with Google"}
                  </Button>
                  <Button variant="outline" className="w-full" disabled={busy !== null} onClick={() => oauth("microsoft")}>
                    {busy === "microsoft" ? <Spinner data-icon="inline-start" /> : <MicrosoftMark />}
                    {signup ? "Sign up with Microsoft" : "Sign in with Microsoft"}
                  </Button>
                </div>

                <FieldSeparator>or</FieldSeparator>

                <form
                  onSubmit={submitEmail}
                  noValidate
                  className="flex flex-col gap-4"
                  onFocus={() => setFieldFocus(true)}
                  onBlur={() => setFieldFocus(false)}
                >
                  <FieldGroup className="gap-4">
                    {signup && (
                      <Field className="gap-1.5" data-invalid={nameError ? true : undefined}>
                        <FieldLabel htmlFor="login-name">Full name</FieldLabel>
                        <Input
                          ref={nameRef}
                          id="login-name"
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onBlur={() => setNameTouched(true)}
                          aria-invalid={nameError ? true : undefined}
                        />
                        {nameError && <FieldError>{nameError}</FieldError>}
                      </Field>
                    )}
                    <Field className="gap-1.5" data-invalid={emailError || formError ? true : undefined}>
                      <FieldLabel htmlFor="login-email">Email</FieldLabel>
                      <Input
                        ref={emailRef}
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setFormError(null);
                        }}
                        onBlur={() => setTouched(true)}
                        aria-invalid={emailError || formError ? true : undefined}
                        aria-describedby="login-email-help"
                      />
                      {/* No hint line: "Send code" and the panel's "No password" note already say a code comes by email. */}
                      <div id="login-email-help" aria-live="polite">
                        {(emailError || formError) && (
                          <FieldError>
                            {emailError ?? formError}
                            {formError && (
                              <>
                                {" "}
                                <Button
                                  type="button"
                                  variant="link"
                                  className="h-auto border-0 p-0"
                                  onClick={() => switchIntent(formError.startsWith("No account") ? "signup" : "signin")}
                                >
                                  {formError.startsWith("No account") ? "Sign up instead" : "Sign in instead"}
                                </Button>
                              </>
                            )}
                          </FieldError>
                        )}
                      </div>
                    </Field>
                  </FieldGroup>
                  <Button type="submit" className="w-full" disabled={busy !== null} aria-busy={busy === "email" || undefined}>
                    {busy === "email" && <Spinner data-icon="inline-start" />}
                    {signup ? "Create account" : "Send code"}
                  </Button>
                </form>
              </div>
              {/* Switch to the other tab, under the form (Studio Admin v2 puts it in the header). */}
              <p className="text-center text-sm text-muted-foreground">
                {signup ? "Already have an account? " : "Don't have an account? "}
                <Button variant="link" className="h-auto border-0 p-0" onClick={() => switchIntent(signup ? "signin" : "signup")}>
                  {signup ? "Sign in" : "Sign up"}
                </Button>
              </p>
            </>
          )}
        </div>
      </div>
    </AuthFrame>
  );
}

function CodeStep({
  email,
  code,
  error,
  busy,
  resendIn,
  onChange,
  onVerify,
  onResend,
  onBack,
}: {
  email: string;
  code: string;
  error: "wrong" | "expired" | null;
  busy: string | null;
  resendIn: number;
  onChange: (v: string) => void;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const verifying = busy === "verify";
  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        onVerify();
      }}
    >
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-heading text-3xl font-medium tracking-title">Enter your code</h1>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="block font-medium text-foreground">{email}</span>
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <Field data-invalid={error ? true : undefined} className="items-center gap-1.5">
          <FieldLabel htmlFor="login-code" className="sr-only">
            6-digit code
          </FieldLabel>
          <InputOTP
            id="login-code"
            maxLength={6}
            pattern="^[0-9]*$"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={onChange}
            disabled={verifying}
            autoFocus
            aria-invalid={error ? true : undefined}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot key={i} index={i} className="size-11 text-lg" aria-invalid={error ? true : undefined} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {error === "wrong" && (
            <FieldError className="text-center">That code isn&apos;t right. Check the latest email.</FieldError>
          )}
          {error === "expired" && <FieldError className="text-center">This code has expired. Send a new one.</FieldError>}
        </Field>
        <Button type="submit" className="w-full" disabled={verifying || code.length < 6} aria-busy={verifying || undefined}>
          {verifying && <Spinner data-icon="inline-start" />}
          Verify & continue
        </Button>
        <div className="flex items-center justify-between text-sm">
          <Button type="button" variant="link" className="h-auto border-0 p-0" onClick={onBack}>
            Use a different email
          </Button>
          {resendIn > 0 ? (
            <span className="text-muted-foreground tabular-nums">Resend in {resendIn}s</span>
          ) : (
            <Button
              type="button"
              variant="link"
              className="h-auto border-0 p-0"
              disabled={busy !== null}
              aria-busy={busy === "resend" || undefined}
              onClick={onResend}
            >
              {busy === "resend" && <Spinner data-icon="inline-start" />}
              Resend code
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

// Provider marks in their official colours, light and dark alike. Fixed third-party brand colours are the one
// allowed exception to tokens: sign-in buttons must look like the provider's own.
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden data-icon="inline-start">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" aria-hidden data-icon="inline-start">
      <path fill="#F25022" d="M1 1h9v9H1z" />
      <path fill="#7FBA00" d="M11 1h9v9h-9z" />
      <path fill="#00A4EF" d="M1 11h9v9H1z" />
      <path fill="#FFB900" d="M11 11h9v9h-9z" />
    </svg>
  );
}
