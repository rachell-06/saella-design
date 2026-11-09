"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpIcon, BookmarkIcon } from "lucide-react";
import { SaellaMini } from "@/components/saella/saella-mini";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group";
import { COUNTRIES, isicLabel } from "./data";
import { EMPTY_FILTERS, type SavedSearch, type Search, agentHref, describeSearch } from "./searches";

// First open / nothing filtered (R13, 2026-10-29; Apollo A1 A-P5, Clay): describe the buyers in a sentence and
// the agent sets the search up, or start from a quick filter. The agent is reached through its own page
// (/agent?prompt=), the same entry every screen links to; the screen never runs the agent itself.
const POPULAR_ISIC = ["5510", "5610", "4663", "4100", "7110", "7410"];
const EXAMPLES = ["Hotels in Da Nang opened in the last 5 years", "Building material wholesalers in Malaysia with an email"];

export function StartPanel({
  total,
  saved,
  onSearch,
  onOpenSaved,
  onBrowseAll,
}: {
  total: number;
  saved: SavedSearch[];
  onSearch: (s: Search) => void;
  onOpenSaved: (s: SavedSearch) => void;
  onBrowseAll: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const ask = () => text.trim() && router.push(agentHref(text.trim()));

  return (
    <section aria-labelledby="companies-start" className="flex flex-1 flex-col items-center overflow-y-auto rounded-card border bg-card px-6 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <SaellaMini size={40} />
          <h2 id="companies-start" className="font-heading text-lg font-semibold tracking-title">
            Who are you looking for?
          </h2>
          <p className="text-muted-foreground">Describe the companies in a sentence and the agent builds the search for you.</p>
        </div>

        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
        >
          <InputGroup>
            <InputGroupTextarea
              aria-label="Describe the companies you're looking for"
              placeholder="Describe the companies you're looking for…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  ask();
                }
              }}
              className="min-h-16"
            />
            <InputGroupAddon align="block-end">
              <InputGroupText className="text-subtle-foreground">Opens in the agent · Enter to send</InputGroupText>
              <InputGroupButton type="submit" variant="default" size="sm" className="ml-auto" disabled={!text.trim()}>
                Build search
                <ArrowUpIcon data-icon="inline-end" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <span>Try:</span>
            {EXAMPLES.map((x) => (
              <Button key={x} type="button" variant="link" className="h-auto p-0 font-normal" onClick={() => setText(x)}>
                {x}
              </Button>
            ))}
          </div>
        </form>

        <div className="flex flex-col gap-4">
          <QuickRow label="Country">
            {COUNTRIES.map((c) => (
              <Button key={c.code} variant="outline" className="rounded-full font-normal" onClick={() => onSearch({ query: "", filters: { ...EMPTY_FILTERS, country: c.code } })}>
                {c.label}
              </Button>
            ))}
          </QuickRow>
          <QuickRow label="Industry">
            {POPULAR_ISIC.map((code) => (
              <Button key={code} variant="outline" className="rounded-full font-normal" onClick={() => onSearch({ query: "", filters: { ...EMPTY_FILTERS, isic: [code] } })}>
                {isicLabel(code)}
              </Button>
            ))}
          </QuickRow>
          {saved.length > 0 && (
            <QuickRow label="Saved">
              {saved.slice(0, 3).map((s) => (
                <Button key={s.id} variant="outline" className="rounded-full font-normal" title={describeSearch(s)} onClick={() => onOpenSaved(s)}>
                  <BookmarkIcon data-icon="inline-start" className="text-muted-foreground" />
                  {s.name}
                </Button>
              ))}
            </QuickRow>
          )}
        </div>

        <p className="text-center text-muted-foreground">
          Or{" "}
          <Button variant="link" className="h-auto p-0" onClick={onBrowseAll}>
            browse all {total.toLocaleString("en-US")} companies
          </Button>
        </p>
      </div>
    </section>
  );
}

function QuickRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
      <p className="w-16 shrink-0 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
