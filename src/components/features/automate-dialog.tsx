"use client";

import { useState } from "react";
import { LockIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { type Campaign, INDUSTRY_TREE, TODAY, campaignStatus, formatDate } from "@/lib/mock/campaigns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DatePicker } from "@/components/saella/date-picker";
import { MultiSelect } from "@/components/saella/multi-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { COUNTRIES } from "@/lib/mock/companies";
import { UNLOCK_COST, unlockCompanies, useUnlocks } from "@/lib/mock/unlocks";
import { tagsOf, useContactsStore, withAnyTag } from "@/lib/mock/contacts";
import { countCompanies, filtersFromCampaign, isicOfSections, lockedCompanies, sectionsOf } from "@/lib/mock/company-audience";
import {
  type Schedule,
  WEEKDAYS,
  automation,
  currentSchedule,
  hhmm,
  nextRun,
  tzLabel,
  useAutomation,
} from "@/components/features/automation";
import {
  DEFAULT_SENDER_ID,
  type Viewer,
  accessFor,
  canEdit,
  findTemplate,
  lockReason,
  senderOptions,
  viewerFor,
} from "@/lib/mock/templates";

// Schedule a template: the live app's "New schedule" / "Edit schedule" dialog (Repo ScheduleConfigModal).
// Fields: Send to (unlocked companies by country / industry, prefilled from
// the campaign's targeting, or Self-upload contacts by tag; live app: locked to the campaign's registry filters),
// Send from, When to send. There is no per-run volume or total: the engine splits the workspace's daily
// allowance between the schedules running that day (Repo schedule-create.ts; PRD Master v1.1.9).
// One schedule per template: Automate on a template that has one opens it for editing (PRD Master v1.2.3).
// Editing adds the Active / Paused switch, as live. Deleting a schedule lives outside this dialog (live app:
// the schedules table of TemplateAutomateModal); follow-ups are in follow-up-dialog.tsx.
// Changes need edit access (Repo template-permissions.ts canEdit); viewers see the settings read-only.


const HOURS = Array.from({ length: 24 }, (_, h) => h);
const newScheduleId = (templateId: string) => `s-${templateId}-${Date.now()}`;
const DEFAULT_TZ = "Asia/Ho_Chi_Minh";
const DEFAULT_ITEM = "__default";

/** Set or edit the template's schedule (live app ScheduleConfigModal). Opened from AutomationPanel. */
export function ScheduleDialog({
  templateId,
  open,
  onOpenChange,
  viewer,
}: {
  templateId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Defaults to the signed-in user (admin in the mock). Pass it to preview as a member. */
  viewer?: Viewer;
}) {
  const found = findTemplate(templateId);
  const store = useAutomation();
  if (!found) return null;
  const { template, campaign } = found;
  const who = viewer ?? viewerFor(null);
  const mayEdit = canEdit(accessFor(template, who));
  const schedule = currentSchedule(store, templateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{!mayEdit ? "Schedule" : schedule ? "Edit schedule" : "New schedule"}</DialogTitle>
          <DialogDescription className="sr-only">Schedule for “{template.name}”</DialogDescription>
        </DialogHeader>

        {!mayEdit && (
          <Alert>
            <LockIcon />
            <AlertTitle>View only</AlertTitle>
            <AlertDescription>{lockReason.edit(template.owner)}</AlertDescription>
          </Alert>
        )}

        {/* Keyed so reopening starts from the saved values. */}
        <ScheduleForm
          key={`${templateId}-${schedule?.id ?? "new"}-${open}`}
          templateId={templateId}
          campaign={campaign}
          schedule={schedule}
          viewerEmail={who.email}
          disabled={!mayEdit}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ScheduleForm({
  templateId,
  campaign,
  schedule,
  viewerEmail,
  disabled,
  onDone,
}: {
  templateId: string;
  campaign: Campaign;
  schedule: Schedule | null;
  viewerEmail: string;
  disabled: boolean;
  onDone: () => void;
}) {
  const ended = campaignStatus(campaign) === "ended";
  const [status, setStatus] = useState<"active" | "paused">(schedule?.status === "paused" ? "paused" : "active");
  const [senderId, setSenderId] = useState(schedule?.senderId ?? "");
  const [cadence, setCadence] = useState<Schedule["cadence"]>(schedule?.cadence ?? "daily");
  const [runOn, setRunOn] = useState(schedule?.runOn ?? "");
  const [days, setDays] = useState<string[]>((schedule?.days ?? []).map(String));
  const [sendHour, setSendHour] = useState(schedule?.sendHour ?? 9);
  const [showErrors, setShowErrors] = useState(false);
  const timezone = schedule?.timezone ?? DEFAULT_TZ;
  const senders = senderOptions(viewerEmail);

  // Send to: prefilled from the saved schedule, else the campaign's targeting (unlocked companies).
  const saved = schedule?.audience;
  const fromCampaign = filtersFromCampaign(campaign);
  const [source, setSource] = useState<"companies" | "contacts">(saved?.source ?? "companies");
  const [countries, setCountries] = useState<string[]>(saved?.source === "companies" ? saved.countries : fromCampaign.countries);
  const [sections, setSections] = useState<string[]>(sectionsOf(saved?.source === "companies" ? saved.isic : fromCampaign.isic));
  const [tags, setTags] = useState<string[]>(saved?.source === "contacts" ? saved.tags : []);
  const [excludeTags, setExcludeTags] = useState<string[]>(saved?.source === "contacts" ? saved.excludeTags : []);
  const { unlocked, balance } = useUnlocks();
  const { contacts } = useContactsStore();
  const companyFilters = { countries: countries as typeof fromCampaign.countries, isic: isicOfSections(sections) };
  const companyCount = countCompanies(companyFilters, unlocked);
  const excluded = new Set(withAnyTag(contacts, excludeTags).map((c) => c.id));
  const contactCount = tags.length ? withAnyTag(contacts, tags).filter((c) => !excluded.has(c.id)).length : 0;
  const audience = source === "companies" ? companyCount.unlocked : contactCount;
  const firstDay = campaign.startsOn && campaign.startsOn > TODAY ? campaign.startsOn : TODAY;
  const daysError = cadence === "custom" && days.length === 0 ? "Pick at least one day" : null;
  const dateError = cadence === "once" && !runOn ? "Pick the date it sends on" : null;
  // Creating is blocked once the campaign has ended (its schedules complete, EC-EC-23) or nobody matches Send to.
  // An existing schedule stays editable, so it can still be paused (live app).
  const blockCreate = !schedule && (ended || audience === 0);
  const locked = disabled || blockCreate;

  function save() {
    if (daysError || dateError) return setShowErrors(true);
    const draft: Schedule = {
      id: schedule?.id ?? newScheduleId(templateId),
      templateId,
      status: schedule ? status : "active",
      cadence,
      days: cadence === "custom" ? days.map(Number) : [],
      runOn: cadence === "once" ? runOn : undefined,
      sendHour,
      timezone,
      senderId: senderId || undefined,
      audience:
        source === "companies"
          ? { source, countries, isic: companyFilters.isic }
          : { source, tags, excludeTags },
      perRunCap: schedule?.perRunCap ?? 0,
      targetTotal: 0,
      sentCount: schedule?.sentCount ?? 0,
    };
    automation.saveSchedule(draft);
    const next = nextRun(draft, campaign.startsOn);
    toast.success(schedule ? "Schedule updated" : "Schedule created", {
      description: draft.status === "paused" ? "Paused. It won't send until you turn it back on." : next ? `Next run ${next}.` : undefined,
    });
    onDone();
  }

  const tz = <span className="text-sm text-muted-foreground">{tzLabel(timezone)}</span>;
  const hourSelect = (
    <Select value={String(sendHour)} onValueChange={(v) => setSendHour(Number(v))} disabled={locked}>
      <SelectTrigger className="w-24 tabular-nums" aria-label="Send at">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {hhmm(h)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-col gap-5">
      <SendTo
        disabled={disabled}
        source={source}
        onSource={setSource}
        countries={countries}
        onCountries={setCountries}
        sections={sections}
        onSections={setSections}
        companyCount={companyCount}
        balance={balance}
        onUnlock={() => {
          const rows = lockedCompanies(companyFilters, unlocked);
          if (!unlockCompanies(rows, balance)) return false;
          toast.success(`${rows.length} ${rows.length === 1 ? "company" : "companies"} unlocked`, {
            description: `${rows.length * UNLOCK_COST} credits used. They're in Send to now.`,
          });
          return true;
        }}
        tagOptions={tagsOf(contacts)}
        tags={tags}
        onTags={setTags}
        excludeTags={excludeTags}
        onExcludeTags={setExcludeTags}
        contactCount={contactCount}
      />

      {ended && !schedule && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>The campaign ended on {formatDate(campaign.endsOn!, true)}</AlertTitle>
          <AlertDescription>Extend the campaign period to schedule it again.</AlertDescription>
        </Alert>
      )}

      <fieldset disabled={locked} className="contents">
        <FieldGroup className="gap-5">
          {schedule && (
            <Field orientation="horizontal">
              <Switch
                id="sch-status"
                checked={status === "active"}
                onCheckedChange={(on) => setStatus(on ? "active" : "paused")}
                disabled={locked}
              />
              <FieldLabel htmlFor="sch-status" className="font-normal">
                {status === "active" ? "Active" : "Paused"}
                <span className="text-muted-foreground">
                  · {status === "active" ? "Running on schedule" : "No sends while paused"}
                </span>
              </FieldLabel>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="sch-sender">Send from</FieldLabel>
            <Select value={senderId} onValueChange={(v) => setSenderId(v === DEFAULT_ITEM ? "" : v)} disabled={locked}>
              <SelectTrigger id="sch-sender" className="w-full">
                <SelectValue placeholder="Business default sender" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={DEFAULT_ITEM}>Business default sender</SelectItem>
                  {senders.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.email}
                      {s.id === DEFAULT_SENDER_ID ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>Leave empty to use your business&apos;s default sender.</FieldDescription>
          </Field>

          {/* One sentence: "Send [Every day] at [09:00] <time zone>". Once adds its date inside
              the sentence; On these days adds the weekday row under it. A dropdown here reads as part of the sentence,
              next to the hour dropdown, so the three choices aren't laid out as buttons. */}
          <FieldSet>
            <FieldLegend variant="label">When to send</FieldLegend>
            <Field data-invalid={showErrors && (dateError || daysError) ? true : undefined}>
              <div className="flex flex-wrap items-center gap-2 text-sm font-normal text-muted-foreground">
                <span>Send</span>
                <Select value={cadence} onValueChange={(v) => setCadence(v as Schedule["cadence"])} disabled={locked}>
                  <SelectTrigger className="w-36" aria-label="How often">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="daily">Every day</SelectItem>
                      <SelectItem value="custom">On these days</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {cadence === "once" && (
                  <>
                    <span>on</span>
                    <DatePicker
                      value={runOn}
                      onChange={setRunOn}
                      min={firstDay}
                      max={campaign.endsOn}
                      invalid={Boolean(showErrors && dateError)}
                      aria-label="Send on"
                      className="w-40"
                    />
                  </>
                )}
                <span>at</span>
                {hourSelect}
                {/* With a date in the sentence the zone would wrap alone; it moves to the line under it. */}
                {cadence !== "once" && tz}
              </div>
              {cadence === "custom" && (
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  spacing={0}
                  value={days}
                  onValueChange={setDays}
                  disabled={locked}
                  aria-label="Days of the week"
                >
                  {WEEKDAYS.map((d) => (
                    <ToggleGroupItem key={d.value} value={String(d.value)} className="w-12">
                      {d.short}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
              {showErrors && dateError ? (
                <FieldError>{dateError}</FieldError>
              ) : showErrors && daysError ? (
                <FieldError>{daysError}</FieldError>
              ) : cadence === "once" ? (
                <FieldDescription>{tzLabel(timezone)}. Sends once on that date, then the schedule is complete.</FieldDescription>
              ) : null}
            </Field>
          </FieldSet>
        </FieldGroup>
      </fieldset>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {disabled ? "Close" : "Cancel"}
        </Button>
        {!disabled && (
          <LockedTip reason={blockCreate ? (ended ? "The campaign has ended" : "Nobody matches who to send to") : undefined}>
            <Button onClick={save} disabled={blockCreate}>
              {schedule ? "Save changes" : "Create schedule"}
            </Button>
          </LockedTip>
        )}
      </DialogFooter>
    </div>
  );
}

const COUNTRY_LABEL = new Map<string, string>(COUNTRIES.map((c) => [c.code, c.label]));
const COUNTRY_CODE = new Map<string, string>(COUNTRIES.map((c) => [c.label, c.code]));
// The 21 ISIC sections campaigns can target (lib/mock/campaigns INDUSTRY_TREE), not only the registry mock's 8.
const SECTION_LABEL = new Map(INDUSTRY_TREE.map((g) => [g.value, g.label]));
const SECTION_CODE = new Map(INDUSTRY_TREE.map((g) => [g.label, g.value]));

/** Who each run sends to: unlocked companies by country and industry, or Self-upload contacts by tag. */
// Locked matches are unlocked right here: leaving for Leads broke the flow of setting up the
// schedule. One click asks, inline (no dialog over the dialog), then charges and the count above grows.
function UnlockMore({ count, balance, onUnlock }: { count: number; balance: number; onUnlock: () => boolean }) {
  const [asking, setAsking] = useState(false);
  const cost = count * UNLOCK_COST;
  const short = cost > balance;
  const n = (x: number) => x.toLocaleString("en-US");
  if (!asking)
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground tabular-nums">
        <span className="flex items-center gap-1.5">
          <LockIcon className="size-3.5" aria-hidden />
          {n(count)} more match but are locked.
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => setAsking(true)}>
          Unlock {n(count)} · {n(cost)} {cost === 1 ? "credit" : "credits"}
        </Button>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border bg-primary-soft/40 px-3 py-2 text-sm tabular-nums">
      <span>
        {short ? (
          <>
            Needs {n(cost)} credits, you have {n(balance)}.{" "}
            <Link href="/settings/billing" className="underline underline-offset-4">
              Top up credits
            </Link>
          </>
        ) : (
          <>
            Unlock {n(count)} {count === 1 ? "company" : "companies"} for {n(cost)} {cost === 1 ? "credit" : "credits"}?{" "}
            <span className="text-muted-foreground">You have {n(balance)}.</span>
          </>
        )}
      </span>
      <span className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setAsking(false)}>
          Cancel
        </Button>
        {!short && (
          <Button type="button" size="sm" onClick={() => onUnlock() && setAsking(false)}>
            Unlock
          </Button>
        )}
      </span>
    </div>
  );
}

function SendTo({
  disabled,
  source,
  onSource,
  countries,
  onCountries,
  sections,
  onSections,
  companyCount,
  balance,
  onUnlock,
  tagOptions,
  tags,
  onTags,
  excludeTags,
  onExcludeTags,
  contactCount,
}: {
  disabled: boolean;
  source: "companies" | "contacts";
  onSource: (s: "companies" | "contacts") => void;
  countries: string[];
  onCountries: (v: string[]) => void;
  sections: string[];
  onSections: (v: string[]) => void;
  companyCount: { unlocked: number; locked: number };
  balance: number;
  /** Unlocks the locked matches here; false when credits are short. */
  onUnlock: () => boolean;
  tagOptions: string[];
  tags: string[];
  onTags: (v: string[]) => void;
  excludeTags: string[];
  onExcludeTags: (v: string[]) => void;
  contactCount: number;
}) {
  const n = (x: number) => x.toLocaleString("en-US");
  return (
    <FieldSet>
      <FieldLegend variant="label">Send to</FieldLegend>
      <Tabs value={source} onValueChange={(v) => !disabled && onSource(v as typeof source)}>
        <TabsList aria-label="Send to">
          <TabsTrigger value="companies" disabled={disabled}>
            Unlocked companies
          </TabsTrigger>
          <TabsTrigger value="contacts" disabled={disabled}>
            Self-upload
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {source === "companies" ? (
        <div className="flex flex-col gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sch-country" className="sr-only">
                Country
              </FieldLabel>
              <MultiSelect
                id="sch-country"
                options={COUNTRIES.map((c) => c.label)}
                value={countries.map((c) => COUNTRY_LABEL.get(c) ?? c)}
                onChange={(v) => onCountries(v.map((l) => COUNTRY_CODE.get(l) ?? l))}
                placeholder="Any country"
                searchPlaceholder="Search countries"
                className="h-8"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="sch-industry" className="sr-only">
                Industry
              </FieldLabel>
              <MultiSelect
                id="sch-industry"
                options={INDUSTRY_TREE.map((g) => g.label)}
                value={sections.map((s) => SECTION_LABEL.get(s) ?? s)}
                onChange={(v) => onSections(v.map((l) => SECTION_CODE.get(l) ?? l))}
                placeholder="Any industry"
                searchPlaceholder="Search industries"
                className="h-8"
              />
            </Field>
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">{n(companyCount.unlocked)}</span> unlocked companies match
          </p>
          {companyCount.locked > 0 && !disabled && (
            <UnlockMore count={companyCount.locked} balance={balance} onUnlock={onUnlock} />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sch-tags" className="font-normal text-muted-foreground">
                Contacts with any of these tags
              </FieldLabel>
              <MultiSelect id="sch-tags" options={tagOptions} value={tags} onChange={onTags} placeholder="Pick tags" searchPlaceholder="Search tags" className="h-8" />
            </Field>
            <Field>
              <FieldLabel htmlFor="sch-exclude" className="font-normal text-muted-foreground">
                Don&apos;t send to (optional)
              </FieldLabel>
              <MultiSelect
                id="sch-exclude"
                options={tagOptions}
                value={excludeTags}
                onChange={onExcludeTags}
                placeholder="No tags left out"
                searchPlaceholder="Search tags"
                className="h-8"
              />
            </Field>
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">{n(contactCount)}</span> {contactCount === 1 ? "contact" : "contacts"}
          </p>
        </div>
      )}
    </FieldSet>
  );
}

// Disabled buttons don't fire pointer events, so the tooltip wraps a span.
export function LockedTip({ reason, children }: { reason?: string; children: React.ReactNode }) {
  if (!reason) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" tabIndex={0}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{reason}</TooltipContent>
    </Tooltip>
  );
}
