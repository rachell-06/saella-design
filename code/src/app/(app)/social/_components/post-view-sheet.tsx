"use client";

import { ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/saella/status-badge";
import { findSocialAccount, type SocialPost } from "@/lib/mock/social";
import { cn } from "@/lib/utils";
import { errorText, kindLabel, NET_LABEL, postName, TARGET_STATUS } from "./rules";
import { ago, PostPreview } from "./post-preview";
import { PreviewSwitcher, type SwitchItem } from "./preview-switcher";
import { AccountAvatar, NOW_MS, when } from "./shared";

// A sent post read back (live PostView.tsx): what went out on each account, how it is doing, where to find it.
export function PostViewSheet({ post, onClose }: { post: SocialPost | null; onClose: () => void }) {
  return (
    <Sheet open={post !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-5xl">
        {post && (
          <>
            <SheetHeader className="border-b p-6 pr-12">
              <SheetTitle className="truncate text-lg">{postName(post) || "Untitled post"}</SheetTitle>
              <SheetDescription>{when(post.scheduledAt && Date.parse(post.scheduledAt) > NOW_MS ? post.scheduledAt : post.createdAt)}</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <PreviewSwitcher key={post.id} label="Accounts in this post" items={items(post)} groupByNetwork />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function items(post: SocialPost): SwitchItem[] {
  return post.targets.map((x) => {
    const a = findSocialAccount(x.accountId);
    const name = a?.name ?? NET_LABEL[x.network];
    const ts = TARGET_STATUS[x.status];
    const dot = x.deletedAt ? "bg-subtle-foreground" : x.status === "published" ? "bg-success" : x.status === "failed" ? "bg-destructive" : "bg-muted-foreground";
    return {
      key: String(x.id),
      network: x.network,
      title: name,
      sub: kindLabel(x.network, a?.kind),
      avatar: <AccountAvatar name={name} size="default" />,
      badge: <span aria-label={x.deletedAt ? "Deleted" : ts.label} className={cn("size-2 shrink-0 rounded-full", dot)} />,
      head: (
        <div className="flex flex-wrap items-center gap-2">
          {x.deletedAt ? <StatusBadge status="archived" label="Deleted" /> : <StatusBadge status={ts.status} label={ts.label} />}
          {x.editedAt && !x.deletedAt && <span className="text-sm text-muted-foreground">Edited</span>}
          {x.status === "failed" && x.lastError && <span className="text-sm text-destructive-soft-foreground">{errorText(x.lastError)}</span>}
          {x.permalink && !x.deletedAt && (
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <a href={x.permalink} target="_blank" rel="noopener noreferrer">
                Open
                <ExternalLinkIcon data-icon="inline-end" />
              </a>
            </Button>
          )}
        </div>
      ),
      body: (
        <PostPreview
          network={x.network}
          name={name}
          handle={a?.handle}
          text={x.bodyOverride?.trim() ? x.bodyOverride : post.body}
          media={post.media}
          metrics={x.deletedAt ? null : x.metrics}
          ago={ago(x.publishedAt ?? post.createdAt, NOW_MS)}
        />
      ),
    };
  });
}
