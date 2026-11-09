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
import { cn } from "@/lib/utils";

// Form multi-select for short option lists (countries, industry sections). The menu stays open
// while picking; the trigger summarises the choice. Empty means "any", stated by the placeholder.
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  className,
}: {
  id?: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Shown when nothing is picked, e.g. "Any country". */
  placeholder: string;
  className?: string;
}) {
  const summary =
    value.length === 0 ? placeholder : value.length <= 2 ? value.join(", ") : `${value[0]} and ${value.length - 1} more`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn("w-full justify-between font-normal", value.length === 0 && "text-subtle-foreground", className)}
        >
          <span className="truncate">{summary}</span>
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={value.includes(option)}
              onCheckedChange={(on) => onChange(on ? [...value, option] : value.filter((v) => v !== option))}
              onSelect={(e) => e.preventDefault()}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {value.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => onChange([])}>Clear</DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
