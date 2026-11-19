"use client";

import { useMemo, useSyncExternalStore } from "react";
import { type Campaign, sampleCampaigns } from "@/lib/mock/campaigns";
import {
  applyCampaignStore,
  campaignActions,
  campaignStore,
  initialCampaignStore,
  subscribeCampaignStore,
} from "@/lib/mock/campaign-store";
import { applyTemplateStore } from "@/lib/mock/templates";
import { useTemplateStore } from "@/lib/mock/use-template-store";

// React hooks over the campaign store (lib/mock/campaign-store.ts): campaigns created this session from any screen,
// edits, archive flags and deletes. A campaign made from Overview's "+ New campaign" appears on the board too.

const EMPTY: readonly Campaign[] = [];

/** The whole campaign store; pass it to applyCampaignStore / isArchived. */
export function useCampaignStore() {
  return useSyncExternalStore(subscribeCampaignStore, campaignStore, initialCampaignStore);
}

/** Campaigns created this session, newest first. */
export function useCreatedCampaigns() {
  return useSyncExternalStore(subscribeCampaignStore, () => campaignStore().created, () => EMPTY);
}

/** Campaigns and their templates as of now (currentCampaigns in lib/mock/templates.ts), re-read when either session
 *  store changes: created, edited and deleted campaigns, template status, moves, copies and deletes, ended campaign →
 *  inactive, numbers from batches. Archived campaigns are included; leave them out with isArchived where a list should. */
export function useCurrentCampaigns(seed: readonly Campaign[] = sampleCampaigns) {
  const campaignState = useCampaignStore();
  const templateState = useTemplateStore();
  return useMemo(() => applyTemplateStore(applyCampaignStore(seed, campaignState), templateState), [seed, campaignState, templateState]);
}

/** Adds a campaign (no templates yet) and returns its id. */
export const addCampaign = (c: Omit<Campaign, "id" | "templates">) => campaignActions.add(c);
