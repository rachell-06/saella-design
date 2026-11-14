"use client";

// Get started checklist, as the live app builds it (Repo EmailOnboardingChecklist + guided-steps.ts, PRD Master
// v1.5.3/1.5.4, v1.6.3). Until every step is done (by the data, or ticked by the user) Overview shows this instead of
// the numbers. Six steps: Saella's "Company details" first (onboarding no longer asks for the company, and "Saella
// shows your data" needs its countries and industries), then the five of the
// shared guided list. Only the current step has a button, later steps are dimmed.
// A step can be ticked by hand after a confirm; a hand tick can be undone, a step the data proves done cannot.
// Ticking "Create the campaign" also ticks "Design the email" (live app `implies`).

import { useState } from "react";
import Link from "next/link";
import { CheckIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { openAgent } from "@/components/features/agent-chat/agent-chat-provider";
import { Hint } from "@/components/saella/hint";
import { cn } from "@/lib/utils";

export type SetupStepKey = "company" | "data" | "campaign" | "template" | "domain" | "send";

// "Show me" hands a turn to the agent in the live app; here it opens the agent panel with that turn as the first
// message (openAgent; the full page /agent is gone).
const SEE_DATA_TURN =
  "Show me the companies in my target country and the industries I focus on.";

export const STEPS: {
  key: SetupStepKey;
  label: string;
  desc: string;
  cta: string;
  /** Where the button goes; a step with `prompt` opens the agent panel instead. */
  href?: string;
  prompt?: string;
  implies?: SetupStepKey[];
}[] = [
  {
    key: "company",
    label: "Add company details",
    desc: "Your company, target countries and industries.",
    cta: "Add details",
    href: "/settings/workspace",
  },
  {
    key: "data",
    label: "Saella shows your data",
    desc: "See the companies matching your countries and industries.",
    cta: "Show me",
    prompt: SEE_DATA_TURN,
  },
  {
    key: "campaign",
    label: "Create the campaign",
    desc: "One container for the audience, its templates and its sends.",
    cta: "Create campaign",
    href: "/campaigns",
    implies: ["template"],
  },
  {
    key: "template",
    label: "Design the email",
    desc: "Write it yourself or let Saella design it, then edit in place.",
    cta: "Design email",
    href: "/templates",
  },
  {
    key: "domain",
    label: "Verify domain & sender",
    desc: "Add the DNS records and confirm the address you send from.",
    cta: "Verify",
    href: "/settings/domain",
  },
  {
    key: "send",
    label: "Send your first 50",
    desc: "Start small: a first batch of about 50 recipients.",
    cta: "Prepare the send",
    href: "/batches/new",
  },
];

export function SetupGuide({
  workspace,
  proven,
  marked,
  onMark,
}: {
  workspace: string;
  /** Steps the workspace data proves done. */
  proven: Set<SetupStepKey>;
  /** Steps the user ticked by hand. */
  marked: Set<SetupStepKey>;
  onMark: (keys: SetupStepKey[], on: boolean) => void;
}) {
  const [confirm, setConfirm] = useState<(typeof STEPS)[number] | null>(null);
  const isDone = (k: SetupStepKey) => proven.has(k) || marked.has(k);
  const count = STEPS.filter((s) => isDone(s.key)).length;
  const active = STEPS.find((s) => !isDone(s.key))?.key;
  const also = confirm?.implies
    ?.filter((k) => !isDone(k))
    .map((k) => STEPS.find((s) => s.key === k)!.label);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pt-2">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl font-normal tracking-tight">
          Welcome to {workspace}
        </h2>
        <p className="text-sm text-muted-foreground">
          Finish these steps to send your first campaign. Your reply, open and
          click insights will appear here once you do.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base font-medium">
            Get started
          </CardTitle>
          <CardAction>
            <span className="text-sm text-muted-foreground tabular-nums">
              {count} / {STEPS.length}
            </span>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground tabular-nums">
              {count}/{STEPS.length} complete
            </span>
            <Progress
              value={(count / STEPS.length) * 100}
              aria-label={`${count} of ${STEPS.length} steps complete`}
              className="*:data-[slot=progress-indicator]:bg-brand"
            />
          </div>

          <ol className="flex flex-col gap-2.5">
            {STEPS.map((s, i) => {
              const done = isDone(s.key);
              const handTicked = done && !proven.has(s.key);
              const isActive = s.key === active;
              return (
                <li
                  key={s.key}
                  className={cn(
                    "flex items-center gap-3.5 rounded-card border px-3.5 py-3",
                    isActive && "border-primary bg-primary-subtle",
                    done ? "opacity-65" : !isActive && "opacity-45",
                  )}
                >
                  {/* The number is the tick, as in the live app: a data-proven step stays done. */}
                  <Hint
                    label={
                      done && !handTicked
                        ? undefined
                        : handTicked
                          ? "Undo"
                          : "Mark as done"
                    }
                  >
                    <Button
                      variant={done ? "default" : "outline"}
                      size="icon-sm"
                      className={cn(
                        "shrink-0 rounded-full tabular-nums",
                        !done && "border-primary text-primary-soft-foreground",
                      )}
                      disabled={done && !handTicked}
                      aria-label={
                        handTicked
                          ? `Undo “${s.label}”`
                          : done
                            ? `${s.label}: done`
                            : `Mark “${s.label}” as done`
                      }
                      onClick={() =>
                        handTicked ? onMark([s.key], false) : setConfirm(s)
                      }
                    >
                      {done ? <CheckIcon /> : i + 1}
                    </Button>
                  </Hint>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      {s.label}
                      {done && <Badge variant="outline">Done</Badge>}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {s.desc}
                    </span>
                  </div>
                  {isActive &&
                    (s.href ? (
                      <Button size="sm" asChild>
                        <Link href={s.href}>{s.cta}</Link>
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => openAgent({ prompt: s.prompt })}>
                        {s.cta}
                      </Button>
                    ))}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark “{confirm?.label}” as done?</AlertDialogTitle>
            <AlertDialogDescription>
              Saella will treat this step as done and won&apos;t guide you
              through it.
              {also && also.length > 0 && ` It also marks: ${also.join(", ")}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirm && onMark([confirm.key, ...(confirm.implies ?? [])], true)
              }
            >
              Mark as done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
