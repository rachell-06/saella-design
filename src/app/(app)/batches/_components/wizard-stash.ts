import type { AudienceFilters } from "./company-audience";
import type { Handling } from "./recipient-checks";

// Review › Edit template: the wizard keeps its picks while the user edits the template, and the editor's Send batch
// brings them back to Review (/batches/new?…&resume=1). Kept in memory for the session, like the other mock stores:
// a reload starts the batch over. Save draft keeps the same picks on the draft, keyed by its id: the draft report's
// Continue (/batches/new?template=…&draft=<id>) reopens the wizard at Review with them.

export type WizardStash = {
  templateId: string;
  source: "companies" | "contacts";
  companyFilters: AudienceFilters;
  companyQuery: string;
  /** Unlocked companies picked (free). */
  pickedIds: string[];
  /** The campaign's locked matches ticked: unlocked for a credit each on Continue or Send now. */
  unlockIds: string[];
  tagFilter: string[];
  contactIds: string[];
  senderId?: string;
  name: string;
  handling: Record<string, Handling>;
  fallbacks: Record<string, string>;
  previewId?: string;
  /** Step to reopen at (Review by default; Recipients when the editor was opened before Review). */
  step?: number;
  /** The draft these picks belong to: Save draft updates it and Send now sends it instead of making a new batch. */
  draftId?: string;
};

let stash: WizardStash | null = null;

export function stashWizard(s: WizardStash) {
  stash = s;
}

/** The kept picks for this template, if any. */
export function resumeWizard(templateId: string | null): WizardStash | null {
  return stash && stash.templateId === templateId ? stash : null;
}

const drafts = new Map<string, WizardStash>();

export function stashDraft(id: string, s: WizardStash) {
  drafts.set(id, { ...s, draftId: id });
}

/** The picks saved with this draft, if it was made in this session for this template. */
export function draftWizard(id: string | null, templateId: string | null): WizardStash | null {
  const s = id ? drafts.get(id) : undefined;
  return s && s.templateId === templateId ? s : null;
}
