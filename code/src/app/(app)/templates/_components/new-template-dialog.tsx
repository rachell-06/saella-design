"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileTextIcon, LayoutTemplateIcon } from "lucide-react";
import { type Campaign, campaignStatus } from "@/app/(app)/campaigns/_components/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TemplateKind } from "./data";

// New template: name, campaign, kind (AC-EC-T-01), then the editor opens on an unsaved draft. The live app
// also offers a starter gallery (StarterPicker, TemplateGalleryPicker); here new templates start from one
// short starter per kind, and Write with AI in the editor covers "start from a prompt".
export function NewTemplateDialog({
  open,
  onOpenChange,
  campaigns,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const usable = campaigns.filter((c) => campaignStatus(c) !== "ended");
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState(usable[0]?.id ?? "");
  const [kind, setKind] = useState<TemplateKind>("letter");
  const [showError, setShowError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !campaignId) return setShowError(true);
    const q = new URLSearchParams({ name: name.trim(), campaign: campaignId, kind });
    router.push(`/templates/draft/edit?${q}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
            <DialogDescription>A template is one email. It sends to the countries and industries of its campaign.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={(showError && !name.trim()) || undefined}>
              <FieldLabel htmlFor="nt-name">Name</FieldLabel>
              <Input
                id="nt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Intro – spring catalog"
                aria-invalid={(showError && !name.trim()) || undefined}
                autoFocus
              />
              {showError && !name.trim() && <FieldError>Give the template a name</FieldError>}
            </Field>
            <Field data-invalid={(showError && !campaignId) || undefined}>
              <FieldLabel htmlFor="nt-campaign">Campaign</FieldLabel>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger id="nt-campaign" className="w-full">
                  <SelectValue placeholder="Pick a campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {usable.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>Ended campaigns aren&apos;t listed: they can&apos;t send any more.</FieldDescription>
              {showError && !campaignId && <FieldError>Pick a campaign</FieldError>}
            </Field>
            <FieldSet>
              <FieldLegend variant="label">Kind</FieldLegend>
              <RadioGroup value={kind} onValueChange={(v) => setKind(v as TemplateKind)} className="grid gap-3 sm:grid-cols-2">
                <KindOption value="letter" title="Letter" description="Reads like a personal email: text, an image, a button." icon={<FileTextIcon />} />
                <KindOption value="design" title="Design" description="A poster: a hero, images and a button, centred." icon={<LayoutTemplateIcon />} />
              </RadioGroup>
            </FieldSet>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Open editor</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KindOption({ value, title, description, icon }: { value: TemplateKind; title: string; description: string; icon: React.ReactNode }) {
  return (
    <FieldLabel htmlFor={`nt-kind-${value}`}>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>
            {icon}
            {title}
          </FieldTitle>
          <FieldDescription>{description}</FieldDescription>
        </FieldContent>
        <RadioGroupItem value={value} id={`nt-kind-${value}`} />
      </Field>
    </FieldLabel>
  );
}
