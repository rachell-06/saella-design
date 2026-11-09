"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { type Locale } from "@/components/saella/language-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
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
} from "../../_components/auth-data";
import { AuthFrame } from "../../_components/auth-frame";

// Sign-in and sign-up (PRD-01 Authentication, read 2026-10-28; live app components/auth/LoginForm.tsx).
// - Work email only: free-mail and disposable addresses are refused with a reason (BR-AU-01, AC-AU-S-01). The
//   field is checked live and says "Email accepted" before submit (AC-AU-L-01).
// - Passwordless: Google, Microsoft or a 6-digit email code (BR-AU-02). Resend unlocks after 60s.
// - Sign-in never creates an account: an unknown email is told to sign up first (AC-AU-L-03, EC-AU-02).
// - Verifying the code opens the Overview on sign-in, onboarding on sign-up (AC-AU-L-02). A sign-up on a
//   domain that already has a workspace lands on request-to-join (AC-ORG-3-01).
// - Accounts that can't enter (pending join, locked workspace, disabled) get their lock screen.
// Mock: members in lib/mock/workspace sign in; thu@northwind-ceramics.com is disabled; bao@… has a pending
// request. Code 000000 is wrong, 999999 is expired, any other 6 digits verify.
//
// Preview with ?state=
//   signup | code | code-wrong | code-expired | personal | disposable | no-account | rate-limited | unavailable |
//   oauth-cancelled | loading                                  (form states)
//   join-pending | invited | join-none | claimed | workspace-locked | account-disabled   (lock screens)
type Mode = "signin" | "signup" | "code";
type Intent = "signin" | "signup";

const LOCK_STATES: Record<string, AccountState> = {
  "join-pending": "requested",
  invited: "invited",
  "join-none": "none",
  claimed: "claimed",
  "workspace-locked": "locked",
  "account-disabled": "disabled",
};

// Page-level errors from the server or the OAuth callback (PRD-01 §4).
const BANNERS: Record<string, { title: string; body: string }> = {
  "rate-limited": {
    title: "Too many sign-ups from this network",
    body: "For safety we allow 3 sign-ups per network each hour. Try again in 42 minutes.",
  },
  unavailable: {
    title: "We couldn't check your email right now",
    body: "Nothing was created. Try again shortly.",
  },
  "oauth-cancelled": {
    title: "Sign-in was cancelled",
    body: "The Google window closed before you finished. Try again, or use an email code.",
  },
};

