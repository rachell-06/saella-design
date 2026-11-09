import type { Contact } from "@/app/(app)/contacts/_components/data";
import { KNOWN_TAGS, MERGE_TAGS, detailsFor, splitTags } from "@/app/(app)/templates/_components/data";
import type { Sender } from "@/lib/mock/workspace";
import { type AudienceSummary, BATCH_CAP, LIST_OVERLAP, SUBJECTS } from "./data";

// Who a new batch really goes to, person by person (2026-10-29, Competitor.md R1–R3).
// R1 "Don't send to": lists and contact tags left out on top of the live app's own exclusions (HubSpot "Don't
//    send to", Mailchimp "Do not send to"). Counts follow summarizeAudience; the people come from the Contacts mock.
// R2 per-recipient check: for each merge tag the template really uses, who has no value for it, so a greeting
//    never goes out as "Hi ," (Clay's lesson: a bad substitution reached the email with no warning).
// R3 preview values: the merge tag values one recipient gets, with the chosen fallbacks.
// The live app needs the server to apply exclusions, count overlap and return the recipient rows.

export type Exclusions = { listIds: string[]; tags: string[] };

export type Recipient = {
  id: string;
  listId: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
};

export type RefinedAudience = AudienceSummary & {
  /** Left out because they are also in a "Don't send to" list. */
  excludedByList: number;
  /** Left out because they carry a "Don't send to" tag. */
  excludedByTag: number;
  excluded: number;
  /** The people the batch goes to, in list order (length = recipients). */
  people: Recipient[];
  /** Contacts in the picked lists that can't be reached, for "Review who is left out". */
  unreachablePeople: Contact[];
  /** Contacts left out by a "Don't send to" tag. */
  taggedPeople: Contact[];
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
    listId: c.id.split("-")[0],
    firstName: noName ? "" : c.firstName,
    lastName: noName ? "" : c.lastName,
    email: noName ? `${SHARED_INBOX[h % SHARED_INBOX.length]}@${domain}` : c.email,
    company: h % 131 === 1 ? "" : c.company,
  };
}

/** Applies "Don't send to" on top of summarizeAudience and lists the people who will get the email. */
export function applyExclusions(
  base: AudienceSummary,
  contacts: Record<string, Contact[]>,
  ex: Exclusions
): RefinedAudience {
  const picked = base.lists.map((l) => l.id);
  const exLists = ex.listIds.filter((id) => !picked.includes(id));
  let excludedByList = 0;
  for (const p of picked) for (const e of exLists) excludedByList += LIST_OVERLAP[[p, e].sort().join("|")] ?? 0;
  const inLists = picked.flatMap((id) => contacts[id] ?? []);
  const reachable = inLists.filter((c) => !c.unreachable);
  const taggedPeople = ex.tags.length ? reachable.filter((c) => c.tags.some((t) => ex.tags.includes(t))) : [];
  // Some tagged people were already out (duplicates, already received): count only the share still eligible.
  const share = reachable.length ? Math.min(1, base.eligible / reachable.length) : 0;
  const excludedByTag = Math.round(taggedPeople.length * share);
  const excluded = Math.min(base.eligible, excludedByList + excludedByTag);
  const eligible = base.eligible - excluded;
  const recipients = Math.min(eligible, BATCH_CAP);
  const out = new Set(taggedPeople.map((c) => c.id));
  return {
    ...base,
    eligible,
    recipients,
    truncated: eligible - recipients,
    excludedByList,
    excludedByTag,
    excluded,
    people: reachable
      .filter((c) => !out.has(c.id))
      .slice(0, recipients)
      .map(toRecipient),
    unreachablePeople: inLists.filter((c) => !!c.unreachable),
    taggedPeople,
  };
}

/** Contact tags found in these lists, for the "Don't send to" tag picker. */
export function tagsIn(contacts: Record<string, Contact[]>, listIds: string[]) {
  const tags = new Set<string>();
  for (const id of listIds) for (const c of contacts[id] ?? []) c.tags.forEach((t) => tags.add(t));
  return [...tags].sort();
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
