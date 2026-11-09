"use client";

import { CircleCheckIcon, CircleSlashIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type EmailSafety, SAFETY_LABEL } from "./data";

// Email safety badge (R10, 2026-10-29). Only the two levels that need a look get colour: caution is warning,
// do not send is destructive; safe stays neutral so a long, mostly safe list reads calm. Same badge in the
// contact table and the contact profile.

const STYLE: Record<EmailSafety, { variant: "secondary" | "warning" | "destructive"; icon: React.ReactNode }> = {
  safe: { variant: "secondary", icon: <CircleCheckIcon /> },
  caution: { variant: "warning", icon: <TriangleAlertIcon /> },
  do_not_send: { variant: "destructive", icon: <CircleSlashIcon /> },
};

/** Sort order for the Email status column: what needs attention first. */
export const SAFETY_RANK: Record<EmailSafety, number> = { do_not_send: 0, caution: 1, safe: 2 };

export function SafetyBadge({ safety, ...props }: { safety: EmailSafety } & React.ComponentProps<typeof Badge>) {
  return (
    <Badge variant={STYLE[safety].variant} {...props}>
      {STYLE[safety].icon}
      {SAFETY_LABEL[safety]}
    </Badge>
  );
}
