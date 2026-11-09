"use client";

import { BookmarkIcon, ChevronDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type SavedSearch, describeSearch } from "./searches";

// Saved searches picker (R12, 2026-10-29; Apollo "Default view ▾"). Each row shows how many matches are New,
// i.e. not in any list yet, so the user sees which search has fresh leads before opening it.
export function SavedSearchesMenu({
  searches,
  activeId,
  newCount,
  onOpen,
}: {
  searches: SavedSearch[];
  activeId?: string;
  newCount: (s: SavedSearch) => number;
  onOpen: (s: SavedSearch) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="font-normal">
          <BookmarkIcon data-icon="inline-start" />
          Saved searches
          {searches.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {searches.length}
            </Badge>
          )}
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {searches.length === 0 ? (
          <div className="flex flex-col gap-1 px-2 py-3">
            <p className="font-medium">No saved searches yet</p>
            <p className="text-muted-foreground">
              Filter the companies, then choose Save search to reopen it later or hand it to the agent.
            </p>
          </div>
        ) : (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Saved searches</DropdownMenuLabel>
            {searches.map((s) => {
              const fresh = newCount(s);
              return (
                <DropdownMenuItem
                  key={s.id}
                  onSelect={() => onOpen(s)}
                  aria-current={s.id === activeId || undefined}
                  className="items-start aria-[current]:bg-primary-subtle"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">{s.name}</span>
                    <span className="truncate text-muted-foreground">{describeSearch(s) || "All companies"}</span>
                  </span>
                  <Badge variant={fresh > 0 ? "brand" : "secondary"} className="tabular-nums">
                    {fresh.toLocaleString("en-US")} new
                  </Badge>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
