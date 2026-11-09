"use client";

import Link from "next/link";
import { CircleCheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// "Get started" card for a new workspace (R14, learned from Mailchimp F5 setup guide + Apollo A5 Next steps).
// Four steps in the order sending needs them; done steps are inferred from data the workspace already has
// (a verified domain, a confirmed sender, a contact list, a sent batch), so the backend stores nothing but the
// dismissal. The first unfinished step is "next" and gets the stronger button; later ones stay quiet.
// Neutral on purpose (user request 2026-10-29, fewer colors on Overview): grey progress, no tinted rows.

export type SetupStepKey = "domain" | "sender" | "list" | "batch";

const STEPS: {
  key: SetupStepKey;
  title: string;
  description: string;
  href: string;
  action: string;
}[] = [
  {
    key: "domain",
    title: "Verify a domain",
    description: "Add four DNS records so emails go out from your own address.",
    href: "/settings/sending",
    action: "Verify domain",
  },
  {
    key: "sender",
    title: "Confirm a sender",
    description:
      "Add the address you send from and click the link we email to it.",
    href: "/settings/sending#senders-title",
    action: "Add sender",
  },
  {
    key: "list",
    title: "Add a contact list",
    description:
      "Upload a CSV or pick companies to build the list you send to.",
    href: "/contacts",
    action: "Add list",
  },
  {
    key: "batch",
    title: "Send your first batch",
    description: "Pick a template and a list, check the preview, then send.",
    href: "/batches/new",
    action: "New batch",
  },
];

export function SetupGuide({
  done,
  onDismiss,
}: {
  done: Set<SetupStepKey>;
  onDismiss: () => void;
}) {
  const count = STEPS.filter((s) => done.has(s.key)).length;
  const next = STEPS.find((s) => !done.has(s.key))?.key;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base font-medium">
          Get started
        </CardTitle>
        <CardDescription>
          Four steps to your first send. Each one opens where it&apos;s done.
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            className="-mt-1 -mr-1 text-muted-foreground"
            aria-label="Hide the setup guide"
            title="Hide the setup guide"
            onClick={onDismiss}
          >
            <XIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex max-w-md items-center gap-3">
          <Progress
            value={(count / STEPS.length) * 100}
            aria-label={`${count} of ${STEPS.length} setup steps done`}
            className="*:data-[slot=progress-indicator]:bg-muted-foreground"
          />
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {count}/{STEPS.length} done
          </span>
        </div>
        <ItemGroup className="-mx-2 gap-0 has-data-[size=sm]:gap-0">
          {STEPS.map((s, i) => {
            const status = done.has(s.key)
              ? "done"
              : s.key === next
                ? "next"
                : "todo";
            return (
              <Item key={s.key} size="sm" className="px-2">
                <ItemMedia>
                  {status === "done" ? (
                    <CircleCheckIcon
                      className="size-5 text-muted-foreground"
                      aria-label="Done"
                    />
                  ) : (
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-full border text-xs tabular-nums",
                        status === "next"
                          ? "border-foreground font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                      aria-label={status === "next" ? "Next step" : "To do"}
                    >
                      {i + 1}
                    </span>
                  )}
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle
                    className={cn(
                      status === "done" && "text-muted-foreground line-through",
                    )}
                  >
                    {s.title}
                  </ItemTitle>
                  {status !== "done" && (
                    <ItemDescription>{s.description}</ItemDescription>
                  )}
                </ItemContent>
                <ItemActions>
                  {status === "done" ? (
                    <span className="text-sm text-muted-foreground">Done</span>
                  ) : (
                    <Button
                      variant={status === "next" ? "outline" : "ghost"}
                      size="sm"
                      asChild
                    >
                      <Link href={s.href}>{s.action}</Link>
                    </Button>
                  )}
                </ItemActions>
              </Item>
            );
          })}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
