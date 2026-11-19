"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, SearchIcon } from "lucide-react";
import { navItems, subPages } from "@/components/layout/app-sidebar";
import { SaellaMini } from "@/components/saella/saella-mini";
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

// Quick search (pattern from Studio Admin). Opens with Ctrl+K / ⌘K (Studio Admin uses J; K is what most tools use);
// no visible box in the top bar. Lists pages from the sidebar plus common actions.
export function SearchCommand({ onAskAgent, showTrigger = true }: { onAskAgent?: () => void; showTrigger?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key?.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
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
      {showTrigger && (
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
      )}
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Go to a page or run an action">
        <Command>
          <CommandInput placeholder="Search pages and actions…" />
          <CommandList>
            <CommandEmpty>Nothing matches. Try a page name like “Leads”.</CommandEmpty>
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onAskAgent?.();
                }}
              >
                {/* The agent's face, as on the launcher (the agent is Saella mini, not ✨). */}
                <SaellaMini size={20} className="-mx-0.5 size-5" />
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
                <CommandItem key={item.href} keywords={item.keywords} onSelect={() => go(item.href)}>
                  <item.icon />
                  {item.label}
                </CommandItem>
              ))}
              {/* Tabs and sub-pages (Leads tabs, Settings pages), straight to the page asked for. */}
              {subPages.map((item) => (
                <CommandItem
                  key={`${item.parent}-${item.href}`}
                  value={`${item.label} ${item.parent}`}
                  keywords={item.keywords}
                  onSelect={() => go(item.href)}
                >
                  <item.icon />
                  {item.label}
                  <span className="ml-auto text-xs text-muted-foreground">{item.parent}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
