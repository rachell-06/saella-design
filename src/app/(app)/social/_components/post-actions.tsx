"use client";

import { CircleCheckIcon, CircleMinusIcon, CircleXIcon, ExternalLinkIcon, LockIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SOCIAL_NETWORKS, type SocialNetwork, type SocialPost } from "@/lib/mock/social";
import { LIVE_DELETE, NET_LABEL } from "./rules";
import { NetworkIcon } from "./network-icon";

/** What happened on one account after a delete or a live edit (live PostActions.tsx Outcome). */
export type Outcome = {
  targetId: number;
  network: SocialNetwork;
  account: string;
  result: "done" | "unchanged" | "locked" | "manual" | "failed";
  error?: string;
  permalink?: string | null;
};

/** Which networks a delete takes down itself, and which must be cleared by hand in the app (no delete in their API). */
export function deletePlan(posts: SocialPost[]) {
  const live = new Set<SocialNetwork>();
  for (const p of posts) for (const x of p.targets) if (x.status === "published" && !x.deletedAt) live.add(x.network);
  const nets = SOCIAL_NETWORKS.filter((n) => live.has(n));
  return { auto: nets.filter((n) => LIVE_DELETE[n]), manual: nets.filter((n) => !LIVE_DELETE[n]) };
}

const names = (ns: SocialNetwork[]) => ns.map((n) => NET_LABEL[n]).join(", ");

export function DeletePostsDialog({
  posts,
  onOpenChange,
  onConfirm,
}: {
  /** Empty = closed. */
  posts: SocialPost[];
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { auto, manual } = deletePlan(posts);
  return (
    <AlertDialog open={posts.length > 0} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{posts.length === 1 ? "Delete this post?" : `Delete ${posts.length} posts?`}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              {auto.length === 0 && manual.length === 0 && <span>Nothing is live yet: it is cancelled and leaves the list.</span>}
              {auto.length > 0 && <span>Taken down on {names(auto)}.</span>}
              {manual.length > 0 && (
                <span className="text-warning-soft-foreground">
                  {names(manual)} can&apos;t delete a live post from Saella. You get a link to delete it in the app.
                </span>
              )}
              <span>The post moves to Archived.</span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function OutcomeRow({ o }: { o: Outcome }) {
  const icon =
    o.result === "done" ? (
      <CircleCheckIcon className="size-4 text-success-soft-foreground" aria-hidden />
    ) : o.result === "failed" ? (
      <CircleXIcon className="size-4 text-destructive-soft-foreground" aria-hidden />
    ) : o.result === "unchanged" ? (
      <CircleMinusIcon className="size-4 text-muted-foreground" aria-hidden />
    ) : (
      <LockIcon className="size-4 text-warning-soft-foreground" aria-hidden />
    );
  const what =
    o.result === "done"
      ? "Done"
      : o.result === "unchanged"
        ? "No change"
        : o.result === "locked"
          ? `${NET_LABEL[o.network]} doesn't allow editing a live post`
          : o.result === "manual"
            ? "Delete it in the app"
            : `Failed: ${o.error ?? ""}`;
  return (
    <li className="flex items-center gap-2.5 py-2.5">
      <NetworkIcon network={o.network} size={20} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{o.account}</span>
      {icon}
      <span className="text-sm text-muted-foreground">{what}</span>
      {o.result === "manual" && o.permalink && (
        <Button variant="link" className="h-auto border-0 p-0" asChild>
          <a href={o.permalink} target="_blank" rel="noopener noreferrer">
            Open to delete
            <ExternalLinkIcon data-icon="inline-end" />
          </a>
        </Button>
      )}
    </li>
  );
}

/** One dialog listing what happened on each account. */
export function OutcomesDialog({ outcomes, onClose }: { outcomes: Outcome[]; onClose: () => void }) {
  return (
    <Dialog open={outcomes.length > 0} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>What happened on each account</DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col divide-y">
          {outcomes.map((o) => (
            <OutcomeRow key={o.targetId} o={o} />
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
