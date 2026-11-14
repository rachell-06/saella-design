"use client";

import { useSyncExternalStore } from "react";

// Contacts mock (one flat book ). The workspace has one contact book grouped by tag,
// no named lists (PRD Contacts BR-RULE-CON-05, live app email_individual_contacts.tags). Contacts are generated here from a few groups, each with its own tags, deterministically so
// screenshots are stable. A small module store keeps the book across client navigation (/contacts, the batch
// wizard), which React state alone would lose. Self-upload holds only contacts the user uploads, never registry
// data. Names are fictional.

import { CURRENT_USER_ID, TODAY } from "@/lib/mock/constants";
export { CURRENT_USER_ID, TODAY };

/** Why an address can't be reached (live app: lib/email/contact-status.ts), plus a manual flag. */
export type UnreachableReason = "bad_format" | "no_mailbox" | "low_quality" | "complained" | "bounced" | "flagged";

export const REASON_LABEL: Record<UnreachableReason, string> = {
  bad_format: "Not a usable email address",
  no_mailbox: "The receiving server says this mailbox does not exist",
  low_quality: "Our email provider refuses it after earlier failures",
  complained: "Marked one of your emails as spam",
  bounced: "Emails to it came back",
  flagged: "Flagged by you",
};

// Email safety: three levels replace the single unreachable flag in
// the UI. "Do not send" is exactly `unreachable` (left out when you send, as before); "Send with caution" still
// sends but may bounce; "Safe to send" means an email has reached it. The data keeps `unreachable` as is, so
// batches (recipient-check, left-out dialog) read the same field; `caution` is new and only shown.

export type EmailSafety = "safe" | "caution" | "do_not_send";

export const SAFETY_LABEL: Record<EmailSafety, string> = {
  safe: "Safe to send",
  caution: "Send with caution",
  do_not_send: "Do not send",
};

/** Why an address that hasn't failed may still bounce. `not_delivered` is derived (nothing has reached it yet). */
export type CautionReason = "catch_all" | "role_address" | "new_domain" | "not_delivered";

export const CAUTION_LABEL: Record<CautionReason, string> = {
  catch_all: "Accepts any address, so we can't confirm this mailbox exists",
  role_address: "Shared inbox (info@, sales@…): often filtered, rarely read",
  new_domain: "The domain was registered recently and has no sending history",
  not_delivered: "No email has reached this address yet",
};

export function emailSafety(c: Pick<Contact, "unreachable" | "caution" | "lastSent">): EmailSafety {
  if (c.unreachable) return "do_not_send";
  return cautionReason(c) ? "caution" : "safe";
}

export function cautionReason(c: Pick<Contact, "unreachable" | "caution" | "lastSent">): CautionReason | undefined {
  if (c.unreachable) return undefined;
  return c.caution ?? (c.lastSent ? undefined : "not_delivered");
}

/** One line on why the address sits at its level. */
export function safetyReason(c: Pick<Contact, "unreachable" | "caution" | "lastSent">): string {
  if (c.unreachable) return REASON_LABEL[c.unreachable];
  const why = cautionReason(c);
  if (why) return CAUTION_LABEL[why];
  return c.lastSent ? `Emails have reached it, most recently on ${formatDate(c.lastSent.on)}` : "Emails have reached it";
}

export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  position?: string;
  phone?: string;
  tags: string[];
  /** Set when the address can't be reached; Saella sets it from bounces, people can flag it by hand. */
  unreachable?: UnreachableReason;
  /** Set by address checks (catch-all domain, role inbox, new domain). Still sent to; shown as "Send with caution". */
  caution?: Exclude<CautionReason, "not_delivered">;
  addedOn: string;
  /** Last template sent to this contact (live app: "Templates sent" column). */
  lastSent?: { template: string; on: string };
};

type State = { contacts: Contact[] };

// ---------------------------------------------------------------------------------------------------------
// Tags (live app: lib/email/contact-tags.ts normalizeTags). Above the generator, which uses them at load.

export const MAX_TAGS_PER_CONTACT = 20;
export const MAX_TAG_LENGTH = 60;

