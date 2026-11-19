"use client";

import { XIcon } from "lucide-react";
import { Hint } from "@/components/saella/hint";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Floating bar for the selected rows of a table (designer 2026-11-12/13): "N selected | actions | ✕".
// Place it as a flex child under the table's card, so the card shrinks and its paging row is never covered. The
// selection's main action may be the page's one solid button; the rest outline. Used by Leads › Find companies and
// Leads › Self-upload. Social › Posts has its own copy (campaigns-screen.tsx) that can move to this.
export function SelectionBar({
  count,
  label,
  onClear,
  children,
}: {
  count: number;
  /** Accessible name of the toolbar, e.g. "Selected companies". */
  label: string;
  onClear: () => void;
  /** The actions, size="sm" buttons. */
  children: React.ReactNode;
}) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className="flex shrink-0 items-center gap-2 self-center rounded-card border bg-popover py-1.5 pr-1.5 pl-4 text-sm shadow-card animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none"
    >
      <span className="font-medium tabular-nums" aria-live="polite">
        {count.toLocaleString("en-US")} selected
      </span>
      <Separator orientation="vertical" className="mx-1 data-vertical:h-5 data-vertical:self-center" />
      <div className="flex items-center gap-2">{children}</div>
      <Separator orientation="vertical" className="mx-1 data-vertical:h-5 data-vertical:self-center" />
      <Hint label="Clear selection">
        <Button variant="ghost" size="icon-sm" aria-label="Clear selection" onClick={onClear}>
          <XIcon />
        </Button>
      </Hint>
    </div>
  );
}
