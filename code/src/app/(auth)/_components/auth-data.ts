import { WORKSPACE, members } from "@/lib/mock/workspace";

// Mock rules for sign-in and sign-up (PRD-01 Authentication, read 2026-10-28). In the live app the database is
// the only email authority (BR-RULE-AU-01); here a short list stands in for it. Names are fictional.

// Free-mail and disposable providers are refused before anything is created (BR-AU-01, AC-AU-S-01).
const PERSONAL = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.vn", "outlook.com", "hotmail.com", "live.com",
  "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "yandex.com", "mail.ru",
  "qq.com", "163.com", "126.com", "zoho.com",
];
const DISPOSABLE = ["mailinator.com", "yopmail.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", "trashmail.com"];

export type EmailVerdict =
  | { ok: true; domain: string }
  | { ok: false; reason: "format" | "work_email" | "disposable_email" };

const EMAIL = /^[^\s@]+@([a-z0-9-]+\.)+[a-z]{2,}$/i;

export function checkEmail(raw: string): EmailVerdict {
  const email = raw.trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, reason: "format" };
  const domain = email.split("@")[1];
  if (DISPOSABLE.includes(domain)) return { ok: false, reason: "disposable_email" };
  if (PERSONAL.includes(domain)) return { ok: false, reason: "work_email" };
  // Academic domains (.edu and country variants) are accepted like any organisation (AC-AU-S-05).
  return { ok: true, domain };
}

// Copy from the live app (lib/i18n/messages.ts: msg.login.workemail, lf.disposable).
export const VERDICT_MESSAGE: Record<Exclude<EmailVerdict, { ok: true }>["reason"], string> = {
  format: "Enter an email address like you@yourcompany.com.",
  work_email: "A business email is required. Personal providers (Gmail, Outlook, …) aren't accepted. Use your company domain.",
  disposable_email: "A business email is required. That looks like a temporary mailbox. Use your company domain.",
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

/** One workspace per email domain (BR-AU-03); a claimed domain sends new sign-ups to request-to-join. */
export function domainOwner(domain: string) {
  return domain === WORKSPACE.domain ? WORKSPACE.company : null;
}

/** Preview codes: 000000 is wrong, 999999 is expired, any other 6 digits verify. */
export const WRONG_CODE = "000000";
export const EXPIRED_CODE = "999999";
export const RESEND_AFTER_S = 60; // resend unlocks after 60 seconds (PRD-01 §3)
