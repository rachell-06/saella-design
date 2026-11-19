import type { Campaign } from "@/lib/mock/campaigns";

// What changes campaigns in this session (mock): campaigns created from any screen, edits, archive flags and deletes.
// One store so the Campaigns board, Templates (list, filter, New template, Copy to…), a template's page and the editor
// all see the same campaigns. Module state: survives moving between screens, resets on reload (so server and first
// client render agree). Plain module (no "use client"): lib/mock/templates.ts reads it on the server too; the React
// hooks are in created-campaigns.ts.
// Backend (live app): POST /api/email/campaigns, PATCH …/[id] (fields, is_archived), DELETE …/[id] (soft delete that
// cascades to the campaign's templates, PRD-02 AC-EC-C-03).

export type CampaignEdit = Partial<Pick<Campaign, "name" | "description" | "countries" | "industries" | "startsOn" | "endsOn">>;

export type CampaignStoreState = {
  /** Newest first. */
  created: readonly Campaign[];
  edits: Readonly<Record<string, CampaignEdit>>;
  /** Live is_archived: archived campaigns leave the board (AC-EC-C-02) and take no new or copied templates. */
  archived: readonly string[];
  deleted: readonly string[];
};

const INITIAL: CampaignStoreState = { created: [], edits: {}, archived: [], deleted: [] };
let state = INITIAL;
const listeners = new Set<() => void>();
export const subscribeCampaignStore = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
function set(next: CampaignStoreState) {
  state = next;
  listeners.forEach((l) => l());
}

export const campaignStore = () => state;
export const initialCampaignStore = () => INITIAL;

export const campaignActions = {
  /** Adds a campaign (no templates yet) and returns its id. */
  add(c: Omit<Campaign, "id" | "templates">) {
    const id = `new-${Date.now()}`;
    set({ ...state, created: [{ ...c, id, templates: [] }, ...state.created] });
    return id;
  },
  update(id: string, fields: CampaignEdit) {
    set({ ...state, edits: { ...state.edits, [id]: { ...state.edits[id], ...fields } } });
  },
  setArchived(id: string, archived: boolean) {
    const rest = state.archived.filter((x) => x !== id);
    set({ ...state, archived: archived ? [...rest, id] : rest });
  },
  /** Soft delete. Its templates go with it: callers remove them from the template store too. */
  remove(id: string) {
    set({ ...state, deleted: [...state.deleted.filter((x) => x !== id), id] });
  },
};

/** Campaigns as of now: this session's new ones on top, then `seed`; edits applied, deleted ones gone. */
export function applyCampaignStore(seed: readonly Campaign[], s: CampaignStoreState = state): Campaign[] {
  if (!s.created.length && !s.deleted.length && !Object.keys(s.edits).length) return [...seed];
  const gone = new Set(s.deleted);
  return [...s.created.filter((c) => !seed.some((x) => x.id === c.id)), ...seed]
    .filter((c) => !gone.has(c.id))
    .map((c) => (s.edits[c.id] ? { ...c, ...s.edits[c.id] } : c));
}

export const isArchived = (id: string, s: CampaignStoreState = state) => s.archived.includes(id);
