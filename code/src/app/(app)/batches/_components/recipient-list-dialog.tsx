"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Recipient, displayName, recipientLabel } from "./recipient-check";

// Review › Recipients › "See who": the exact people the batch goes to, searchable, each removable (live app
// EmailBatchWizard confirm step: recipient table with search and "Remove" per row). Removing only changes this
// batch; the contact stays in the book.

const n = (x: number) => x.toLocaleString("en-US");
const SHOWN = 50;
const divider = "border-r border-border/50 last:border-r-0";

export function RecipientListDialog({
  open,
  onOpenChange,
  people,
  leftOut,
  removed,
  onRemoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Everyone the audience reaches, before the Review check and removals. */
  people: Recipient[];
  /** Left out by the recipient data check (missing data, "leave them out"). */
  leftOut: Set<string>;
  removed: Set<string>;
  onRemoved: (next: Set<string>) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matched = people.filter(
    (p) =>
      !q ||
      p.email.toLowerCase().includes(q) ||
      displayName(p).toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q),
  );
  const rows = matched.slice(0, SHOWN);
  // Saella companies carry no contact tags: no Tags column then.
  const showTags = people.some((p) => p.tags.length > 0);
  // Companies are named by the company already: no Company column then.
  const showCompany = people.some((p) => !p.isCompany);
  const cols = 3 + (showTags ? 1 : 0) + (showCompany ? 1 : 0);
  const sending = people.filter((p) => !leftOut.has(p.id) && !removed.has(p.id)).length;

  function toggle(id: string) {
    const next = new Set(removed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onRemoved(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="tabular-nums">
            {n(sending)} recipients
          </DialogTitle>
          <DialogDescription>
            Removing someone only takes them out of this batch.
          </DialogDescription>
        </DialogHeader>

        <InputGroup className="w-64">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label="Search recipients"
            placeholder="Search name, email or company"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <div className="max-h-96 overflow-y-auto rounded-lg border">
          <Table aria-label="Recipients of this batch">
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className={divider}>Recipient</TableHead>
                {showCompany && <TableHead className={divider}>Company</TableHead>}
                {showTags && <TableHead className={divider}>Tags</TableHead>}
                <TableHead className={divider}>Status</TableHead>
                <TableHead className={`${divider} w-28`}>
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={cols} className="h-24 text-center text-muted-foreground">
                    No results.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => {
                  const out = removed.has(p.id);
                  const checkOut = leftOut.has(p.id);
                  return (
                    <TableRow key={p.id} className={out || checkOut ? "text-muted-foreground" : undefined}>
                      <TableCell className={`${divider} max-w-64`}>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {recipientLabel(p)}
                          </span>
                          <span className="truncate text-sm text-muted-foreground">
                            {p.email}
                          </span>
                        </div>
                      </TableCell>
                      {showCompany && (
                        <TableCell className={`${divider} max-w-48 truncate`}>
                          {p.company}
                        </TableCell>
                      )}
                      {showTags && (
                        <TableCell className={`${divider} max-w-40 truncate text-muted-foreground`}>
                          {p.tags.join(", ")}
                        </TableCell>
                      )}
                      {/* Own Status column, a badge on every row (PATTERNS 9.1). */}
                      <TableCell className={divider}>
                        <Badge variant={checkOut || out ? "outline" : "secondary"}>
                          {checkOut ? "Missing data" : out ? "Removed" : "Included"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`${divider} text-right`}>
                        {!checkOut && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggle(p.id)}
                            aria-label={`${out ? "Put back" : "Remove"} ${p.email}`}
                          >
                            {out ? "Put back" : "Remove"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {matched.length > SHOWN && (
            <p className="border-t px-4 py-2 text-sm text-muted-foreground tabular-nums">
              Showing {n(SHOWN)} of {n(matched.length)}. Search to find someone.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
