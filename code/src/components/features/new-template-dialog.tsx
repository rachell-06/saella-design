"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, PenLineIcon, PaletteIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { DesignGallery } from "@/components/features/design-gallery";
import { NewCampaignDialog } from "@/components/features/new-campaign-dialog";
import { addCampaign, useCampaignStore } from "@/lib/mock/created-campaigns";
import { applyCampaignStore, isArchived } from "@/lib/mock/campaign-store";
import { type Campaign, campaignStatus } from "@/lib/mock/campaigns";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type DesignStart, type TemplateKind, untitledName } from "@/lib/mock/templates";

// New template: campaign, kind (AC-EC-T-01) and, for a Design, how it starts; then the editor opens on an unsaved
// draft (nothing is created until the first Save). Live app: "Add template" opens TemplateGalleryPicker (Letter, or
// Poster → Blank / four prebuilt posters), creates an "Untitled template" at once and opens the editor; the name is
// set there. Here the name is optional too: left empty, the template is "Untitled …" until Write with Saella or the
// user names it. A Letter starts from the live app's outreach example (starterBlocks).
// "+ New campaign" at the end of the campaign list opens the create-campaign form on top (a template always belongs
// to a campaign, PRD-02), then picks the new one. `returnTo` (e.g. New batch): the editor goes back there after the
// first save, with `template=<new id>` added.
const NEW_CAMPAIGN = "__new-campaign";

export function NewTemplateDialog({
  open,
  onOpenChange,
  campaigns,
  defaultCampaignId,
  returnTo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaigns: Campaign[];
  /** Pre-picks the campaign, e.g. when opened from a campaign card's "Add template". */
  defaultCampaignId?: string;
  /** Page to go back to after the template is first saved (gets `template=<id>`). */
  returnTo?: string;
}) {
  const router = useRouter();
  // Campaigns made this session too, newest first, so one made a moment ago can be picked.
  // Ended and archived campaigns take no new templates (live new-template-dialog: !is_archived && !campaignEnded).
  const campaignState = useCampaignStore();
  const usable = applyCampaignStore(campaigns, campaignState).filter(
    (c) => campaignStatus(c) !== "ended" && !isArchived(c.id, campaignState)
  );
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState(
    usable.some((c) => c.id === defaultCampaignId) ? (defaultCampaignId as string) : (usable[0]?.id ?? "")
  );
  const [kind, setKind] = useState<TemplateKind>("letter");
  const [start, setStart] = useState<DesignStart>("blank");
  const [showError, setShowError] = useState(false);
  // Design goes through a gallery step, as in New campaign: the form's main button reads "Choose design", the
  // gallery's "Open editor"; Back keeps the form.
  const [step, setStep] = useState<"form" | "gallery">("form");

  function changeOpen(o: boolean) {
    onOpenChange(o);
    if (!o) setStep("form");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignId) {
      setStep("form");
      return setShowError(true);
    }
    if (kind === "design" && step === "form") return setStep("gallery");
    const q = new URLSearchParams({ campaign: campaignId, kind });
    if (name.trim()) q.set("name", name.trim());
    if (kind === "design") q.set("start", start);
    if (returnTo) q.set("return", returnTo);
    // Closed before leaving: Next may keep this page's state for when the user comes back.
    changeOpen(false);
    router.push(`/templates/draft/edit?${q}`);
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className={step === "gallery" ? "sm:max-w-5xl" : "sm:max-w-xl"}>
        <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
          <DialogHeader>
            {step === "gallery" && (
              <Button type="button" variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => setStep("form")}>
                <ArrowLeftIcon data-icon="inline-start" />
                Back
              </Button>
            )}
            <DialogTitle>New template</DialogTitle>
            {/* No visible line on the form: the fields say it (PATTERNS.md §9.15); readers still get one. */}
            <DialogDescription className={step === "gallery" ? undefined : "sr-only"}>
              {step === "gallery" ? "Pick a design to start from." : "Name it, pick its campaign and kind."}
            </DialogDescription>
          </DialogHeader>
          {step === "gallery" ? (
            <DesignGallery value={start} onChange={setStart} idPrefix="nt-design" />
          ) : (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nt-name">Name (optional)</FieldLabel>
              <Input
                id="nt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={untitledName(kind, start)}
                autoFocus
              />
            </Field>
            <Field data-invalid={(showError && !campaignId) || undefined}>
              <FieldLabel htmlFor="nt-campaign">Campaign</FieldLabel>
              <Select value={campaignId} onValueChange={(v) => (v === NEW_CAMPAIGN ? setCreatingCampaign(true) : setCampaignId(v))}>
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
                  {usable.length > 0 && <SelectSeparator />}
                  <SelectItem value={NEW_CAMPAIGN}>
                    <PlusIcon />
                    New campaign
                  </SelectItem>
                </SelectContent>
              </Select>
              {showError && !campaignId && <FieldError>Pick a campaign</FieldError>}
            </Field>
            <FieldSet>
              <FieldLegend variant="label">Kind</FieldLegend>
              <RadioGroup value={kind} onValueChange={(v) => setKind(v as TemplateKind)} className="grid gap-3 sm:grid-cols-2">
                <KindOption value="letter" title="Letter" description="Reads like a personal email: text, an image, a button." icon={<PenLineIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />} />
                <KindOption value="design" title="Design" description="A poster: a hero, images and a button, centred." icon={<PaletteIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />} />
              </RadioGroup>
            </FieldSet>
          </FieldGroup>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">
              {kind === "design" && step === "form" ? (
                <>
                  Choose design
                  <ArrowRightIcon data-icon="inline-end" />
                </>
              ) : (
                "Open editor"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <NewCampaignDialog
        // Already making a template here: no "Start with a template".
        offerStarter={false}
        open={creatingCampaign}
        onOpenChange={setCreatingCampaign}
        onCreate={(c) => {
          setCampaignId(addCampaign(c));
          setCreatingCampaign(false);
          toast.success(`Created “${c.name}”`);
        }}
      />
    </Dialog>
  );
}

function KindOption({ value, title, description, icon }: { value: TemplateKind; title: string; description: string; icon: React.ReactNode }) {
  return (
    <FieldLabel htmlFor={`nt-kind-${value}`} className="has-data-checked:ring-1 has-data-checked:ring-primary">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>
            {icon}
            {title}
          </FieldTitle>
          <FieldDescription>{description}</FieldDescription>
        </FieldContent>
        {/* No visible dot: the card's orange border shows the pick; the radio stays for keys and readers. */}
        <RadioGroupItem value={value} id={`nt-kind-${value}`} className="sr-only" />
      </Field>
    </FieldLabel>
  );
}
