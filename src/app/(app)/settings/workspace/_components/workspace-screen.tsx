"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlertIcon, FileTextIcon, FileUpIcon, SparklesIcon, TrashIcon, UploadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/mock/constants";
import { MultiSelect } from "@/components/saella/multi-select";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AGENT_INSTRUCTIONS_MAX,
  COMPANY_LIMITS,
  type CompanyProfile,
  DOMAIN_RE,
  DRAFTED_CONTEXT,
  ISIC_SECTIONS,
  ORG,
  WEBSITE_DRAFT,
  initialCompany,
  initialInstructions,
  normaliseDomain,
} from "../../_components/data";
import { SectionHeader } from "../../_components/section-header";
import { useUnsavedGuard } from "../../_components/unsaved-guard";

// Settings → Company: the workspace's profile and the agent's standing instructions on one page (the
// Agent tab merged in). Live app CompanyProfileSection.tsx + AgentSettingsSection.tsx, api/email/company,
// api/email/agent-context/generate; PRD Master MOD-BE-018, AC-AG-I-01, AC-EC-G-06; onboarding "Draft my setup".
// - Name (required, 120), logo, target countries and industries, phone (60), slogan (160), address (200);
//   instructions 4,000, never cut: over the limit the counter turns red and Save locks.
// - "Fill from your website or a file" (PDF, DOCX…) drafts every field but the logo, instructions included. Drafted
//   values go straight into the fields, each changed one marked "Drafted" (no per-field
//   approval). Nothing saves until Save changes; Discard draft restores the pre-draft values.
// - The live app imports a file straight into the instructions; here the file feeds the whole draft.
// - Any member can edit (the API only checks workspace membership). One Save for everything; leaving with unsaved
//   edits asks Save / Discard / Keep editing.
// Preview with ?state= loading | error | save-error | drafting | drafted | draft-error | over-limit | file
type Profile = CompanyProfile & { instructions: string };
type DraftKey = "name" | "countries" | "industries" | "phone" | "slogan" | "address" | "instructions";
const DRAFT_KEYS: DraftKey[] = ["name", "countries", "industries", "phone", "slogan", "address", "instructions"];
type Draft = { before: Profile; filled: DraftKey[]; count: number };

const COUNTRY_OPTIONS = COUNTRIES.map((c) => c.label);
const n = (v: number) => v.toLocaleString("en-US");
const equal = (a: string | string[], b: string | string[]) =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((x) => b.includes(x))
    : typeof a === "string" && typeof b === "string" && a.trim() === b.trim();
const same = (a: Profile, b: Profile) => a.logo === b.logo && DRAFT_KEYS.every((k) => equal(a[k], b[k]));

/** Puts a draft into the form; every field it changes is marked. */
function applyDraft(form: Profile, prev: Draft | null, values: Partial<Record<DraftKey, string | string[]>>) {
  const next: Profile = { ...form };
  const filled = new Set(prev?.filled ?? []);
  let count = 0;
  for (const k of DRAFT_KEYS) {
    const v = values[k];
    if (v === undefined || equal(form[k], v)) continue;
    (next as Record<DraftKey, string | string[]>)[k] = v;
    if (!filled.has(k)) count++;
    filled.add(k);
  }
  const draft: Draft | null = filled.size ? { before: prev?.before ?? form, filled: [...filled], count: (prev?.count ?? 0) + count } : prev;
  return { form: next, draft, count };
}

const START: Profile = { ...initialCompany, instructions: initialInstructions };

