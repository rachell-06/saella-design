"use client";

import { useState } from "react";
import {
  BookmarkIcon,
  EllipsisIcon,
  HeartIcon,
  MessageCircleIcon,
  Repeat2Icon,
  SendIcon,
  Share2Icon,
  ThumbsUpIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SocialMedia, SocialNetwork } from "@/lib/mock/social";
import { NetworkIcon } from "./network-icon";
import { AccountAvatar, MediaTile } from "./shared";

export type PreviewMedia = SocialMedia & { preview?: string };

// The post roughly as it sits in each network's feed: header, text folded where the network folds it, media laid
// out the network's way, and the action bar people know, with real counts once it is live (live PostPreview.tsx).
// Drawn with Saella tokens so it follows the app theme; only the network mark keeps its brand colour.
const FOLD: Record<SocialNetwork, { chars: number; lines: number }> = {
  facebook: { chars: 480, lines: 5 },
  instagram: { chars: 125, lines: 2 },
  threads: { chars: 500, lines: 12 },
  linkedin: { chars: 210, lines: 3 },
  tiktok: { chars: 90, lines: 2 },
  youtube: { chars: 100, lines: 2 },
  pinterest: { chars: 100, lines: 2 },
  douyin: { chars: 90, lines: 2 },
};
const VERTICAL: SocialNetwork[] = ["tiktok", "youtube", "douyin"];

function fold(text: string, chars: number, lines: number) {
  const ls = text.split("\n");
  let shown = ls.slice(0, lines).join("\n");
  if (Array.from(shown).length > chars) {
    shown = Array.from(shown).slice(0, chars).join("");
    const cut = shown.lastIndexOf(" ");
    if (cut > chars * 0.6) shown = shown.slice(0, cut);
  }
  return { shown: shown.replace(/[.,;:!?]+$/, ""), cut: shown.length < text.length };
}

