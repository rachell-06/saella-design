"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  InfoIcon,
  LockIcon,
  LockOpenIcon,
  SendIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UnplugIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DatePicker, TimePicker } from "@/components/saella/date-picker";
import { Hint } from "@/components/saella/hint";
import { Stepper } from "@/components/saella/stepper";
import { cn } from "@/lib/utils";
import { TODAY } from "@/lib/mock/constants";
import { WORKSPACE_TZ_LABEL } from "@/lib/time";
import {
  findSocialCampaign,
  findSocialPost,
  IMAGE_MODELS,
  SOCIAL_NETWORKS,
  socialAccounts,
  tiktokCreators,
  type SocialAccount,
  type SocialMedia,
  type SocialNetwork,
} from "@/lib/mock/social";
import {
  allowedKinds,
  brand,
  checkPost,
  GROUP_TITLE,
  hasErrors,
  kindLabel,
  LIVE_EDIT,
  MEDIA_GROUPS,
  mediaGroup,
  NET_LABEL,
  NET_WHAT,
  NETWORK_RULES,
  textLength,
  UPLOAD_TYPES,
  type Issue,
  type MediaGroup,
  type TikTokChoice,
} from "./rules";
import { NetworkIcon } from "./network-icon";
import { PostPreview } from "./post-preview";
import { PreviewSwitcher } from "./preview-switcher";
import { SendMap, type SendAccount, type SendState } from "./send-map";
import { TikTokConsent, TikTokSettings, tiktokBlock, type CreatorState } from "./tiktok-settings";
import { GoalStep, type GoalResult } from "./goal-step";
import { mockDraft, TONES, type Tone } from "./draft";
import { AccountAvatar, MediaTile, NOW_MS, when } from "./shared";

// ------------------------------------------------------------------ content model (live SocialPostBuilder.tsx)
// One post can go to all three media groups at once. Each group has a shared "All" content; a network can be
// LOCKED to keep its own text and media. Locked networks are still sent; the lock only stops "All" edits flowing into
// them. What a network gets = its own content if locked, else its group's "All".
type Item = SocialMedia & {
  key: string;
  preview?: string;
  uploading?: boolean;
  ai?: boolean;
};
type Slot = { text: string; items: Item[] };
type Target = { kind: "all"; g: MediaGroup } | { kind: "own"; n: SocialNetwork };
type Active = { g: MediaGroup; n: "all" | SocialNetwork };
const EMPTY: Slot = { text: "", items: [] };
const NO_ALL: Record<MediaGroup, Slot> = {
  both: EMPTY,
  image: EMPTY,
  video: EMPTY,
};
const FILLED_TEXT =
  "Our autumn glazes are here. Rust, moss and oat, each piece dipped by hand in our studio.\n\nFood-safe, dishwasher-safe, small batch. 15% off your first order with AUTUMN15 until Nov 30.\n\nnorthwind-ceramics.com/autumn #handmade #ceramics";
const FILLED: Record<MediaGroup, Slot> = {
  both: {
    text: FILLED_TEXT,
    items: [
      {
        key: "f1",
        kind: "image",
        url: "mock:photo-1",
        width: 1080,
        height: 1350,
      },
      {
        key: "f2",
        kind: "image",
        url: "mock:photo-2",
        width: 1080,
        height: 1350,
      },
    ],
  },
  image: {
    text: FILLED_TEXT,
    items: [
      {
        key: "f3",
        kind: "image",
        url: "mock:photo-1",
        width: 1080,
        height: 1350,
      },
    ],
  },
  video: {
    text: FILLED_TEXT,
    items: [
      {
        key: "f4",
        kind: "video",
        url: "mock:video-1",
        width: 1080,
        height: 1920,
        durationS: 42,
      },
    ],
  },
};
const copySlot = (s: Slot): Slot => ({
  text: s.text,
  items: s.items.map((i) => ({ ...i })),
});
const fromMedia = (m: SocialMedia[]): Item[] => m.map((x, i) => ({ ...x, key: `${i}:${x.url}` }));
const toMedia = (items: Item[]): SocialMedia[] => items.filter((i) => !i.uploading);

const GROUP_ICON: Record<MediaGroup, React.ReactNode> = {
  both: (
    <>
      <ImageIcon aria-hidden />
      <VideoIcon aria-hidden />
    </>
  ),
  image: <ImageIcon aria-hidden />,
  video: <VideoIcon aria-hidden />,
};

const usable = (a: SocialAccount) => a.status === "active" && a.login.status === "active" && a.canPublish;
const STEPS = [
  { id: "write", label: "Write" },
  { id: "preview", label: "Preview" },
  { id: "send", label: "Send" },
];

