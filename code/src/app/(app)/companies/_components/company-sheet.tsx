"use client";

import { GlobeIcon, LockIcon, MailIcon, PhoneIcon, PlusIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Company, STATUSES, countryLabel, formatDate, isicLabel, isicSection, maskEmail, maskPhone } from "./data";

// Company detail in a Sheet (DESIGN.md §8.1: Sheet for detail). Registry facts first, then contact details,
// masked until unlocked. Unlock is planned, not built: 1 credit per company once metering is on, and credits
// are still off (PRD-04 CO-UNLOCK-001, PRD Master Upcoming tab), so the button is shown disabled with the reason.
export function CompanySheet({
  company,
  lists,
  onOpenChange,
  onAddToList,
  onNewList,
}: {
  company: Company | null;
  lists: { id: string; name: string }[];
  onOpenChange: (open: boolean) => void;
  onAddToList: (company: Company, listId: string) => void;
  onNewList: (company: Company) => void;
}) {
  const c = company;
  return (
    <Sheet open={c !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        {c && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>{c.name}</SheetTitle>
              <SheetDescription>
                {countryLabel(c.country)} · Registration no. {c.registrationNo}
              </SheetDescription>
              {c.status !== "active" && (
                <div>
                  <Badge variant={c.status === "ceased" || c.status === "suspended" ? "destructive" : "secondary"}>
                    {STATUSES.find((s) => s.value === c.status)?.label}
                  </Badge>
                </div>
              )}
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                <Fact label="Industry">
                  {isicLabel(c.isic)}
                  <span className="block text-muted-foreground">
                    ISIC {c.isic} · {isicSection(c.isic)?.label}
                  </span>
                </Fact>
                <Fact label="Founded">{formatDate(c.incorporatedOn)}</Fact>
                <Fact label="Address">{c.address}</Fact>
                {c.representative && <Fact label="Representative">{c.representative}</Fact>}
                {c.branchOf && <Fact label="Branch">{c.branchOf}</Fact>}
                {c.fdi && <Fact label="Ownership">Foreign direct investment</Fact>}
              </dl>

              <Separator />

              <section aria-labelledby="co-contact" className="flex flex-col gap-3">
                <h3 id="co-contact" className="font-heading text-base font-medium">
                  Contact details
                </h3>
                <ul className="flex flex-col gap-2 text-sm">
                  <ContactLine icon={<MailIcon />} value={c.email && maskEmail(c.email)} empty="No email in the registry" />
                  <ContactLine icon={<PhoneIcon />} value={c.phone && maskPhone(c.phone)} empty="No phone in the registry" />
                  <ContactLine icon={<GlobeIcon />} value={c.website && `${c.website.slice(0, 6)}•••`} empty="No website in the registry" />
                </ul>
                <Alert>
                  <LockIcon />
                  <AlertTitle>Unlocking is not available yet</AlertTitle>
                  <AlertDescription>
                    Full email, phone and website will cost 1 credit per company once credits are switched on. You can
                    already send to this company: Saella uses the address without showing it.
                  </AlertDescription>
                </Alert>
              </section>
            </div>

            <SheetFooter className="flex-row border-t">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button variant="outline" disabled>
                      <LockIcon data-icon="inline-start" />
                      Unlock · 1 credit
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Credits are off, so unlocking isn&apos;t available yet</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="ml-auto" disabled={!c.email}>
                    <PlusIcon data-icon="inline-start" />
                    Add to list
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Add to contact list</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    {lists.map((l) => (
                      <DropdownMenuItem key={l.id} onSelect={() => onAddToList(c, l.id)}>
                        <span className="truncate">{l.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => onNewList(c)}>
                      <PlusIcon />
                      New list…
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 wrap-break-word">{children}</dd>
    </div>
  );
}

function ContactLine({ icon, value, empty }: { icon: React.ReactNode; value?: string; empty: string }) {
  return (
    <li className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
      {icon}
      {value ? <span className="tabular-nums">{value}</span> : <span className="text-muted-foreground">{empty}</span>}
    </li>
  );
}
