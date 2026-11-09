"use client";

import { useSyncExternalStore } from "react";
import { type ContactList, contactLists, members } from "@/lib/mock/workspace";

// Contacts mock (2026-10-28). Lists come from the shared `contactLists`; their contacts are generated here,
// deterministically so screenshots are stable. A small module store keeps lists and contacts across client
// navigation (/contacts → /contacts/[listId] → /companies "Save as contact list"), which React state alone
// would lose. Names are fictional; "today" is 2026-10-27.

export const TODAY = "2026-10-27";

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

// Email safety (R10, 2026-10-29, Apollo A1 "Email Status"): three levels replace the single unreachable flag in
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
  catch_all: "The domain accepts every address, so we can't tell whether this mailbox exists",
  role_address: "Shared inbox (info@, sales@…): often filtered, and nobody in particular reads it",
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
  /** Saved from the company registry: the address stays masked until unlocked (PRD-04 CO-UNLOCK-001). Sending still works. */
  masked?: boolean;
  /** Last template sent to this contact (live app: "Templates sent" column). */
  lastSent?: { template: string; on: string };
};

export type ListMeta = Omit<ContactList, "contacts" | "unreachable">;

type State = { lists: ListMeta[]; contacts: Record<string, Contact[]> };

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
const COMPANY_B: Record<string, string[]> = {
  l1: ["Hotel", "Resort", "Boutique Hotel", "Suites", "Hotel & Spa"],
  l2: ["Home Living", "Trading", "Interiors", "Supply", "Tiles"],
  l3: ["Distribution", "Building Supply", "Trading Sdn Bhd", "Materials", "Wholesale"],
  l4: ["Architects", "Design Studio", "Atelier", "Interiors"],
};
const POSITIONS: Record<string, string[]> = {
  l1: ["Purchasing manager", "Procurement officer", "General manager", "F&B manager", "Housekeeping manager"],
  l2: ["Owner", "Buyer", "Sales manager", "Showroom manager"],
  l3: ["Purchasing director", "Category manager", "Owner", "Operations manager"],
  l4: ["Principal architect", "Interior designer", "Project architect", "Design director"],
};
const EXTRA_TAGS = ["vip", "met in person", "reorder", "samples sent"];
const AUTO_REASONS: UnreachableReason[] = ["no_mailbox", "no_mailbox", "bounced", "low_quality", "complained", "bad_format"];
const ROLE_INBOXES = ["info", "sales", "purchasing", "contact"];
const SENT_TEMPLATES: Record<string, string> = {
  l1: "Intro – ceramics catalog",
  l2: "Nice to meet you at the fair",
  l3: "Q4 reorder reminder",
  l4: "New tile range lookbook",
};

const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");

function generate(list: ContactList): Contact[] {
  const r = rng(list.id.charCodeAt(1) * 7919);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const suffixes = COMPANY_B[list.id] ?? ["Trading"];
  const positions = POSITIONS[list.id] ?? ["Manager"];
  const tld = list.id === "l1" ? "vn" : list.id === "l4" ? "sg" : list.id === "l2" ? "co.th" : "my";
  // Spread the unreachable ones evenly through the list.
  const every = list.unreachable > 0 ? Math.floor(list.contacts / list.unreachable) : Infinity;
  return Array.from({ length: list.contacts }, (_, i) => {
    const firstName = pick(FIRST);
    const lastName = pick(LAST);
    const company = `${pick(COMPANY_A)} ${pick(suffixes)}`;
    const extra = r() < 0.18 ? [pick(EXTRA_TAGS)] : [];
    const unreachable = i % every === every - 1 && Math.floor(i / every) < list.unreachable ? AUTO_REASONS[i % AUTO_REASONS.length] : undefined;
    const day = 1 + (i % 27);
    // A few addresses that may bounce (R10); picked by index so the random stream, and every other field, stays as it was.
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
      id: `${list.id}-c${i + 1}`,
      firstName,
      lastName,
      email: `${user}@${slug(company)}.${tld}`,
      company,
      position: r() < 0.85 ? pick(positions) : undefined,
      phone: r() < 0.5 ? `+${list.id === "l1" ? "84 28" : list.id === "l4" ? "65 6" : "60 3"}${Math.floor(1000000 + r() * 8999999)}` : undefined,
      tags: extra,
      unreachable,
      caution,
      addedOn: list.createdOn,
      lastSent: r() < 0.7 && SENT_TEMPLATES[list.id] ? { template: SENT_TEMPLATES[list.id], on: `2026-10-${String(day).padStart(2, "0")}` } : undefined,
    };
  });
}

