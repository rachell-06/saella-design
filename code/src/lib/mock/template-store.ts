import type { Campaign, Template } from "@/lib/mock/campaigns";
import type { TemplateDetails } from "@/lib/mock/templates";
import { members } from "@/lib/mock/workspace";

const nameOf = (email: string) => members.find((m) => m.email === email)?.name ?? email;

// What the template "⋯" menu changes in this session (mock): status, owner, share list, copies, deletes and the
// activity log they leave. One store so Templates, a template's page and the Campaigns cards show the same thing.
// Module state: survives moving between screens, resets on reload (so server and first client render agree).
// Read through applyTemplateStore / findTemplate / detailsFor in lib/mock/templates.ts.
// Backend (live app): PATCH /api/email/templates/[id] (status), POST|DELETE …/shares, POST …/transfer,
// POST …/copy, DELETE (soft delete), GET …/activity.

/** The live app's nine logged actions (Repo template-activity.ts). Views are not logged. */
export type ActivityAction = "edit" | "share" | "revoke" | "copy" | "send" | "reassign" | "schedule" | "followup" | "delete";

export type ActivityEntry = { id: string; action: ActivityAction; actor: string; at: string; detail?: string };

export type TemplateCopy = {
  campaign: Omit<Campaign, "templates">;
  template: Template;
  details: TemplateDetails;
};

export type TemplateStoreState = {
  patch: Readonly<Record<string, Partial<Pick<Template, "status" | "owner" | "name">>>>;
  /** Content saved in the editor this session (seed and created templates alike); read through detailsFor. */
  content: Readonly<Record<string, EditedContent>>;
  /** Share list (emails) once someone changed it; otherwise the mock's. */
  shares: Readonly<Record<string, readonly string[]>>;
  deleted: readonly string[];
  copies: readonly TemplateCopy[];
  /** Templates moved to another campaign in the editor (live PATCH campaign_id, TPL-UPDATE-001): id → campaign id. */
  moves: Readonly<Record<string, string>>;
  log: Readonly<Record<string, readonly ActivityEntry[]>>;
};

export type EditedContent = Pick<TemplateDetails, "kind" | "subject" | "preheader" | "senderId" | "blocks" | "html" | "attachments">;

const INITIAL: TemplateStoreState = { patch: {}, content: {}, shares: {}, deleted: [], copies: [], moves: {}, log: {} };
let state = INITIAL;
const listeners = new Set<() => void>();
export const subscribeTemplateStore = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
function set(next: TemplateStoreState) {
  state = next;
  listeners.forEach((l) => l());
}

export const templateStore = () => state;
export const initialTemplateStore = () => INITIAL;
// The React hook is in use-template-store.ts ("use client"): this file is also read by server pages.

let seq = 0;
const now = () => new Date().toISOString();
function withLog(s: TemplateStoreState, id: string, e: Omit<ActivityEntry, "id" | "at">): TemplateStoreState {
  const entry: ActivityEntry = { ...e, id: `a${Date.now().toString(36)}${(seq++).toString(36)}`, at: now() };
  return { ...s, log: { ...s.log, [id]: [entry, ...(s.log[id] ?? [])] } };
}

export const templateActions = {
  setStatus(id: string, status: Template["status"], actor: string) {
    const s = { ...state, patch: { ...state.patch, [id]: { ...state.patch[id], status } } };
    set(withLog(s, id, { action: "edit", actor, detail: status === "active" ? "Marked active" : "Marked inactive" }));
  },
  /** Owner-only share list (AC-EC-TO-01); takes effect at once (TPL-SHARE-001). */
  setShared(id: string, current: readonly string[], email: string, on: boolean, actor: string) {
    const list = on ? [...current.filter((x) => x !== email), email] : current.filter((x) => x !== email);
    const s = { ...state, shares: { ...state.shares, [id]: list } };
    set(withLog(s, id, on ? { action: "share", actor, detail: `with ${nameOf(email)}` } : { action: "revoke", actor, detail: `from ${nameOf(email)}` }));
  },
  /** Admin hands one template to another member; shares stay, the new owner's own share goes (live transfer route). */
  transfer(id: string, from: string, to: string, currentShares: readonly string[], actor: string) {
    const s = {
      ...state,
      patch: { ...state.patch, [id]: { ...state.patch[id], owner: to } },
      shares: { ...state.shares, [id]: currentShares.filter((x) => x !== to) },
    };
    set(withLog(s, id, { action: "reassign", actor, detail: `from ${nameOf(from)} to ${nameOf(to)}` }));
  },
  /** AC-EC-T-06: a copy is always a draft (inactive), owned by whoever copies it (BR-RULE-EC-41). Returns its id. */
  copy(source: Template, details: TemplateDetails, campaign: Campaign, actor: string) {
    const id = `copy-${Date.now().toString(36)}${(seq++).toString(36)}`;
    const { templates: _omit, ...target } = campaign;
    void _omit;
    const template: Template = {
      id,
      name: `${source.name} (copy)`,
      owner: actor,
      status: "inactive",
      recipients: 0,
      delivered: 0,
      opens: 0,
      clicks: 0,
      bounces: 0,
      unsubs: 0,
    };
    const copy: TemplateCopy = {
      campaign: target,
      template,
      details: { ...details, sharedWith: [], replies: 0, links: [], updatedAt: now() },
    };
    const s = { ...state, copies: [...state.copies, copy] };
    // Logged on the source: that's the log someone opens to ask where copies went (live copy route).
    set(withLog(s, source.id, { action: "copy", actor, detail: `into ${campaign.name}` }));
    return id;
  },
  /** A template made in the editor (AC-EC-T-01), kept with the copies: same lists, same lookups. Returns its id. */
  create(
    campaign: Campaign,
    fields: Pick<Template, "name" | "status">,
    content: EditedContent,
    actor: string
  ) {
    const id = `tpl-${Date.now().toString(36)}${(seq++).toString(36)}`;
    const { templates: _omit, ...target } = campaign;
    void _omit;
    const created: TemplateCopy = {
      campaign: target,
      template: { id, ...fields, owner: actor, recipients: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubs: 0 },
      details: { ...content, replies: 0, links: [], sharedWith: [], updatedAt: now() },
    };
    set(withLog({ ...state, copies: [...state.copies, created] }, id, { action: "edit", actor, detail: "Created" }));
    return id;
  },
  /**
   * Save an existing template from the editor: name, status, content and campaign, so the lists, the template page,
   * New batch and the ⋯ menu see it in this session (live PATCH /api/email/templates/[id]). `move` = the campaign it
   * moves to, when the editor changed it.
   */
  update(id: string, fields: Pick<Template, "name" | "status">, content: EditedContent, actor: string, move?: { id: string; name: string }) {
    const prev = state.patch[id]?.status;
    const s = {
      ...state,
      patch: { ...state.patch, [id]: { ...state.patch[id], ...fields } },
      content: { ...state.content, [id]: content },
      moves: move ? { ...state.moves, [id]: move.id } : state.moves,
    };
    const detail = move
      ? `Moved to ${move.name}`
      : prev !== undefined && prev !== fields.status
        ? fields.status === "active"
          ? "Marked active"
          : "Marked inactive"
        : "Edited";
    set(withLog(s, id, { action: "edit", actor, detail }));
  },
  /** Soft delete (AC-EC-T-07): gone from lists and metrics; sent batches keep their report. */
  remove(id: string, actor: string) {
    set(withLog({ ...state, deleted: [...state.deleted, id] }, id, { action: "delete", actor }));
  },
};
