"use client";

import { useSyncExternalStore } from "react";
import type { Campaign } from "@/lib/mock/campaigns";

// Campaigns created in this session from any screen (mock). The Campaigns board shows its seed list plus these, so a
// campaign made from Overview's "+ New campaign" appears there too. Module state: survives moving between screens,
// resets on reload. Backend: POST /api/email/campaigns, then the list refetches.

let created: readonly Campaign[] = [];
const EMPTY: readonly Campaign[] = [];
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useCreatedCampaigns() {
  return useSyncExternalStore(subscribe, () => created, () => EMPTY);
}

/** Adds a campaign (no templates yet) and returns its id. */
export function addCampaign(c: Omit<Campaign, "id" | "templates">) {
  const id = `new-${Date.now()}`;
  created = [{ ...c, id, templates: [] }, ...created];
  listeners.forEach((l) => l());
  return id;
}
