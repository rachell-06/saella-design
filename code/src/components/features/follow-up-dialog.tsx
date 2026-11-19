"use client";

import { useState } from "react";
import { InfoIcon, LockIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Campaign } from "@/lib/mock/campaigns";
import { useTemplateStore } from "@/lib/mock/use-template-store";
import { liveStatus } from "@/components/features/activation";
import { Hint } from "@/components/saella/hint";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DELAYS,
  DELAY_MAX,
  DELAY_MIN,
  FLOW_STEPS_MAX,
  FLOW_TRIGGERS,
  type Flow,
  type FlowStep,
  automation,
  useAutomation,
} from "@/components/features/automation";
import { type Viewer, accessFor, canEdit, findTemplate, lockReason, viewerFor } from "@/lib/mock/templates";

// Follow-up flow of a template: an ordered chain of 1 to 10 steps, each "if <condition>, wait <delay>, send <template>"
// (PRD-02 AC-EC-F-01..05, BR-RULE-EC-31..33). The live app's FlowConfigModal saves one step; Saella keeps the PRD's
// chain (decisions.md). Opened from the Automation card on the template page.

type Row = FlowStep & { key: string };

/** "Delete this follow-up?" / "Delete this schedule?" (PATTERNS 9.10), one confirm for the Automation card's ⋯ menu and
 *  the follow-up dialog's Delete. */
