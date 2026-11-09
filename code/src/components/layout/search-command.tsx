"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, SearchIcon, SparklesIcon } from "lucide-react";
import { navItems } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

// Quick search in the app header (pattern from Studio Admin, 2026-10-27). Opens with Ctrl+K / ⌘K
// (Studio Admin uses J; K is what most tools use). Lists pages from the sidebar plus common actions.
export function SearchCommand({ onAskAgent }: { onAskAgent?: () => void }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full max-w-64 justify-start font-normal text-subtle-foreground"
      >
        <SearchIcon data-icon="inline-start" />
        Search
        <KbdGroup className="ml-auto">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Go to a page or run an action">
        <Command>
          <CommandInput placeholder="Search pages and actions…" />
          <CommandList>
            <CommandEmpty>Nothing matches. Try a page name like “Contacts”.</CommandEmpty>
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onAskAgent?.();
                }}
              >
                <SparklesIcon />
                Ask the agent
              </CommandItem>
              <CommandItem onSelect={() => go("/campaigns/new")}>
                <PlusIcon />
                New campaign
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Pages">
              {navItems.map((item) => (
                <CommandItem key={item.href} onSelect={() => go(item.href)}>
                  <item.icon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
