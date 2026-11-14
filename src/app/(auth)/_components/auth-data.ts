import { WORKSPACE, members } from "@/lib/mock/workspace";

// Mock rules for sign-in and sign-up (PRD-01 Authentication). In the live app the database is
// the only email authority (BR-RULE-AU-01); here a short list stands in for it. Names are fictional.

// Any email address is accepted, personal ones included (differs from PRD-01
// BR-AU-01 / AC-AU-S-01 and the live app, which refuse free-mail and disposable providers).
// Public mail domains are still known, so they never count as a company: no join-by-domain for them.
const PUBLIC_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.vn", "outlook.com", "hotmail.com", "live.com",
  "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "yandex.com", "mail.ru",
  "qq.com", "163.com", "126.com", "zoho.com",
];

/** A free-mail provider: anyone can have an address there, so the domain says nothing about the company. */
export function isPublicDomain(domain: string) {
  return PUBLIC_DOMAINS.includes(domain.trim().toLowerCase());
}

export type EmailVerdict = { ok: true; domain: string } | { ok: false; reason: "format" };

const EMAIL = /^[^\s@]+@([a-z0-9-]+\.)+[a-z]{2,}$/i;

export function checkEmail(raw: string): EmailVerdict {
  const email = raw.trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, reason: "format" };
  return { ok: true, domain: email.split("@")[1] };
}

export const VERDICT_MESSAGE: Record<Exclude<EmailVerdict, { ok: true }>["reason"], string> = {
  format: "Enter an email address like you@example.com.",
};

// Extra accounts for the session states. u5 is disabled by the admin (BR-RULE-ORG-06).
const DISABLED = ["thu@northwind-ceramics.com"];

export type Account =
  | { kind: "active"; name: string }
  | { kind: "requested" } // join request waiting on the admin (AC-ORG-J-02)
  | { kind: "disabled" }
  | { kind: "none" };

/** What the server knows about this address. Sign-in never creates an account (AC-AU-L-03). */
export function lookupAccount(email: string): Account {
  const e = email.trim().toLowerCase();
  if (DISABLED.includes(e)) return { kind: "disabled" };
  const m = members.find((x) => x.email === e);
  if (!m) return { kind: "none" };
  return m.status === "pending" ? { kind: "requested" } : { kind: "active", name: m.name };
}

/** One workspace per company domain (BR-AU-03); a claimed domain sends new sign-ups to request-to-join. A public
 *  mail domain (gmail.com…) is never a company: sign-up there always creates a new workspace. */
export function domainOwner(domain: string) {
  if (isPublicDomain(domain)) return null;
  return domain === WORKSPACE.domain ? WORKSPACE.company : null;
}

// Mock session. The live app gates /onboarding on a signed-in user whose workspace has no onboarded_at
// (Repo app/onboarding/page.tsx, lib/email/onboarding.ts; AC-ONB-G-01/02): nobody signed in → /login, already
// onboarded → Overview. Here sign-in writes this record to sessionStorage (this tab only, gone on close) and
// onboarding reads it. Storage can be blocked, so every access is guarded and a failure reads as signed out.
export type MockSession = { email: string; onboarded: boolean };
const SESSION_KEY = "saella-mock-session";

export function saveSession(s: MockSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {}
}

export function readSessionRaw(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function parseSession(raw: string | null): MockSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockSession;
  } catch {
    return null;
  }
}

export const readSession = () => parseSession(readSessionRaw());

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

/** Preview codes: 000000 is wrong, 999999 is expired, any other 6 digits verify. */
export const WRONG_CODE = "000000";
export const EXPIRED_CODE = "999999";
export const RESEND_AFTER_S = 60; // resend unlocks after 60 seconds (PRD-01 §3)
