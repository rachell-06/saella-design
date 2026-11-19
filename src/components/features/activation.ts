import { checkContent } from "@/app/(app)/templates/_components/editor/content-check";
import type { Template } from "@/lib/mock/campaigns";
import type { TemplateStoreState } from "@/lib/mock/template-store";
import { campaignArchivedFor, campaignEndedFor, detailsFor } from "@/lib/mock/templates";

// Which templates can send (the PRD leaves template status open): only an ACTIVE template goes
// out, by batch, schedule or follow-up. Marking one active needs a passing content check, everywhere.
// A template whose campaign has ended is off and stays off (PRD Master v1.1.9, Repo campaign-expiry.ts: the sweep
// switches the campaign's templates to inactive).

/** Why a template of an ended campaign can't send, be scheduled or be marked active. */
export const CAMPAIGN_ENDED = "The campaign has ended";
/** The same for an archived campaign: off until the campaign is unarchived. */
export const CAMPAIGN_ARCHIVED = "The campaign is archived";

/** Why the template's campaign keeps it off (ended or archived); undefined while the campaign runs. */
export function campaignOffReason(id: string) {
  if (campaignEndedFor(id)) return CAMPAIGN_ENDED;
  if (campaignArchivedFor(id)) return CAMPAIGN_ARCHIVED;
  return undefined;
}

/** True for a campaignOffReason reason: nothing to fix in the editor, so no Open editor. */
export const isCampaignOff = (reason: string | undefined) => reason === CAMPAIGN_ENDED || reason === CAMPAIGN_ARCHIVED;

/** Why "Mark active" is blocked: the editor's content check finds errors (the same rule as its Mark active). */
export function activateBlockedReason(id: string) {
  const off = campaignOffReason(id);
  if (off) return off;
  const errors = checkContent(detailsFor(id)).issues.filter((i) => i.severity === "error");
  if (errors.length === 0) return undefined;
  // One problem: name it ("Can't mark it active yet: Add a subject."); several: count them.
  if (errors.length === 1) return `Can't mark it active yet: ${errors[0].title}.`;
  return `Fix ${errors.length} problems in the editor to mark it active.`;
}

/** A template's status as of now: inactive once its campaign has ended or is archived, else the session's Mark
 *  active / inactive (template store) over the seed value. */
export function liveStatus(id: string, seed: Template["status"], store: TemplateStoreState): Template["status"] {
  if (campaignOffReason(id)) return "inactive";
  return store.patch[id]?.status ?? seed;
}