export function DeleteAutomationDialog({
  kind,
  open,
  onOpenChange,
  onConfirm,
}: {
  kind: "schedule" | "flow";
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{kind === "flow" ? "Delete this follow-up?" : "Delete this schedule?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {kind === "flow"
              ? "None of its steps go out any more. Emails already sent stay in their reports."
              : "It stops sending. Batches already queued still go out."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
let keySeq = 0;
const newKey = () => `step-${++keySeq}`;

export function FollowUpDialog({
  templateId,
  open,
  onOpenChange,
  viewer,
  flowId,
}: {
  templateId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Defaults to the signed-in user (admin in the mock). */
  viewer?: Viewer;
  /** null adds a new follow-up; an id opens that one; omitted opens the template's first one. */
  flowId?: string | null;
}) {
  const found = findTemplate(templateId);
  const store = useAutomation();
  if (!found) return null;
  const { template, campaign } = found;
  const access = accessFor(template, viewer ?? viewerFor(null));
  const mayEdit = canEdit(access);
  // A template can start several follow-ups, so the caller says which one opens.
  const flow =
    flowId === undefined
      ? (store.flows.find((f) => f.templateId === templateId) ?? null)
      : (store.flows.find((f) => f.id === flowId) ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-3xl"
        onOpenAutoFocus={(e) => {
          const first = (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-first-field]");
          if (first) {
            e.preventDefault();
            first.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{flow ? "Edit follow-up" : "New follow-up"}</DialogTitle>
          {/* No visible subtitle: the dialog opens from that template. */}
          <DialogDescription className="sr-only">After “{template.name}”</DialogDescription>
        </DialogHeader>
        {!mayEdit && (
          <Alert>
            <LockIcon />
            <AlertTitle>View only</AlertTitle>
            <AlertDescription>{lockReason.edit(template.owner)}</AlertDescription>
          </Alert>
        )}
        <FollowUpForm
          key={`${templateId}-${flow?.id ?? "new"}-${open}`}
          templateId={templateId}
          templateName={template.name}
          campaign={campaign}
          flow={flow}
          disabled={!mayEdit}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function FollowUpForm({
  templateId,
  templateName,
  campaign,
  flow,
  disabled,
  onDone,
}: {
  templateId: string;
  templateName: string;
  campaign: Campaign;
  flow: Flow | null;
  disabled: boolean;
  onDone: () => void;
}) {
  // Picked from the same campaign so the sequence reads as one story (the live app lists the workspace's templates and
  // can create one inline).
  const templateStore = useTemplateStore();
  const options = campaign.templates
    .filter((t) => t.id !== templateId)
    .map((t) => ({ ...t, status: liveStatus(t.id, t.status, templateStore) }));
  const [rows, setRows] = useState<Row[]>(() =>
    (flow?.steps.length ? flow.steps : [{ templateId: "", trigger: "no_open" as const, delayHours: 72 }]).map((s) => ({ ...s, key: newKey() }))
  );
  const [showErrors, setShowErrors] = useState(false);
  // Rows typing their own wait (hours): kept apart from the value, so a number that happens to match a preset (24)
  // doesn't swap the box back to the list mid-typing. A saved wait that isn't a preset opens typed.
  const [customWait, setCustomWait] = useState<Set<string>>(
    () => new Set(rows.filter((r) => !DELAYS.some((d) => d.value === r.delayHours)).map((r) => r.key))
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patch = (key: string, p: Partial<FlowStep>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const errorOf = (r: Row) => ({
    template: !r.templateId ? "Pick the email to send" : null,
    delay: !Number.isInteger(r.delayHours) || r.delayHours < DELAY_MIN || r.delayHours > DELAY_MAX ? "1 to 1,440 hours" : null,
  });
  const invalid = rows.some((r) => errorOf(r).template || errorOf(r).delay);

  // Focus a field by id once React has drawn it (and after a closing Select has put focus back on its trigger).
  const focusField = (id: string) => window.setTimeout(() => document.getElementById(id)?.focus(), 0);

  function save() {
    if (invalid) {
      // Saving with errors moves focus to the first invalid field (PATTERNS 9.11), in the order they read.
      const first = rows.find((r) => errorOf(r).delay || errorOf(r).template);
      if (first) focusField(`${first.key}-${errorOf(first).delay ? "wait" : "send"}`);
      return setShowErrors(true);
    }
    automation.saveFlow({
      id: flow?.id ?? `f-${templateId}-${Date.now()}`,
      templateId,
      steps: rows.map(({ templateId: t, trigger, delayHours }) => ({ templateId: t, trigger, delayHours })),
      // Pause / Resume lives in the row's ⋯ menu (no switch in Edit).
      status: flow?.status ?? "active",
      sent: flow?.sent ?? 0,
    });
    toast.success(flow ? "Follow-up updated" : "Follow-up added", {
      description: `${rows.length} ${rows.length === 1 ? "trigger" : "triggers"} after “${templateName}”.`,
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset disabled={disabled} className="contents">
        <ol className="flex flex-col gap-3" aria-label="Triggers">
          {rows.map((r, i) => {
            const err = errorOf(r);
            const custom = customWait.has(r.key);
            return (
              <li key={r.key} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex min-h-6 items-center gap-2 text-sm font-medium">
                  {/* "Trigger", not "Step": each one is an if-this-then-send rule. */}
                  Trigger {i + 1}
                  {/* A follow-up needs one trigger, so the only one has no Remove. */}
                  {rows.length > 1 && (
                    <Hint label="Remove trigger">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="-my-1 ml-auto"
                        aria-label={`Remove trigger ${i + 1}`}
                        onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                      >
                        <Trash2Icon />
                      </Button>
                    </Hint>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1.3fr)]">
                  <Field>
                    <FieldLabel htmlFor={`${r.key}-if`} className={cn(i > 0 && "sr-only")}>If the recipient</FieldLabel>
                    <Select value={r.trigger} onValueChange={(v) => patch(r.key, { trigger: v as FlowStep["trigger"] })} disabled={disabled}>
                      <SelectTrigger id={`${r.key}-if`} className="w-full" data-first-field={i === 0 ? "" : undefined}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {FLOW_TRIGGERS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field data-invalid={showErrors && err.delay ? true : undefined}>
                    <FieldLabel htmlFor={`${r.key}-wait`} className={cn(i > 0 && "sr-only")}>{custom ? "Wait (hours)" : "Wait"}</FieldLabel>
                    {custom ? (
                      <Input
                        id={`${r.key}-wait`}
                        inputMode="numeric"
                        autoComplete="off"
                        // Empty while cleared, not "0" (0 isn't a valid wait).
                        value={r.delayHours > 0 ? String(r.delayHours) : ""}
                        onChange={(e) => patch(r.key, { delayHours: Number(e.target.value.replace(/\D/g, "")) })}
                        aria-invalid={showErrors && err.delay ? true : undefined}
                        placeholder="Hours"
                        className="tabular-nums"
                      />
                    ) : (
                      <Select
                        value={String(r.delayHours)}
                        onValueChange={(v) => {
                          // Other: type it, starting from the wait picked so far (never an invalid 0).
                          if (v === "custom") {
                            setCustomWait((x) => new Set(x).add(r.key));
                            // Straight into the new box, ready to type.
                            focusField(`${r.key}-wait`);
                          } else patch(r.key, { delayHours: Number(v) });
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger id={`${r.key}-wait`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {DELAYS.map((d) => (
                              <SelectItem key={d.value} value={String(d.value)}>
                                {d.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">Other (hours)…</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                    {showErrors && err.delay && <FieldError>{err.delay}</FieldError>}
                  </Field>
                  <Field data-invalid={showErrors && err.template ? true : undefined}>
                    <FieldLabel htmlFor={`${r.key}-send`} className={cn(i > 0 && "sr-only")}>Then send</FieldLabel>
                    <Select value={r.templateId} onValueChange={(v) => patch(r.key, { templateId: v })} disabled={disabled || options.length === 0}>
                      <SelectTrigger id={`${r.key}-send`} className="w-full" aria-invalid={showErrors && err.template ? true : undefined}>
                        <SelectValue placeholder={options.length === 0 ? "No other template in this campaign" : "Pick a template"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {options.map((t) => (
                            // Only an active template sends; an inactive one shows, greyed.
                            <SelectItem key={t.id} value={t.id} disabled={t.status === "inactive" && t.id !== r.templateId}>
                              {t.name}
                              {t.status === "inactive" ? " (inactive)" : ""}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {showErrors && err.template && <FieldError>{err.template}</FieldError>}
                  </Field>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-1.5">
          <Hint label={rows.length >= FLOW_STEPS_MAX ? `Up to ${FLOW_STEPS_MAX} triggers` : undefined}>
            <span className="inline-flex" tabIndex={rows.length >= FLOW_STEPS_MAX && !disabled ? 0 : undefined}>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || rows.length >= FLOW_STEPS_MAX}
                onClick={() => setRows((rs) => [...rs, { key: newKey(), templateId: "", trigger: "no_open", delayHours: 72 }])}
              >
                <PlusIcon data-icon="inline-start" />
                Add trigger
              </Button>
            </span>
          </Hint>
          <Hint label="People who reply, unsubscribe or bounce leave the follow-up.">
            <span tabIndex={0} className="inline-flex rounded-sm p-1 text-muted-foreground" aria-label="Who leaves the follow-up">
              <InfoIcon aria-hidden className="size-3.5" />
            </span>
          </Hint>
        </div>
      </fieldset>

      <DialogFooter>
        {flow && !disabled && (
          <Button
            variant="ghost"
            className="text-destructive-soft-foreground hover:text-destructive-soft-foreground sm:mr-auto"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon data-icon="inline-start" />
            Delete follow-up
          </Button>
        )}
        <Button variant="outline" onClick={onDone}>
          {disabled ? "Close" : "Cancel"}
        </Button>
        {!disabled && <Button onClick={save}>{flow ? "Save follow-up" : "Add follow-up"}</Button>}
      </DialogFooter>
      {flow && (
        <DeleteAutomationDialog
          kind="flow"
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onConfirm={() => {
            automation.deleteFlow(flow.id);
            toast.success("Follow-up deleted");
            setConfirmDelete(false);
            onDone();
          }}
        />
      )}
    </div>
  );
}
