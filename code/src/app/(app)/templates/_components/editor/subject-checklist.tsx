"use client";

import { ChevronDownIcon, CircleAlertIcon, CircleCheckIcon, LightbulbIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { SubjectCheck } from "./content-check";

// Live checklist under Subject and Preheader (R5, ĐX 2026-10-29). Rules live in content-check.ts (checkSubject).
// Quiet on purpose (2026-11-05): only checks that need attention are listed; the passing ones fold into
// "N of M look good", which opens to show them. A missing preheader is a tip (grey bulb), as in the Check tab.
// Advice only: it never blocks saving.

const STATE = {
  ok: { icon: CircleCheckIcon, className: "text-subtle-foreground", label: "Looks good" },
  tip: { icon: LightbulbIcon, className: "text-muted-foreground", label: "Tip" },
  warning: { icon: TriangleAlertIcon, className: "text-warning-soft-foreground", label: "Worth fixing" },
  error: { icon: CircleAlertIcon, className: "text-destructive", label: "Must fix" },
} as const;

export function SubjectChecklist({ checks }: { checks: SubjectCheck[] }) {
  const passing = checks.filter((c) => c.state === "ok");
  const failing = checks.filter((c) => c.state !== "ok");
  return (
    <Collapsible asChild>
      <section aria-labelledby="ed-subject-check" className="flex flex-col gap-2 border-t pt-2 sm:col-span-2">
        <div className="flex flex-wrap items-center gap-x-2">
          <h3 id="ed-subject-check" className="text-sm font-medium">
            Subject check
          </h3>
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
      </section>
    </Collapsible>
  );
}

function CheckList({ checks }: { checks: SubjectCheck[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
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
