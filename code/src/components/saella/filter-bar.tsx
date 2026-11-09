"use client";

import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

// Search + facet filters + active-value chips for list screens (Companies, Contacts, Campaigns).
// Controlled: the screen owns the state, so filters can come from the URL or from the agent.
export type FilterFacet = { key: string; label: string; options: string[] };
export type FilterValue = Record<string, string[]>;

export function FilterBar({
  facets,
  value,
  onChange,
  query,
  onQueryChange,
  searchPlaceholder = "Search",
  resultCount,
  resultNoun = "results",
}: {
  facets: FilterFacet[];
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder?: string;
  resultCount?: number;
  resultNoun?: string;
}) {
  const toggle = (key: string, option: string, on: boolean) => {
    const current = value[key] ?? [];
    onChange({ ...value, [key]: on ? [...current, option] : current.filter((o) => o !== option) });
  };
  const active = facets.flatMap((f) => (value[f.key] ?? []).map((option) => ({ facet: f, option })));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </InputGroup>
        {facets.map((facet) => {
          const count = value[facet.key]?.length ?? 0;
          return (
            <DropdownMenu key={facet.key}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {facet.label}
                  {count > 0 && (
                    <Badge variant="brand" className="tabular-nums">
                      {count}
                    </Badge>
                  )}
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuGroup>
                  {facet.options.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option}
                      checked={value[facet.key]?.includes(option) ?? false}
                      onCheckedChange={(on) => toggle(facet.key, option, on === true)}
                      // Keep the menu open so several values can be picked in one go.
                      onSelect={(e) => e.preventDefault()}
                    >
                      {option}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
        {resultCount !== undefined && (
          <p className="ml-auto text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {resultCount.toLocaleString("en-US")} {resultNoun}
          </p>
        )}
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {active.map(({ facet, option }) => (
            <Badge
              key={`${facet.key}:${option}`}
              variant="outline"
              className="h-6 gap-1 border-primary-soft bg-primary-subtle pr-0.5 font-medium text-foreground"
            >
              <span className="text-muted-foreground">{facet.label}:</span>
              {option}
              <button
                type="button"
                aria-label={`Remove ${facet.label} ${option}`}
                onClick={() => toggle(facet.key, option, false)}
                className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary-soft hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
          <Button variant="link" size="sm" onClick={() => onChange({})}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
