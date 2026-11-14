"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Email status as the live app (lib/email/contact-status.ts): Valid or Invalid.
// The table's Status column shows a badge on every row, Valid included;
// Invalid carries its reason. Same Invalid badge in the contact profile.
// Status pill: outlined pill, tinted fill, dot + word, in Saella's destructive-soft tokens.

export function InvalidBadge({ className, ...props }: React.ComponentProps<typeof Badge>) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border-destructive/20 bg-destructive-soft px-2 text-destructive-soft-foreground", className)}
      {...props}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
      Invalid
    </Badge>
  );
}

export function ValidBadge({ className, ...props }: React.ComponentProps<typeof Badge>) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border-success/20 bg-success-soft px-2 text-success-soft-foreground", className)}
      {...props}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-success" />
      Valid
    </Badge>
  );
}
