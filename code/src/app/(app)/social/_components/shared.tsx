"use client";

import { EyeIcon, HeartIcon, ImageIcon, MessageCircleIcon, PlayIcon, Repeat2Icon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hint } from "@/components/saella/hint";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/mock/campaigns";
import { WORKSPACE_TZ_LABEL } from "@/lib/time";
import { NOW } from "@/lib/mock/constants";
import type { SocialMedia } from "@/lib/mock/social";

/** "Oct 20, 9:01 AM GMT+7": every time tied to an action carries the zone (PATTERNS.md §9.8). */
export const when = (iso: string) => `${formatDateTime(iso)} ${WORKSPACE_TZ_LABEL}`;
/** The mock world's "now" in ms (lib/mock/constants NOW). */
export const NOW_MS = Date.parse(NOW);

// Tints from the chart palette (tokens.css): the hue only tells accounts apart, ink text keeps the contrast.
const AVATAR_TINTS = ["bg-chart-1/20", "bg-chart-2/20", "bg-chart-3/20", "bg-chart-4/20", "bg-chart-6/20", "bg-chart-5/25"];
/** Same name, same tint: a small stable hash of the account's name. */
const tintOf = (name: string) => AVATAR_TINTS[Array.from(name).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATAR_TINTS.length];
/** "Northwind Studio Café" → "NS"; one word → its first letter. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0]?.toUpperCase() ?? "")
    .join("");

/** Account picture: the page/profile image when there is one, else its initials on a tint derived from the name. */
export function AccountAvatar({ name, src, size = "sm", className }: { name: string; src?: string | null; size?: "sm" | "default"; className?: string }) {
  return (
    <Avatar size={size} className={className}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className={cn("font-medium text-foreground", tintOf(name))}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

/** A photo or video. Mock media ("mock:…") has no file, so a neutral tile with its kind stands in; an upload shows itself. */
export function MediaTile({ media, className }: { media: SocialMedia & { preview?: string }; className?: string }) {
  const src = media.preview ?? (media.url.startsWith("mock:") ? null : media.url);
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-muted text-muted-foreground", className)}>
      {src ? (
        media.kind === "video" ? (
          <video src={src} muted playsInline preload="metadata" className="size-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview (blob URL) of a file the user picked
          <img src={src} alt="" className="size-full object-cover" />
        )
      ) : media.kind === "video" ? null : (
        <ImageIcon className="size-6" aria-hidden />
      )}
      {media.kind === "video" && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-foreground/60 text-background">
            <PlayIcon className="size-4 fill-current" aria-hidden />
          </span>
        </span>
      )}
    </div>
  );
}

/** A post's numbers on one account or one network, as the network reports them. Never added across networks (BR-SOC-04). */
export function Metrics({ m, className }: { m: Record<string, number> | null | undefined; className?: string }) {
  if (!m) return null;
  const parts: [typeof EyeIcon, number | undefined, string][] = [
    [EyeIcon, m.views ?? m.impressions, m.views !== undefined ? "Views" : "Impressions"],
    [HeartIcon, m.likes, "Likes"],
    [MessageCircleIcon, m.comments, "Comments"],
    [Repeat2Icon, m.shares ?? m.saves, m.shares !== undefined ? "Shares" : "Saves"],
  ];
  return (
    <span className={cn("flex items-center gap-3 text-sm text-muted-foreground tabular-nums", className)}>
      {parts
        .filter(([, v]) => typeof v === "number")
        .map(([Icon, v, label]) => (
          <Hint key={label} label={label}>
            <span tabIndex={0} className="inline-flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Icon className="size-3.5" aria-hidden />
              {(v as number).toLocaleString("en-US")}
              <span className="sr-only">{label}</span>
            </span>
          </Hint>
        ))}
    </span>
  );
}
