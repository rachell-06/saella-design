"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Email status as the live app (lib/email/contact-status.ts): Valid or Invalid.
// Only Invalid shows a badge, with its reason; Valid is the normal state and stays unlabelled. Same
// Invalid badge in the contact profile. Presentation from Studio Admin /dashboard/users StatusBadge, in Saella's
// destructive-soft tokens.

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
