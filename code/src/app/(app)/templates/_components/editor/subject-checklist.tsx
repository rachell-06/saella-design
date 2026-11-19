"use client";

import { ChevronDownIcon, CircleAlertIcon, CircleCheckIcon, LightbulbIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Hint } from "@/components/saella/hint";
import { cn } from "@/lib/utils";
import type { SubjectCheck } from "./content-check";

// Live subject checklist (R5). Rules live in content-check.ts (checkSubject). Quiet on purpose: only checks that need
// attention are listed; the passing ones fold into "N of M look good". A missing preheader is a tip. The content
// check doesn't repeat these. Advice only: it never blocks saving.

const STATE = {
  ok: { icon: CircleCheckIcon, className: "text-subtle-foreground", label: "Looks good" },
  tip: { icon: LightbulbIcon, className: "text-muted-foreground", label: "Tip" },
  warning: { icon: TriangleAlertIcon, className: "text-warning-soft-foreground", label: "Worth fixing" },
  error: { icon: CircleAlertIcon, className: "text-destructive", label: "Must fix" },
} as const;

function CheckList({ checks }: { checks: SubjectCheck[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-2.5">
      {checks.map((c) => {
        const S = STATE[c.state];
        return (
          <li key={c.id} className="flex gap-2 text-sm">
            <S.icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", S.className)} />
            <div className="flex min-w-0 flex-col">
              <span className="break-words">
                <span className="sr-only">{S.label}: </span>
                {c.label}
              </span>
              <span className="text-muted-foreground">{c.detail}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The checks as one small trigger at the end of the Subject row ("5/6"), opening the list. The icon is the worst state. */
export function SubjectCheckButton({ checks }: { checks: SubjectCheck[] }) {
  const passing = checks.filter((c) => c.state === "ok");
  const failing = checks.filter((c) => c.state !== "ok");
  const worst = (["error", "warning", "tip"] as const).find((s) => failing.some((c) => c.state === s)) ?? "ok";
  const S = STATE[worst];
  return (
    <Popover>
      <Hint label="Subject check">
        <PopoverTrigger asChild>
          <Button variant="ghost" size="xs" className="text-sm font-normal text-muted-foreground tabular-nums" aria-label={`Subject check: ${passing.length} of ${checks.length} look good`}>
            <S.icon className={S.className} />
            {passing.length}/{checks.length}
          </Button>
        </PopoverTrigger>
      </Hint>
      <PopoverContent align="end" className="w-96">
        {/* Only what needs attention is listed; the passing checks fold into "N of M look good" (PATTERNS.md §9.3). */}
        <Collapsible className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-2">
            <p className="text-sm font-medium">Subject check</p>
            {passing.length > 0 ? (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="group/trigger -ml-1 font-normal text-muted-foreground tabular-nums">
                  {passing.length} of {checks.length} look good
                  <ChevronDownIcon data-icon="inline-end" className="transition-transform group-data-[state=open]/trigger:rotate-180" />
                </Button>
              </CollapsibleTrigger>
            ) : (
              <span className="text-sm text-muted-foreground tabular-nums">0 of {checks.length} look good</span>
            )}
          </div>
          {failing.length > 0 && <CheckList checks={failing} />}
          <CollapsibleContent>
            <CheckList checks={passing} />
          </CollapsibleContent>
        </Collapsible>
      </PopoverContent>
    </Popover>
  );
}
