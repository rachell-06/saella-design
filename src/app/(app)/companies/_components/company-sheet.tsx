"use client";

import { ArrowUpRightIcon, LockIcon, LockOpenIcon } from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/saella/copy-button";
import { Hint } from "@/components/saella/hint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { type Company, STATUSES, countryLabel, formatDate, isicLabel, maskEmail, maskPhone, maskWebsite } from "@/lib/mock/companies";

// Company detail in a Sheet. Registry facts first, then contact details,
// masked until unlocked. Unlock (PRD Contacts US-CON-U, AC-CON-U-01..03; live app #116): one click, 1 credit,
// reveals email, phone and website for the whole workspace; the cost is on the button, so no confirm (live app
// unlockOne). It is the sheet's one solid button while the company is locked; once unlocked the values show in
// full with Copy, an "Unlocked" badge marks it, and the button goes. Nothing hidden → no Unlock.
export function CompanySheet({
  company,
  unlocked,
  onOpenChange,
  onUnlock,
}: {
  company: Company | null;
  /** The workspace has unlocked this company. */
  unlocked: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlock: (company: Company) => void;
}) {
  const c = company;
  const canUnlock = c !== null && !unlocked && Boolean(c.email);
  return (
    <Sheet open={c !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        {c && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>{c.name}</SheetTitle>
              <SheetDescription>
                {countryLabel(c.country)} · Tax code {c.registrationNo}
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
              <dl className="grid grid-cols-[7rem_1fr] gap-x-6 gap-y-3 text-sm">
                {/* The name only: the ISIC code behind it is how Saella maps each country's codes, not something users
                    read: industry codes in plain words. */}
                <Fact label="Industry">{isicLabel(c.isic)}</Fact>
                {c.subIndustries.length > 0 && (
                  <Fact label="Other industries">
                    <ul className="flex flex-col gap-1">
                      {c.subIndustries.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </Fact>
                )}
                <Fact label="Founded">{formatDate(c.incorporatedOn)}</Fact>
                <Fact label="Address">{c.address}</Fact>
                {/* Free and always shown: the registry publishes it (live app never masks it). Not a contact: no email or phone. */}
                {c.representative && <Fact label="Legal representative">{c.representative}</Fact>}
                {c.branches && (
                  <Fact label="Branches">
                    <ul className="flex flex-col gap-1">
                      {c.branches.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </Fact>
                )}
                {c.fdi && <Fact label="Ownership">Foreign direct investment</Fact>}
              </dl>

              <Separator />

              <section aria-labelledby="co-contact" className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h3 id="co-contact" className="font-heading text-base font-medium">
                    Contact details
                  </h3>
                  {unlocked && (
                    <Badge variant="success">
                      <LockOpenIcon data-icon="inline-start" />
                      Unlocked
                    </Badge>
                  )}
                </div>
                {/* Labelled rows, not icons: a masked "p*****.my" alone doesn't say it is a website. */}
                <dl className="grid grid-cols-[7rem_1fr] items-center gap-x-6 gap-y-3 text-sm">
                  <Fact label="Email">
                    <Contact value={c.email} masked={!unlocked && c.email ? maskEmail(c.email) : undefined} />
                  </Fact>
                  <Fact label="Phone">
                    <Contact value={c.phone} masked={!unlocked && c.phone ? maskPhone(c.phone) : undefined} />
                  </Fact>
                  <Fact label="Website">
                    <Contact value={c.website} masked={!unlocked && c.website ? maskWebsite(c.website) : undefined} link />
                  </Fact>
                </dl>
              </section>
            </div>

            {/* Unlock is the sheet's only action (no saving to Self-upload). */}
            {/* Says exactly what this company's unlock gives: only the fields it has;
                company contact details, never people. */}
            {canUnlock && (
              <SheetFooter className="flex-col items-start gap-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Unlock reveals: {[c.email && "email", c.phone && "phone", c.website && "website"].filter(Boolean).join(", ")}
                </p>
                <Button onClick={() => onUnlock(c)}>
                  <LockIcon data-icon="inline-start" />
                  Unlock · 1 credit
                </Button>
              </SheetFooter>
            )}
            {!unlocked && !canUnlock && (
              <SheetFooter className="border-t">
                <p className="text-sm text-muted-foreground">Nothing to unlock: no email in our data.</p>
              </SheetFooter>
            )}
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

/** Masked until unlocked. After: email and phone copy on a click of the value, with a copy icon that shows on
 *  hover or keyboard focus; the website is a link that opens in a new tab. */
function Contact({ value, masked, link }: { value?: string; masked?: string; link?: boolean }) {
  if (!value) return <span className="text-muted-foreground">Not in our data</span>;
  // One line each: cut with an ellipsis, the full value on hover.
  if (masked)
    return (
      <span className="block truncate text-muted-foreground tabular-nums" title={masked}>
        {masked}
      </span>
    );
  if (link) {
    const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return (
      // Body colour, underline on hover: an outside link, not a Saella action.
      <Hint label={value}>
        <Button
          variant="link"
          className="h-auto max-w-full justify-start border-0 p-0 font-normal text-foreground"
          asChild
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            <span className="min-w-0 truncate">{value}</span>
            <ArrowUpRightIcon data-icon="inline-end" className="text-muted-foreground" />
          </a>
        </Button>
      </Hint>
    );
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy", { description: "Select the value and copy it by hand." });
    }
  };
  return (
    <span className="group/copy flex w-full min-w-0 items-center gap-1">
      <Hint
        label={
          <span className="flex flex-col">
            <span className="break-all">{value}</span>
            <span className="opacity-70">Click to copy</span>
          </span>
        }
      >
        <Button
          variant="link"
          className="h-auto min-w-0 shrink justify-start border-0 p-0 text-left font-normal text-foreground tabular-nums hover:no-underline"
          onClick={copy}
        >
          <span className="min-w-0 truncate">{value}</span>
        </Button>
      </Hint>
      <span className="opacity-0 transition-opacity group-focus-within/copy:opacity-100 group-hover/copy:opacity-100 motion-reduce:transition-none">
        <CopyButton value={value} label="Copy" />
      </span>
    </span>
  );
}