/** Trim, collapse spaces, drop empties, cap length and count, dedupe case-insensitively keeping the first casing. */
export function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    const s = v.replace(/[{}",\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= MAX_TAGS_PER_CONTACT) break;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// Deterministic generation

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Mai", "Huong", "Quang", "Thao", "Duc", "Lan", "Somchai", "Niran", "Aisyah", "Farid", "Siti", "Rizal", "Mei Ling", "Wei", "Joy", "Paolo", "Hana", "Khanh", "Arif", "Ploy", "Dewi", "Tuan", "Nadia", "Carlo"];
const LAST = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Srisuk", "Wongsa", "Rahman", "Abdullah", "Tan", "Lim", "Santos", "Reyes", "Putri", "Wijaya", "Vu", "Dang", "Ong", "Chua", "Bautista"];
const COMPANY_A = ["Lotus Bay", "Riverside", "Green Lagoon", "Silver Sand", "Mekong Star", "Palm Grove", "Coral Point", "Jade Hill", "Sunrise", "Harbor Light", "Orchid", "Blue Reef", "Golden Bamboo", "Lantern", "Bamboo Leaf", "Cloud Nine"];
/**
 * How the demo book was filled: one group per way people came in, each with the tags its people carry. Only a
 * seed for the generator; the app knows tags, not groups. Batches in workspace.ts send to these tags.
 */
type Group = {
  /** Id prefix of the generated contacts. */
  key: string;
  /** Random seed, so every field stays the same between renders. */
  seed: number;
  tags: string[];
  size: number;
  unreachable: number;
  addedOn: string;
  companySuffixes: string[];
  positions: string[];
  tld: string;
  phonePrefix: string;
  /** Template these people last got (live app "Templates sent"). */
  sentTemplate: string;
};

const GROUPS: Group[] = [
  {
    key: "h",
    seed: 49,
    tags: ["hotel", "vietnam"],
    size: 1240,
    unreachable: 22,
    addedOn: "2026-09-28",
    companySuffixes: ["Hotel", "Resort", "Boutique Hotel", "Suites", "Hotel & Spa"],
    positions: ["Purchasing manager", "Procurement officer", "General manager", "F&B manager", "Housekeeping manager"],
    tld: "vn",
    phonePrefix: "84 28",
    sentTemplate: "Intro – ceramics catalog",
  },
  {
    key: "f",
    seed: 50,
    tags: ["fair", "thailand"],
    size: 312,
    unreachable: 7,
    addedOn: "2026-09-02",
    companySuffixes: ["Home Living", "Trading", "Interiors", "Supply", "Tiles"],
    positions: ["Owner", "Buyer", "Sales manager", "Showroom manager"],
    tld: "co.th",
    phonePrefix: "60 3",
    sentTemplate: "Nice to meet you at the fair",
  },
  {
    key: "d",
    seed: 51,
    tags: ["distributor"],
    size: 2875,
    unreachable: 85,
    addedOn: "2026-08-14",
    companySuffixes: ["Distribution", "Building Supply", "Trading Sdn Bhd", "Materials", "Wholesale"],
    positions: ["Purchasing director", "Category manager", "Owner", "Operations manager"],
    tld: "my",
    phonePrefix: "60 3",
    sentTemplate: "Q4 reorder reminder",
  },
  {
    key: "a",
    seed: 52,
    tags: ["architect", "singapore"],
    size: 248,
    unreachable: 3,
    addedOn: "2026-10-20",
    companySuffixes: ["Architects", "Design Studio", "Atelier", "Interiors"],
    positions: ["Principal architect", "Interior designer", "Project architect", "Design director"],
    tld: "sg",
    phonePrefix: "65 6",
    sentTemplate: "New tile range lookbook",
  },
];

const EXTRA_TAGS = ["vip", "met in person", "reorder", "samples sent"];
const AUTO_REASONS: UnreachableReason[] = ["no_mailbox", "no_mailbox", "bounced", "low_quality", "complained", "bad_format"];
const ROLE_INBOXES = ["info", "sales", "purchasing", "contact"];

const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");

function generate(g: Group): Contact[] {
  const r = rng(g.seed * 7919);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  // Spread the unreachable ones evenly through the group.
  const every = g.unreachable > 0 ? Math.floor(g.size / g.unreachable) : Infinity;
  return Array.from({ length: g.size }, (_, i) => {
    const firstName = pick(FIRST);
    const lastName = pick(LAST);
    const company = `${pick(COMPANY_A)} ${pick(g.companySuffixes)}`;
    const extra = r() < 0.18 ? [pick(EXTRA_TAGS)] : [];
    const unreachable = i % every === every - 1 && Math.floor(i / every) < g.unreachable ? AUTO_REASONS[i % AUTO_REASONS.length] : undefined;
    const day = 1 + (i % 27);
    // A few addresses that may bounce; picked by index so the random stream, and every other field, stays as it was.
    const caution: Contact["caution"] = unreachable
      ? undefined
      : i % 29 === 3
        ? "role_address"
        : i % 37 === 8
          ? "catch_all"
          : i % 53 === 14
            ? "new_domain"
            : undefined;
    const user = caution === "role_address" ? ROLE_INBOXES[i % ROLE_INBOXES.length] : `${slug(firstName)}.${slug(lastName)}${i > 40 ? i : ""}`;
    return {
      id: `${g.key}-c${i + 1}`,
      firstName,
      lastName,
      email: `${user}@${slug(company)}.${g.tld}`,
      company,
      position: r() < 0.85 ? pick(g.positions) : undefined,
      phone: r() < 0.5 ? `+${g.phonePrefix}${Math.floor(1000000 + r() * 8999999)}` : undefined,
      tags: normalizeTags([...g.tags, ...extra]),
      unreachable,
      caution,
      addedOn: g.addedOn,
      lastSent: r() < 0.7 ? { template: g.sentTemplate, on: `2026-10-${String(day).padStart(2, "0")}` } : undefined,
    };
  });
}

// Newest first, as the live app lists contacts (CON-SEQ-002 orders by creation time).
const byNewest = (a: Contact, b: Contact) => b.addedOn.localeCompare(a.addedOn);

let state: State = { contacts: GROUPS.flatMap(generate).sort(byNewest) };

const listeners = new Set<() => void>();
function setState(fn: (s: State) => State) {
  state = fn(state);
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** The contact book, shared by /contacts, /companies and the batch wizard. */
export function useContactsStore() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** The book right now, for code outside React (import preview, setup checks). */
export const getContacts = () => state.contacts;

/** Distinct tags, case-insensitive, sorted (CON-SEQ-002 tags endpoint). */
export function tagsOf(contacts: Pick<Contact, "tags">[]) {
  return [...new Map(contacts.flatMap((c) => c.tags).map((t) => [t.toLowerCase(), t])).values()].sort((a, b) => a.localeCompare(b));
}

/** Contacts carrying any of these tags (case-insensitive), the way Contacts and batches pick people. */
export function withAnyTag<T extends Pick<Contact, "tags">>(contacts: T[], tags: string[]) {
  const want = new Set(tags.map((t) => t.toLowerCase()));
  return contacts.filter((c) => c.tags.some((t) => want.has(t.toLowerCase())));
}

/** /contacts filtered by these tags, e.g. the "View contacts" action after saving. */
export function contactsHref(tags: string[]) {
  if (tags.length === 0) return "/contacts";
  const q = new URLSearchParams(tags.map((t) => ["tag", t]));
  return `/contacts?${q}`;
}

/** Contacts per safety level, for the filter counts. */
export function safetyCounts(contacts: Contact[]): Record<EmailSafety, number> {
  const out: Record<EmailSafety, number> = { safe: 0, caution: 0, do_not_send: 0 };
  for (const c of contacts) out[emailSafety(c)] += 1;
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// Actions

/** The dedupe key: a contact is unique per (email, company name) in the workspace (BR-RULE-CON-05). */
export const contactKey = (c: Pick<Contact, "email" | "company">) => `${c.email.trim().toLowerCase()}|${c.company.trim().toLowerCase()}`;

/**
 * Add contacts to the book, each with `tags` on top of its own. Same email + company already in the book →
 * updated in place, tags merged, not replaced (PRD Contacts BR-RULE-CON-05, AC-CON-I-04, CON-SEQ-003).
 */
export function upsertContacts(incoming: Omit<Contact, "id" | "addedOn">[], tags: string[] = []) {
  const byKey = new Map(state.contacts.map((c) => [contactKey(c), c]));
  const changed = new Map<string, Contact>();
  const fresh: Contact[] = [];
  let added = 0;
  let updated = 0;
  const stamp = Date.now().toString(36);
  for (const c of incoming) {
    const key = contactKey(c);
    const hit = byKey.get(key);
    if (hit) {
      updated += 1;
      const merged = { ...hit, ...stripEmpty(c), id: hit.id, addedOn: hit.addedOn, tags: normalizeTags([...hit.tags, ...c.tags, ...tags]) };
      byKey.set(key, merged);
      changed.set(hit.id, merged);
      const i = fresh.indexOf(hit);
      if (i >= 0) fresh[i] = merged;
    } else {
      added += 1;
      const row: Contact = { ...c, id: `n${stamp}-${added}`, addedOn: TODAY, tags: normalizeTags([...c.tags, ...tags]) };
      fresh.push(row);
      byKey.set(key, row);
    }
  }
  // New rows first: the book lists newest first.
  setState((s) => ({ contacts: [...fresh, ...s.contacts.map((c) => changed.get(c.id) ?? c)] }));
  return { added, updated };
}

function stripEmpty<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "")) as Partial<T>;
}

/** Whether this email + company is already in the book (import preview, AC-CON-I-04). */
export function isInBook(c: Pick<Contact, "email" | "company">) {
  const key = contactKey(c);
  return state.contacts.some((x) => contactKey(x) === key);
}

export function updateContacts(ids: string[], fn: (c: Contact) => Contact) {
  const set = new Set(ids);
  setState((s) => ({ contacts: s.contacts.map((c) => (set.has(c.id) ? fn(c) : c)) }));
}

export function removeContacts(ids: string[]) {
  const set = new Set(ids);
  setState((s) => ({ contacts: s.contacts.filter((c) => !set.has(c.id)) }));
}

export function formatDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const fmt = (n: number) => n.toLocaleString("en-US");

