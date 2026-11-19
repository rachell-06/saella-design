// Social posting (live app origin/development 2026-11-05: src/lib/social/*, src/components/social/*; PRD-12
// https://pgg-prd-lib.vercel.app/docs/saella-prd-social). Fictional Northwind Ceramics accounts, campaigns and posts,
// enough to show every state the live screens have. Times are UTC ISO strings, shown in workspace time (GMT+7).
import { CURRENT_USER } from "./constants";

/** Every network the live app knows (lib/social/types.ts SOCIAL_NETWORKS), in its display order. */
export const SOCIAL_NETWORKS = ["facebook", "instagram", "threads", "linkedin", "tiktok", "youtube", "pinterest", "douyin"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export type AccountKind =
  | "page"
  | "ig_business"
  | "threads_profile"
  | "linkedin_org"
  | "linkedin_member"
  | "tiktok_user"
  | "youtube_channel"
  | "pinterest_user"
  | "douyin_user";

/** live = posts go here; paused = switched off in the network settings; lost = the login no longer covers it. */
export type SocialAccount = {
  id: number;
  loginId: number;
  network: SocialNetwork;
  kind: AccountKind;
  name: string;
  handle: string | null;
  status: "active" | "disabled" | "lost";
  canPublish: boolean;
  login: { displayName: string | null; status: "active" | "expired" };
};

/** Per network: which implementation serves it (null = not available on this deployment) and how many accounts one login brings. */
export type NetworkInfo = { network: SocialNetwork; route: "direct" | "mock" | null; fanout: "one" | "many"; error: string | null };

export const NETWORK_INFO: NetworkInfo[] = [
  { network: "facebook", route: "direct", fanout: "many", error: null },
  { network: "instagram", route: "direct", fanout: "one", error: null },
  { network: "threads", route: "direct", fanout: "one", error: null },
  { network: "linkedin", route: "direct", fanout: "many", error: null },
  // Demo route: the whole flow runs, nothing reaches TikTok (live providers/mock.ts).
  { network: "tiktok", route: "mock", fanout: "one", error: null },
  // No direct provider yet (live providers/index.ts: "YouTube / Douyin direct: next").
  { network: "youtube", route: null, fanout: "one", error: null },
  { network: "pinterest", route: "direct", fanout: "one", error: null },
  { network: "douyin", route: null, fanout: "one", error: null },
];

export const socialAccounts: SocialAccount[] = [
  { id: 11, loginId: 1, network: "facebook", kind: "page", name: "Northwind Ceramics", handle: null, status: "active", canPublish: true, login: { displayName: "Linh Tran", status: "active" } },
  { id: 12, loginId: 1, network: "facebook", kind: "page", name: "Northwind Studio Café", handle: null, status: "active", canPublish: true, login: { displayName: "Linh Tran", status: "active" } },
  { id: 13, loginId: 1, network: "facebook", kind: "page", name: "Northwind Outlet", handle: null, status: "disabled", canPublish: true, login: { displayName: "Linh Tran", status: "active" } },
  { id: 21, loginId: 2, network: "instagram", kind: "ig_business", name: "Northwind Ceramics", handle: "northwindceramics", status: "active", canPublish: true, login: { displayName: "northwindceramics", status: "active" } },
  { id: 41, loginId: 4, network: "linkedin", kind: "linkedin_org", name: "Northwind Ceramics", handle: null, status: "active", canPublish: true, login: { displayName: "Linh Tran", status: "active" } },
  { id: 42, loginId: 4, network: "linkedin", kind: "linkedin_member", name: "Linh Tran", handle: null, status: "active", canPublish: true, login: { displayName: "Linh Tran", status: "active" } },
  { id: 51, loginId: 5, network: "tiktok", kind: "tiktok_user", name: "Northwind Clay", handle: "northwind.clay", status: "active", canPublish: true, login: { displayName: "Northwind Clay", status: "active" } },
  // Sign-in expired: the account shows Lost until someone connects Pinterest again.
  { id: 71, loginId: 7, network: "pinterest", kind: "pinterest_user", name: "Northwind Ceramics", handle: "northwindceramics", status: "active", canPublish: true, login: { displayName: "northwindceramics", status: "expired" } },
];

/** How Saella should write for each network (live /api/social/settings). Empty = its usual style. */
export const networkPrompts: Partial<Record<SocialNetwork, string>> = {
  facebook: "Friendly and short, 1–2 emoji, end with 3 hashtags.",
  linkedin: "Professional. Speak to buyers at cafés and boutique hotels; no emoji.",
};

export type SocialMedia = { kind: "image" | "video"; url: string; width?: number; height?: number; durationS?: number };

export type TargetStatus = "queued" | "publishing" | "published" | "failed" | "cancelled";
export type PostStatus = "draft" | "pending_approval" | "scheduled" | "publishing" | "published" | "partial" | "failed" | "cancelled";

/** One account a post goes to, with its own result and newest numbers. */
export type SocialTarget = {
  id: number;
  accountId: number;
  network: SocialNetwork;
  status: TargetStatus;
  bodyOverride?: string | null;
  deletedAt?: string | null;
  editedAt?: string | null;
  publishedAt?: string | null;
  permalink: string | null;
  lastError: string | null;
  metrics: Record<string, number> | null;
  metricsAt?: string | null;
};

export type SocialPost = {
  id: number;
  campaignId: number;
  title: string | null;
  createdBy: string;
  createdAt: string;
  scheduledAt: string | null;
  archivedAt: string | null;
  status: PostStatus;
  body: string;
  media: SocialMedia[];
  targets: SocialTarget[];
};

export type SocialCampaign = { id: number; name: string; brief: string; updatedAt: string };

export const socialCampaigns: SocialCampaign[] = [
  {
    id: 1,
    name: "Autumn glaze collection",
    brief:
      "Launch of the hand-glazed autumn range: 12 pieces in rust, moss and oat. For home cooks and café owners in Ho Chi Minh City and Singapore. Key message: small-batch, food-safe, dishwasher-safe. Offer: 15% off the first order until Nov 30 with code AUTUMN15. Link: northwind-ceramics.com/autumn",
    updatedAt: "2026-10-24T08:10:00Z",
  },
  {
    id: 2,
    name: "Café partner program",
    brief: "Wholesale tableware for cafés and boutique hotels: volume pricing from 50 pieces, custom glaze colours, 3-week lead time. Goal: partner enquiries through the contact form.",
    updatedAt: "2026-10-26T02:30:00Z",
  },
  { id: 3, name: "Holiday gift sets", brief: "", updatedAt: "2026-10-26T09:00:00Z" },
];

const LINK = (n: SocialNetwork, id: string) => `https://www.${n === "tiktok" ? "tiktok" : n}.com/northwind/${id}`;
const PHOTO = (k: number): SocialMedia => ({ kind: "image", url: `mock:photo-${k}`, width: 1080, height: 1350 });
const VIDEO: SocialMedia = { kind: "video", url: "mock:video-1", width: 1080, height: 1920, durationS: 42 };

const AUTUMN_BODY =
  "Our autumn glazes are here 🍂 Rust, moss and oat, each piece dipped by hand in our Thu Duc studio.\n\nFood-safe, dishwasher-safe, made in small batches. Take 15% off your first order with AUTUMN15 until Nov 30.\n\nnorthwind-ceramics.com/autumn #handmade #ceramics #tableware";

const live = (id: number, accountId: number, network: SocialNetwork, at: string, metrics: Record<string, number> | null, extra: Partial<SocialTarget> = {}): SocialTarget => ({
  id,
  accountId,
  network,
  status: "published",
  publishedAt: at,
  permalink: LINK(network, String(id)),
  lastError: null,
  metrics,
  metricsAt: "2026-10-27T02:40:00Z",
  ...extra,
});
const queued = (id: number, accountId: number, network: SocialNetwork): SocialTarget => ({ id, accountId, network, status: "queued", permalink: null, lastError: null, metrics: null });

export const socialPosts: SocialPost[] = [
  {
    id: 101,
    campaignId: 1,
    title: "Autumn range launch",
    createdBy: CURRENT_USER,
    createdAt: "2026-10-20T02:00:00Z",
    scheduledAt: null,
    archivedAt: null,
    status: "published",
    body: AUTUMN_BODY,
    media: [PHOTO(1), PHOTO(2), PHOTO(3)],
    targets: [
      live(1011, 11, "facebook", "2026-10-20T02:01:00Z", { impressions: 4820, likes: 212, comments: 18, shares: 27 }),
      live(1012, 12, "facebook", "2026-10-20T02:02:00Z", { impressions: 1310, likes: 64, comments: 5, shares: 3 }),
      live(1013, 21, "instagram", "2026-10-20T02:01:00Z", { views: 6930, likes: 488, comments: 41, saves: 96 }),
      live(1014, 41, "linkedin", "2026-10-20T02:01:00Z", { impressions: 2210, likes: 57, comments: 6, shares: 4 }, {
        bodyOverride:
          "Our autumn range is out: 12 hand-glazed pieces in rust, moss and oat, food-safe and dishwasher-safe.\n\nCafé and hotel buyers: ask about volume pricing from 50 pieces.\n\nnorthwind-ceramics.com/autumn",
        editedAt: "2026-10-21T03:00:00Z",
      }),
    ],
  },
  {
    id: 102,
    campaignId: 1,
    title: "Moss glaze close-up",
    createdBy: "minh@northwind-ceramics.com",
    createdAt: "2026-10-26T07:20:00Z",
    scheduledAt: "2026-10-29T02:00:00Z",
    archivedAt: null,
    status: "scheduled",
    body: "Moss, up close. Every bowl takes its own green where the glaze pools. Which one would you pick? #handmade #ceramics",
    media: [PHOTO(4)],
    targets: [queued(1021, 11, "facebook"), queued(1022, 21, "instagram"), queued(1023, 41, "linkedin")],
  },
  {
    id: 103,
    campaignId: 1,
    title: null,
    createdBy: CURRENT_USER,
    createdAt: "2026-10-23T04:00:00Z",
    scheduledAt: null,
    archivedAt: null,
    status: "partial",
    body: "Oat glaze plates, stacked and ready for your table. Shop the set: northwind-ceramics.com/autumn",
    media: [PHOTO(5)],
    targets: [
      live(1031, 11, "facebook", "2026-10-23T04:01:00Z", { impressions: 2140, likes: 96, comments: 7, shares: 9 }),
      live(1032, 21, "instagram", "2026-10-23T04:01:00Z", { views: 3410, likes: 251, comments: 12, saves: 40 }),
      { id: 1033, accountId: 71, network: "pinterest", status: "failed", permalink: null, lastError: "Pinterest API: PINNER_DATA_ACCESS required for business accounts", metrics: null },
    ],
  },
  {
    id: 104,
    campaignId: 1,
    title: "Studio tour reel",
    createdBy: CURRENT_USER,
    createdAt: "2026-10-22T10:00:00Z",
    scheduledAt: null,
    archivedAt: null,
    status: "published",
    body: "From wet clay to your table: 40 seconds inside the Northwind studio. #pottery #behindthescenes",
    media: [VIDEO],
    targets: [
      live(1041, 51, "tiktok", "2026-10-22T10:03:00Z", { views: 12840, likes: 1033, comments: 58, shares: 71 }),
      live(1042, 21, "instagram", "2026-10-22T10:02:00Z", { views: 5120, likes: 402, comments: 22, saves: 61 }),
    ],
  },
  {
    id: 105,
    campaignId: 1,
    title: "Rust mugs restock",
    createdBy: "minh@northwind-ceramics.com",
    createdAt: "2026-10-21T01:30:00Z",
    scheduledAt: null,
    archivedAt: null,
    status: "published",
    body: "Rust mugs are back in stock. 350 ml, fits a flat white with room for latte art.",
    media: [PHOTO(6)],
    targets: [live(1051, 11, "facebook", "2026-10-21T01:31:00Z", { impressions: 980, likes: 41, comments: 3, shares: 1 })],
  },
  {
    id: 106,
    campaignId: 1,
    title: "Glaze colour poll",
    createdBy: CURRENT_USER,
    createdAt: "2026-10-18T09:00:00Z",
    scheduledAt: null,
    archivedAt: null,
    status: "published",
    body: "Rust, moss or oat? Tell us your favourite and we'll glaze an extra batch of the winner.",
    media: [],
    targets: [live(1061, 41, "linkedin", "2026-10-18T09:01:00Z", { impressions: 1540, likes: 38, comments: 21, shares: 2 })],
  },
  {
    id: 190,
    campaignId: 1,
    title: "Teaser (old)",
    createdBy: CURRENT_USER,
    createdAt: "2026-10-12T02:00:00Z",
    scheduledAt: null,
    archivedAt: "2026-10-19T02:00:00Z",
    status: "published",
    body: "Something warm is coming out of the kiln next week.",
    media: [PHOTO(7)],
    targets: [live(1901, 11, "facebook", "2026-10-12T02:01:00Z", { impressions: 760, likes: 30, comments: 2, shares: 0 })],
  },
  {
    id: 201,
    campaignId: 2,
    title: "Partner pricing announcement",
    createdBy: CURRENT_USER,
    createdAt: "2026-10-26T02:00:00Z",
    scheduledAt: null,
    archivedAt: null,
    status: "failed",
    body: "Opening a café or refreshing a hotel breakfast room? Northwind now offers partner pricing from 50 pieces, custom glaze colours and a 3-week lead time.",
    media: [PHOTO(8)],
    targets: [{ id: 2011, accountId: 41, network: "linkedin", status: "failed", permalink: null, lastError: "LinkedIn sign-in expired. Reconnect LinkedIn and retry.", metrics: null }],
  },
  {
    id: 202,
    campaignId: 2,
    title: "Partner spotlight: Lantern Café",
    createdBy: "minh@northwind-ceramics.com",
    createdAt: "2026-10-27T02:58:00Z",
    scheduledAt: null,
    archivedAt: null,
    status: "publishing",
    body: "Lantern Café in District 3 serves every flat white in a Northwind moss cup. Thank you for building with us ☕",
    media: [PHOTO(9)],
    targets: [
      { id: 2021, accountId: 11, network: "facebook", status: "publishing", permalink: null, lastError: null, metrics: null },
      queued(2022, 12, "facebook"),
      queued(2023, 21, "instagram"),
    ],
  },
  {
    id: 203,
    campaignId: 2,
    title: "Trade fair invite",
    createdBy: CURRENT_USER,
    createdAt: "2026-10-15T03:00:00Z",
    scheduledAt: "2026-10-20T02:00:00Z",
    archivedAt: null,
    status: "cancelled",
    body: "Meet us at the HCMC Hospitality Expo, booth C14.",
    media: [],
    targets: [{ id: 2031, accountId: 41, network: "linkedin", status: "cancelled", permalink: null, lastError: null, metrics: null }],
  },
];

/** Pictures "Write with Saella" can make (live lib/social/image-models.ts). Credits = twice the cost at $0.10 a credit. */
export const IMAGE_MODELS = [
  { id: "google/gemini-nano-banana-2.1", name: "Nano Banana 2.1", maker: "Google", speed: "fast", credits: 1 },
  { id: "google/gemini-3-pro-image", name: "Nano Banana Pro", maker: "Google", speed: "slow", credits: 3 },
  { id: "openai/gpt-image-2", name: "GPT Image 2", maker: "OpenAI", speed: "slow", credits: 1 },
  { id: "bytedance/seedream-5.0-lite", name: "Seedream 5 Lite", maker: "ByteDance", speed: "slow", credits: 1 },
  { id: "bfl/flux-3-image", name: "Flux 3", maker: "Black Forest Labs", speed: "fast", credits: 1 },
] as const;

export type TikTokPrivacy = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";
/** What TikTok's creator_info says about an account right now (live lib/social/tiktok-options.ts). */
export type TikTokCreator = {
  nickname: string;
  username: string;
  privacyOptions: TikTokPrivacy[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoSeconds: number | null;
  /** Until TikTok's audit passes, posts can only be "Only me". */
  audited: boolean;
};
export const tiktokCreators: Record<number, TikTokCreator> = {
  51: {
    nickname: "Northwind Clay",
    username: "northwind.clay",
    privacyOptions: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"],
    commentDisabled: false,
    duetDisabled: true,
    stitchDisabled: false,
    maxVideoSeconds: 600,
    audited: false,
  },
};

export const findSocialCampaign = (id: number) => socialCampaigns.find((c) => c.id === id);
export const findSocialPost = (id: number) => socialPosts.find((p) => p.id === id);
export const findSocialAccount = (id: number) => socialAccounts.find((a) => a.id === id);
