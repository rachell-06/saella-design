import { type Contact, tagsOf, withAnyTag } from "@/lib/mock/contacts";
import { KNOWN_TAGS, MERGE_TAGS, detailsFor, splitTags } from "@/lib/mock/templates";
import type { Sender } from "@/lib/mock/workspace";
import { type AudienceSummary, SUBJECTS, summarizeAudience } from "@/lib/mock/batches";

// Who a new batch really goes to, person by person (2026-10-29, Competitor.md R1–R3).
// R1 "Send to" / "Don't send to": contact tags picked and left out (2026-11-10: tags, no named lists; HubSpot
//    "Don't send to", Mailchimp "Do not send to"), on top of the live app's own exclusions. summarizeAudience
//    (lib/mock/batches.ts) works person by person over the contact book.
// R2 per-recipient check: for each merge tag the template really uses, who has no value for it, so a greeting
//    never goes out as "Hi ," (Clay's lesson: a bad substitution reached the email with no warning).
// R3 preview values: the merge tag values one recipient gets, with the chosen fallbacks.
// The live app needs the server to apply exclusions, count overlap and return the recipient rows.

export type Recipient = {
  id: string;
  tags: string[];
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  /** A Saella company (registry), not a Self-upload contact: shown by its company name. */
  isCompany?: boolean;
};

export type RefinedAudience = Omit<AudienceSummary, "people"> & {
  /** The people the batch goes to, in book order (length = recipients). */
  people: Recipient[];
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

// The Contacts mock has a name and a company for everyone; real uploads don't. A few rows are blanked here,
// deterministically, so the check has something to find: shared inboxes with no name, rows with no company.
const SHARED_INBOX = ["info", "sales", "purchasing"];
function toRecipient(c: Contact): Recipient {
  const h = hash(c.id);
  const domain = c.email.split("@")[1] ?? "";
  const noName = h % 97 === 0;
  return {
    id: c.id,
    tags: c.tags,
    firstName: noName ? "" : c.firstName,
    lastName: noName ? "" : c.lastName,
    email: noName ? `${SHARED_INBOX[h % SHARED_INBOX.length]}@${domain}` : c.email,
    company: h % 131 === 1 ? "" : c.company,
  };
}

/** Who a batch to these tags reaches, minus "Don't send to", with the recipients the per-recipient check reads. */
export function buildAudience(
  book: Contact[],
  tags: string[],
  excludeTags: string[],
  templateId: string | undefined,
  /** Contacts picked one by one; replaces the tag match when given. */
  ids?: ReadonlySet<string>
): RefinedAudience {
  const base = summarizeAudience(book, tags, excludeTags, templateId, ids);
  return { ...base, people: base.people.map(toRecipient) };
}

/** Other tags the picked people carry, for the "Don't send to" picker. */
export function tagsIn(book: Contact[], tags: string[]) {
  const picked = new Set(tags.map((t) => t.toLowerCase()));
  return tagsOf(withAnyTag(book, tags)).filter((t) => !picked.has(t.toLowerCase()));
}

// ---------------------------------------------------------------------------------------------------------------
// R2: per-recipient check against the merge tags the template uses
// ---------------------------------------------------------------------------------------------------------------

/** The subject the batch sends: the batch mock's subject line, else the template's. */
export function subjectFor(templateId: string | undefined) {
  if (!templateId) return "";
  return SUBJECTS[templateId] ?? detailsFor(templateId).subject;
}

/** Every text in the template that can hold a merge tag: subject, preheader and the blocks. */
function textsOf(templateId: string, subject: string) {
  const d = detailsFor(templateId);
  const blockTexts = d.blocks.flatMap((b) =>
    b.type === "heading" || b.type === "paragraph"
      ? [b.text]
      : b.type === "hero"
        ? [b.headline, b.subline]
        : b.type === "button"
          ? [b.label]
          : []
  );
  return [subject, d.preheader, ...blockTexts].filter(Boolean);
}

/** Recipient fields behind each merge tag. Sender tags come from the sender, never empty. */
const FIELD: Record<string, (r: Recipient) => string> = {
  recipient_first_name: (r) => r.firstName,
  recipient_name: (r) => `${r.firstName} ${r.lastName}`.trim(),
  company_name: (r) => r.company,
  recipient_email: (r) => r.email,
};

export const TAG_LABEL: Record<string, string> = Object.fromEntries(MERGE_TAGS.map((m) => [m.tag, m.label]));
export const DEFAULT_FALLBACK: Record<string, string> = Object.fromEntries(MERGE_TAGS.map((m) => [m.tag, m.fallback]));

export type DataIssue =
  | {
      kind: "missing";
      tag: string;
      /** e.g. "first name" */
      field: string;
      people: Recipient[];
      /** The first line that uses the tag, e.g. "Hi {{recipient_first_name}},". */
      line: string;
    }
  | { kind: "unknown"; tag: string; line: string };

export type RecipientCheck = {
  /** Recipient merge tags the template uses (labels), e.g. ["First name", "Company"]. */
  fields: string[];
  issues: DataIssue[];
};

export function checkRecipients(templateId: string | undefined, subject: string, people: Recipient[]): RecipientCheck {
  if (!templateId) return { fields: [], issues: [] };
  const texts = textsOf(templateId, subject);
  const used = new Map<string, string>();
  for (const t of texts) for (const p of splitTags(t)) if (p.tag && !used.has(p.tag)) used.set(p.tag, t);
  const issues: DataIssue[] = [];
  const fields: string[] = [];
  for (const [tag, line] of used) {
    if (!KNOWN_TAGS.has(tag)) {
      issues.push({ kind: "unknown", tag, line });
      continue;
    }
    const get = FIELD[tag];
    if (!get) continue;
    fields.push(TAG_LABEL[tag]);
    const missing = people.filter((r) => !get(r));
    if (missing.length) issues.push({ kind: "missing", tag, field: TAG_LABEL[tag].toLowerCase(), people: missing, line });
  }
  return { fields, issues };
}

/** Merge tag values for one recipient; an empty field takes its fallback. */
export function valuesFor(r: Recipient, sender: Sender | undefined, fallbacks: Record<string, string>) {
  const values: Record<string, string> = {
    sender_name: sender?.name ?? "",
    sender_email: sender?.email ?? "",
  };
  for (const [tag, get] of Object.entries(FIELD)) values[tag] = get(r) || (fallbacks[tag] ?? "");
  return values;
}

/** Fields this recipient has no value for, among the ones the template uses. */
export function gapsOf(r: Recipient, issues: DataIssue[]) {
  return issues.filter((i): i is Extract<DataIssue, { kind: "missing" }> => i.kind === "missing" && i.people.some((p) => p.id === r.id));
}

export const displayName = (r: Recipient) => `${r.firstName} ${r.lastName}`.trim();
/** How a recipient is named in pickers and lists: the company for Saella companies, else the person. */
export const recipientLabel = (r: Recipient) => (r.isCompany ? r.company : displayName(r) || r.email);