/** Hashtags and links in the link colour, as the networks show them. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(#[\p{L}\p{N}_]+|https?:\/\/\S+|\b[\w-]+\.com\/\S*)/u).map((part, i) =>
        i % 2 ? (
          <span key={i} className="text-info-soft-foreground">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

function Collage({ media, ratio }: { media: PreviewMedia[]; ratio: string }) {
  if (!media.length) return null;
  if (media.length === 1) return <MediaTile media={media[0]} className={cn("w-full", ratio)} />;
  const shown = media.slice(0, 4);
  return (
    <div className="grid grid-cols-2 gap-0.5">
      {shown.map((m, i) => (
        <div key={i} className={cn("relative", media.length === 3 && i === 0 && "col-span-2")}>
          <MediaTile media={m} className={cn("w-full", media.length === 3 && i === 0 ? "aspect-video" : "aspect-square")} />
          {i === 3 && media.length > 4 && (
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/50 text-2xl font-medium text-background">
              +{media.length - 4}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const n = (v?: number) => (typeof v === "number" ? v.toLocaleString("en-US") : undefined);

export function PostPreview({
  network,
  name,
  handle,
  text,
  media,
  metrics,
  ago,
}: {
  network: SocialNetwork;
  name: string;
  handle?: string | null;
  text: string;
  media: PreviewMedia[];
  /** Live numbers once the post is out; absent in the composer. */
  metrics?: Record<string, number> | null;
  /** "2h", "Just now". */
  ago?: string;
}) {
  const [open, setOpen] = useState(false);
  const { chars, lines } = FOLD[network];
  const { shown, cut } = open ? { shown: text, cut: false } : fold(text, chars, lines);
  const vertical = VERTICAL.includes(network);
  const m = metrics ?? {};

  const body = (
    <p className="text-sm whitespace-pre-wrap break-words">
      {network === "instagram" && <span className="mr-1 font-medium">{handle ?? name}</span>}
      <Rich text={shown} />
      {cut && (
        <>
          {"… "}
          <Button variant="link" className="h-auto border-0 p-0 text-muted-foreground" onClick={() => setOpen(true)}>
            {network === "linkedin" ? "see more" : network === "instagram" ? "more" : "See more"}
          </Button>
        </>
      )}
    </p>
  );

  const header = (
    <div className="flex items-center gap-2.5 px-4 pt-3">
      <AccountAvatar name={name} size="default" className={network === "linkedin" ? "after:rounded-md *:rounded-md" : undefined} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{[handle ? `@${handle}` : null, ago ?? "Just now"].filter(Boolean).join(" · ")}</span>
      </div>
      <NetworkIcon network={network} size={18} />
      <EllipsisIcon className="size-4 text-muted-foreground" aria-hidden />
    </div>
  );

  const bar = (items: [typeof HeartIcon, string, string | undefined][]) => (
    <div className="flex items-center justify-around border-t px-2 py-1.5 text-sm text-muted-foreground">
      {items.map(([Icon, label, count]) => (
        <span key={label} className="flex items-center gap-1.5 py-1">
          <Icon className="size-4" aria-hidden />
          {count ?? label}
        </span>
      ))}
    </div>
  );

  if (vertical) {
    // Video networks: the vertical video, the caption under it, then the counts (kept off the video so they read in
    // both themes).
    return (
      <div className="mx-auto flex w-full max-w-72 flex-col overflow-hidden rounded-lg border bg-card">
        {media[0] ? <MediaTile media={media[0]} className="aspect-[9/16] w-full" /> : <div className="aspect-[9/16] w-full bg-muted" />}
        <div className="flex flex-col gap-1 px-3 pt-2.5">
          <span className="text-sm font-medium">@{handle ?? name}</span>
          <p className="text-sm whitespace-pre-wrap break-words">
            <Rich text={shown} />
            {cut && "…"}
          </p>
        </div>
        {bar([
          [HeartIcon, "Like", n(m.likes)],
          [MessageCircleIcon, "Comment", n(m.comments)],
          [Share2Icon, "Share", n(m.shares)],
        ])}
      </div>
    );
  }

  return (
    <div className={cn("mx-auto flex w-full flex-col gap-3 overflow-hidden rounded-lg border bg-card", network === "instagram" || network === "pinterest" ? "max-w-[420px]" : "max-w-[520px]")}>
      {header}
      {network !== "instagram" && network !== "pinterest" && <div className="px-4">{body}</div>}
      {network === "instagram" ? (
        media[0] && <MediaTile media={media[0]} className="aspect-[4/5] w-full" />
      ) : network === "pinterest" ? (
        media[0] && <MediaTile media={media[0]} className="mx-4 aspect-[2/3] rounded-lg" />
      ) : (
        <Collage media={media} ratio={network === "threads" ? "aspect-[4/5] rounded-lg" : "aspect-[4/5]"} />
      )}
      {(network === "instagram" || network === "pinterest") && <div className="px-4">{body}</div>}
      {network === "facebook" &&
        bar([
          [ThumbsUpIcon, "Like", n(m.likes)],
          [MessageCircleIcon, "Comment", n(m.comments)],
          [Share2Icon, "Share", n(m.shares)],
        ])}
      {network === "instagram" &&
        bar([
          [HeartIcon, "Like", n(m.likes)],
          [MessageCircleIcon, "Comment", n(m.comments)],
          [SendIcon, "Send", undefined],
          [BookmarkIcon, "Save", n(m.saves)],
        ])}
      {network === "threads" &&
        bar([
          [HeartIcon, "Like", n(m.likes)],
          [MessageCircleIcon, "Reply", n(m.comments)],
          [Repeat2Icon, "Repost", n(m.shares)],
          [SendIcon, "Share", undefined],
        ])}
      {network === "linkedin" &&
        bar([
          [ThumbsUpIcon, "Like", n(m.likes)],
          [MessageCircleIcon, "Comment", n(m.comments)],
          [Repeat2Icon, "Repost", n(m.shares)],
          [SendIcon, "Send", undefined],
        ])}
      {network === "pinterest" && bar([[BookmarkIcon, "Save", n(m.saves)], [Share2Icon, "Share", undefined]])}
    </div>
  );
}

/** "2h" the way the networks print it, from when it went out. */
export function ago(iso: string | null | undefined, nowMs: number) {
  if (!iso) return undefined;
  const min = Math.floor((nowMs - Date.parse(iso)) / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)}d`;
}
