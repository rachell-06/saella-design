"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, ImageIcon, PaperclipIcon, SparklesIcon, VideoIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SaellaMini } from "@/components/saella/saella-mini";
import { cn } from "@/lib/utils";
import { IMAGE_MODELS, SOCIAL_NETWORKS, type SocialAccount, type SocialNetwork } from "@/lib/mock/social";
import { mockDraft, TONES, type Tone } from "./draft";
import { brand, NETWORK_RULES, textLength, UPLOAD_TYPES } from "./rules";
import { NetworkIcon } from "./network-icon";

// Agent-led start of a new post (designer request 2026-11-13, a trial): the user says what they want to post, the
// agent (mocked here, deterministic) suggests the connected accounts that fit, with a reason each, and flags those
// that don't. It only suggests: the user picks, and publishing still needs the user's own click on the Send step.

export type GoalMedia = {
  kind: "image" | "video";
  name: string;
  preview: string;
  width?: number;
  height?: number;
  durationS?: number;
};
export type GoalResult = {
  accountIds: number[];
  /** What Saella writes from: the collection brief plus this post's goal. */
  brief: string;
  media: GoalMedia | null;
  tone: Tone;
  image: boolean;
  imageModel: string;
};

const EXAMPLES = ["Promo video for our autumn range", "Photo post: new mugs in stock", "We're hiring a studio potter"];

/** What the post carries: the attached file wins, else what the words say. */
function kindOf(goal: string, media: GoalMedia | null): "video" | "image" | "text" {
  if (media) return media.kind;
  if (/\b(video|reel|clip|film)\b/i.test(goal)) return "video";
  if (/\b(photo|image|picture|pic|carousel)\b/i.test(goal)) return "image";
  return "text";
}

/** Why a network suits this goal, in one line. B2B words tilt LinkedIn and Facebook. */
function reasonFor(n: SocialNetwork, goal: string, kind: "video" | "image" | "text") {
  const b2b = /\b(hiring|hire|job|b2b|partner|wholesale|caf[eé]s?|hotel)/i.test(goal);
  const r: Record<SocialNetwork, string> = {
    facebook: b2b ? "Local businesses and your page followers" : "Your page followers and local buyers",
    instagram: kind === "video" ? "Reels reach people who don't follow you yet" : "Product photos do well in the feed",
    threads: "Short text that starts a conversation",
    linkedin: b2b ? "B2B decision makers and job seekers" : "B2B buyers: cafés, hotels, shops",
    tiktok: "Short vertical video reaches new buyers",
    youtube: "Video people search for later",
    pinterest: "Shoppers saving product ideas",
    douyin: "Short video for buyers in China",
  };
  return r[n];
}

/** Why a network doesn't suit this post, from its format rules (rules.ts). Null = it fits. */
function misfit(n: SocialNetwork, kind: "video" | "image" | "text") {
  const r = NETWORK_RULES[n];
  if (kind === "video" && !r.video) return `${brand(n)} doesn't take videos yet`;
  if (kind === "image" && r.videoOnly) return `${brand(n)} takes video only`;
  if (kind === "text" && !r.textOnly)
    return r.videoOnly ? `${brand(n)} needs a video` : `${brand(n)} needs a photo or video`;
  return null;
}

const usable = (a: SocialAccount) => a.status === "active" && a.login.status === "active" && a.canPublish;

type Row = { a: SocialAccount; reason: string; fit: boolean };

function suggest(accounts: SocialAccount[], goal: string, media: GoalMedia | null) {
  const kind = kindOf(goal, media);
  const order = (a: SocialAccount) => SOCIAL_NETWORKS.indexOf(a.network);
  const rows: Row[] = accounts
    .filter(usable)
    .sort((x, y) => order(x) - order(y))
    .map((a) => {
      const why = misfit(a.network, kind);
      return { a, fit: !why, reason: why ?? reasonFor(a.network, goal, kind) };
    });
  const blocked = accounts
    .filter((a) => !usable(a))
    .map((a) => ({
      a,
      reason: a.login.status !== "active" || a.status === "lost" ? "Sign-in expired" : "Paused in settings",
    }));
  return { kind, fit: rows.filter((r) => r.fit), left: rows.filter((r) => !r.fit), blocked };
}

