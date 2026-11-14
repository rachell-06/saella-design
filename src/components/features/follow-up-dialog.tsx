"use client";

import { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, CornerDownRightIcon, LockIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import type { Campaign } from "@/lib/mock/campaigns";
import { Hint } from "@/components/saella/hint";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
// chain. Opened from the Automation card on the template page.

type Row = FlowStep & { key: string };
let keySeq = 0;
const newKey = () => `step-${++keySeq}`;

export function FollowUpDialog({
  templateId,
  open,
  onOpenChange,
  viewer,
}: {
  templateId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Defaults to the signed-in user (admin in the mock). */
  viewer?: Viewer;
}) {
  const found = findTemplate(templateId);
  const store = useAutomation();
  if (!found) return null;
  const { template, campaign } = found;
  const access = accessFor(template, viewer ?? viewerFor(null));
  const mayEdit = canEdit(access);
  const flow = store.flows.find((f) => f.templateId === templateId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{flow ? "Edit follow-up" : "New follow-up"}</DialogTitle>
          <DialogDescription>Emails that go out after “{template.name}”, one step after another.</DialogDescription>
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
  // Picked from the same campaign so the sequence reads as one story (the live app lists the
  // workspace's templates and can create one inline).
  const options = campaign.templates.filter((t) => t.id !== templateId);
  const [rows, setRows] = useState<Row[]>(() =>
    (flow?.steps.length ? flow.steps : [{ templateId: "", trigger: "no_open" as const, delayHours: 72 }]).map((s) => ({ ...s, key: newKey() }))
  );
  const [status, setStatus] = useState<Flow["status"]>(flow?.status ?? "active");
  const [showErrors, setShowErrors] = useState(false);

  const patch = (key: string, p: Partial<FlowStep>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const next = [...rs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  const errorOf = (r: Row) => ({
    template: !r.templateId ? "Pick the email to send" : null,
    delay: !Number.isInteger(r.delayHours) || r.delayHours < DELAY_MIN || r.delayHours > DELAY_MAX ? "1 to 1,440 hours" : null,
  });
  const invalid = rows.some((r) => errorOf(r).template || errorOf(r).delay);

  function save() {
    if (invalid) return setShowErrors(true);
    automation.saveFlow({
      id: flow?.id ?? `f-${templateId}-${Date.now()}`,
      templateId,
      steps: rows.map(({ templateId: t, trigger, delayHours }) => ({ templateId: t, trigger, delayHours })),
      status: flow ? status : "active",
      sent: flow?.sent ?? 0,
    });
    toast.success(flow ? "Follow-up updated" : "Follow-up added", {
      description: `${rows.length} ${rows.length === 1 ? "step" : "steps"} after “${templateName}”.`,
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-5">
      {flow && (
        <Field orientation="horizontal">
          <Switch id="fu-status" checked={status === "active"} onCheckedChange={(on) => setStatus(on ? "active" : "paused")} disabled={disabled} />
          <FieldLabel htmlFor="fu-status" className="font-normal">
            {status === "active" ? "Active" : "Paused"}
            <span className="text-muted-foreground tabular-nums">· {flow.sent.toLocaleString("en-US")} sent so far</span>
          </FieldLabel>
        </Field>
      )}

      <fieldset disabled={disabled} className="contents">
        <ol className="flex flex-col gap-3" aria-label="Steps">
          {rows.map((r, i) => {
            const err = errorOf(r);
            const custom = !DELAYS.some((d) => d.value === r.delayHours);
            return (
              <li key={r.key} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CornerDownRightIcon aria-hidden className="size-4 text-brand" />
                  Step {i + 1}
                  <span className="font-normal text-muted-foreground">
                    · checked against {i === 0 ? `“${templateName}”` : `step ${i}`}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <Hint label="Move up">
                      <Button variant="ghost" size="icon-sm" aria-label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUpIcon />
                      </Button>
                    </Hint>
                    <Hint label="Move down">
                      <Button variant="ghost" size="icon-sm" aria-label={`Move step ${i + 1} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDownIcon />
                      </Button>
                    </Hint>
                    <Hint label={rows.length === 1 ? "A follow-up needs at least one step" : "Remove step"}>
                      <span className="inline-flex" tabIndex={rows.length === 1 ? 0 : undefined}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove step ${i + 1}`}
                          disabled={rows.length === 1}
                          onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                        >
                          <Trash2Icon />
                        </Button>
                      </span>
                    </Hint>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1.3fr)]">
                  <Field>
                    <FieldLabel htmlFor={`${r.key}-if`}>If the recipient</FieldLabel>
                    <Select value={r.trigger} onValueChange={(v) => patch(r.key, { trigger: v as FlowStep["trigger"] })} disabled={disabled}>
                      <SelectTrigger id={`${r.key}-if`} className="w-full">
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
                    <FieldLabel htmlFor={`${r.key}-wait`}>Wait</FieldLabel>
                    {custom ? (
                      <Input
                        id={`${r.key}-wait`}
                        inputMode="numeric"
                        value={String(r.delayHours)}
                        onChange={(e) => patch(r.key, { delayHours: Number(e.target.value.replace(/\D/g, "")) })}
                        aria-invalid={showErrors && err.delay ? true : undefined}
                        placeholder="Hours"
                        className="tabular-nums"
                      />
                    ) : (
                      <Select
                        value={String(r.delayHours)}
                        onValueChange={(v) => patch(r.key, { delayHours: v === "custom" ? 0 : Number(v) })}
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
                    <FieldLabel htmlFor={`${r.key}-send`}>Then send</FieldLabel>
                    <Select value={r.templateId} onValueChange={(v) => patch(r.key, { templateId: v })} disabled={disabled || options.length === 0}>
                      <SelectTrigger id={`${r.key}-send`} className="w-full" aria-invalid={showErrors && err.template ? true : undefined}>
                        <SelectValue placeholder={options.length === 0 ? "No other template in this campaign" : "Pick a template"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {options.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            disabled={disabled || rows.length >= FLOW_STEPS_MAX}
            onClick={() => setRows((rs) => [...rs, { key: newKey(), templateId: "", trigger: "no_open", delayHours: 72 }])}
          >
            <PlusIcon data-icon="inline-start" />
            Add step
          </Button>
          <span className="text-sm text-muted-foreground">
            Up to {FLOW_STEPS_MAX} steps. People who reply, unsubscribe or bounce leave the flow.
          </span>
        </div>
      </fieldset>

      <DialogFooter className="items-center">
        {flow && !disabled && (
          <Button
            variant="ghost"
            className="mr-auto text-destructive hover:text-destructive"
            onClick={() => {
              automation.deleteFlow(flow.id);
              toast.success("Follow-up removed", { description: "Emails already queued still go out." });
              onDone();
            }}
          >
            <Trash2Icon data-icon="inline-start" />
            Remove follow-up
          </Button>
        )}
        <Button variant="outline" onClick={onDone}>
          {disabled ? "Close" : "Cancel"}
        </Button>
        {!disabled && <Button onClick={save}>{flow ? "Save follow-up" : "Add follow-up"}</Button>}
      </DialogFooter>
    </div>
  );
}
