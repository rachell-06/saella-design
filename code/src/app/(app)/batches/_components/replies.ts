// Replies by intent for the Recipients tab (ĐX R6, 2026-10-29, learned from Apollo "Recent replies" and Unify).
// The backend does not classify replies yet: this mock spreads `metrics.replies` over recipients who opened, so the
// Replied count always equals the batch's replies number shown elsewhere in the report.

import type { RecipientRow, ReportBatch } from "./data";

export type ReplyIntent = "meet" | "question" | "ooo" | "not-interested" | "wrong-person";

export type Reply = { intent: ReplyIntent; at: string };

export type ReplyRow = RecipientRow & { reply?: Reply };

/** Order of the chips, most actionable first. Badge variants reuse the report's status palette. */
export const INTENTS: { value: ReplyIntent; label: string; variant: "success" | "info" | "secondary" | "warning" | "outline" }[] = [
  { value: "meet", label: "Willing to meet", variant: "success" },
  { value: "question", label: "Follow-up question", variant: "info" },
  { value: "ooo", label: "Out of office", variant: "secondary" },
  { value: "not-interested", label: "Not interested", variant: "warning" },
  { value: "wrong-person", label: "Wrong person", variant: "outline" },
];

// Illustrative mix of intents (cumulative shares in INTENTS order), not a benchmark.
const SHARES = [0.3, 0.55, 0.75, 0.92, 1];

/** Attaches a reply to exactly `metrics.replies` recipients (same batch → same people, same intents). */
export function withReplies(b: ReportBatch, rows: RecipientRow[]): ReplyRow[] {
  const total = b.metrics?.replies ?? 0;
  // Someone who unsubscribed or marked the email as spam is not counted as a reply here.
  const eligible = rows.filter((r) => r.opened && !r.unsubscribed && !r.complained);
  const count = Math.min(total, eligible.length);
  if (count === 0) return rows;
  const stride = eligible.length / count;
  const replied = new Map<string, Reply>();
  for (let j = 0; j < count; j++) {
    const r = eligible[Math.floor(j * stride)];
    const h = hash(r.id);
    const intent = INTENTS[SHARES.findIndex((s) => (h % 1000) / 1000 < s)].value;
    // Replies land 10 minutes to about 2 days after the open.
    const opened = new Date(r.lastActivity ?? b.sentAt ?? `${b.createdOn}T02:00:00Z`).getTime();
    const at = new Date(opened + (10 + (Math.floor(h / 1000) % 2870)) * 60_000).toISOString();
    replied.set(r.id, { intent, at });
  }
  return rows.map((r) => (replied.has(r.id) ? { ...r, reply: replied.get(r.id) } : r));
}

// FNV-1a: small, deterministic, good enough to spread intents and times.
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