export function LoginScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const preview = params.get("state") ?? "";

  const [locale, setLocale] = useState<Locale>("en");
  const [lock, setLock] = useState<AccountState | null>(LOCK_STATES[preview] ?? null);
  const [intent, setIntent] = useState<Intent>(preview === "signup" ? "signup" : "signin");
  const [mode, setMode] = useState<Mode>(preview.startsWith("code") ? "code" : preview === "signup" ? "signup" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(
    preview.startsWith("code") || preview === "no-account"
      ? preview === "no-account"
        ? "hoa@kestrel-logistics.vn"
        : "linh@northwind-ceramics.com"
      : preview === "personal"
        ? "linh.tran@gmail.com"
        : preview === "disposable"
          ? "test@mailinator.com"
          : ""
  );
  const [touched, setTouched] = useState(preview === "personal" || preview === "disposable");
  const [formError, setFormError] = useState<string | null>(
    preview === "no-account" ? "No account with that email. Sign up first." : null
  );
  const [banner, setBanner] = useState<{ title: string; body: string } | null>(BANNERS[preview] ?? null);
  const [code, setCode] = useState(preview === "code-wrong" ? WRONG_CODE : preview === "code-expired" ? EXPIRED_CODE : "");
  const [codeError, setCodeError] = useState<"wrong" | "expired" | null>(
    preview === "code-wrong" ? "wrong" : preview === "code-expired" ? "expired" : null
  );
  const [busy, setBusy] = useState<"email" | "google" | "microsoft" | "verify" | null>(
    preview === "loading" ? "email" : null
  );
  const [resendIn, setResendIn] = useState(preview.startsWith("code") ? 42 : 0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const verdict = checkEmail(email);
  // Live check (AC-AU-L-01): a refused provider or "accepted" shows while typing; a bad format waits for blur.
  const showVerdict = email.trim() !== "" && (touched || verdict.ok || verdict.reason !== "format");
  const emailError = showVerdict && !verdict.ok ? VERDICT_MESSAGE[verdict.reason] : null;

  function switchIntent(next: Intent) {
    setIntent(next);
    setMode(next);
    setFormError(null);
    setBanner(null);
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setFormError(null);
    if (!verdict.ok) return;
    const account = lookupAccount(email);
    // Sign-in never creates an account (AC-AU-L-03); sign-up on an existing account goes to sign-in.
    if (intent === "signin" && account.kind === "none") {
      setFormError("No account with that email. Sign up first.");
      return;
    }
    if (intent === "signup" && account.kind !== "none") {
      setFormError("There's already an account for this email. Sign in instead.");
      return;
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
      return router.push("/onboarding");
    }
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

  // OAuth: intent travels with the click so a sign-in can never create a workspace (AC-AU-O-04).
  function oauth(provider: "google" | "microsoft") {
    setBusy(provider);
    setBanner(null);
    setTimeout(() => {
      setBusy(null);
      enter(intent, intent === "signup" ? "hoa@kestrel-logistics.vn" : "linh@northwind-ceramics.com");
    }, 800);
  }

  if (lock) {
    return (
      <AuthFrame locale={locale} onLocaleChange={setLocale}>
        <AccountStatePanel initial={lock} />
      </AuthFrame>
    );
  }

  const signup = intent === "signup";

  return (
    <AuthFrame locale={locale} onLocaleChange={setLocale}>
      <div className="flex w-full max-w-sm flex-col gap-6">
        {mode === "code" ? (
          <CodeStep
            email={email}
            code={code}
            error={codeError}
            busy={busy === "verify"}
            resendIn={resendIn}
            onChange={(v) => {
              setCode(v);
              setCodeError(null);
              if (v.length === 6) verify(v);
            }}
            onVerify={() => verify()}
            onResend={() => {
              setResendIn(RESEND_AFTER_S);
              setCode("");
              setCodeError(null);
            }}
            onBack={() => setMode(intent)}
          />
        ) : (
          <>
            <div className="flex flex-col gap-1.5 text-center">
              <h1 className="font-heading text-2xl font-medium tracking-title">
                {signup ? "Create your account" : "Welcome to Saella"}
              </h1>
              <p className="text-muted-foreground">
                {signup ? "Start with your business email" : "Sign in with your business email"}
              </p>
            </div>

            {banner && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>{banner.title}</AlertTitle>
                <AlertDescription>{banner.body}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Button variant="outline" size="lg" disabled={busy !== null} onClick={() => oauth("google")}>
                {busy === "google" ? <Spinner data-icon="inline-start" /> : <GoogleMark />}
                {signup ? "Sign up with Google" : "Sign in with Google"}
              </Button>
              <Button variant="outline" size="lg" disabled={busy !== null} onClick={() => oauth("microsoft")}>
                {busy === "microsoft" ? <Spinner data-icon="inline-start" /> : <MicrosoftMark />}
                {signup ? "Sign up with Microsoft" : "Sign in with Microsoft"}
              </Button>
            </div>

            <FieldSeparator>or</FieldSeparator>

            <form onSubmit={submitEmail} noValidate>
              <FieldGroup className="gap-4">
                {signup && (
                  <Field>
                    <FieldLabel htmlFor="login-name">Full name</FieldLabel>
                    <Input
                      id="login-name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                )}
                <Field data-invalid={(emailError || formError) ? true : undefined}>
                  <FieldLabel htmlFor="login-email">Business email</FieldLabel>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@yourcompany.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFormError(null);
                    }}
                    onBlur={() => setTouched(true)}
                    aria-invalid={(emailError || formError) ? true : undefined}
                    aria-describedby="login-email-help"
                  />
                  <div id="login-email-help" aria-live="polite">
                    {emailError || formError ? (
                      <FieldError>
                        {emailError ?? formError}
                        {formError?.startsWith("No account") && (
                          <>
                            {" "}
                            <Button type="button" variant="link" className="h-auto p-0" onClick={() => switchIntent("signup")}>
                              Sign up
                            </Button>
                          </>
                        )}
                        {formError?.startsWith("There's already") && (
                          <>
                            {" "}
                            <Button type="button" variant="link" className="h-auto p-0" onClick={() => switchIntent("signin")}>
                              Sign in
                            </Button>
                          </>
                        )}
                      </FieldError>
                    ) : showVerdict && verdict.ok ? (
                      <FieldDescription className="flex items-center gap-1.5 text-success-soft-foreground">
                        <CircleCheckIcon className="size-4" aria-hidden />
                        Email accepted.
                      </FieldDescription>
                    ) : (
                      <FieldDescription>We&apos;ll email you a one-time code to verify.</FieldDescription>
                    )}
                  </div>
                </Field>
                <Button type="submit" size="lg" disabled={busy !== null} aria-busy={busy === "email" || undefined}>
                  {busy === "email" && <Spinner data-icon="inline-start" />}
                  {signup ? "Create account" : "Send code"}
                </Button>
              </FieldGroup>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {signup ? "Already have an account? " : "Don't have an account? "}
              <Button variant="link" className="h-auto p-0" onClick={() => switchIntent(signup ? "signin" : "signup")}>
                {signup ? "Sign in" : "Sign up"}
              </Button>
            </p>
          </>
        )}
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
  busy: boolean;
  resendIn: number;
  onChange: (v: string) => void;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        onVerify();
      }}
    >
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-heading text-2xl font-medium tracking-title">Enter your code</h1>
        <p className="text-muted-foreground">
          We sent a 6-digit code to <span className="block font-medium text-foreground">{email}</span>
        </p>
      </div>
      <Field data-invalid={error ? true : undefined} className="items-center">
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
          disabled={busy}
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
          <FieldError className="text-center">That code isn&apos;t right. Check the latest email and try again.</FieldError>
        )}
        {error === "expired" && (
          <FieldError className="text-center">This code has expired. Send a new one below.</FieldError>
        )}
      </Field>
      <Button type="submit" size="lg" disabled={busy || code.length < 6} aria-busy={busy || undefined}>
        {busy && <Spinner data-icon="inline-start" />}
        Verify & continue
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Button type="button" variant="link" className="h-auto p-0" onClick={onBack}>
          Use a different email
        </Button>
        {resendIn > 0 ? (
          <span className="text-muted-foreground tabular-nums">Resend in {resendIn}s</span>
        ) : (
          <Button type="button" variant="link" className="h-auto p-0" onClick={onResend}>
            Resend code
          </Button>
        )}
      </div>
    </form>
  );
}

// Provider marks drawn in one colour (no multi-colour icons in the DS).
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden data-icon="inline-start" fill="currentColor">
      <path d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.7 14.55 2.75 12 2.75 6.89 2.75 2.75 6.89 2.75 12S6.89 21.25 12 21.25c5.33 0 8.87-3.75 8.87-9.03 0-.6-.07-1.06-.15-1.52Z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden data-icon="inline-start" fill="currentColor">
      <path d="M3 3h8.5v8.5H3zM12.5 3H21v8.5h-8.5zM3 12.5h8.5V21H3zM12.5 12.5H21V21h-8.5z" />
    </svg>
  );
}