export function WorkspaceScreen() {
  const preview = useSearchParams().get("state") ?? "";
  const [loading, setLoading] = useState(preview === "loading");
  const [loadError, setLoadError] = useState(preview === "error");
  const [saved, setSaved] = useState<Profile>(START);
  const [initial] = useState(() => {
    if (preview === "drafted") return applyDraft(START, null, WEBSITE_DRAFT);
    if (preview === "over-limit")
      return { form: { ...START, instructions: `${initialInstructions}\n\n${Array(14).fill(DRAFTED_CONTEXT).join(" ")}` }, draft: null };
    return { form: START, draft: null };
  });
  const [form, setForm] = useState<Profile>(initial.form);
  const [draft, setDraft] = useState<Draft | null>(initial.draft);
  const [url, setUrl] = useState(preview === "draft-error" ? "northwind-ceramics.invalid" : ORG.domain);
  const [urlError, setUrlError] = useState<string | null>(
    preview === "draft-error" ? "Couldn't read that website. Check the address, or fill in by hand." : null
  );
  const [generating, setGenerating] = useState(preview === "drafting");
  const [file, setFile] = useState<string | null>(preview === "file" ? "Northwind company profile.pdf" : null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoFile = useRef<HTMLInputElement>(null);
  const sourceFile = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const dirty = !same(form, saved);
  const over = form.instructions.length - AGENT_INSTRUCTIONS_MAX;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm((f) => ({ ...f, [k]: v }));

  function save(): Promise<boolean> {
    if (!form.name.trim()) {
      setNameError("Enter the company name.");
      nameRef.current?.focus();
      return Promise.resolve(false);
    }
    if (over > 0) return Promise.resolve(false);
    setSaving(true);
    return new Promise((resolve) =>
      setTimeout(() => {
        setSaving(false);
        if (preview === "save-error") {
          toast.error("Couldn't save", { description: "Your edits are still here. Try again." });
          return resolve(false);
        }
        const clean: Profile = {
          ...form,
          name: form.name.trim(),
          phone: form.phone.trim(),
          slogan: form.slogan.trim(),
          address: form.address.trim(),
        };
        setForm(clean);
        setSaved(clean);
        setDraft(null);
        toast.success("Company profile saved");
        resolve(true);
      }, 600)
    );
  }

  function discardAll() {
    setForm(saved);
    setDraft(null);
    setNameError(null);
  }

  useUnsavedGuard({ section: "Company", dirty, save, discard: discardAll });

  function generate() {
    if (file) return draftFrom();
    const host = normaliseDomain(url);
    if (!host) return setUrlError("Enter your website.");
    if (!DOMAIN_RE.test(host)) return setUrlError("That doesn't look like a website. Try yourcompany.com.");
    if (host.endsWith(".invalid")) {
      setGenerating(true);
      setTimeout(() => {
        setGenerating(false);
        setUrlError("Couldn't read that website. Check the address, or fill in by hand.");
      }, 1400);
      return;
    }
    draftFrom();
  }

  function draftFrom() {
    setUrlError(null);
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      const r = applyDraft(form, draft, WEBSITE_DRAFT);
      setForm(r.form);
      setDraft(r.draft);
      if (r.count === 0) toast("Nothing new to draft", { description: "Your details already match it." });
    }, 1400);
  }

  function pickFile(f: File) {
    if (!/\.(pdf|docx?|md|markdown|txt|text)$/i.test(f.name)) return toast.error("Use a PDF, DOCX, MD or TXT file.");
    setFile(f.name);
    setUrlError(null);
  }


  function uploadLogo(f: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) return toast.error("Use a PNG, JPG or WebP image.");
    setUploading(true);
    const src = URL.createObjectURL(f);
    setTimeout(() => {
      set("logo", src);
      setUploading(false);
      toast("Logo uploaded", { description: "Save changes to use it." });
    }, 600);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <span className="sr-only">Loading company profile</span>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-24 w-full max-w-2xl rounded-card" />
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-72 w-full max-w-2xl rounded-card" />
      </div>
    );
  }
  if (loadError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Couldn&apos;t load the company profile</AlertTitle>
        <AlertDescription>Check your connection and try again.</AlertDescription>
        <AlertAction>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoadError(false);
              setLoading(true);
              setTimeout(() => setLoading(false), 700);
            }}
          >
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  const initials =
    form.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  const filled = (k: DraftKey) => Boolean(draft?.filled.includes(k));
  const brandBorder = (k: DraftKey) => (filled(k) ? "border-brand/50" : undefined);
  /** Shimmer instead of the control while the website is read (only drafted fields). */
  const busy = (control: React.ReactNode, h = "h-8") => (generating ? <Skeleton className={cn(h, "w-full")} /> : control);

  return (
    <section className="flex flex-col gap-6" aria-labelledby="company-title">
      <SectionHeader id="company-title" title="Company" description="Signs the emails Saella writes and guides the agent." />

      <form
        noValidate
        className="flex max-w-2xl flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {draft && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-brand/30 bg-primary-subtle px-4 py-2.5 text-sm"
          >
            <SparklesIcon className="size-4 text-brand" aria-hidden />
            <span>
              <span className="font-medium tabular-nums">
                {draft.count} field{draft.count === 1 ? "" : "s"} drafted
              </span>{" "}
              · Review, then save
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setForm(draft.before);
                setDraft(null);
              }}
            >
              Discard draft
            </Button>
          </div>
        )}

        <Field data-invalid={urlError ? true : undefined} className="rounded-card border p-4">
          <FieldLabel htmlFor={file ? undefined : "co-url"}>Fill from your website or a file</FieldLabel>
          <div className="flex gap-2">
            {file ? (
              <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5">
                <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate" title={file}>
                  {file}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="ml-auto text-muted-foreground"
                  aria-label={`Remove ${file}`}
                  disabled={generating}
                  onClick={() => setFile(null)}
                >
                  <XIcon />
                </Button>
              </div>
            ) : (
              <Input
                id="co-url"
                className="flex-1"
                placeholder="yourcompany.com"
                value={url}
                disabled={generating}
                aria-invalid={urlError ? true : undefined}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    generate();
                  }
                }}
              />
            )}
            <Button type="button" variant="ai" onClick={generate} disabled={generating} aria-busy={generating || undefined}>
              {generating ? <Spinner data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}
              {generating ? "Drafting…" : "Generate"}
            </Button>
          </div>
          {urlError && <FieldError>{urlError}</FieldError>}
          <div className="flex items-center">
            {!file && (
              <>
                <input
                  ref={sourceFile}
                  type="file"
                  accept=".pdf,.doc,.docx,.md,.markdown,.txt,.text"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickFile(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2.5"
                  onClick={() => sourceFile.current?.click()}
                  disabled={generating}
                >
                  <FileUpIcon data-icon="inline-start" />
                  Or upload a file
                </Button>
              </>
            )}
          </div>
        </Field>

        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="size-20 rounded-full after:rounded-full">
            {form.logo && <AvatarImage src={form.logo} alt="" className="rounded-full object-cover" />}
            <AvatarFallback className="rounded-full text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <input
              ref={logoFile}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => logoFile.current?.click()}
              disabled={uploading}
              aria-busy={uploading || undefined}
            >
              {uploading ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
              {form.logo ? "Change logo" : "Upload logo"}
            </Button>
            {form.logo && (
              <Button type="button" variant="ghost" onClick={() => set("logo", null)}>
                <TrashIcon data-icon="inline-start" />
                Remove
              </Button>
            )}
            {draft && !form.logo && <span className="text-sm text-muted-foreground">Logos aren&apos;t drafted.</span>}
          </div>
        </div>

        <FieldGroup>
          <Field data-invalid={nameError ? true : undefined}>
            <DraftLabel htmlFor="co-name" drafted={filled("name")}>
              Company name
            </DraftLabel>
            {busy(
              <Input
                id="co-name"
                ref={nameRef}
                value={form.name}
                maxLength={COMPANY_LIMITS.name}
                placeholder="e.g. Northwind Ceramics"
                aria-invalid={nameError ? true : undefined}
                className={brandBorder("name")}
                onChange={(e) => {
                  set("name", e.target.value);
                  setNameError(null);
                }}
                onBlur={() => !form.name.trim() && setNameError("Enter the company name.")}
              />
            )}
            {nameError && <FieldError>{nameError}</FieldError>}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <DraftLabel htmlFor="co-countries" drafted={filled("countries")}>
                Target countries
              </DraftLabel>
              {busy(
                <MultiSelect
                  id="co-countries"
                  options={COUNTRY_OPTIONS}
                  value={form.countries}
                  onChange={(v) => set("countries", v)}
                  placeholder="Your target markets"
                  className={brandBorder("countries")}
                />
              )}
            </Field>
            <Field>
              <DraftLabel htmlFor="co-industries" drafted={filled("industries")}>
                Target industries
              </DraftLabel>
              {busy(
                <MultiSelect
                  id="co-industries"
                  options={ISIC_SECTIONS}
                  value={form.industries}
                  onChange={(v) => set("industries", v)}
                  placeholder="Your industry focus"
                  className={brandBorder("industries")}
                />
              )}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <DraftLabel htmlFor="co-phone" drafted={filled("phone")}>
                Phone (optional)
              </DraftLabel>
              {busy(
                <Input
                  id="co-phone"
                  value={form.phone}
                  maxLength={COMPANY_LIMITS.phone}
                  placeholder="e.g. +84 394 069 371"
                  className={brandBorder("phone")}
                  onChange={(e) => set("phone", e.target.value)}
                />
              )}
            </Field>
            <Field>
              <DraftLabel htmlFor="co-slogan" drafted={filled("slogan")}>
                Slogan (optional)
              </DraftLabel>
              {busy(
                <Input
                  id="co-slogan"
                  value={form.slogan}
                  maxLength={COMPANY_LIMITS.slogan}
                  placeholder="e.g. Tiles that last"
                  className={brandBorder("slogan")}
                  onChange={(e) => set("slogan", e.target.value)}
                />
              )}
            </Field>
          </div>
          <Field>
            <DraftLabel htmlFor="co-address" drafted={filled("address")}>
              Address (optional)
            </DraftLabel>
            {busy(
              <Input
                id="co-address"
                value={form.address}
                maxLength={COMPANY_LIMITS.address}
                placeholder="Street, district, city, country"
                className={brandBorder("address")}
                onChange={(e) => set("address", e.target.value)}
              />
            )}
          </Field>
          {/* No data-invalid on the Field: it would turn the whole text red. The red border and counter carry it. */}
          <Field>
            <DraftLabel htmlFor="co-instructions" drafted={filled("instructions")}>
              Instructions for the agent
            </DraftLabel>
            {busy(
              <Textarea
                id="co-instructions"
                value={form.instructions}
                onChange={(e) => set("instructions", e.target.value)}
                aria-invalid={over > 0 ? true : undefined}
                aria-describedby="co-count"
                placeholder="What you sell, your tone, and anything the agent must never say."
                className={cn("max-h-96 min-h-40", brandBorder("instructions"))}
              />,
              "h-40"
            )}
            <div id="co-count" className="flex justify-between gap-4 text-sm">
              {over > 0 ? <FieldError>Too long to save. Nothing was cut; trim what you don&apos;t need.</FieldError> : <span />}
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  over > 0 ? "font-medium text-destructive-soft-foreground" : "text-muted-foreground"
                )}
              >
                {n(form.instructions.length)} / {n(AGENT_INSTRUCTIONS_MAX)}
                {over > 0 && ` (${n(over)} over)`}
              </span>
            </div>
          </Field>
        </FieldGroup>

        <div className="flex justify-end gap-2">
          {dirty && (
            <Button type="button" variant="outline" onClick={discardAll} disabled={saving}>
              Discard
            </Button>
          )}
          <Button type="submit" disabled={!dirty || over > 0 || saving || generating} aria-busy={saving || undefined}>
            {saving && <Spinner data-icon="inline-start" />}
            Save changes
          </Button>
        </div>
      </form>
    </section>
  );
}

function DraftLabel({ htmlFor, drafted, children }: { htmlFor: string; drafted: boolean; children: React.ReactNode }) {
  return (
    <FieldLabel htmlFor={htmlFor}>
      {children}
      {drafted && (
        <Badge variant="brand">
          <SparklesIcon data-icon="inline-start" />
          Drafted
        </Badge>
      )}
    </FieldLabel>
  );
}
