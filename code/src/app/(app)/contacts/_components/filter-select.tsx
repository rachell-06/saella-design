"use client";

import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Filter in the card toolbar, drawn like Studio Admin /dashboard/users' "Role: All" select. Several values at once
// (decisions.md "Leads › Contacts": the live app filters one tag, the new app several); the menu stays open while
// picking and "All" clears it.

export function MultiFilter({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  /** While the options load (PATTERNS.md §9.17). */
  disabled?: boolean;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const summary = value.length === 0 ? "All" : value.length === 1 ? value[0] : `${value[0]} +${value.length - 1}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="font-normal" disabled={disabled} aria-label={`Filter by ${label.toLowerCase()}: ${value.join(", ") || "all"}`}>
          <span className="text-muted-foreground">{label}:</span>
          <span className="max-w-40 truncate">{summary}</span>
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={value.length === 0} onSelect={() => onChange([])}>
            All
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={value.includes(option)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(on) => onChange(on ? [...value, option] : value.filter((v) => v !== option))}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
