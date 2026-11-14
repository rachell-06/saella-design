"use client";

import { ExternalLinkIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/saella/hint";
import { StatusBadge, type Status } from "@/components/saella/status-badge";
import { SOCIAL_NETWORKS, type SocialNetwork } from "@/lib/mock/social";
import { NET_LABEL } from "./rules";
import { NetworkIcon } from "./network-icon";
import { AccountAvatar, MediaTile } from "./shared";
import type { PreviewMedia } from "./post-preview";

export type SendState = "ready" | "queued" | "publishing" | "published" | "failed" | "scheduled" | "updated" | "locked" | "unchanged";
export type SendAccount = { id: number; network: SocialNetwork; name: string; sub: string; state: SendState; link?: string | null; error?: string | null };

const STATE: Record<SendState, { status: Status; label: string }> = {
  ready: { status: "draft", label: "Ready" },
  queued: { status: "draft", label: "Waiting" },
  publishing: { status: "sending", label: "Posting" },
  published: { status: "sent", label: "Live" },
  updated: { status: "sent", label: "Updated" },
  failed: { status: "failed", label: "Failed" },
  scheduled: { status: "scheduled", label: "Scheduled" },
  locked: { status: "archived", label: "Can't edit" },
  unchanged: { status: "ended", label: "No change" },
};

// Where a post goes (live SendMap.tsx): post → network → page or account, and once sent, how each account is doing.
// The live map draws animated lines; here it is the same tree as a list, each account with its own state.
export function SendMap({ title, thumb, accounts }: { title: string; thumb?: PreviewMedia; accounts: SendAccount[] }) {
  const nets = SOCIAL_NETWORKS.filter((n) => accounts.some((a) => a.network === n));
  return (
    <div className="flex flex-col divide-y rounded-lg border">
      <div className="flex items-center gap-3 px-4 py-3">
        {thumb ? (
          <MediaTile media={thumb} className="size-10 shrink-0 rounded-md" />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <FileTextIcon className="size-4" aria-hidden />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={title}>
          {title}
        </span>
      </div>
      {nets.map((n) => {
        const list = accounts.filter((a) => a.network === n);
        const done = list.filter((a) => a.state === "published" || a.state === "updated").length;
        const started = list.some((a) => a.state !== "ready");
        return (
          <section key={n} aria-label={NET_LABEL[n]}>
            <div className="flex items-center gap-2.5 bg-muted/50 px-4 py-2">
              <NetworkIcon network={n} size={22} />
              <span className="text-sm font-medium">{NET_LABEL[n]}</span>
              {started && <span className="text-sm text-muted-foreground tabular-nums">{`${done} of ${list.length} done`}</span>}
            </div>
            <ul className="divide-y border-t">
              {list.map((a) => {
                const s = STATE[a.state];
                const badge = <StatusBadge status={s.status} label={s.label} />;
                return (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2 pl-12">
                    <AccountAvatar name={a.name} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{a.name}</span>
                      {a.sub && <span className="truncate text-sm text-muted-foreground">{a.sub}</span>}
                    </span>
                    {/* Before sending every account is "Ready": no badge until something happens. */}
                    {a.state === "ready" ? null : a.state === "failed" && a.error ? (
                      <Hint label={a.error}>
                        <span tabIndex={0} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          {badge}
                        </span>
                      </Hint>
                    ) : (
                      badge
                    )}
                    <span className="flex w-7 justify-end">
                      {a.link && (a.state === "published" || a.state === "updated") && (
                        <Button variant="ghost" size="icon-sm" asChild>
                          <a href={a.link} target="_blank" rel="noopener noreferrer" aria-label={`Open on ${NET_LABEL[n]}`}>
                            <ExternalLinkIcon />
                          </a>
                        </Button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
