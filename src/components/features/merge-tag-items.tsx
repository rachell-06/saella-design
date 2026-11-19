"use client";

import { DropdownMenuGroup, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MERGE_TAGS } from "@/lib/mock/templates";

/** Width for the DropdownMenuContent that holds MergeTagItems. */
export const MERGE_TAG_MENU_CLASS = "w-72";

/**
 * The merge-tag list for every "{ } Tags" menu (subject, preheader, Letter, Design). One line per tag: the name,
 * then the sample value muted and cut short on the right (designer 2026-11-14: the narrow menu wrapped "Lotus
 * Riverside Hotel" and "Sender email" onto two lines). Put it in a DropdownMenuContent with MERGE_TAG_MENU_CLASS.
 */
export function MergeTagItems({ onPick }: { onPick: (tag: string) => void }) {
  return (
    <DropdownMenuGroup>
      {MERGE_TAGS.map((m) => (
        <DropdownMenuItem key={m.tag} onSelect={() => onPick(m.tag)} className="gap-3">
          <span className="shrink-0 whitespace-nowrap">{m.label}</span>
          <span className="ml-auto min-w-0 truncate text-xs text-muted-foreground">
            {m.example}
          </span>
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  );
}
