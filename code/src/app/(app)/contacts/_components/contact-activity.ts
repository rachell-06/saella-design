import { WORKSPACE_TZ } from "@/lib/time";
import { type ReportBatch, allBatches, batchTitle, findTemplate } from "@/lib/mock/batches";
import { type Contact } from "@/lib/mock/contacts";
import { NOW as MOCK_NOW } from "@/lib/mock/constants";

// Email activity of one contact (R8, 2026-10-29; HubSpot contact Activities tab, Apollo A2 engagement). The live
// app keeps per-recipient events for each batch (report Recipients tab) but has no per-contact view or API yet;
// this mock derives one from the batches sent to the contact's list, deterministically, so screenshots are stable:
// - a contact with no "Last sent" never received anything (empty state); nothing after that date is shown;
// - inclusion and engagement follow each batch's own rates (bounces, opens, clicks, unsubscribes);
// - an unsubscribe ends the history; an unreachable contact's newest batch bounced (or was marked as spam);
// - replies are boosted over the batch rate so the illustration has some (numbers are illustrative).

export type ActivityKind = "delivered" | "opened" | "clicked" | "replied" | "bounced" | "unsubscribed" | "complained";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  at: string;
  batchId: string;
  batchTitle: string;
  template: string;
  /** Clicked link, when the event is a click. */
  url?: string;
};

export type ActivitySummary = { received: number; opened: number; clicked: number; replied: number; bounced: number };

/** The shared mock clock. Events after it haven't happened yet. */
const NOW = Date.parse(MOCK_NOW);

const LINKS = ["northwind-ceramics.com/catalog-2026", "northwind-ceramics.com/samples", "northwind-ceramics.com/price-list"];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);

function sentAtMs(b: ReportBatch) {
  return new Date(b.sentAt ?? `${b.createdOn}T02:00:00Z`).getTime();
}

/** Newest first. `listSize` scales how likely the contact was in each batch (recipients ÷ list size). */
export function contactActivity(contact: Contact, listId: string, listSize: number): ActivityEvent[] {
  if (!contact.lastSent || contact.unreachable === "bad_format") return [];
  const until = new Date(`${contact.lastSent.on}T23:59:59Z`).getTime();
  const candidates = allBatches()
    .filter((b) => (b.status === "sent" || b.status === "sending") && b.listIds.includes(listId) && sentAtMs(b) <= until)
    .sort((a, b) => sentAtMs(a) - sentAtMs(b));
  if (candidates.length === 0) return [];

  const r = rng(hash(contact.id));
  let received = candidates.filter((b) => r() < Math.min(0.95, Math.max(0.25, b.recipients / Math.max(1, listSize))));
  // "Last sent" says they got at least one email: keep the newest batch in.
  const newest = candidates[candidates.length - 1];
  if (!received.includes(newest)) received = [...received, newest];

  const hardBounce = contact.unreachable === "bounced" || contact.unreachable === "no_mailbox" || contact.unreachable === "low_quality";
  // The address failed on its first send: that one bounce is the whole history.
  if (hardBounce) received = [newest];

  const out: ActivityEvent[] = [];
  for (const b of received) {
    const rb = rng(hash(`${contact.id}|${b.id}`));
    const met = b.metrics;
    const base = { batchId: b.id, batchTitle: batchTitle(b), template: findTemplate(b.templateId)?.template.name ?? "Untitled template" };
    const push = (kind: ActivityKind, at: number, url?: string) => {
      if (at <= NOW) out.push({ id: `${b.id}-${kind}`, kind, at: new Date(at).toISOString(), url, ...base });
    };
    const t0 = sentAtMs(b) + Math.round(rb() * 40) * 60_000;
    const isLast = b === received[received.length - 1];
    if ((hardBounce && isLast) || (!hardBounce && met && rb() < met.bounces / Math.max(1, b.recipients))) {
      push("bounced", t0);
      continue;
    }
    push("delivered", t0);
    const complained = contact.unreachable === "complained" && isLast;
    const opened = complained || (met ? rb() < met.opens / Math.max(1, met.delivered) : false);
    if (!opened) continue;
    const tOpen = t0 + Math.round(10 + rb() * 60 * 26) * 60_000;
    push("opened", tOpen);
    if (complained) {
      push("complained", tOpen + 2 * 60_000);
      break;
    }
    if (met && rb() < met.clicks / Math.max(1, met.opens)) push("clicked", tOpen + Math.round(1 + rb() * 4) * 60_000, LINKS[Math.floor(rb() * LINKS.length)]);
    if (met && rb() < (met.replies / Math.max(1, met.opens)) * 2.5) push("replied", tOpen + Math.round(40 + rb() * 60 * 30) * 60_000);
    if (met && rb() < met.unsubs / Math.max(1, met.opens)) {
      push("unsubscribed", tOpen + 3 * 60_000);
      break;
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Counted per batch: "opened 3" means three of the batches were opened, however many times. */
export function summarize(events: ActivityEvent[]): ActivitySummary {
  const batches = (k: ActivityKind[]) => new Set(events.filter((e) => k.includes(e.kind)).map((e) => e.batchId)).size;
  return {
    received: batches(["delivered", "bounced"]),
    opened: batches(["opened"]),
    clicked: batches(["clicked"]),
    replied: batches(["replied"]),
    bounced: batches(["bounced"]),
  };
}

/** Month groups in order, e.g. "October 2026", workspace time. */
export function groupByMonth(events: ActivityEvent[]) {
  const groups: { month: string; events: ActivityEvent[] }[] = [];
  for (const e of events) {
    const month = new Date(e.at).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: WORKSPACE_TZ });
    const last = groups[groups.length - 1];
    if (last?.month === month) last.events.push(e);
    else groups.push({ month, events: [e] });
  }
  return groups;
}

export function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: WORKSPACE_TZ });
}
