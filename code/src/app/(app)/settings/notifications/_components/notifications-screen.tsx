"use client";

import { SCROLL_SHEET_BODY } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckIcon, CircleAlertIcon, ListIcon, MinusIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionHeader } from "../../_components/section-header";
import { Item } from "@/components/ui/item";

// Settings → Notifications (PRD Notification, read).
// - The only preference that exists is marketing opt-out: it silences tips and offers only; transactional,
//   policy and security notices always arrive (AC-NTF-L-05, BR-RULE-NTF-06, EC-NTF-05). The PRD doesn't give its
//   default; we show it on.
// - Everything lands in the in-app feed; email only for actionable or must-not-miss events (BR-RULE-NTF-02,
//   AC-NTF-F-04). Users can't turn those off, so the table is read-only: it tells people what to expect.
// - Events, recipients and channels follow what the live app dispatches (notifyAdmins, template-notify,
//   campaign-expiry, membership, domain-recheck, auto-pause). Owners get template activity by email too; sending pauses
//   and domain changes go to the admin. There is no "batch finished" notification. Admin transfer and send-as are
//   in-app only (PRD AC-NTF-M-06 says email). The marketing opt-out is stored (notification_prefs) but the live app
//   has no screen for it yet; the default is on.
// - The page keeps the one choice (Tips) and one line on what to expect; the event-by-event list (read-only) sits
//   behind "See the full list" in a Sheet.
// Preview with ?state= loading | error | saving-error | list (the Sheet open)
type Row = { event: string; who: string; inApp: boolean; email: boolean };

const ROWS: { group: string; rows: Row[] }[] = [
  {
    group: "Your team",
    rows: [
      { event: "Someone asks to join", who: "Admin", inApp: true, email: true },
      { event: "An invited member joins", who: "Admin", inApp: true, email: true },
      { event: "Your join request is approved", who: "You", inApp: true, email: true },
      { event: "Your join request is rejected", who: "You", inApp: false, email: true },
      { event: "The admin role moves", who: "Old and new admin", inApp: true, email: false },
      { event: "Teammates can send as you", who: "You", inApp: true, email: false },
      { event: "Templates are reassigned to you", who: "New owner", inApp: true, email: true },
    ],
  },
  {
    group: "Templates and sending",
    rows: [
      { event: "Your template is edited, shared, copied, sent or rescheduled", who: "Owner", inApp: true, email: true },
      { event: "A template is shared with you, or your access ends", who: "You", inApp: true, email: true },
      { event: "A campaign ends", who: "People on its templates", inApp: true, email: true },
      { event: "Sending is paused for the workspace", who: "Admin", inApp: true, email: true },
      // The bell entry that opens the template's Automation card; live app credits.schedule_paused goes to whoever set the
      // schedule up.
      { event: "A schedule is waiting for credits", who: "Who set it up", inApp: true, email: false },
    ],
  },
  {
    group: "Domain and account",
    rows: [
      { event: "Someone verifies your company's domain and becomes admin", who: "Everyone", inApp: true, email: true },
      { event: "The domain is verified or loses a record", who: "Admin", inApp: true, email: true },
      { event: "Policy and security notices", who: "Everyone", inApp: true, email: true },
      { event: "Welcome when you first sign in", who: "You", inApp: true, email: true },
    ],
  },
];

export function NotificationsScreen() {
  const preview = useSearchParams().get("state") ?? "";
  const loading = preview === "loading";
  const [loadError, setLoadError] = useState(preview === "error");
  const [tips, setTips] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listOpen, setListOpen] = useState(preview === "list");
  const failSave = preview === "saving-error";

  function changeTips(on: boolean) {
    setTips(on);
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      if (failSave) {
        setTips(!on);
        toast.error("Couldn't save your choice", { description: "Nothing changed. Try again." });
        return;
      }
      toast.success(on ? "You'll get tips and offers" : "No more tips and offers", {
        description: on ? undefined : "Account and security emails still arrive.",
      });
    }, 500);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <span className="sr-only">Loading notification settings</span>
        <Skeleton className="h-16 w-full rounded-card" />
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    );
  }
  if (loadError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Couldn&apos;t load your notification settings</AlertTitle>
        <AlertDescription>Check your connection and try again.</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => setLoadError(false)}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-4" aria-labelledby="pref-title">
        <SectionHeader
          id="pref-title"
          title="Notifications"
          description="Everything shows under the bell; things to act on also come by email."
          actions={
            <Button variant="outline" onClick={() => setListOpen(true)}>
              <ListIcon data-icon="inline-start" />
              See the full list
            </Button>
          }
        />
        <Item variant="outline" className="block rounded-card px-4 py-3 text-base">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="ntf-tips">Tips and offers</FieldLabel>
              <FieldDescription>
                Product tips, discounts and news. Turning this off never stops account, team or security emails.
              </FieldDescription>
            </FieldContent>
            <Switch id="ntf-tips" checked={tips} onCheckedChange={changeTips} disabled={saving} aria-busy={saving || undefined} />
          </Field>
        </Item>
      </section>

      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-3xl">
          <SheetHeader className="border-b">
            <SheetTitle>What you&apos;re told about</SheetTitle>
            <SheetDescription>These can&apos;t be turned off.</SheetDescription>
          </SheetHeader>
          <div className={cn("p-4", SCROLL_SHEET_BODY)}>
          <div className="rounded-card border">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="w-40">Who</TableHead>
                <TableHead className="w-20 text-center">In app</TableHead>
                <TableHead className="w-20 text-center">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((g) => (
                <Group key={g.group} group={g.group} rows={g.rows} />
              ))}
            </TableBody>
          </Table>
          </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Group({ group, rows }: { group: string; rows: Row[] }) {
  return (
    <>
      <TableRow>
        <TableCell colSpan={4} className="bg-muted/50 text-sm font-medium text-muted-foreground">
          {group}
        </TableCell>
      </TableRow>
      {rows.map((r) => (
        <TableRow key={r.event}>
          <TableCell className="whitespace-normal">{r.event}</TableCell>
          <TableCell className="whitespace-normal text-muted-foreground">{r.who}</TableCell>
          <Channel on={r.inApp} label="in app" />
          <Channel on={r.email} label="by email" />
        </TableRow>
      ))}
    </>
  );
}

function Channel({ on, label }: { on: boolean; label: string }) {
  return (
    <TableCell className="text-center">
      {on ? (
        <CheckIcon className="mx-auto size-4 text-success-soft-foreground" aria-label={`Sent ${label}`} />
      ) : (
        <MinusIcon className="mx-auto size-4 text-muted-foreground" aria-label={`Not sent ${label}`} />
      )}
    </TableCell>
  );
}
