"use client";

import { MoreHorizontalIcon, PencilIcon, SquarePenIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { type Thread, timeAgo } from "./data";

// History sidebar of the full agent page (PRD-03 AC-AG-C-05, live app components/agent/HistorySidebar.tsx):
// up to 50 threads, newest first, no paging (AC-AG-T-01); each shows title, visibility and time since last
// activity (AC-AG-T-02). Rename and delete are not in the live app or PRD-03 (task request; see report); their
// dialogs live in thread-dialogs.tsx, opened by the screen.
export const MAX_THREADS = 50;

export function ThreadList({
  threads,
  selectedId,
  loading,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: {
  threads: Thread[];
  selectedId?: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (thread: Thread) => void;
  onDelete: (thread: Thread) => void;
}) {
  return (
    <nav aria-label="Conversations" className="flex min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
        <h2 className="text-sm font-medium text-muted-foreground">Recent</h2>
        <Button variant="outline" size="sm" onClick={onNew}>
          <SquarePenIcon data-icon="inline-start" />
          New chat
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-3 p-3" aria-busy>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          <ul className="flex flex-col">
            {threads.slice(0, MAX_THREADS).map((t) => {
              const selected = t.id === selectedId;
              return (
                <li key={t.id} className="group/thread relative">
                  <button
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => onSelect(t.id)}
                    className={cn(
                      "relative flex w-full flex-col gap-0.5 py-2.5 pr-10 pl-3 text-left transition-colors hover:bg-muted/60",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                      "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand before:opacity-0",
                      "aria-[current=true]:bg-primary-subtle aria-[current=true]:before:opacity-100"
                    )}
                  >
                    <span className="truncate text-sm font-medium">{t.title || "Untitled"}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.visibility === "private" ? "Private" : "Company"} · {timeAgo(t.updatedAt)}
                    </span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Actions for ${t.title || "Untitled"}`}
                        className={cn(
                          "absolute top-2 right-2 opacity-0 transition-opacity group-hover/thread:opacity-100 group-focus-within/thread:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100",
                          selected && "opacity-100"
                        )}
                      >
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onSelect={() => onRename(t)}>
                          <PencilIcon />
                          Rename
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(t)}>
                          <Trash2Icon />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
