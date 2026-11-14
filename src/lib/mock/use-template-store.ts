"use client";

import { useSyncExternalStore } from "react";
import { initialTemplateStore, subscribeTemplateStore, templateStore } from "@/lib/mock/template-store";

/** Subscribe a screen to the template store (template-store.ts); pass the result to applyTemplateStore. */
export function useTemplateStore() {
  return useSyncExternalStore(subscribeTemplateStore, templateStore, initialTemplateStore);
}
