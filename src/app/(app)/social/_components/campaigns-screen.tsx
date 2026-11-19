"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  EllipsisIcon,
  FolderOpenIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Hint } from "@/components/saella/hint";
import { StatusBadge } from "@/components/saella/status-badge";
import { cn } from "@/lib/utils";
import {
  findSocialAccount,
  socialCampaigns,
  socialPosts,
  type SocialCampaign,
  type SocialPost,
  type SocialTarget,
} from "@/lib/mock/social";
import { CampaignDialog, type CampaignFields } from "./campaign-dialog";
import { NetworkIcon } from "./network-icon";
import {
  DeletePostsDialog,
  OutcomesDialog,
  type Outcome,
} from "./post-actions";
import { PostViewSheet } from "./post-view-sheet";
import {
  errorText,
  LIVE_DELETE,
  NET_LABEL,
  networksOf,
  POST_STATUS,
  postName,
} from "./rules";
import { NOW_MS, when } from "./shared";

const SHOWN_PER_CAMPAIGN = 5;

/** A post's status follows its targets (PRD-12: derived, never stored). */
function derive(p: SocialPost): SocialPost["status"] {
  const s = p.targets.map((x) => x.status);
  if (
    s.includes("publishing") ||
    (s.includes("queued") &&
      !(p.scheduledAt && Date.parse(p.scheduledAt) > NOW_MS))
  )
    return "publishing";
  if (s.includes("queued")) return "scheduled";
  const live = s.filter((x) => x === "published").length;
  const failed = s.includes("failed");
  if (live && failed) return "partial";
  if (live) return "published";
  if (failed) return "failed";
  return "cancelled";
}

// Same exclusions as the shared DataTable's onRowClick.
const ROW_CLICK_IGNORE =
  "button, a, input, label, select, textarea, [role=checkbox], [role=menuitem], [data-no-row-click]";