export function PostBuilder({ campaignId, postId }: { campaignId: number; postId?: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const preview = params.get("state");
  const campaign = findSocialCampaign(campaignId);
  const post = postId ? findSocialPost(postId) : undefined;
  const accounts = useMemo(() => (preview === "no-accounts" ? [] : socialAccounts), [preview]);

  // Editing a post that is (partly) live: text only, on networks that can change a live post.
  const liveTargets =
    post?.targets.filter((x) => (x.status === "published" || x.status === "publishing") && !x.deletedAt) ?? [];
  const live = liveTargets.length > 0;
  const liveNets = new Set(liveTargets.map((x) => x.network));

  const initial = useMemo(() => {
    if (!post) {
      // ?state=filled: a written post, to review the Preview and Send steps without typing (with ?step=1|2).
      const all = preview === "filled" ? FILLED : NO_ALL;
      return {
        selected: new Set(accounts.filter(usable).map((a) => a.id)),
        all,
        own: {},
        locked: new Set<SocialNetwork>(),
        mode: "now" as const,
        date: undefined,
        time: undefined,
      };
    }
    const selected = new Set(
      post.targets.filter((x) => !x.deletedAt && x.status !== "cancelled").map((x) => x.accountId)
    );
    const own: Partial<Record<SocialNetwork, Slot>> = {};
    if (live) {
      for (const x of post.targets)
        if (!own[x.network])
          own[x.network] = {
            text: x.bodyOverride ?? post.body,
            items: fromMedia(post.media),
          };
      return {
        selected,
        all: NO_ALL,
        own,
        locked: new Set(Object.keys(own) as SocialNetwork[]),
        mode: "now" as const,
        date: undefined,
        time: undefined,
      };
    }
    const base: Slot = { text: post.body, items: fromMedia(post.media) };
    for (const x of post.targets)
      if (x.bodyOverride?.trim() && x.bodyOverride !== post.body)
        own[x.network] = { text: x.bodyOverride, items: fromMedia(post.media) };
    const later = post.scheduledAt && Date.parse(post.scheduledAt) > NOW_MS;
    // Scheduled time back into workspace date + time (GMT+7).
    const local = later ? new Date(Date.parse(post.scheduledAt!) + 7 * 3600_000).toISOString() : null;
    return {
      selected,
      all: {
        both: copySlot(base),
        image: copySlot(base),
        video: copySlot(base),
      },
      own,
      locked: new Set(Object.keys(own) as SocialNetwork[]),
      mode: later ? ("later" as const) : ("now" as const),
      date: local?.slice(0, 10),
      time: local?.slice(11, 16),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- built once per post
  }, [postId, accounts]);

  const [step, setStep] = useState(() => Math.min(2, Math.max(0, Number(params.get("step") ?? 0) || 0)));
  // New posts start with the agent asking for the goal; "Pick networks myself" or ?start=manual goes straight to the
  // manual Write step. Edits, prefilled previews and workspaces without accounts skip it.
  const goalFlow = !postId && !preview && params.get("start") !== "manual" && accounts.length > 0;
  const [atGoal, setAtGoal] = useState(goalFlow && !params.get("step"));
  const [goalNets, setGoalNets] = useState<number | null>(null);
  const [pendingImage, setPendingImage] = useState(false);
  // Came through the goal step: Write with Saella already has its brief and tone, so the panel shows refine only.
  const [fromAgent, setFromAgent] = useState(false);
  const [title, setTitle] = useState(post?.title ?? "");
  const [selected, setSelected] = useState<Set<number>>(initial.selected);
  const [all, setAll] = useState<Record<MediaGroup, Slot>>(initial.all);
  const [own, setOwn] = useState<Partial<Record<SocialNetwork, Slot>>>(initial.own);
  const [locked, setLocked] = useState<Set<SocialNetwork>>(initial.locked);
  const [active, setActive] = useState<Active | null>(null);
  const [lockAsk, setLockAsk] = useState<{
    n: SocialNetwork;
    apply: (tg: Target) => void;
  } | null>(null);
  const [unlockAsk, setUnlockAsk] = useState<SocialNetwork | null>(null);
  const [aiPick, setAiPick] = useState<SocialNetwork[] | null>(null);
  const [aiBrief, setAiBrief] = useState(campaign?.brief ?? "");
  const [aiChange, setAiChange] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiImage, setAiImage] = useState(false);
  const [imgModel, setImgModel] = useState<string>(IMAGE_MODELS[0].id);
  const [imgBusy, setImgBusy] = useState(false);
  const [drafted, setDrafted] = useState(false);
  const [ttChoice, setTtChoice] = useState<Record<number, TikTokChoice>>({});
  const [creators, setCreators] = useState<Record<number, CreatorState>>({});
  const [mode, setMode] = useState<"now" | "later">(initial.mode);
  const [date, setDate] = useState<string | undefined>(initial.date);
  const [time, setTime] = useState<string | undefined>(initial.time);
  const [sendPhase, setPhase] = useState<"idle" | "sending" | "done">("idle");
  const [results, setResults] = useState<
    Map<number, { state: SendState; link?: string | null; error?: string | null }>
  >(new Map());
  const [viewAt, setViewAt] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const aiSeq = useRef(0);
  // Sending ends when no account is still on its way.
  const phase =
    sendPhase === "sending" &&
    results.size &&
    [...results.values()].every((r) => r.state === "published" || r.state === "failed")
      ? "done"
      : sendPhase;
  const uploadTarget = useRef<Target | null>(null);

  // ------------------------------------------------------------ derived
  const ordered = accounts
    .slice()
    .sort(
      (a, b) => SOCIAL_NETWORKS.indexOf(a.network) - SOCIAL_NETWORKS.indexOf(b.network) || a.name.localeCompare(b.name)
    );
  const chosen = ordered.filter((a) => selected.has(a.id));
  const networks = SOCIAL_NETWORKS.filter((n) => chosen.some((a) => a.network === n));
  const modes = MEDIA_GROUPS.filter((g) => networks.some((n) => mediaGroup(n) === g));
  const netsIn = (g: MediaGroup) => networks.filter((n) => mediaGroup(n) === g);
  const canEdit = (n: SocialNetwork) => !live || !liveNets.has(n) || LIVE_EDIT[n];
  const allOpen = (g: MediaGroup) => !live && netsIn(g).some((n) => !locked.has(n));
  const slotOf = (n: SocialNetwork): Slot => (locked.has(n) ? (own[n] ?? EMPTY) : all[mediaGroup(n)]);
  const textFor = (n: SocialNetwork) => slotOf(n).text;
  const mediaFor = (n: SocialNetwork) => toMedia(slotOf(n).items);
  const issues = new Map<SocialNetwork, Issue[]>(networks.map((n) => [n, checkPost(n, textFor(n), mediaFor(n))]));
  const badNets = networks.filter((n) => hasErrors(issues.get(n) ?? []));
  const uploading = [...MEDIA_GROUPS.map((g) => all[g]), ...Object.values(own)].some((s) =>
    s?.items.some((i) => i.uploading)
  );
  const filled = (n: SocialNetwork) => Boolean(textFor(n).trim() || mediaFor(n).length);
  const hasContent = networks.some(filled);
  const ttAccounts = live ? [] : chosen.filter((a) => a.network === "tiktok");
  const ttKey = ttAccounts.map((a) => a.id).join();

  // TikTok's creator_info, read when a TikTok account is picked (?state=tiktok-error shows a refusal).
  useEffect(() => {
    for (const id of ttKey ? ttKey.split(",").map(Number) : []) {
      if (creators[id]) continue;
      setTimeout(
        () =>
          setCreators((s) => ({
            ...s,
            [id]:
              preview === "tiktok-error"
                ? {
                    status: "error",
                    message: "This account has reached TikTok's posting limit for now. Try again later.",
                  }
                : { status: "ok", creator: tiktokCreators[id] },
          })),
        600
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the picked TikTok accounts change
  }, [ttKey]);

  // Keep the editor on something that exists: a group's "All", or its first network when all of them are locked.
  const cur: Active | null = (() => {
    if (!modes.length) return null;
    const ok =
      active &&
      modes.includes(active.g) &&
      (active.n === "all" ? allOpen(active.g) : netsIn(active.g).includes(active.n));
    if (ok) return active;
    const g = active && modes.includes(active.g) ? active.g : modes[0];
    return allOpen(g) ? { g, n: "all" } : { g, n: netsIn(g)[0] };
  })();

  // ------------------------------------------------------------ editing
  const updateSlot = (tg: Target, fn: (s: Slot) => Slot) => {
    if (tg.kind === "all") setAll((m) => ({ ...m, [tg.g]: fn(m[tg.g]) }));
    else setOwn((m) => ({ ...m, [tg.n]: fn(m[tg.n] ?? EMPTY) }));
  };
  const lockNet = (n: SocialNetwork) => {
    setOwn((m) => ({ ...m, [n]: copySlot(all[mediaGroup(n)]) }));
    setLocked((s) => new Set(s).add(n));
  };
  const unlockNet = (n: SocialNetwork) => {
    setOwn((m) => {
      const c = { ...m };
      delete c[n];
      return c;
    });
    setLocked((s) => {
      const c = new Set(s);
      c.delete(n);
      return c;
    });
  };
  /** Where an edit lands. Editing a network that still follows "All" locks it first, after asking. */
  const withTarget = (apply: (tg: Target) => void) => {
    if (!cur) return;
    if (cur.n === "all") return apply({ kind: "all", g: cur.g });
    if (locked.has(cur.n)) return apply({ kind: "own", n: cur.n });
    setLockAsk({ n: cur.n, apply });
  };

  function addFiles(files: File[], tg: Target) {
    for (const file of files) {
      const spec = UPLOAD_TYPES[file.type];
      if (!spec) {
        toast.error(`${file.name} is not a supported file type`);
        continue;
      }
      if (file.size > spec.maxMb * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${spec.maxMb} MB`);
        continue;
      }
      const key = `${file.name}-${file.size}-${Math.random()}`;
      const preview = URL.createObjectURL(file);
      updateSlot(tg, (s) => ({
        ...s,
        items: [...s.items, { key, preview, uploading: true, kind: spec.kind, url: preview }],
      }));
      const done = (meta: Partial<SocialMedia>) =>
        updateSlot(tg, (s) => ({
          ...s,
          items: s.items.map((x) => (x.key === key ? { ...x, ...meta, uploading: false } : x)),
        }));
      if (spec.kind === "image") {
        const img = new window.Image();
        img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => done({});
        img.src = preview;
      } else {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () =>
          done({
            width: v.videoWidth,
            height: v.videoHeight,
            durationS: Math.round(v.duration * 10) / 10,
          });
        v.onerror = () => done({});
        v.src = preview;
      }
    }
  }

  // ------------------------------------------------------------ Saella writes (mock /api/social/draft, /api/social/image)
  const picked = aiPick ? networks.filter((n) => aiPick.includes(n)) : networks;
  function planSlots() {
    const slots: Target[] = [];
    const autoLock: SocialNetwork[] = [];
    for (const g of modes) {
      const nets = netsIn(g);
      const open = nets.filter((n) => !locked.has(n));
      if (!nets.some((n) => picked.includes(n))) continue;
      if (open.length && open.every((n) => picked.includes(n))) slots.push({ kind: "all", g });
      else
        for (const n of open.filter((x) => picked.includes(x))) {
          autoLock.push(n);
          slots.push({ kind: "own", n });
        }
      for (const n of nets.filter((x) => locked.has(x) && picked.includes(x))) slots.push({ kind: "own", n });
    }
    return { slots, autoLock };
  }
  const photoSlots = (slots: Target[]) =>
    slots.filter((s) => (s.kind === "all" ? s.g !== "video" : mediaGroup(s.n) !== "video"));

  function draft(refine: boolean) {
    const brief = refine ? aiChange.trim() : aiBrief.trim();
    if (!brief) return toast.info(refine ? "Say what to change" : "Say what the post is about first");
    const { slots, autoLock } = planSlots();
    if (!slots.length) return;
    setAiBusy(true);
    setTimeout(() => {
      for (const n of autoLock) lockNet(n);
      for (const s of slots) {
        const nets = s.kind === "all" ? netsIn(s.g).filter((n) => !locked.has(n)) : [s.n];
        updateSlot(s, (x) => ({
          ...x,
          text: mockDraft(aiBrief, tone, nets, refine ? brief : undefined),
        }));
      }
      setAiBusy(false);
      setDrafted(true);
      setAiChange("");
      if (autoLock.length) toast.info(`${autoLock.map(brand).join(", ")} now have their own text (locked).`);
      else toast.success("Draft ready. Check it, then preview each network.");
      if (!refine && aiImage) makeImage(photoSlots(slots));
    }, 1500);
  }
  function makeImage(targets: Target[]) {
    if (!targets.length) return;
    aiSeq.current += 1;
    const key = `ai:${aiSeq.current}`;
    setImgBusy(true);
    for (const tg of targets)
      updateSlot(tg, (s) => ({
        ...s,
        items: [...s.items.filter((i) => !i.ai), { key, kind: "image", url: "mock:ai", uploading: true, ai: true }],
      }));
    setTimeout(() => {
      for (const tg of targets)
        updateSlot(tg, (s) => ({
          ...s,
          items: s.items.map((i) => (i.key === key ? { ...i, uploading: false, width: 1080, height: 1350 } : i)),
        }));
      setImgBusy(false);
      toast.success("Image added");
    }, 3000);
  }
  const modelName = IMAGE_MODELS.find((m) => m.id === imgModel)?.name ?? IMAGE_MODELS[0].name;

  // From the goal step: its accounts become the selection, its drafts fill the content (one text per group, a
  // network whose draft differs gets its own, locked), an attached file goes into every group that takes it, and the
  // image (if asked) is made once the Write step shows. The brief and tone carry over for "Write again".
  function fromGoal(r: GoalResult) {
    const nets = SOCIAL_NETWORKS.filter((n) => accounts.some((a) => a.network === n && r.accountIds.includes(a.id)));
    const m = r.media;
    const item: Item | null = m
      ? {
          key: `goal:${m.preview}`,
          kind: m.kind,
          url: m.preview,
          preview: m.preview,
          width: m.width,
          height: m.height,
          durationS: m.durationS,
        }
      : null;
    const nextAll = { ...all };
    const nextOwn: Partial<Record<SocialNetwork, Slot>> = {};
    for (const g of MEDIA_GROUPS) {
      const items =
        item && (g === "both" || g === item.kind)
          ? [...all[g].items.filter((i) => i.key !== item.key), { ...item }]
          : all[g].items;
      const inG = nets.filter((n) => mediaGroup(n) === g);
      const texts = inG.map((n) => mockDraft(r.brief, r.tone, [n]));
      nextAll[g] = { text: texts[0] ?? all[g].text, items };
      inG.forEach((n, i) => {
        // Each network keeps its own draft (its shape differs per network), so each one is locked.
        nextOwn[n] = { text: texts[i], items: items.map((x) => ({ ...x })) };
      });
    }
    setSelected(new Set(r.accountIds));
    setAiPick(null);
    setAiBrief(r.brief);
    setTone(r.tone);
    setAiImage(r.image);
    setImgModel(r.imageModel);
    setAll(nextAll);
    setOwn(nextOwn);
    setLocked(new Set(Object.keys(nextOwn) as SocialNetwork[]));
    setDrafted(true);
    setFromAgent(true);
    setGoalNets(r.accountIds.length);
    setPendingImage(r.image);
    setStep(0);
    setAtGoal(false);
  }
  useEffect(() => {
    if (!pendingImage || atGoal || !networks.length) return;
    const t = setTimeout(() => {
      setPendingImage(false);
      makeImage(photoSlots(planSlots().slots));
    });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once after the goal step hands over
  }, [pendingImage, atGoal, networks.length]);

  // ------------------------------------------------------------ send
  const sendAt = mode === "later" && date && time ? Date.parse(`${date}T${time}:00+07:00`) : null;
  const whenBad = mode === "later" && (!sendAt || sendAt <= NOW_MS);
  const canNext0 = chosen.length > 0 && !uploading && !imgBusy && hasContent;
  const videoSeconds = ttAccounts.length
    ? (mediaFor("tiktok").find((m) => m.kind === "video")?.durationS ?? null)
    : null;
  const ttWhy = ttAccounts.length
    ? tiktokBlock(
        ttAccounts.map((a) => a.id),
        creators,
        ttChoice,
        videoSeconds
      )
    : null;
  const canSend = canNext0 && badNets.length === 0 && !whenBad && !ttWhy;

  function send() {
    if (live) {
      const next = new Map<number, { state: SendState; link?: string | null }>();
      for (const a of chosen) {
        const before = post!.targets.find((x) => x.accountId === a.id);
        const original = before?.bodyOverride ?? post!.body;
        next.set(a.id, {
          state: !LIVE_EDIT[a.network] ? "locked" : textFor(a.network) === original ? "unchanged" : "updated",
          link: before?.permalink,
        });
      }
      setResults(next);
      setPhase("done");
      return;
    }
    if (mode === "later") {
      setResults(new Map(chosen.map((a) => [a.id, { state: "scheduled" as SendState }])));
      setPhase("done");
      toast.success(`Post scheduled for ${when(new Date(sendAt!).toISOString())}.`);
      return;
    }
    setResults(new Map(chosen.map((a) => [a.id, { state: "queued" as SendState }])));
    setPhase("sending");
  }
  // Sending: accounts go out one after another (on one network about a minute apart in the live app; faster here).
  useEffect(() => {
    if (phase !== "sending") return;
    const t = setInterval(() => {
      setResults((m) => {
        const next = new Map(m);
        const id = [...next.entries()].find(([, r]) => r.state === "publishing" || r.state === "queued")?.[0];
        if (id === undefined) return m;
        const r = next.get(id)!;
        const a = accounts.find((x) => x.id === id)!;
        next.set(
          id,
          r.state === "queued"
            ? { state: "publishing" }
            : {
                state: "published",
                link: `https://www.${a.network}.com/northwind/new-${id}`,
              }
        );
        return next;
      });
    }, 900);
    return () => clearInterval(t);
  }, [phase, accounts]);

  const setMany = (ids: number[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (on) n.add(id);
        else n.delete(id);
      }
      return n;
    });

  // ------------------------------------------------------------ early states
  const crumbs = [
    { label: "Posts", href: "/social" },
    ...(campaign ? [{ label: campaign.name, href: `/social?campaign=${campaign.id}` }] : []),
  ];
  const pageTitle = live ? "Edit live post" : postId ? "Edit post" : "New post";
  // Says what the page is for, not its steps (the stepper shows those).
  const pageDescription = postId ? "Change this post and how it looks on each network." : "Create one post and tailor it for every network.";
  if (preview === "loading") {
    return (
      <>
        <PageHeader
          title={pageTitle}
          description={pageDescription}
          breadcrumbs={crumbs}
        />
        <div className="flex flex-col gap-6" aria-busy>
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="h-48 rounded-card" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Skeleton className="h-96 rounded-card" />
            <Skeleton className="h-96 rounded-card" />
          </div>
        </div>
      </>
    );
  }
  if (!campaign || (postId && !post)) {
    return (
      <>
        <PageHeader
          title={pageTitle}
          description={pageDescription}
          breadcrumbs={[{ label: "Posts", href: "/social" }]}
        />
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>{campaign ? "Post not found" : "Collection not found"}</EmptyTitle>
            <EmptyDescription>It doesn&apos;t exist or was removed.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline" asChild>
              <Link href="/social">Back to posts</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </>
    );
  }

  // ---------------------------------------------------------------- step 1: who it goes to
  const targets = (
    <section aria-labelledby="pb-targets" className="flex flex-col gap-4 rounded-card border p-6">
      <h2 id="pb-targets" className="font-heading text-lg font-medium tracking-title">
        Publish to
      </h2>
      {ordered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UnplugIcon />
            </EmptyMedia>
            <EmptyTitle>No connected accounts yet</EmptyTitle>
            <EmptyDescription>Connect a page or account to start posting.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline" asChild>
              <Link href="/social/accounts">Connect accounts</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {MEDIA_GROUPS.map((g) => {
            const nets = SOCIAL_NETWORKS.filter((n) => mediaGroup(n) === g && ordered.some((a) => a.network === n));
            const ok = ordered.filter((a) => mediaGroup(a.network) === g && usable(a));
            const on = ok.filter((a) => selected.has(a.id)).length;
            return (
              <div key={g} className="flex flex-col rounded-lg border">
                <Label className="gap-2.5 border-b bg-table-head px-3 py-2.5">
                  <Checkbox
                    checked={ok.length > 0 && on === ok.length ? true : on > 0 ? "indeterminate" : false}
                    disabled={!ok.length}
                    onCheckedChange={(v) =>
                      setMany(
                        ok.map((a) => a.id),
                        v === true
                      )
                    }
                  />
                  {GROUP_TITLE[g]}
                </Label>
                {nets.length === 0 && (
                  <p className="px-3 py-3 text-sm text-muted-foreground">No account connected in this group yet.</p>
                )}
                {nets.map((n) => {
                  const list = ordered.filter((a) => a.network === n);
                  const okN = list.filter(usable);
                  const k = okN.filter((a) => selected.has(a.id)).length;
                  return (
                    <Collapsible key={n} className="border-b last:border-b-0">
                      <div className="flex items-center gap-2 pr-3">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-auto min-w-0 flex-1 justify-start gap-2.5 rounded-none px-3 py-2 font-normal [&[data-state=open]_.chev]:rotate-90"
                          >
                            <ChevronRightIcon className="chev text-muted-foreground transition-transform duration-150" />
                            <NetworkIcon network={n} size={24} />
                            <span className="flex min-w-0 flex-col text-left">
                              <span className="truncate text-sm font-medium">{NET_LABEL[n]}</span>
                              <span className="truncate text-sm text-muted-foreground">
                                {okN.length === 0
                                  ? "Can't post right now"
                                  : `${k} of ${okN.length} ${NET_WHAT[n] === "Pages" || NET_WHAT[n] === "Company Pages" ? NET_WHAT[n] : "selected"}`}
                              </span>
                            </span>
                          </Button>
                        </CollapsibleTrigger>
                        <Checkbox
                          checked={okN.length > 0 && k === okN.length ? true : k > 0 ? "indeterminate" : false}
                          disabled={!okN.length}
                          onCheckedChange={(v) =>
                            setMany(
                              okN.map((a) => a.id),
                              v === true
                            )
                          }
                          aria-label={`All ${NET_LABEL[n]} accounts`}
                        />
                      </div>
                      <CollapsibleContent>
                        <ul className="flex flex-col pb-1">
                          {list.map((a) => {
                            const ok1 = usable(a);
                            const row = (
                              <Label className={cn("gap-3 py-1.5 pr-3 pl-10 font-normal", !ok1 && "opacity-60")}>
                                <AccountAvatar name={a.name} />
                                <span className="flex min-w-0 flex-1 flex-col">
                                  <span className="truncate font-medium">{a.name}</span>
                                  <span className="truncate text-muted-foreground">
                                    {a.handle ? `@${a.handle}` : kindLabel(a.network, a.kind)}
                                  </span>
                                </span>
                                <Checkbox
                                  checked={selected.has(a.id)}
                                  disabled={!ok1}
                                  onCheckedChange={(v) => setMany([a.id], v === true)}
                                />
                              </Label>
                            );
                            return (
                              <li key={a.id}>
                                {ok1 ? (
                                  row
                                ) : (
                                  <Hint label="This account can't publish right now. Check it on the Accounts tab">
                                    {<span className="block">{row}</span>}
                                  </Hint>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  // The editor: groups and their networks on the left (lock per network), the chosen one's text and media on the right.
  const actSlot = !cur ? null : cur.n === "all" ? all[cur.g] : slotOf(cur.n);
  const actNets = cur ? (cur.n === "all" ? netsIn(cur.g).filter((n) => !locked.has(n)) : [cur.n]) : [];
  const actKinds = allowedKinds(actNets);
  const actLimit = actNets.length ? Math.min(...actNets.map((n) => NETWORK_RULES[n].maxText)) : null;
  const actLen = actSlot ? textLength(actSlot.text) : 0;
  const actRO = Boolean(cur && cur.n !== "all" && !canEdit(cur.n));
  const note = !cur
    ? ""
    : live && cur.n !== "all"
      ? canEdit(cur.n)
        ? ""
        : `${brand(cur.n)} doesn't let a live post be changed. To change it, delete it and post again.`
      : cur.n === "all"
        ? `Shared by ${actNets.map(brand).join(", ")}`
        : locked.has(cur.n)
          ? `${brand(cur.n)} only`
          : `${brand(cur.n)} uses the shared content. Editing here locks it.`;
  const viewable = (actSlot?.items ?? []).filter((i) => !i.uploading);

  const rail = (
    <nav aria-label="Content" className="flex flex-col gap-4 border-r p-3">
      {modes.map((g) => (
        <div key={g} className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 px-2 pb-1 text-xs font-semibold text-muted-foreground [&_svg]:size-3.5">
            {GROUP_ICON[g]}
            {GROUP_TITLE[g]}
          </span>
          {/* "All" only while some network here still shares it; every one locked to its own text = no row. */}
          {allOpen(g) && (
            <Button
              variant="ghost"
              aria-current={cur?.g === g && cur.n === "all" ? "true" : undefined}
              onClick={() => setActive({ g, n: "all" })}
              className="h-auto w-full justify-between px-2 py-1.5 font-normal aria-[current=true]:bg-primary-subtle"
            >
              <span className="font-medium">All</span>
              <span className="text-muted-foreground tabular-nums">
                {((k) => `${k} ${k === 1 ? "network" : "networks"}`)(netsIn(g).filter((n) => !locked.has(n)).length)}
              </span>
            </Button>
          )}
          {netsIn(g).map((n) => {
            const isLocked = locked.has(n);
            const bad = badNets.includes(n);
            const item = (
              <div
                className={cn(
                  "flex items-center rounded-lg",
                  cur?.g === g && cur.n === n && "bg-primary-subtle",
                  !canEdit(n) && "opacity-60"
                )}
              >
                <Button
                  variant="ghost"
                  aria-current={cur?.g === g && cur.n === n ? "true" : undefined}
                  onClick={() => setActive({ g, n })}
                  className="h-auto min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 font-normal hover:bg-transparent"
                >
                  <NetworkIcon network={n} size={18} />
                  <span className="truncate">{brand(n)}</span>
                  {!filled(n) ? null : bad ? (
                    <CircleAlertIcon className="ml-auto text-warning-soft-foreground" aria-label="Not ready to send" />
                  ) : (
                    <CircleCheckIcon className="ml-auto text-success-soft-foreground" aria-label="Ready to publish" />
                  )}
                </Button>
                {!live && (
                  <Hint
                    label={
                      isLocked
                        ? "Unlock: use the shared content again"
                        : "Lock: give this network its own text and media"
                    }
                  >
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={uploading}
                      aria-pressed={isLocked}
                      aria-label={isLocked ? `Unlock ${brand(n)}` : `Lock ${brand(n)}`}
                      className={cn("mr-1", isLocked ? "text-primary-soft-foreground" : "text-muted-foreground")}
                      onClick={() => (isLocked ? setUnlockAsk(n) : lockNet(n))}
                    >
                      {isLocked ? <LockIcon /> : <LockOpenIcon />}
                    </Button>
                  </Hint>
                )}
              </div>
            );
            return (
              <Hint key={n} label={canEdit(n) ? undefined : `${brand(n)} doesn't let a live post be changed`}>
                {item}
              </Hint>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const sharedIssues = (() => {
    if (!cur) return [];
    const lines = new Map<string, Issue>();
    for (const n of actNets) for (const i of issues.get(n) ?? []) lines.set(i.text, i);
    return [...lines.values()];
  })();

  const editor = actSlot && cur && (
    <div className="flex min-w-0 flex-col gap-3 p-4">
      <p className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", !note && "hidden")}>
        {note}
        {cur.n !== "all" && locked.has(cur.n) && !live && (
          <LockIcon className="size-3.5 text-primary-soft-foreground" aria-label="Locked" />
        )}
      </p>
      <div className="flex flex-col rounded-lg border focus-within:ring-2 focus-within:ring-ring">
        <Textarea
          aria-label="Post text"
          value={actSlot.text}
          disabled={actRO}
          placeholder="What do you want to share?"
          className="min-h-44 resize-none border-0 focus-visible:ring-0"
          onChange={(e) => {
            const v = e.target.value;
            withTarget((tg) => updateSlot(tg, (s) => ({ ...s, text: v })));
          }}
        />
        {actSlot.items.length > 0 && (
          <ul className="flex flex-wrap gap-2 px-3 pb-3">
            {actSlot.items.map((it) => (
              <li key={it.key} className="relative size-20 overflow-hidden rounded-md border">
                {it.uploading ? (
                  <Hint label={it.ai ? `Making the image with ${modelName}…` : "Uploading…"}>
                    <span tabIndex={0} className="flex size-full items-center justify-center bg-muted">
                      <Spinner />
                    </span>
                  </Hint>
                ) : (
                  <Button
                    variant="ghost"
                    className="size-full rounded-none p-0"
                    aria-label="View larger"
                    onClick={() => setViewAt(viewable.findIndex((v) => v.key === it.key))}
                  >
                    <MediaTile media={it} className="size-full" />
                  </Button>
                )}
                {it.ai && !it.uploading && (
                  <Hint label="Made with AI">
                    <span
                      tabIndex={0}
                      className="absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-brand"
                    >
                      <SparklesIcon className="size-3" aria-label="Made with AI" />
                    </span>
                  </Hint>
                )}
                {!live && !it.uploading && (
                  <Button
                    variant="secondary"
                    size="icon-xs"
                    aria-label="Remove"
                    className="absolute top-1 right-1 rounded-full"
                    onClick={() =>
                      withTarget((tg) =>
                        updateSlot(tg, (s) => ({
                          ...s,
                          items: s.items.filter((x) => x.key !== it.key),
                        }))
                      )
                    }
                  >
                    <XIcon />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between gap-3 border-t px-2 py-1.5">
          {live ? (
            <span />
          ) : (
            <Hint label="JPG, PNG or WebP up to 8 MB · MP4 or MOV up to 50 MB">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  withTarget((tg) => {
                    uploadTarget.current = tg;
                    fileRef.current?.click();
                  });
                }}
              >
                {actKinds.length === 2 ? (
                  <ImageIcon data-icon="inline-start" />
                ) : actKinds[0] === "video" ? (
                  <VideoIcon data-icon="inline-start" />
                ) : (
                  <ImageIcon data-icon="inline-start" />
                )}
                {actKinds.length === 2 ? "Photo / video" : actKinds[0] === "video" ? "Add video" : "Add photos"}
              </Button>
            </Hint>
          )}
          <span
            className={cn(
              "px-1 text-xs tabular-nums",
              actLimit && actLen > actLimit ? "text-destructive-soft-foreground" : "text-muted-foreground"
            )}
          >
            {actLimit
              ? `${actLen.toLocaleString("en-US")} / ${actLimit.toLocaleString("en-US")}`
              : `${actLen} characters`}
          </span>
        </div>
        {/* Hidden file input opened by the "Photo / video" Button. */}
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          accept={Object.keys(UPLOAD_TYPES)
            .filter((m) => actKinds.includes(UPLOAD_TYPES[m].kind))
            .join(",")}
          onChange={(e) => {
            if (uploadTarget.current && e.target.files) addFiles([...e.target.files], uploadTarget.current);
            e.target.value = "";
          }}
        />
      </div>
      {(actSlot.text.trim() || actSlot.items.length > 0) && <IssueList issues={sharedIssues} />}
    </div>
  );

  const aiPanel = !live && (
    <section aria-labelledby="pb-ai" className="flex flex-col gap-4 rounded-card border p-6">
      <h2 id="pb-ai" className="flex items-center gap-2 font-heading text-lg font-medium tracking-title">
        <SparklesIcon className="size-4 text-brand" aria-hidden />
        Write with Saella
      </h2>
      {!fromAgent && (
        <>
          <Field>
            <FieldLabel htmlFor="pb-brief">What is this post about?</FieldLabel>
            <Textarea id="pb-brief" value={aiBrief} onChange={(e) => setAiBrief(e.target.value)} className="min-h-28" />
          </Field>
          <Field>
            <FieldLabel>Tone</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={tone}
              onValueChange={(v) => v && setTone(v as Tone)}
              className="flex-wrap"
            >
              {TONES.map((t) => (
                <ToggleGroupItem key={t.value} value={t.value}>
                  {t.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          {networks.length > 0 && (
            <Field>
              <FieldLabel>Write for</FieldLabel>
              <ToggleGroup
                type="multiple"
                variant="outline"
                size="sm"
                value={picked}
                onValueChange={(v) => setAiPick(v as SocialNetwork[])}
                className="flex-wrap"
              >
                {networks.map((n) => (
                  <ToggleGroupItem key={n} value={n} aria-label={brand(n)}>
                    <NetworkIcon network={n} size={14} />
                    {brand(n)}
                    {locked.has(n) && <LockIcon aria-label="Locked" />}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          )}
          <div className="flex flex-col gap-3">
            <Label className="gap-2.5 font-normal">
              <Switch checked={aiImage} onCheckedChange={setAiImage} />
              Include an image
            </Label>
            {aiImage && (
              <Field>
                <FieldLabel htmlFor="pb-model">Image model</FieldLabel>
                <Select value={imgModel} onValueChange={setImgModel}>
                  <SelectTrigger id="pb-model" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {IMAGE_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                          <span className="text-muted-foreground">
                            {m.maker} · {m.speed === "fast" ? "fast" : "up to 2 min"} · {m.credits}{" "}
                            {m.credits === 1 ? "credit" : "credits"}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {picked.length > 0 && !photoSlots(planSlots().slots).length && (
                  <FieldDescription>Video-only networks: no image is made.</FieldDescription>
                )}
              </Field>
            )}
          </div>
        </>
      )}
      <Hint label={picked.length ? undefined : "Pick accounts first"}>
        <span className="self-end">
          <Button variant="ai" disabled={!picked.length || imgBusy || aiBusy} onClick={() => draft(false)}>
            {aiBusy ? <Spinner data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}
            {aiBusy ? "Writing…" : drafted ? "Write again" : "Write for me"}
          </Button>
        </span>
      </Hint>
      {(aiBusy || imgBusy) && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          {aiBusy
            ? aiImage
              ? "Writing the text; the image comes right after."
              : "Writing, about 10–20 seconds."
            : `Making the image with ${modelName}…`}
        </p>
      )}
      {drafted && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <Field>
            <FieldLabel htmlFor="pb-change">Want a change?</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="pb-change"
                value={aiChange}
                placeholder="e.g. shorter, add the discount"
                onChange={(e) => setAiChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && draft(true)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton disabled={aiBusy} onClick={() => draft(true)}>
                  Apply
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          {aiImage && (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              disabled={aiBusy || imgBusy}
              onClick={() => {
                const where: Target[] = [
                  ...MEDIA_GROUPS.filter((g) => all[g].items.some((i) => i.ai)).map((g): Target => ({
                    kind: "all",
                    g,
                  })),
                  ...[...locked]
                    .filter((n) => own[n]?.items.some((i) => i.ai))
                    .map((n): Target => ({ kind: "own", n })),
                ];
                makeImage(where.length ? where : photoSlots(planSlots().slots));
              }}
            >
              New image
            </Button>
          )}
        </div>
      )}
    </section>
  );

  const compose = (
    <div className="flex flex-col gap-6">
      {live ? (
        <Alert variant="info">
          <InfoIcon />
          <AlertTitle>This post is live: only its text can change</AlertTitle>
        </Alert>
      ) : (
        targets
      )}
      <div className={cn("grid items-start gap-6", !live && "lg:grid-cols-[minmax(0,1fr)_360px]")}>
        <section aria-labelledby="pb-content" className="flex flex-col rounded-card border">
          <div className="flex items-center justify-between gap-4 border-b px-6 py-3">
            <h2 id="pb-content" className="font-heading text-lg font-medium tracking-title">
              Content
            </h2>
            <Hint label="Shown in your list. Empty: the first line is used">
              <Input
                id="pb-title"
                aria-label="Post name"
                value={title}
                maxLength={120}
                placeholder="Post name (optional)"
                className="w-72"
                onChange={(e) => setTitle(e.target.value)}
              />
            </Hint>
          </div>
          {modes.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Pick accounts first.</p>
          ) : (
            <div className="grid min-h-80 grid-cols-[200px_minmax(0,1fr)]">
              {rail}
              {editor}
            </div>
          )}
        </section>
        {aiPanel}
      </div>
    </div>
  );

  // ---------------------------------------------------------------- step 2
  const previewStep = (
    <div className="flex flex-col gap-4">
      {badNets.length > 0 && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            {badNets.length === 1 ? "1 network needs a fix" : `${badNets.length} networks need a fix`}
          </AlertTitle>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => setStep(0)}>
              Edit
            </Button>
          </AlertAction>
        </Alert>
      )}
      <PreviewSwitcher
        className="rounded-card"
        label="Networks in this post"
        items={networks.map((n) => {
          const accs = chosen.filter((a) => a.network === n);
          const list = issues.get(n) ?? [];
          return {
            key: n,
            network: n,
            title: NET_LABEL[n],
            sub: accs.map((a) => a.name).join(", "),
            badge: badNets.includes(n) ? (
              <CircleAlertIcon className="size-4 shrink-0 text-warning-soft-foreground" aria-label="Needs a fix" />
            ) : (
              <CircleCheckIcon className="size-4 shrink-0 text-success-soft-foreground" aria-label="Ready" />
            ),
            head: list.length ? <IssueList issues={list} /> : undefined,
            body: (
              <PostPreview
                network={n}
                name={accs[0].name}
                handle={accs[0].handle}
                text={textFor(n)}
                media={slotOf(n).items.filter((i) => !i.uploading)}
              />
            ),
          };
        })}
      />
    </div>
  );

  // ---------------------------------------------------------------- step 3
  const mapAccounts: SendAccount[] = chosen.map((a) => {
    const r = results.get(a.id);
    // The network row already says "Facebook Page": the line under a name only adds a handle or a different kind.
    const sub = a.handle
      ? `@${a.handle}`
      : kindLabel(a.network, a.kind) === NET_LABEL[a.network]
        ? ""
        : kindLabel(a.network, a.kind);
    return {
      id: a.id,
      network: a.network,
      name: a.name,
      sub,
      state: r?.state ?? "ready",
      link: r?.link,
      error: r?.error,
    };
  });
  const okCount = mapAccounts.filter((a) => a.state === "published" || a.state === "updated").length;
  const badCount = mapAccounts.filter((a) => a.state === "failed").length;
  const firstThumb = [...modes.map((g) => all[g]), ...Object.values(own)]
    .flatMap((s) => s?.items ?? [])
    .find((i) => i.kind === "image" && !i.uploading);
  const progress =
    phase === "sending"
      ? `Sending… ${okCount + badCount} of ${mapAccounts.length} done`
      : phase === "done"
        ? mode === "later" && !live
          ? `Scheduled for ${sendAt ? when(new Date(sendAt).toISOString()) : ""}`
          : live
            ? "Changes sent"
            : `Done: ${okCount} live, ${badCount} failed`
        : null;

  const sendStep = (
    <div className="flex flex-col gap-6">
      {ttAccounts.length > 0 && (
        <TikTokSettings
          accounts={ttAccounts.map((a) => ({ id: a.id, name: a.name }))}
          creators={creators}
          choices={ttChoice}
          onChange={(id, c) => setTtChoice((m) => ({ ...m, [id]: c }))}
          onReload={(id) => {
            setCreators((s) => ({ ...s, [id]: { status: "loading" } }));
            setTimeout(
              () =>
                setCreators((s) => ({
                  ...s,
                  [id]: { status: "ok", creator: tiktokCreators[id] },
                })),
              600
            );
          }}
          videoSeconds={videoSeconds}
          readOnly={phase !== "idle"}
        />
      )}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Where it goes</h3>
        <SendMap
          title={title.trim() || textFor(networks[0] ?? "facebook").split("\n")[0] || "Untitled post"}
          thumb={firstThumb}
          accounts={mapAccounts}
        />
      </div>
      {ttAccounts.length > 0 && phase === "idle" && (
        <div className="flex flex-col gap-1">
          <TikTokConsent branded={ttAccounts.some((a) => ttChoice[a.id]?.disclose && ttChoice[a.id]?.branded)} />
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-6">
        {progress ? (
          <p
            aria-live="polite"
            className={cn(
              "flex items-center gap-2 text-sm font-medium",
              phase === "sending"
                ? "text-foreground"
                : badCount
                  ? "text-destructive-soft-foreground"
                  : "text-success-soft-foreground"
            )}
          >
            {phase === "sending" ? (
              <Spinner />
            ) : badCount ? (
              <CircleXIcon className="size-4" aria-hidden />
            ) : (
              <CircleCheckIcon className="size-4" aria-hidden />
            )}
            {progress}
            {phase === "sending" && (
              <span className="font-normal text-muted-foreground">
                Accounts on the same network go about a minute apart.
              </span>
            )}
          </p>
        ) : live ? (
          <span />
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-auto">
              <FieldLabel>When</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                value={mode}
                onValueChange={(v) => v && setMode(v as "now" | "later")}
              >
                <ToggleGroupItem value="now">
                  <SendIcon />
                  Publish now
                </ToggleGroupItem>
                <ToggleGroupItem value="later">
                  <ClockIcon />
                  Schedule
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
            {mode === "later" && (
              <>
                <Field className="w-44" data-invalid={(date && time && whenBad) || undefined}>
                  <FieldLabel htmlFor="pb-date">Date</FieldLabel>
                  <DatePicker
                    id="pb-date"
                    value={date}
                    onChange={setDate}
                    min={TODAY}
                    invalid={Boolean(date && time && whenBad)}
                  />
                </Field>
                <Field className="w-36" data-invalid={(date && time && whenBad) || undefined}>
                  <FieldLabel htmlFor="pb-time">Time ({WORKSPACE_TZ_LABEL})</FieldLabel>
                  <TimePicker
                    id="pb-time"
                    value={time ?? ""}
                    onChange={setTime}
                    invalid={Boolean(date && time && whenBad)}
                  />
                </Field>
                {date && time && whenBad && (
                  <p className="pb-1.5 text-sm text-destructive-soft-foreground">Pick a time in the future</p>
                )}
              </>
            )}
          </div>
        )}
        {phase === "idle" ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeftIcon data-icon="inline-start" />
              Back
            </Button>
            <Hint
              label={!canSend ? (ttWhy ?? (whenBad ? "Pick a date and a time in the future" : undefined)) : undefined}
            >
              <span>
                <Button disabled={!canSend} onClick={send}>
                  {live ? null : mode === "now" ? (
                    <SendIcon data-icon="inline-start" />
                  ) : (
                    <ClockIcon data-icon="inline-start" />
                  )}
                  {live
                    ? "Save changes"
                    : mode === "now"
                      ? `Publish to ${chosen.length} accounts`
                      : `Schedule for ${chosen.length} accounts`}
                </Button>
              </span>
            </Hint>
          </div>
        ) : (
          <Button
            variant={phase === "done" ? "default" : "outline"}
            onClick={() => router.push(postId ? `/social?new=${postId}` : `/social?campaign=${campaignId}`)}
          >
            Back to posts
          </Button>
        )}
      </div>
    </div>
  );

  const maxReachable = !canNext0 ? 0 : badNets.length ? 1 : 2;

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={crumbs}
      />

      {goalFlow ? (
        <Stepper
          steps={[
            {
              id: "goal",
              label: "Goal",
              summary: goalNets ? `${goalNets} ${goalNets === 1 ? "account" : "accounts"}` : undefined,
            },
            ...STEPS,
          ]}
          current={atGoal ? 0 : step + 1}
          maxReachable={atGoal ? (goalNets ? 1 : 0) : phase === "idle" ? maxReachable + 1 : step + 1}
          onStepClick={
            phase === "idle" ? (i) => (i === 0 ? setAtGoal(true) : (setAtGoal(false), setStep(i - 1))) : undefined
          }
          className="max-w-3xl [&>li:last-child]:flex-none"
        />
      ) : (
        <Stepper
          steps={STEPS}
          current={step}
          maxReachable={phase === "idle" ? maxReachable : step}
          onStepClick={phase === "idle" ? setStep : undefined}
          className="max-w-2xl [&>li:last-child]:flex-none"
        />
      )}

      {atGoal ? (
        <GoalStep
          accounts={accounts}
          brief={campaign.brief}
          initialGoal={params.get("goal") ?? undefined}
          onContinue={fromGoal}
          onManual={() => {
            setAtGoal(false);
            setStep(0);
          }}
        />
      ) : step === 0 ? (
        compose
      ) : step === 1 ? (
        previewStep
      ) : (
        <section className="rounded-card border p-6">{sendStep}</section>
      )}

      {step < 2 && !atGoal && (
        <div className="flex items-center justify-between gap-3">
          {step === 0 ? (
            <Button variant="outline" asChild>
              <Link href={`/social?campaign=${campaign.id}`}>Cancel</Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeftIcon data-icon="inline-start" />
              Back
            </Button>
          )}
          <Button disabled={step === 0 ? !canNext0 : badNets.length > 0} onClick={() => setStep(step + 1)}>
            {step === 0 ? "Next: preview" : "Next: send"}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      )}

      <AlertDialog open={lockAsk !== null} onOpenChange={(o) => !o && setLockAsk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit {lockAsk && brand(lockAsk.n)} on its own?</AlertDialogTitle>
            <AlertDialogDescription>
              {lockAsk && brand(lockAsk.n)} will be locked: changes under “All” stop applying to it. It is still posted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep shared</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!lockAsk) return;
                lockNet(lockAsk.n);
                // The lock copies "All" first; the edit then lands on the copy.
                setTimeout(() => lockAsk.apply({ kind: "own", n: lockAsk.n }));
                setLockAsk(null);
              }}
            >
              Lock and edit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={unlockAsk !== null} onOpenChange={(o) => !o && setUnlockAsk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock {unlockAsk && brand(unlockAsk)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its own text, photos and videos are replaced by the “All” content of{" "}
              {unlockAsk && GROUP_TITLE[mediaGroup(unlockAsk)]}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep locked</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (unlockAsk) unlockNet(unlockAsk);
                setUnlockAsk(null);
              }}
            >
              Unlock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={viewAt !== null} onOpenChange={(o) => !o && setViewAt(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle className="sr-only">Photo or video</DialogTitle>
          {viewAt !== null && viewable[viewAt] && (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous"
                disabled={viewable.length < 2}
                onClick={() => setViewAt((viewAt - 1 + viewable.length) % viewable.length)}
              >
                <ChevronLeftIcon />
              </Button>
              {viewable[viewAt].kind === "video" && viewable[viewAt].preview ? (
                <video
                  src={viewable[viewAt].preview}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[70vh] min-w-0 flex-1 rounded-lg"
                />
              ) : (
                <MediaTile
                  media={viewable[viewAt]}
                  className="aspect-[4/5] max-h-[70vh] min-w-0 flex-1 rounded-lg [&_img]:object-contain"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next"
                disabled={viewable.length < 2}
                onClick={() => setViewAt((viewAt + 1) % viewable.length)}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Problems with the text or media; each shown once, naming its network. Nothing to say when all is well. */
function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {issues.map((i) => (
        <li key={i.text} className="flex items-start gap-2 text-sm">
          {i.level === "error" ? (
            <CircleXIcon className="mt-0.5 size-4 shrink-0 text-destructive-soft-foreground" aria-label="Must fix" />
          ) : i.level === "warn" ? (
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning-soft-foreground" aria-label="Warning" />
          ) : (
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-info-soft-foreground" aria-label="Note" />
          )}
          <span>{i.text}</span>
        </li>
      ))}
    </ul>
  );
}
