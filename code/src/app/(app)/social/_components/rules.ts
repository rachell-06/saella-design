// What each network accepts in one post, and the words the social screens use for networks, statuses and problems.
// Mirrors the live app (origin/development): lib/social/rules.ts, lib/social/tiktok-options.ts, components/social/labels.ts.
import type { SocialMedia, SocialNetwork, SocialPost, SocialTarget, TikTokPrivacy } from "@/lib/mock/social";
import { SOCIAL_NETWORKS } from "@/lib/mock/social";
import type { Status } from "@/components/saella/status-badge";

export const NET_LABEL: Record<SocialNetwork, string> = {
  facebook: "Facebook Page",
  instagram: "Instagram",
  threads: "Threads",
  linkedin: "LinkedIn Page",
  tiktok: "TikTok",
  youtube: "YouTube",
  pinterest: "Pinterest",
  douyin: "Douyin",
};
/** The bare network name for sentences: "Facebook", not "Facebook Page". */
export const brand = (n: SocialNetwork) => (n === "facebook" ? "Facebook" : n === "linkedin" ? "LinkedIn" : NET_LABEL[n]);
/** What one login brings, for "Add {what}". */
export const NET_WHAT: Record<SocialNetwork, string> = {
  facebook: "Pages",
  instagram: "account",
  threads: "profile",
  linkedin: "Company Pages",
  tiktok: "account",
  youtube: "channel",
  pinterest: "account",
  douyin: "account",
};
export const kindLabel = (n: SocialNetwork, kind?: string) => (n === "linkedin" && kind === "linkedin_member" ? "LinkedIn profile" : NET_LABEL[n]);

type NetworkRules = {
  maxText: number;
  textOnly: boolean;
  maxImages: number;
  video: boolean;
  videoOnly?: boolean;
  mixMedia: boolean;
  maxVideoSeconds?: number;
  aspect?: [number, number];
};
export const NETWORK_RULES: Record<SocialNetwork, NetworkRules> = {
  facebook: { maxText: 63206, textOnly: true, maxImages: 10, video: true, mixMedia: false },
  instagram: { maxText: 2200, textOnly: false, maxImages: 10, video: true, mixMedia: true, maxVideoSeconds: 900, aspect: [0.8, 1.91] },
  threads: { maxText: 500, textOnly: true, maxImages: 20, video: true, mixMedia: true, maxVideoSeconds: 300 },
  linkedin: { maxText: 3000, textOnly: true, maxImages: 20, video: false, mixMedia: false },
  tiktok: { maxText: 2200, textOnly: false, maxImages: 0, video: true, videoOnly: true, mixMedia: false, maxVideoSeconds: 600 },
  pinterest: { maxText: 800, textOnly: false, maxImages: 5, video: false, mixMedia: false },
  youtube: { maxText: 5000, textOnly: false, maxImages: 0, video: true, videoOnly: true, mixMedia: false },
  douyin: { maxText: 1000, textOnly: false, maxImages: 0, video: true, videoOnly: true, mixMedia: false, maxVideoSeconds: 900 },
};

/** Once a post is live: which networks let Saella change its text, and take it down (live rules.ts LIVE_EDIT / LIVE_DELETE). */
export const LIVE_EDIT: Record<SocialNetwork, boolean> = { facebook: true, instagram: false, threads: false, linkedin: true, tiktok: false, youtube: false, pinterest: true, douyin: false };
export const LIVE_DELETE: Record<SocialNetwork, boolean> = { facebook: true, instagram: false, threads: true, linkedin: true, tiktok: false, youtube: false, pinterest: true, douyin: false };

export type Issue = { level: "error" | "warn" | "info"; text: string };

export const textLength = (s: string) => Array.from(s).length;

/** Problems with one network's version of a post; an error blocks sending. Each message names its network. */
export function checkPost(n: SocialNetwork, text: string, media: SocialMedia[]): Issue[] {
  const r = NETWORK_RULES[n];
  const b = brand(n);
  const out: Issue[] = [];
  const images = media.filter((m) => m.kind === "image");
  const videos = media.filter((m) => m.kind === "video");
  const len = textLength(text);
  if (!text.trim() && media.length === 0) out.push({ level: "error", text: "Write something or add a photo" });
  if (len > r.maxText) out.push({ level: "error", text: `${b}: the text is ${len.toLocaleString("en-US")} characters, the limit is ${r.maxText.toLocaleString("en-US")}` });
  if (r.videoOnly) {
    if (images.length > 0) out.push({ level: "error", text: `${b} photo posts are not supported yet. Use one video` });
    else if (videos.length === 0) out.push({ level: "error", text: `${b} needs a video` });
    if (videos.length > 1) out.push({ level: "error", text: `${b} takes a single video, without photos` });
  } else {
    if (!r.textOnly && media.length === 0) out.push({ level: "error", text: `${b} needs a photo or a video` });
    if (videos.length > 0 && !r.video) out.push({ level: "error", text: `${b} videos are not supported yet. Use photos` });
    if (images.length > r.maxImages) out.push({ level: "error", text: `${b} takes at most ${r.maxImages} photos` });
    if (r.video && !r.mixMedia && videos.length > 0 && (images.length > 0 || videos.length > 1))
      out.push({ level: "error", text: `${b} takes a single video, without photos` });
  }
  if (r.maxVideoSeconds && videos.some((v) => (v.durationS ?? 0) > r.maxVideoSeconds!))
    out.push({ level: "error", text: `${b} takes videos up to ${r.maxVideoSeconds} seconds` });
  if (r.aspect) {
    const [lo, hi] = r.aspect;
    if (images.some((m) => m.width && m.height && (m.width / m.height < lo - 0.01 || m.width / m.height > hi + 0.01)))
      out.push({ level: "warn", text: `${b} crops photos outside 4:5 to 1.91:1` });
  }
  if (n === "pinterest") {
    if (textLength(text.trim().split("\n")[0] ?? "") > 100) out.push({ level: "warn", text: "Pinterest uses the first line as the title and cuts it at 100 characters" });
    out.push({ level: "info", text: "Pins go to the board “Saella” on the account" });
  }
  return out;
}
export const hasErrors = (issues: Issue[]) => issues.some((i) => i.level === "error");