let state: State = {
  lists: contactLists.map((l): ListMeta => ({ id: l.id, name: l.name, source: l.source, tags: l.tags, createdOn: l.createdOn, ownerId: l.ownerId })),
  contacts: Object.fromEntries(contactLists.map((l) => [l.id, generate(l)])),
};

const listeners = new Set<() => void>();
function setState(fn: (s: State) => State) {
  state = fn(state);
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Lists and contacts, shared by /contacts, /contacts/[listId] and /companies. */
export function useContactsStore() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function listStats(contacts: Contact[] = []) {
  return { contacts: contacts.length, unreachable: contacts.filter((c) => c.unreachable).length };
}

/** Contacts per safety level, for the filter counts. */
export function safetyCounts(contacts: Contact[]): Record<EmailSafety, number> {
  const out: Record<EmailSafety, number> = { safe: 0, caution: 0, do_not_send: 0 };
  for (const c of contacts) out[emailSafety(c)] += 1;
  return out;
}

export const ownerName = (id: string) => members.find((m) => m.id === id)?.name ?? "Unknown";
export const SOURCE_LABEL: Record<ListMeta["source"], string> = {
  upload: "Uploaded",
  companies: "From Companies",
  agent: "Built by the agent",
};

// ---------------------------------------------------------------------------------------------------------
// Tags (live app: lib/email/contact-tags.ts normalizeTags)

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
// Actions

export const CURRENT_USER_ID = "u1";

export function createList(meta: Pick<ListMeta, "name" | "source"> & { tags?: string[] }, contacts: Contact[] = []): string {
  const id = `l-${Date.now().toString(36)}`;
  setState((s) => ({
    lists: [{ id, name: meta.name, source: meta.source, tags: meta.tags ?? [], createdOn: TODAY, ownerId: CURRENT_USER_ID }, ...s.lists],
    contacts: { ...s.contacts, [id]: contacts },
  }));
  return id;
}

export function renameList(id: string, name: string) {
  setState((s) => ({ ...s, lists: s.lists.map((l) => (l.id === id ? { ...l, name } : l)) }));
}

export function deleteList(id: string) {
  setState((s) => {
    const rest = { ...s.contacts };
    delete rest[id];
    return { lists: s.lists.filter((l) => l.id !== id), contacts: rest };
  });
}

const contactKey = (c: Pick<Contact, "email" | "company">) => `${c.email.trim().toLowerCase()}|${c.company.trim().toLowerCase()}`;

/**
 * Add contacts to a list. A contact is unique per (email, company) and saving again updates it in place
 * (PRD Contacts BR-RULE-CON-05, AC-CON-I-04); tags are merged, not replaced, on add (CON-SEQ-003).
 */
export function upsertContacts(listId: string, incoming: Omit<Contact, "id" | "addedOn">[]) {
  const existing = state.contacts[listId] ?? [];
  const byKey = new Map(existing.map((c) => [contactKey(c), c]));
  let added = 0;
  let updated = 0;
  const next = [...existing];
  for (const c of incoming) {
    const hit = byKey.get(contactKey(c));
    if (hit) {
      updated += 1;
      const merged = { ...hit, ...stripEmpty(c), tags: normalizeTags([...hit.tags, ...c.tags]) };
      next[next.indexOf(hit)] = merged;
      byKey.set(contactKey(c), merged);
    } else {
      added += 1;
      const row = { ...c, id: `${listId}-n${Date.now().toString(36)}${added}`, addedOn: TODAY, tags: normalizeTags(c.tags) };
      next.unshift(row);
      byKey.set(contactKey(c), row);
    }
  }
  setState((s) => ({ ...s, contacts: { ...s.contacts, [listId]: next } }));
  return { added, updated };
}

function stripEmpty<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "")) as Partial<T>;
}

export function isDuplicateIn(listId: string, c: Pick<Contact, "email" | "company">) {
  const key = contactKey(c);
  return (state.contacts[listId] ?? []).some((x) => contactKey(x) === key);
}

export function updateContacts(listId: string, ids: string[], fn: (c: Contact) => Contact) {
  const set = new Set(ids);
  setState((s) => ({
    ...s,
    contacts: { ...s.contacts, [listId]: (s.contacts[listId] ?? []).map((c) => (set.has(c.id) ? fn(c) : c)) },
  }));
}

export function removeContacts(listId: string, ids: string[]) {
  const set = new Set(ids);
  setState((s) => ({ ...s, contacts: { ...s.contacts, [listId]: (s.contacts[listId] ?? []).filter((c) => !set.has(c.id)) } }));
}

export function formatDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const fmt = (n: number) => n.toLocaleString("en-US");

export function maskEmail(e: string) {
  const [user, domain] = e.split("@");
  return `${user?.[0] ?? ""}•••@${domain ?? ""}`;
}
