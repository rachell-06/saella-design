"use client";

import { useMemo } from "react";
import {
  type Contact,
  REASON_LABEL,
  contactKey,
  normalizeTags,
  removeContacts,
  tagsOf,
  updateContacts,
  upsertContacts,
  useContactsStore,
} from "@/lib/mock/contacts";
import type { ContactDraft } from "./contact-dialog";

// One contact book per workspace, grouped by tag (PRD Contacts BR-CON-04; decisions.md "Leads › Contacts",
// 2026-11-05: no named lists, tags like the live app). The shared mock (lib/mock/contacts.ts) keeps the flat book;
// this file gives the screen the book, its tags and the write actions.

export type BookContact = Contact;

/** Valid / Invalid as the live app (lib/email/contact-status.ts): invalid = what already happened to the address. */
export const isInvalid = (c: Pick<Contact, "unreachable">) => Boolean(c.unreachable);
export const invalidReason = (c: Pick<Contact, "unreachable">) => (c.unreachable ? REASON_LABEL[c.unreachable] : undefined);

export function useContactBook() {
  const { contacts } = useContactsStore();
  return useMemo(() => ({ contacts, tags: tagsOf(contacts) }), [contacts]);
}

/**
 * Add one contact. Same email + company already in the book → update it in place, tags merged
 * (AC-CON-M-02, BR-RULE-CON-05, CON-SEQ-003).
 */
export function addContact(book: BookContact[], draft: ContactDraft): "added" | "updated" {
  const hit = book.some((c) => contactKey(c) === contactKey(draft));
  upsertContacts([draft]);
  return hit ? "updated" : "added";
}

/** Edit any field; tags are replaced, not merged (AC-CON-M-03, CON-SEQ-003). */
export function editContact(contact: BookContact, draft: ContactDraft) {
  updateContacts([contact.id], (c) => ({
    ...c,
    ...draft,
    tags: normalizeTags(draft.tags),
    // The Invalid verdict came from the old address's history; a new address has none yet.
    unreachable: draft.email === c.email ? c.unreachable : undefined,
    caution: draft.email === c.email ? c.caution : undefined,
  }));
}

/** Hard delete; past sends and reports stay (AC-CON-D-01, D-02). */
export function deleteContact(contact: BookContact) {
  removeContacts([contact.id]);
}