/** How the post builder sorts networks: photos and video, photos only, video only. */
export type MediaGroup = "both" | "image" | "video";
export const MEDIA_GROUPS: MediaGroup[] = ["both", "image", "video"];
export const GROUP_TITLE: Record<MediaGroup, string> = { both: "Photos & video", image: "Photos only", video: "Video only" };
export function mediaGroup(n: SocialNetwork): MediaGroup {
  const r = NETWORK_RULES[n];
  if (r.videoOnly || r.maxImages === 0) return "video";
  if (!r.video) return "image";
  return "both";
}
/** File kinds the uploader offers for the chosen networks: the union of what they take. */
export function allowedKinds(nets: SocialNetwork[]): ("image" | "video")[] {
  if (!nets.length) return ["image", "video"];
  const g = new Set(nets.map(mediaGroup));
  if (g.size === 1 && g.has("video")) return ["video"];
  if (g.size === 1 && g.has("image")) return ["image"];
  return ["image", "video"];
}
export const UPLOAD_TYPES: Record<string, { kind: "image" | "video"; maxMb: number }> = {
  "image/jpeg": { kind: "image", maxMb: 8 },
  "image/png": { kind: "image", maxMb: 8 },
  "image/webp": { kind: "image", maxMb: 8 },
  "video/mp4": { kind: "video", maxMb: 50 },
  "video/quicktime": { kind: "video", maxMb: 50 },
};

/** Post and target statuses on StatusBadge (dot + word). Social has no family of its own: the batch family is the closest. */
export const POST_STATUS: Record<SocialPost["status"], { status: Status; label: string }> = {
  draft: { status: "draft", label: "Draft" },
  pending_approval: { status: "paused", label: "Waiting for approval" },
  scheduled: { status: "scheduled", label: "Scheduled" },
  publishing: { status: "sending", label: "Publishing" },
  published: { status: "sent", label: "Published" },
  partial: { status: "paused", label: "Partly published" },
  failed: { status: "failed", label: "Failed" },
  cancelled: { status: "ended", label: "Cancelled" },
};
export const TARGET_STATUS: Record<SocialTarget["status"], { status: Status; label: string }> = {
  queued: { status: "draft", label: "Queued" },
  publishing: { status: "sending", label: "Publishing" },
  published: { status: "sent", label: "Live" },
  failed: { status: "failed", label: "Failed" },
  cancelled: { status: "ended", label: "Cancelled" },
};

/** Provider errors said better than the network says them; anything else is shown as the network wrote it. */
export function errorText(raw: string) {
  if (/business accounts|pinner data|PINNER_DATA_ACCESS/i.test(raw))
    return "Pinterest needs a business account. Switch in Pinterest settings, then retry.";
  return raw;
}

/** What to call a post in a list: its name, else the first line of what went out. */
export function postName(p: SocialPost) {
  const shared = p.targets.some((x) => !x.bodyOverride);
  const text = (p.title?.trim() || (shared ? p.body : p.targets[0]?.bodyOverride) || p.body || "").trim();
  return Array.from(text.split("\n")[0] ?? "").slice(0, 120).join("");
}

export const networksOf = (targets: { network: SocialNetwork }[]) => SOCIAL_NETWORKS.filter((n) => targets.some((x) => x.network === n));

// ------------------------------------------------------------------ TikTok (Content Sharing Guidelines)
export const PRIVACY_LABEL: Record<TikTokPrivacy, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};
export type TikTokChoice = { privacy: TikTokPrivacy | null; comment: boolean; duet: boolean; stitch: boolean; disclose: boolean; yourBrand: boolean; branded: boolean };
export const BLANK_TIKTOK: TikTokChoice = { privacy: null, comment: false, duet: false, stitch: false, disclose: false, yourBrand: false, branded: false };
export const TIKTOK_MUSIC_URL = "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en";
export const TIKTOK_BRANDED_URL = "https://www.tiktok.com/legal/page/global/bc-policy/en";
