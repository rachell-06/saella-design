"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  GlobeIcon,
  ImageUpIcon,
  MailIcon,
  SearchIcon,
  SparklesIcon,
  TrashIcon,
} from "lucide-react";
import { INDUSTRIES } from "@/lib/mock/campaigns";
import { COUNTRIES } from "@/lib/mock/constants";
import type { Locale } from "@/components/saella/language-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { AccountStatePanel } from "../../_components/account-state";
import { AuthFrame } from "../../_components/auth-frame";
import { CHARACTER_SVG } from "./character-svg";

// First-run wizard (PRD Onboarding, read 2026-10-28; live app components/onboarding/OnboardingFlow.tsx).
// - Welcome and language are one screen, with an optional website so Saella drafts the setup (AC-ORG-W-01).
//   Website drafting is skipped when the email domain is already claimed: that user goes to request-to-join
//   instead (AC-ORG-W-05, US-ONB-N1).
// - Three steps: workspace name (only required field, trimmed, max 120; becomes the email from-name), logo
//   (optional; png/jpeg/gif/webp up to 5 MB), targeting (countries SG/VN/MY/ID/PH + searchable industries stored
//   as ISIC sections) (AC-ONB-W-01, AC-ONB-W-03, BR-RULE-ONB-02).
// - No skip control and no bypass (AC-ONB-G-03, BR-ONB-05): only the logo step can be passed empty.
// - Back keeps what was typed; switching language mid-setup keeps progress (AC-LNG-S-02).
// - A failed save keeps the user on the last step with a clear error; nothing is half-saved (AC-ONB-W-04).
// - The sending domain and a default sender were pre-provisioned at sign-up from the address (BR-ONB-02,
//   AC-ONB-P-01/03); the done screen says so and names the three checklist steps the Overview tracks
//   (domain verified, sender confirmed, first batch sent: BR-ONB-03, AC-ONB-C-01). Finish -> /overview?tour=1
//   (AC-ONB-W-02).
// - The chibi character appears here only (CLAUDE.md, DESIGN.md): wave while setting up, cheer when done.
// Preview with ?state= name | logo | targeting | done | drafting | save-error | claimed
type Step = 0 | 1 | 2 | 3 | 4;

// Fictional new sign-up (not a real customer).
const SIGNUP = { email: "hoa@kestrel-logistics.vn", domain: "kestrel-logistics.vn" };
// Friendly names; the live app maps them to ISIC section letters on save (BR-RULE-ONB-03).
const ALL_INDUSTRIES = [
  ...INDUSTRIES,
  "Agriculture, forestry and fishing",
  "Information and communication",
  "Financial and insurance",
  "Education",
  "Human health and social work",
  "Arts, entertainment and recreation",
  "Electricity and gas supply",
  "Mining and quarrying",
];
const NAME_MAX = 120;
const LOGO_MAX_MB = 5;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const STEPS = ["Workspace name", "Logo", "Who you sell to"];

const STEP_FROM_STATE: Record<string, Step> = { name: 1, logo: 2, targeting: 3, "save-error": 3, done: 4 };