export function GoalStep({
  accounts,
  brief,
  initialGoal,
  onContinue,
  onManual,
}: {
  accounts: SocialAccount[];
  /** The collection's brief: product details the drafts are written from. */
  brief: string;
  /** ?goal=… (preview links): fills the box and asks right away. */
  initialGoal?: string;
  onContinue: (r: GoalResult) => void;
  onManual: () => void;
}) {
  const [goal, setGoal] = useState(initialGoal ?? "");
  const [media, setMedia] = useState<GoalMedia | null>(null);
  const [phase, setPhase] = useState<"ask" | "thinking" | "done">(initialGoal?.trim() ? "thinking" : "ask");
  const [result, setResult] = useState<ReturnType<typeof suggest> | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [tone, setTone] = useState<Tone>("professional");
  const [image, setImage] = useState(false);
  const [imageModel, setImageModel] = useState<string>(IMAGE_MODELS[0].id);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function ask(text = goal) {
    if (!text.trim()) return;
    setPhase("thinking");
    answer(text);
  }
  // The mock agent "thinks" for 1.5 s, then answers from the goal, the file and the network rules.
  function answer(text: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = suggest(accounts, text, media);
      setResult(r);
      setPicked(new Set(r.fit.map((x) => x.a.id)));
      setPhase("done");
    }, 1500);
  }
  useEffect(() => {
    if (initialGoal?.trim()) answer(initialGoal);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, for a preview link
  }, []);

  function attach(file: File) {
    const spec = UPLOAD_TYPES[file.type];
    if (!spec) return;
    const preview = URL.createObjectURL(file);
    const m: GoalMedia = { kind: spec.kind, name: file.name, preview };
    setMedia(m);
    if (spec.kind === "image") {
      const img = new window.Image();
      img.onload = () =>
        setMedia((x) => (x?.preview === preview ? { ...x, width: img.naturalWidth, height: img.naturalHeight } : x));
      img.src = preview;
    } else {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () =>
        setMedia((x) =>
          x?.preview === preview
            ? { ...x, width: v.videoWidth, height: v.videoHeight, durationS: Math.round(v.duration) }
            : x
        );
      v.src = preview;
    }
  }

  const toggle = (id: number, on: boolean) =>
    setPicked((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  const kindWord = result ? { video: "a video", image: "a photo post", text: "a text post" }[result.kind] : "";
  // Drafts follow the ticked accounts and the tone live: one per network, as each network gets it.
  const source = brief.trim()
    ? `${brief.trim()}

This post: ${goal.trim()}`
    : goal.trim();
  const draftNets = SOCIAL_NETWORKS.filter((n) => accounts.some((a) => a.network === n && picked.has(a.id)));
  const model = IMAGE_MODELS.find((m) => m.id === imageModel) ?? IMAGE_MODELS[0];

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {/* The ask */}
      <section aria-labelledby="goal-title" className="flex flex-col gap-4 rounded-card border p-6">
        <h2 id="goal-title" className="flex items-center gap-2.5 font-heading text-lg font-medium tracking-title">
          <SaellaMini size={28} label="Saella agent" />
          What do you want to post?
        </h2>
        <div className="flex flex-col rounded-lg border bg-card focus-within:ring-2 focus-within:ring-ring">
          <Textarea
            aria-labelledby="goal-title"
            value={goal}
            placeholder="e.g. A promo video for our autumn range, for cafés and home cooks"
            className="min-h-24 resize-none border-0 focus-visible:ring-0"
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
            }}
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-2">
            {media ? (
              <span className="flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 text-sm">
                {media.kind === "video" ? (
                  <VideoIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <ImageIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="truncate" title={media.name}>
                  {media.name}
                </span>
                <Button variant="ghost" size="icon-xs" aria-label="Remove file" onClick={() => setMedia(null)}>
                  <XIcon />
                </Button>
              </span>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <PaperclipIcon data-icon="inline-start" />
                Attach photo or video
              </Button>
            )}
            <Button variant="ai" size="sm" disabled={!goal.trim() || phase === "thinking"} onClick={() => ask()}>
              <SparklesIcon data-icon="inline-start" />
              {phase === "done" ? "Ask again" : "Ask Saella"}
            </Button>
          </div>
          {/* Hidden file input opened by "Attach photo or video" (DESIGN.md §2 Control exception). */}
          <input
            ref={fileRef}
            type="file"
            hidden
            accept={Object.keys(UPLOAD_TYPES).join(",")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) attach(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={tone}
            onValueChange={(v) => v && setTone(v as Tone)}
            aria-label="Tone"
          >
            {TONES.map((t) => (
              <ToggleGroupItem key={t.value} value={t.value}>
                {t.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Label className="gap-2.5 font-normal">
            <Switch checked={image} onCheckedChange={setImage} />
            Include an image
          </Label>
          {image && (
            <Select value={imageModel} onValueChange={setImageModel}>
              <SelectTrigger size="sm" aria-label="Image model" className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {IMAGE_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                      <span className="text-muted-foreground">
                        {m.speed === "fast" ? "fast" : "up to 2 min"} · {m.credits}{" "}
                        {m.credits === 1 ? "credit" : "credits"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
        {phase === "ask" && (
          <div className="flex flex-wrap items-center gap-2">
            {EXAMPLES.map((x) => (
              <Button
                key={x}
                variant="outline"
                size="sm"
                className="rounded-full font-normal"
                onClick={() => setGoal(x)}
              >
                {x}
              </Button>
            ))}
          </div>
        )}
        <Button variant="link" className="h-auto self-start border-0 p-0" onClick={onManual}>
          Pick networks myself
        </Button>
      </section>

      {/* The agent's answer */}
      {phase === "thinking" && (
        <section
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-card border p-4 text-sm text-muted-foreground"
        >
          <SaellaMini size={28} state="thinking" />
          Picking networks and writing drafts…
        </section>
      )}
      {phase === "done" && result && (
        <section aria-labelledby="goal-answer" className="flex flex-col gap-4 rounded-card border p-6">
          <div className="flex items-start gap-3">
            <SaellaMini size={28} />
            <p id="goal-answer" className="pt-1 text-sm">
              {result.fit.length
                ? `For ${kindWord}, these ${result.fit.length === 1 ? "account fits" : "accounts fit"} best.`
                : `None of your accounts takes ${kindWord}. Pick some below, or change the post.`}
              {result.kind !== "text" && !media && (
                <span className="text-muted-foreground"> Add the file in the next step.</span>
              )}
            </p>
          </div>

          <ul aria-label="Suggested accounts" className="flex flex-col divide-y rounded-lg border">
            {[...result.fit, ...result.left].map((r) => (
              <li key={r.a.id}>
                <Label className={cn("gap-3 px-3 py-2.5 font-normal", !r.fit && "text-muted-foreground")}>
                  <NetworkIcon network={r.a.network} size={22} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-snug">
                    <span className={cn("truncate font-medium", r.fit && "text-foreground")}>
                      {r.a.name} <span className="font-normal text-muted-foreground">· {brand(r.a.network)}</span>
                    </span>
                    <span className={cn("truncate", r.fit ? "text-muted-foreground" : "text-warning-soft-foreground")}>
                      {r.reason}
                    </span>
                  </span>
                  <Checkbox checked={picked.has(r.a.id)} onCheckedChange={(v) => toggle(r.a.id, v === true)} />
                </Label>
              </li>
            ))}
            {result.blocked.map(({ a, reason }) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground">
                <NetworkIcon network={a.network} size={22} className="opacity-60" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">
                    {a.name} <span className="font-normal">· {brand(a.network)}</span>
                  </span>
                  <span className="truncate">{reason}</span>
                </span>
                <Button variant="link" className="h-auto border-0 p-0" asChild>
                  <Link
                    href={
                      a.login.status !== "active" || a.status === "lost"
                        ? "/social/accounts"
                        : `/social/accounts?config=${a.network}`
                    }
                  >
                    {a.login.status !== "active" || a.status === "lost" ? "Reconnect" : "Settings"}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-muted-foreground [&[data-state=open]>svg]:rotate-90"
              >
                <ChevronRightIcon data-icon="inline-start" className="transition-transform duration-150" />
                Why these?
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="ml-6 list-disc pt-1 text-sm text-muted-foreground">
                <li>What you said: {kindWord}</li>
                <li>What each network accepts</li>
                <li>Only accounts that can post now</li>
              </ul>
            </CollapsibleContent>
          </Collapsible>

          {draftNets.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Drafts</h3>
              <ul aria-label="Drafts" className="flex flex-col divide-y rounded-lg border">
                {draftNets.map((n) => {
                  const text = mockDraft(source, tone, [n]);
                  const len = textLength(text);
                  const max = NETWORK_RULES[n].maxText;
                  return (
                    <li key={n} className="flex items-start gap-3 px-3 py-2.5">
                      <NetworkIcon network={n} size={20} className="mt-0.5" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm leading-snug">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">{brand(n)}</span>
                          {/* Count only when close to the network's limit (rules.ts). */}
                          {len > max * 0.8 && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {len.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
                            </span>
                          )}
                        </span>
                        <span className="line-clamp-4 whitespace-pre-line text-muted-foreground">
                          {text.replace(/\n{2,}/g, "\n")}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {image && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ImageIcon className="size-4" aria-hidden />
                  One 4:5 image with {model.name}, made when you continue
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
            {image && (
              <span className="text-sm text-muted-foreground tabular-nums">
                Image: {model.credits} {model.credits === 1 ? "credit" : "credits"}
              </span>
            )}
            <Button
              disabled={picked.size === 0}
              onClick={() => onContinue({ accountIds: [...picked], brief: source, media, tone, image, imageModel })}
            >
              Continue with {picked.size} {picked.size === 1 ? "account" : "accounts"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