// Social home (live SocialCampaigns.tsx): every campaign as a group, its posts underneath (newest five, more on
// request). A post opens into its networks and their accounts with results and numbers. Presentation: Studio Admin
// kanban "List" view (collapsible groups with a muted header row, task rows below).
export function SocialCampaignsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const preview = params.get("state");
  const fresh = Number(params.get("new") ?? 0) || null;
  const focusCampaign = Number(params.get("campaign") ?? 0) || null;

  const [campaigns, setCampaigns] = useState<SocialCampaign[]>(
    preview === "empty" ? [] : socialCampaigns,
  );
  const [posts, setPosts] = useState<SocialPost[]>(
    preview === "empty" ? [] : socialPosts,
  );
  const [archived, setArchived] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  // Arriving from the post builder with a post past the fold (?new=): its campaign opens in full.
  const [allShown, setAllShown] = useState<Set<number>>(() => {
    const p = socialPosts.find((x) => x.id === fresh);
    if (!p) return new Set();
    const list = socialPosts.filter(
      (x) => x.campaignId === p.campaignId && !x.archivedAt,
    );
    return list.findIndex((x) => x.id === fresh) >= SHOWN_PER_CAMPAIGN
      ? new Set([p.campaignId])
      : new Set();
  });
  // ?view=<post id> opens a post's read-back sheet (shareable, and reviewable without a click).
  const [viewing, setViewing] = useState<number | null>(
    Number(params.get("view") ?? 0) || null,
  );
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SocialCampaign | null>(null);
  const [cancelling, setCancelling] = useState<SocialPost | null>(null);
  const [deleting, setDeleting] = useState<SocialPost[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [syncedAt, setSyncedAt] = useState("2026-10-27T02:40:00Z");

  const update = (id: number, fn: (p: SocialPost) => SocialPost) =>
    setPosts((all) =>
      all.map((p) =>
        p.id === id ? (({ ...q }) => ({ ...q, status: derive(q) }))(fn(p)) : p,
      ),
    );
  const setTargets = (id: number, fn: (x: SocialTarget) => SocialTarget) =>
    update(id, (p) => ({ ...p, targets: p.targets.map(fn) }));

  // Posts on their way out move on their own: the live list polls every few seconds while anything is queued.
  const moving = posts.filter((p) =>
    p.targets.some(
      (x) =>
        x.status === "publishing" ||
        (x.status === "queued" &&
          !(p.scheduledAt && Date.parse(p.scheduledAt) > NOW_MS)),
    ),
  );
  const movingKey = moving.map((p) => p.id).join();
  useEffect(() => {
    if (!movingKey) return;
    const t = setTimeout(() => {
      for (const id of movingKey.split(",").map(Number)) {
        let stepped = false;
        setTargets(id, (x) => {
          if (stepped) return x;
          if (x.status === "publishing") {
            stepped = true;
            return {
              ...x,
              status: "published",
              publishedAt: new Date(NOW_MS).toISOString(),
              permalink: `https://www.${x.network}.com/northwind/${x.id}`,
              metrics: null,
            };
          }
          if (x.status === "queued") {
            stepped = true;
            return { ...x, status: "publishing" };
          }
          return x;
        });
      }
    }, 15_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-armed whenever the set of moving posts changes
  }, [movingKey, posts]);

  // Arriving from the post builder (?new=) or an old campaign link (?campaign=): bring that row into view.
  const focused = useRef(false);
  useEffect(() => {
    if (focused.current || (!fresh && !focusCampaign)) return;
    focused.current = true;
    const cid = fresh
      ? posts.find((p) => p.id === fresh)?.campaignId
      : focusCampaign;
    setTimeout(
      () =>
        document
          .getElementById(fresh ? `soc-post-${fresh}` : `soc-camp-${cid}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      200,
    );
  }, [fresh, focusCampaign, posts]);

  const visible = useMemo(
    () => posts.filter((p) => Boolean(p.archivedAt) === archived),
    [posts, archived],
  );
  const hasLive = posts.some(
    (p) => !p.archivedAt && p.targets.some((x) => x.status === "published"),
  );

  function act(p: SocialPost, action: "publish_now" | "retry" | "refresh") {
    if (action === "publish_now") {
      update(p.id, (q) => ({
        ...q,
        scheduledAt: null,
        targets: q.targets.map((x) =>
          x.status === "queued" ? { ...x, status: "publishing" } : x,
        ),
      }));
      toast.success("Publishing now");
    } else if (action === "retry") {
      setTargets(p.id, (x) =>
        x.status === "failed" ? { ...x, status: "queued", lastError: null } : x,
      );
      toast.success("Retrying the failed accounts");
    } else {
      setSyncedAt(new Date(NOW_MS).toISOString());
      toast.success("Numbers updated");
    }
  }

  function setArchivedFor(ids: number[], on: boolean) {
    setPosts((all) =>
      all.map((p) =>
        ids.includes(p.id)
          ? { ...p, archivedAt: on ? new Date(NOW_MS).toISOString() : null }
          : p,
      ),
    );
    setPicked(new Set());
    toast.success(
      `${ids.length === 1 ? "Post" : `${ids.length} posts`} ${on ? "archived" : "restored"}`,
    );
  }

  function remove(chosen: SocialPost[]) {
    const out: Outcome[] = [];
    for (const p of chosen)
      for (const x of p.targets)
        if (x.status === "published" && !x.deletedAt)
          out.push({
            targetId: x.id,
            network: x.network,
            account:
              findSocialAccount(x.accountId)?.name ?? NET_LABEL[x.network],
            result: LIVE_DELETE[x.network] ? "done" : "manual",
            permalink: x.permalink,
          });
    const ids = chosen.map((p) => p.id);
    const now = new Date(NOW_MS).toISOString();
    setPosts((all) =>
      all.map((p) =>
        ids.includes(p.id)
          ? {
              ...p,
              archivedAt: p.archivedAt ?? now,
              targets: p.targets.map((x) =>
                x.status === "published" && LIVE_DELETE[x.network]
                  ? { ...x, deletedAt: now }
                  : x.status === "queued"
                    ? { ...x, status: "cancelled" }
                    : x,
              ),
            }
          : p,
      ),
    );
    setDeleting([]);
    setPicked(new Set());
    if (out.length) setOutcomes(out);
    else toast.success("Done");
  }

  function saveCampaign(fields: CampaignFields) {
    if (editing) {
      setCampaigns((all) =>
        all.map((c) => (c.id === editing.id ? { ...c, ...fields } : c)),
      );
      setEditing(null);
      toast.success("Collection saved");
      return;
    }
    setCreating(false);
    // A new campaign goes straight on to its first post. The mock has no store, so it opens the builder of campaign 3.
    router.push(`/social/campaigns/3/new`);
  }

  const pick = (id: number, on: boolean) =>
    setPicked((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const newCampaign = (
    <Button size="sm" onClick={() => setCreating(true)}>
      <PlusIcon data-icon="inline-start" />
      New collection
    </Button>
  );

  const header = (
    <>
      <PageHeader
        title="Posts"
        description="Plan, publish and measure your social posts."
        actions={
          preview === "empty" || preview === "error" || preview === "loading"
            ? undefined
            : newCampaign
        }
      />
    </>
  );

  if (preview === "loading") {
    return (
      <>
        {header}
        <div className="flex flex-col gap-4" aria-busy>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </>
    );
  }
  if (preview === "error") {
    return (
      <>
        {header}
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Couldn&apos;t load your posts</AlertTitle>
          <AlertDescription>
            Check your connection, then try again.
          </AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.replace("/social")}
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      </>
    );
  }
  if (campaigns.length === 0) {
    return (
      <>
        {header}
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpenIcon />
            </EmptyMedia>
            <EmptyTitle>No posts yet</EmptyTitle>
            <EmptyDescription>
              Start a collection, say what it is about, and Saella drafts
              the posts.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreating(true)}>
              <PlusIcon data-icon="inline-start" />
              New collection
            </Button>
          </EmptyContent>
        </Empty>
        <CampaignDialog
          open={creating}
          onOpenChange={setCreating}
          onSave={saveCampaign}
        />
      </>
    );
  }

  const postRow = (p: SocialPost) => {
    const st = POST_STATUS[p.status];
    const nets = networksOf(p.targets);
    const future = Boolean(p.scheduledAt && Date.parse(p.scheduledAt) > NOW_MS);
    const hasQueued = p.targets.some((x) => x.status === "queued");
    const failedTargets = p.targets.filter((x) => x.status === "failed");
    const time = future
      ? `Scheduled for ${when(p.scheduledAt!)}`
      : when(p.createdAt);
    // Why it failed, on the badge (one account's reason; the sheet lists each account).
    const why =
      failedTargets.length && failedTargets[0].lastError
        ? errorText(failedTargets[0].lastError)
        : undefined;
    const badge = <StatusBadge status={st.status} label={st.label} />;
    return (
      <li
        key={p.id}
        id={`soc-post-${p.id}`}
        aria-current={viewing === p.id || undefined}
        className={cn(
          "group/row flex cursor-pointer items-center gap-3 border-t px-4 py-2.5 transition-colors first:border-t-0 hover:bg-muted/50 aria-[current=true]:bg-muted",
          p.id === fresh && "bg-primary-subtle",
        )}
        onClick={(e) => {
          // Row click opens the post; controls in the row keep their own click.
          const t = e.target as HTMLElement;
          if (!e.currentTarget.contains(t) || t.closest(ROW_CLICK_IGNORE))
            return;
          if (window.getSelection()?.toString()) return;
          setViewing(p.id);
        }}
      >
        <Checkbox
          checked={picked.has(p.id)}
          onCheckedChange={(v) => pick(p.id, v === true)}
          aria-label={`Select ${postName(p) || "post"}`}
        />
        <span className="flex w-16 shrink-0 -space-x-1.5">
          {nets.map((n) => (
            <Hint key={n} label={NET_LABEL[n]}>
              <span className="rounded-full ring-2 ring-card">
                <NetworkIcon network={n} size={22} />
              </span>
            </Hint>
          ))}
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <Button
            variant="link"
            className="h-auto max-w-full justify-start border-0 p-0 font-medium text-foreground hover:no-underline"
            onClick={() => setViewing(p.id)}
          >
            <span className="truncate" title={postName(p)}>
              {postName(p) || "Untitled post"}
            </span>
          </Button>
          <span className="max-w-full truncate text-sm text-muted-foreground">
            {time}
          </span>
        </div>
        {/* Status column: fixed width, and the actions after it too, so it lines up on every row. */}
        <span className="flex w-36 shrink-0">
          {why ? (
            <Hint label={why}>
              <span
                tabIndex={0}
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {badge}
              </span>
            </Hint>
          ) : (
            badge
          )}
        </span>
        {/* One action in sight, the one the row's state calls for; the rest in ⋯. */}
        <div className="flex w-44 shrink-0 items-center justify-end gap-1.5">
          {future && !archived && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => act(p, "publish_now")}
            >
              <SendIcon data-icon="inline-start" />
              Publish now
            </Button>
          )}
          {failedTargets.length > 0 && !archived && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => act(p, "retry")}
            >
              <RotateCcwIcon data-icon="inline-start" />
              Retry failed
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="More actions"
                className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              >
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-max max-w-80">
              {!archived && (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/social/campaigns/${p.campaignId}/posts/${p.id}/edit`}
                  >
                    <PencilIcon />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}
              {hasQueued && !archived && (
                <DropdownMenuItem onSelect={() => setCancelling(p)}>
                  <XIcon />
                  Cancel publishing
                </DropdownMenuItem>
              )}
              {archived ? (
                <DropdownMenuItem
                  onSelect={() => setArchivedFor([p.id], false)}
                >
                  <ArchiveRestoreIcon />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setArchivedFor([p.id], true)}>
                  <ArchiveIcon />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDeleting([p])}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
    );
  };

  return (
    <>
      {header}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={archived ? "archived" : "shown"}
            onValueChange={(v) => {
              setArchived(v === "archived");
              setPicked(new Set());
            }}
          >
            <TabsList variant="default" aria-label="Show">
              <TabsTrigger value="shown">Posts</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
          {hasLive && !archived && (
            <Hint label={`Refresh numbers · updated ${when(syncedAt)}`}>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Refresh numbers"
                onClick={() => act(visible[0], "refresh")}
              >
                <RefreshCwIcon />
              </Button>
            </Hint>
          )}
        </div>

        {archived && visible.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ArchiveIcon />
              </EmptyMedia>
              <EmptyTitle>No archived posts</EmptyTitle>
              <EmptyDescription>
                Posts you archive or delete show up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-card border bg-card">
            {/* Archived view: only campaigns that have archived posts. */}
            {campaigns
              .filter(
                (c) => !archived || visible.some((p) => p.campaignId === c.id),
              )
              .map((c) => {
                const list = visible.filter((p) => p.campaignId === c.id);
                const all = allShown.has(c.id);
                const shown = all ? list : list.slice(0, SHOWN_PER_CAMPAIGN);
                return (
                  // Closed by default (like Accounts); the collection a link points to (?campaign=) or that holds the post just made
                  // (?new=) opens.
                  <Collapsible
                    key={c.id}
                    defaultOpen={c.id === focusCampaign || (fresh !== null && list.some((p) => p.id === fresh))}
                    asChild
                  >
                    <section
                      id={`soc-camp-${c.id}`}
                      aria-label={c.name}
                      className="border-t first:border-t-0"
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 bg-muted/50 py-2 pr-4 pl-4",
                          c.id === focusCampaign && "bg-primary-subtle",
                        )}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Show posts in ${c.name}`}
                            className="text-muted-foreground [&[data-state=open]>svg]:rotate-90"
                          >
                            <ChevronRightIcon className="transition-transform duration-150" />
                          </Button>
                        </CollapsibleTrigger>
                        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
                          <span className="truncate">{c.name}</span>
                          <span className="font-normal text-muted-foreground tabular-nums">
                            {list.length}
                          </span>
                        </h2>
                        {!archived && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/social/campaigns/${c.id}/new`}>
                              <PlusIcon data-icon="inline-start" />
                              New post
                            </Link>
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`${c.name} actions`}
                            >
                              <EllipsisIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-max max-w-80">
                            <DropdownMenuItem onSelect={() => setEditing(c)}>
                              <PencilIcon />
                              Edit collection
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CollapsibleContent>
                        {list.length === 0 ? (
                          <p className="border-t px-4 py-4 pl-14 text-sm text-muted-foreground">
                            {archived ? "No archived posts." : "No posts yet."}
                          </p>
                        ) : (
                          <ul
                            aria-label={`Posts in ${c.name}`}
                            className="border-t"
                          >
                            {shown.map(postRow)}
                            {list.length > SHOWN_PER_CAMPAIGN && (
                              <li className="border-t px-4 py-2 pl-14">
                                <Button
                                  variant="link"
                                  className="h-auto border-0 p-0"
                                  onClick={() =>
                                    setAllShown((s) => {
                                      const n = new Set(s);
                                      if (n.has(c.id)) n.delete(c.id);
                                      else n.add(c.id);
                                      return n;
                                    })
                                  }
                                >
                                  {all
                                    ? "Show less"
                                    : `Show ${list.length - SHOWN_PER_CAMPAIGN} more`}
                                </Button>
                              </li>
                            )}
                          </ul>
                        )}
                      </CollapsibleContent>
                    </section>
                  </Collapsible>
                );
              })}
          </div>
        )}

        {/* Selected posts: floating bar under the list. */}
        {picked.size > 0 && (
          <div
            role="toolbar"
            aria-label="Selected posts"
            className="sticky bottom-4 z-10 flex items-center gap-2 self-center rounded-card border bg-popover py-1.5 pr-1.5 pl-4 text-sm shadow-card animate-in duration-200 fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
          >
            <span className="font-medium tabular-nums" aria-live="polite">
              {picked.size} selected
            </span>
            <Separator
              orientation="vertical"
              className="mx-1 data-vertical:h-5 data-vertical:self-center"
            />
            {archived ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArchivedFor([...picked], false)}
              >
                <ArchiveRestoreIcon data-icon="inline-start" />
                Restore
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArchivedFor([...picked], true)}
              >
                <ArchiveIcon data-icon="inline-start" />
                Archive
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleting(posts.filter((p) => picked.has(p.id)))}
            >
              <Trash2Icon data-icon="inline-start" />
              Delete
            </Button>
            <Separator
              orientation="vertical"
              className="mx-1 data-vertical:h-5 data-vertical:self-center"
            />
            <Hint label="Clear selection">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Clear selection"
                onClick={() => setPicked(new Set())}
              >
                <XIcon />
              </Button>
            </Hint>
          </div>
        )}
      </div>

      <PostViewSheet
        post={posts.find((p) => p.id === viewing) ?? null}
        onClose={() => setViewing(null)}
      />
      <CampaignDialog
        open={creating || editing !== null}
        initial={
          editing ? { name: editing.name, brief: editing.brief } : undefined
        }
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSave={saveCampaign}
      />
      <AlertDialog
        open={cancelling !== null}
        onOpenChange={(o) => !o && setCancelling(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancel what hasn&apos;t been published yet?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Accounts where the post is already live keep it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (cancelling)
                  setTargets(cancelling.id, (x) =>
                    x.status === "queued" ? { ...x, status: "cancelled" } : x,
                  );
                setCancelling(null);
                toast.success("Cancelled");
              }}
            >
              Cancel post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DeletePostsDialog
        posts={deleting}
        onOpenChange={(o) => !o && setDeleting([])}
        onConfirm={() => remove(deleting)}
      />
      <OutcomesDialog outcomes={outcomes} onClose={() => setOutcomes([])} />
    </>
  );
}