export function OnboardingWizard() {
  const params = useSearchParams();
  const preview = params.get("state") ?? "";
  const filled = preview in STEP_FROM_STATE;

  const [locale, setLocale] = useState<Locale>("en");
  const [step, setStep] = useState<Step>(STEP_FROM_STATE[preview] ?? 0);
  const [website, setWebsite] = useState(preview === "drafting" ? "kestrel-logistics.vn" : "");
  const [drafting, setDrafting] = useState(preview === "drafting");
  const [draftNote, setDraftNote] = useState<"ready" | null>(null);
  const [name, setName] = useState(filled ? "Kestrel Logistics" : "");
  const [about, setAbout] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [logo, setLogo] = useState<{ url: string; name: string } | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>(filled ? ["VN", "SG"] : []);
  const [industries, setIndustries] = useState<string[]>(filled ? ["Transportation and storage"] : []);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const failOnce = useRef(preview === "save-error");

  const trimmed = name.trim();
  const nameError = !trimmed ? "Enter a workspace name" : trimmed.length > NAME_MAX ? `Keep it to ${NAME_MAX} characters` : null;

  // Preview: show the website reader working, then the draft.
  useEffect(() => {
    if (!drafting) return;
    const t = setTimeout(() => {
      setDrafting(false);
      setName("Kestrel Logistics");
      setAbout("Cold-chain trucking and warehousing for food and pharma importers in southern Vietnam.");
      setCountries(["VN", "SG"]);
      setIndustries(["Transportation and storage", "Wholesale and retail trade"]);
      setDraftNote("ready");
    }, preview === "drafting" ? 60000 : 1400);
    return () => clearTimeout(t);
  }, [drafting, preview]);

  useEffect(() => () => {
    if (logo) URL.revokeObjectURL(logo.url);
  }, [logo]);

  function draft() {
    setDraftNote(null);
    setDrafting(true);
  }

  function pickLogo(file: File | undefined) {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return setLogoError("Use a PNG, JPG, GIF or WebP image.");
    if (file.size > LOGO_MAX_MB * 1024 * 1024) return setLogoError(`That file is over ${LOGO_MAX_MB} MB. Pick a smaller one.`);
    setLogoError(null);
    setLogo({ url: URL.createObjectURL(file), name: file.name });
  }

  function finish() {
    setSaving(true);
    setSaveFailed(false);
    setTimeout(() => {
      setSaving(false);
      if (failOnce.current) {
        failOnce.current = false;
        return setSaveFailed(true);
      }
      setStep(4);
    }, 900);
  }

  if (preview === "claimed") {
    return (
      <AuthFrame locale={locale} onLocaleChange={setLocale}>
        <AccountStatePanel initial="claimed" />
      </AuthFrame>
    );
  }

  const next = () => {
    if (step === 1 && nameError) return setNameTouched(true);
    if (step === 3) return finish();
    setStep((s) => (s + 1) as Step);
  };

  return (
    <AuthFrame locale={locale} onLocaleChange={setLocale}>
      <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-2">
        {/* Left: the character and where you are. */}
        <aside className="hidden flex-col items-center justify-center gap-8 rounded-card bg-cream p-10 lg:flex">
          <div
            className="h-64 w-48 text-foreground"
            // Static art from our own repo (character-svg.ts), not user input.
            dangerouslySetInnerHTML={{ __html: CHARACTER_SVG[step === 4 ? "cheer" : "wave"] }}
          />
          <ol className="flex w-full max-w-60 flex-col gap-3" aria-label="Setup steps">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const current = step === n;
              return (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-2.5 text-sm",
                    current ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                  aria-current={current ? "step" : undefined}
                >
                  {done ? (
                    <CircleCheckIcon className="size-4 text-success-soft-foreground" aria-hidden />
                  ) : (
                    <CircleDashedIcon className={cn("size-4", current && "text-brand")} aria-hidden />
                  )}
                  {label}
                  {done && <span className="sr-only">(done)</span>}
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Right: the step. */}
        <section className="flex min-h-128 flex-col justify-center gap-6">
          {step >= 1 && step <= 3 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground tabular-nums">
                Step {step} of {STEPS.length}
              </span>
              <Progress value={(step / STEPS.length) * 100} aria-label={`Step ${step} of ${STEPS.length}`} />
            </div>
          )}

          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="font-heading text-2xl font-medium tracking-title">Welcome to Saella</h1>
                <p className="text-muted-foreground">
                  Let&apos;s set up your email workspace. It takes about a minute. Create campaigns, send, follow up
                  and track replies, with the agent along the way.
                </p>
              </div>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="onb-site">Have a website? (optional)</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <GlobeIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="onb-site"
                      placeholder="e.g. yourcompany.com"
                      value={website}
                      onChange={(e) => {
                        setWebsite(e.target.value);
                        setDraftNote(null);
                      }}
                      disabled={drafting}
                    />
                  </InputGroup>
                  <FieldDescription>
                    Saella drafts your name, logo, markets, industries and business context. You review every step
                    before anything is saved.
                  </FieldDescription>
                </Field>
                {draftNote === "ready" && (
                  <Alert variant="success">
                    <CircleCheckIcon />
                    <AlertTitle>Draft ready</AlertTitle>
                    <AlertDescription>Review each step. Nothing is saved yet.</AlertDescription>
                  </Alert>
                )}
              </FieldGroup>
              {/* One action (one solid orange button per page): with a website it drafts first, then continues to
                  review; without one it starts the steps empty. Language is the picker in the header. */}
              <div>
                <Button
                  size="lg"
                  onClick={() => (website.trim() && draftNote !== "ready" ? draft() : setStep(1))}
                  disabled={drafting}
                  aria-busy={drafting || undefined}
                >
                  {drafting ? (
                    <Spinner data-icon="inline-start" />
                  ) : website.trim() && draftNote !== "ready" ? (
                    <SparklesIcon data-icon="inline-start" />
                  ) : null}
                  {drafting
                    ? "Reading your website…"
                    : draftNote === "ready"
                      ? "Review the draft"
                      : website.trim()
                        ? "Draft my setup"
                        : "Get started"}
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <StepBody title="What should we call your workspace?" sub="Usually your company or team name. It becomes the “from” name on every email you send; you can change it later in Settings.">
              <FieldGroup>
                <Field data-invalid={(nameTouched && nameError) ? true : undefined}>
                  <FieldLabel htmlFor="onb-name">Workspace name</FieldLabel>
                  <Input
                    id="onb-name"
                    placeholder="e.g. Kestrel Logistics"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setNameTouched(true)}
                    aria-invalid={(nameTouched && nameError) ? true : undefined}
                    autoFocus
                  />
                  {nameTouched && nameError ? (
                    <FieldError>{nameError}</FieldError>
                  ) : (
                    trimmed.length > NAME_MAX - 20 && (
                      <FieldDescription className="tabular-nums">
                        {trimmed.length}/{NAME_MAX}
                      </FieldDescription>
                    )
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="onb-about">About your company (optional)</FieldLabel>
                  <Textarea
                    id="onb-about"
                    placeholder="What you sell, to whom, and what makes you different."
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    className="min-h-20"
                  />
                  <FieldDescription>The agent uses this when it writes emails for you.</FieldDescription>
                </Field>
              </FieldGroup>
            </StepBody>
          )}

          {step === 2 && (
            <StepBody title="Add your logo" sub="Shows in your workspace and on designed emails. You can add it later.">
              <Field data-invalid={logoError ? true : undefined}>
                <FieldLabel htmlFor="onb-logo" className="sr-only">
                  Logo
                </FieldLabel>
                <div className="flex items-center gap-4">
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-card border bg-muted text-muted-foreground">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local preview from an object URL
                      <img src={logo.url} alt="Logo preview" className="size-full object-contain" />
                    ) : (
                      <ImageUpIcon className="size-6" aria-hidden />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <label htmlFor="onb-logo" className="cursor-pointer">
                        <ImageUpIcon data-icon="inline-start" />
                        {logo ? "Change logo" : "Upload logo"}
                      </label>
                    </Button>
                    {logo && (
                      <Button variant="ghost" onClick={() => setLogo(null)}>
                        <TrashIcon data-icon="inline-start" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    id="onb-logo"
                    type="file"
                    accept={LOGO_TYPES.join(",")}
                    className="sr-only"
                    onChange={(e) => {
                      pickLogo(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
                {logoError ? (
                  <FieldError>{logoError}</FieldError>
                ) : (
                  <FieldDescription>PNG, JPG, GIF or WebP, up to {LOGO_MAX_MB} MB.</FieldDescription>
                )}
              </Field>
            </StepBody>
          )}

          {step === 3 && (
            <StepBody title="Who do you sell to?" sub="Pick your target markets and industries. They seed the audience of every new campaign.">
              <FieldGroup>
                <FieldSet>
                  <FieldLegend variant="label">Countries</FieldLegend>
                  <ToggleGroup
                    type="multiple"
                    variant="outline"
                    value={countries}
                    onValueChange={setCountries}
                    aria-label="Countries"
                    className="flex-wrap"
                  >
                    {COUNTRIES.map((c) => (
                      <ToggleGroupItem key={c.code} value={c.code} className="px-3">
                        {c.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FieldSet>
                <IndustryPicker value={industries} onChange={setIndustries} />
                {saveFailed && (
                  <Alert variant="destructive">
                    <CircleAlertIcon />
                    <AlertTitle>Couldn&apos;t save your setup</AlertTitle>
                    <AlertDescription>Nothing was saved. Check your connection and press Finish again.</AlertDescription>
                  </Alert>
                )}
              </FieldGroup>
            </StepBody>
          )}

          {step >= 1 && step <= 3 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="lg" onClick={() => setStep((s) => (s - 1) as Step)} disabled={saving}>
                <ArrowLeftIcon data-icon="inline-start" />
                Back
              </Button>
              <Button size="lg" onClick={next} disabled={saving} aria-busy={saving || undefined}>
                {saving && <Spinner data-icon="inline-start" />}
                {step === 3 ? "Finish" : "Continue"}
              </Button>
            </div>
          )}

          {step === 4 && <DoneStep name={trimmed || "Your workspace"} />}
        </section>
      </div>
    </AuthFrame>
  );
}

function StepBody({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-title">{title}</h1>
        <p className="text-muted-foreground">{sub}</p>
      </div>
      {children}
    </div>
  );
}

// Searchable industry picks (AC-ONB-W-03): selected first, then matches for the query.
function IndustryPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = ALL_INDUSTRIES.filter((i) => value.includes(i) || !q || i.toLowerCase().includes(q));
  const ordered = [...shown.filter((i) => value.includes(i)), ...shown.filter((i) => !value.includes(i))];
  return (
    <FieldSet>
      <FieldLegend variant="label">Industries</FieldLegend>
      <InputGroup className="max-w-sm">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label="Search industries"
          placeholder="Search industries…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </InputGroup>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Industries">
        {ordered.map((i) => (
          <Toggle
            key={i}
            variant="outline"
            pressed={value.includes(i)}
            onPressedChange={(on) => onChange(on ? [...value, i] : value.filter((x) => x !== i))}
          >
            {i}
          </Toggle>
        ))}
        {ordered.length === value.length && q && (
          <p className="text-sm text-muted-foreground">No other industry matches “{query}”.</p>
        )}
      </div>
    </FieldSet>
  );
}

function DoneStep({ name }: { name: string }) {
  const items = [
    { icon: CircleCheckIcon, done: true, title: name, body: "Your workspace, and the “from” name on your emails." },
    {
      icon: GlobeIcon,
      done: false,
      title: SIGNUP.domain,
      body: "Sending domain, added for you. Add its DNS records to verify it.",
    },
    {
      icon: MailIcon,
      done: false,
      title: SIGNUP.email,
      body: "Default sender. We sent a confirmation link to this inbox.",
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-title">You&apos;re all set</h1>
        <p className="text-muted-foreground">Here&apos;s what Saella prepared from your sign-up.</p>
      </div>
      <ul className="flex flex-col divide-y rounded-card border">
        {items.map((it) => (
          <li key={it.title} className="flex items-start gap-3 px-4 py-3">
            <it.icon
              className={cn("mt-0.5 size-4 shrink-0", it.done ? "text-success-soft-foreground" : "text-muted-foreground")}
              aria-hidden
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{it.title}</span>
              <span className="text-sm text-muted-foreground">{it.body}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">
        The Overview walks you through three steps: verify the domain, confirm the sender, then create a campaign and
        send your first batch. The agent can draft the first campaign for you.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" asChild>
          <Link href="/overview?tour=1">Go to Overview</Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/settings/sending">Set up sending</Link>
        </Button>
      </div>
    </div>
  );
}
