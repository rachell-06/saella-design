"use client";

// Overview campaign filter (workspaces can have many campaigns, so it needs search).
// Single-pick combobox on shadcn Popover + Command, the same pattern as the shared MultiSelect: search box always on
// top, "All campaigns" pinned first, plain substring match, ✓ on the current one. Enter picks, Esc closes.

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CampaignPicker({
  campaigns,
  value,
  onChange,
}: {
  campaigns: { id: string; name: string }[];
  /** Campaign id, or null for all campaigns. */
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = campaigns.find((c) => c.id === value);
  const pick = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Campaign"
          className="w-52 justify-between font-normal"
        >
          <span className="truncate">{current?.name ?? "All campaigns"}</span>
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        {/* Plain substring match on the name: cmdk's default fuzzy match lists unrelated names. */}
        <Command filter={(item, search) => (item.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder="Search campaigns" />
          <CommandList>
            <CommandEmpty>No campaigns match</CommandEmpty>
            <CommandGroup>
              <CommandItem value="All campaigns" data-checked={value === null} onSelect={() => pick(null)}>
                All campaigns
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {campaigns.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.id}`}
                  data-checked={c.id === value}
                  onSelect={() => pick(c.id)}
                >
                  <span className="truncate">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
