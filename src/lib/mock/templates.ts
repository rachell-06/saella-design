import {
  type Campaign,
  CURRENT_USER,
  type Template,
  campaignStatus,
  sampleCampaigns,
} from "@/lib/mock/campaigns";
import { allBatches } from "@/lib/mock/batches";
import { blocksToHtml } from "@/lib/mock/templates-html";
import { members, senders, type Sender } from "@/lib/mock/workspace";
import { type ActivityEntry, type TemplateStoreState, templateStore } from "@/lib/mock/template-store";

// Template-level data the Campaigns mock doesn't carry: kind, subject, preheader, default sender, body and
// replies. Keyed by the template ids in campaigns/data.ts (t1..t9). Names fictional, numbers illustrative.

export type TemplateKind = "letter" | "design";

// ---------------------------------------------------------------------------------------------------------
// Body blocks. A first build of the editor: a template is a list of blocks instead of free HTML.
// Letter = rich text read top to bottom; design (poster) = the same list rendered as centred poster sections
// plus a hero block. AC-EC-T-01: the kind can be switched per template.
// ---------------------------------------------------------------------------------------------------------

export type HeroTone = "soft" | "muted" | "ink";

export type Block =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; file?: string; alt: string }
  | { id: string; type: "button"; label: string; url: string }
  | { id: string; type: "divider" }
  | { id: string; type: "hero"; headline: string; subline: string; tone: HeroTone };

export type BlockType = Block["type"];

export const BLOCK_LABEL: Record<BlockType, string> = {
  heading: "Heading",
  paragraph: "Text",
  image: "Image",
  button: "Button",
  divider: "Divider",
  hero: "Hero",
};

/** Blocks offered per kind, in menu order (Text first; a Design may have headings too). */
export const BLOCKS_FOR: Record<TemplateKind, BlockType[]> = {
  letter: ["heading", "paragraph", "image", "button", "divider"],
  design: ["paragraph", "heading", "image", "button", "divider", "hero"],
};

let blockSeq = 0;
export const newBlockId = () => `b${Date.now().toString(36)}${(blockSeq++).toString(36)}`;

export function emptyBlock(type: BlockType): Block {
  const id = newBlockId();
  switch (type) {
    case "heading":
      return { id, type, text: "New heading" };
    case "paragraph":
      return { id, type, text: "Write something for {{recipient_first_name}}." };
    case "image":
      return { id, type, alt: "" };
    case "button":
      return { id, type, label: "Learn more", url: "https://" };
    case "divider":
      return { id, type };
    case "hero":
      return { id, type, headline: "Your headline", subline: "One line that says why it matters", tone: "soft" };
  }
}

// Switching kind keeps every block's words: hero ↔ heading.
export function convertBlocks(blocks: Block[], to: TemplateKind): Block[] {
  return blocks.map((b) => {
    if (to === "letter" && b.type === "hero") return { id: b.id, type: "heading", text: b.headline };
    if (to === "design" && b.type === "heading") return { id: b.id, type: "hero", headline: b.text, subline: "", tone: "soft" };
    return b;
  });
}

// Merge tags from the live app (Repo src/lib/email/templating.ts MERGE_TAGS). unsubscribe_url is a system tag:
// the renderer appends an unsubscribe footer when the body has none (Repo src/lib/email/render.ts:153).
export const MERGE_TAGS = [
  { tag: "recipient_first_name", label: "First name", example: "Jane", fallback: "there" },
  { tag: "recipient_name", label: "Full name", example: "Jane Nguyen", fallback: "there" },
  { tag: "company_name", label: "Company", example: "Lotus Riverside Hotel", fallback: "your company" },
  { tag: "recipient_email", label: "Email", example: "jane@lotus-riverside.vn", fallback: "" },
  { tag: "sender_name", label: "Sender name", example: "Linh Tran", fallback: "" },
  { tag: "sender_email", label: "Sender email", example: "linh@northwind-ceramics.com", fallback: "" },
] as const;

export const KNOWN_TAGS = new Set<string>([...MERGE_TAGS.map((m) => m.tag), "unsubscribe_url"]);

/** Splits text into plain parts and {{tag}} parts. */
export function splitTags(text: string): { text: string; tag?: string }[] {
  const parts: { text: string; tag?: string }[] = [];
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], tag: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export function resolveTags(text: string, values: Record<string, string>) {
  return splitTags(text)
    .map((p) => (p.tag ? (values[p.tag] ?? p.text) : p.text))
    .join("");
}

// ---------------------------------------------------------------------------------------------------------
// Per-template details
// ---------------------------------------------------------------------------------------------------------

export type TemplateDetails = {
  kind: TemplateKind;
  subject: string;
  preheader: string;
  /** Sticky default sender (AC-EC-SA-03, BR-RULE-EC-43). Unset = the admin-marked default. */
  senderId?: string;
  /** Design body. For a Letter: the same content as blocks, derived from `html` (lists, checks, the agent). */
  blocks: Block[];
  /** Letter body: rich-text HTML (live app body_html, TipTap). Seed letters get it from blocks. */
  html?: string;
  replies: number;
  updatedAt: string;
  /** Members the owner shared it with (BR-RULE-EC-41), by email. */
  sharedWith: string[];
  /** Click totals per link, across every send (live app TemplateLinkStat). */
  links: { url: string; clicks: number }[];
};

const signature = (name = "Linh Tran"): Block => ({
  id: newBlockId(),
  type: "paragraph",
  text: `Best regards,\n${name}\nNorthwind Ceramics · northwind-ceramics.com`,
});

const B = {
  h: (text: string): Block => ({ id: newBlockId(), type: "heading", text }),
  p: (text: string): Block => ({ id: newBlockId(), type: "paragraph", text }),
  img: (file: string | undefined, alt: string): Block => ({ id: newBlockId(), type: "image", file, alt }),
  btn: (label: string, url: string): Block => ({ id: newBlockId(), type: "button", label, url }),
  hr: (): Block => ({ id: newBlockId(), type: "divider" }),
  hero: (headline: string, subline: string, tone: HeroTone = "soft"): Block => ({ id: newBlockId(), type: "hero", headline, subline, tone }),
};

export const templateDetails: Record<string, TemplateDetails> = {
  t1: {
    kind: "letter",
    subject: "Handmade tableware for {{company_name}} guest rooms",
    preheader: "Our 2026 catalog, with hotel pricing inside",
    senderId: "s1",
    blocks: [
      B.p("Hi {{recipient_first_name}},"),
      B.p("I'm Linh from Northwind Ceramics. We make glazed tableware and bathroom sets for hotels across Vietnam, fired in small batches in Bat Trang."),
      B.img("catalog-cover.jpg", "Cover of the Northwind 2026 hotel catalog: stacked white plates with a blue rim"),
      B.p("Our new catalog has hotel pricing for orders from 200 pieces, and we can match your brand colour on cups and trays."),
      B.btn("View the catalog", "https://northwind-ceramics.com/catalog-2026"),
      B.hr(),
      signature(),
    ],
    replies: 19,
    updatedAt: "2026-10-25T01:12:00Z",
    sharedWith: ["an@northwind-ceramics.com"],
    links: [
      { url: "northwind-ceramics.com/catalog-2026", clicks: 61 },
      { url: "northwind-ceramics.com/hotel-pricing", clicks: 13 },
    ],
  },
  t2: {
    kind: "letter",
    subject: "Did the catalog reach you, {{recipient_first_name}}?",
    preheader: "Two minutes, then I'll stop asking",
    senderId: "s1",
    blocks: [
      B.p("Hi {{recipient_first_name}},"),
      B.p("Just checking that last week's catalog reached the right person at {{company_name}}. If someone else handles purchasing, I'd be glad to send it to them."),
      B.btn("See hotel pricing", "https://northwind-ceramics.com/hotel-pricing"),
      signature(),
    ],
    // Matches batch b2, still sending (412 of 640): 17 clicked, 10 replied (batches/_components/data.ts).
    replies: 10,
    updatedAt: "2026-10-23T20:40:00Z",
    sharedWith: [],
    links: [{ url: "northwind-ceramics.com/hotel-pricing", clicks: 17 }],
  },
  t3: {
    kind: "letter",
    // Kept rough on purpose: it shows the content check (spam words, caps, a missing alt text).
    subject: "FREE holiday pricing – act now!!",
    preheader: "",
    blocks: [
      B.h("Holiday pricing for {{company_name}}"),
      B.p("Order before December 10 and we guarantee delivery before the new year, with 100% free shipping on orders over 500 pieces."),
      B.img("holiday-set.jpg", ""),
      B.btn("Get the price list", "https://northwind-ceramics.com/holiday"),
      signature(),
    ],
    replies: 0,
    updatedAt: "2026-10-26T03:05:00Z",
    sharedWith: [],
    links: [],
  },
  t4: {
    kind: "letter",
    subject: "Great to meet you in Bangkok, {{recipient_first_name}}",
    preheader: "The samples you asked about, and next steps",
    senderId: "s1",
    blocks: [
      B.p("Hi {{recipient_first_name}},"),
      B.p("Thank you for stopping by our booth at the Bangkok trade fair. As promised, here are the pieces you liked, with lead times and minimum orders."),
      B.img("fair-booth.jpg", "Northwind booth at the Bangkok fair with the celadon range on display"),
      B.btn("Request samples", "https://northwind-ceramics.com/samples"),
      signature(),
    ],
    replies: 23,
    updatedAt: "2026-09-11T02:00:00Z",
    sharedWith: [],
    links: [{ url: "northwind-ceramics.com/samples", clicks: 41 }],
  },
  t5: {
    kind: "letter",
    subject: "Your samples are ready to ship",
    preheader: "Pick an address and we'll send them this week",
    senderId: "s1",
    blocks: [
      B.p("Hi {{recipient_first_name}},"),
      B.p("Your sample box is packed. Reply with the delivery address for {{company_name}} and we'll ship it this week."),
      signature(),
    ],
    replies: 11,
    updatedAt: "2026-09-14T19:00:00Z",
    sharedWith: [],
    links: [],
  },
  t6: {
    kind: "letter",
    subject: "Q4 reorder: lock in 2026 prices",
    preheader: "Prices change on January 1",
    senderId: "s2",
    blocks: [
      B.p("Hello {{recipient_first_name}},"),
      B.p("Our 2027 price list starts on January 1. Orders confirmed before December 15 keep this year's prices."),
      B.btn("Reorder now", "https://northwind-ceramics.com/reorder"),
      signature("Minh Pham"),
    ],
    replies: 64,
    updatedAt: "2026-10-19T23:30:00Z",
    sharedWith: [],
    links: [
      { url: "northwind-ceramics.com/reorder", clicks: 171 },
      { url: "northwind-ceramics.com/price-list-2027", clicks: 34 },
    ],
  },
  t7: {
    kind: "design",
    subject: "The Song Hong tile range, for specifiers",
    preheader: "Eight glazes, three formats, samples in 5 days",
    senderId: "s1",
    blocks: [
      B.hero("Song Hong tiles", "Eight river glazes for kitchens, baths and lobbies", "ink"),
      B.img("lookbook-hero.jpg", "Bathroom wall in green Song Hong tiles with brass fittings"),
      B.p("Hand-glazed in Bat Trang. Each batch is numbered, so a reorder matches the first one."),
      B.btn("Open the lookbook", "https://northwind-ceramics.com/song-hong"),
    ],
    replies: 1,
    updatedAt: "2026-10-23T02:00:00Z",
    sharedWith: [],
    links: [{ url: "northwind-ceramics.com/song-hong", clicks: 3 }],
  },
  t8: {
    kind: "design",
    subject: "Song Hong lookbook",
    preheader: "",
    senderId: "s2",
    blocks: [
      B.hero("Song Hong", "The lookbook", "soft"),
      B.img("lookbook-grid.jpg", "Grid of eight tile glazes"),
      B.btn("See all glazes", "https://northwind-ceramics.com/song-hong"),
    ],
    replies: 0,
    updatedAt: "2026-10-22T01:00:00Z",
    sharedWith: [CURRENT_USER],
    links: [],
  },
  t9: {
    kind: "design",
    subject: "A first look at Spring 2027",
    preheader: "New colours for the coming season",
    blocks: [B.hero("Spring 2027", "A first look", "soft"), B.img(undefined, ""), B.btn("Preview the range", "https://")],
    replies: 0,
    updatedAt: "2026-10-18T21:00:00Z",
    sharedWith: [],
    links: [],
  },
};

export function detailsFor(id: string): TemplateDetails {
  const s = templateStore();
  const found = s.copies.find((c) => c.template.id === id)?.details ?? baseDetails(id);
  // Seed letters were written as blocks: their HTML is made once from them.
  const base = found.kind === "letter" && found.html === undefined ? { ...found, html: blocksToHtml(found.blocks) } : found;
  const shares = s.shares[id];
  return shares ? { ...base, sharedWith: [...shares] } : base;
}

function baseDetails(id: string): TemplateDetails {
  return (
    templateDetails[id] ?? {
      kind: "letter",
      subject: "",
      preheader: "",
      blocks: [],
      replies: 0,
      updatedAt: "2026-10-26T17:00:00Z",
      sharedWith: [],
      links: [],
    }
  );
}

/**
 * How a Design starts (live app StarterPicker, poster step): blank, or one of the four prebuilt posters
 * (Repo src/lib/email/posters/presets.ts). Images are empty placeholders to upload, as in the live presets.
 * `description` is the purpose in a few words: the gallery cards have one short line for it.
 */
export const DESIGN_STARTS = [
  { key: "blank", name: "Blank", untitled: "Untitled poster", description: "Start empty" },
  { key: "esg-outreach", name: "ESG outreach", untitled: "Untitled ESG outreach", description: "For credibility-led outreach" },
  { key: "newsletter", name: "Newsletter", untitled: "Untitled newsletter", description: "For news and announcements" },
  { key: "product-launch", name: "Product launch", untitled: "Untitled product launch", description: "For launches and releases" },
  { key: "minimal", name: "Minimal", untitled: "Untitled minimal poster", description: "For short pitches" },
] as const;

export type DesignStart = (typeof DESIGN_STARTS)[number]["key"];

export const isDesignStart = (v: string | null | undefined): v is DesignStart => DESIGN_STARTS.some((s) => s.key === v);

/** The name a new template gets until someone names it (live app: "Untitled template", "Untitled poster", "Untitled <preset>"). */
export function untitledName(kind: TemplateKind, start?: DesignStart) {
  if (kind === "letter") return "Untitled template";
  return (DESIGN_STARTS.find((s) => s.key === start) ?? DESIGN_STARTS[0]).untitled;
}

/**
 * Starting body for a new template. Letter: the live app's outreach example (EmailTemplateEditor
 * FREEFORM_DEFAULT_BODY: greeting, intro, a value paragraph to replace, a question, sign-off), with Saella's merge
 * tags. Design: the picked poster, or nothing for Blank.
 */
export function starterBlocks(kind: TemplateKind, start: DesignStart = "blank"): Block[] {
  if (kind === "letter")
    return [
      B.p("Dear {{recipient_name}},"),
      B.p("I hope this email finds you well."),
      B.p("I'm reaching out from {{sender_name}}. We work with companies like {{company_name}} to support their growth, and I thought what we do might be relevant to you."),
      B.p("[Replace this paragraph with a short, specific value statement: the problem you solve and why it matters to {{company_name}}.]"),
      B.p("Would you be open to a 15-minute conversation next week to see if there's a fit?"),
      B.p("Best regards,\n{{sender_name}}"),
    ];
  switch (start) {
    case "esg-outreach":
      return [
        B.hero("Cut your footprint, prove it with data", "Results our clients measured in the first year", "ink"),
        B.p("30% less energy · 2,000 t CO₂ avoided · 40 sites certified"),
        B.img(undefined, "Photo of a finished project"),
        B.p("We help companies like {{company_name}} plan, fund and report their sustainability work, from the first audit to the certificate."),
        B.btn("Book a 15-minute call", "https://"),
        B.p("Best regards,\n{{sender_name}}"),
      ];
    case "newsletter":
      return [
        B.hero("News from {{sender_name}}", "What we've been working on this season", "soft"),
        B.img(undefined, "Header photo"),
        B.h("About us"),
        B.p("A short paragraph on who you are and who you work with."),
        B.h("What we offer"),
        B.p("Two or three lines on your main services, and what's new."),
        B.btn("Read more", "https://"),
      ];
    case "product-launch":
      return [
        B.hero("Introducing your new product", "Available from this month", "ink"),
        B.img(undefined, "Product photo"),
        B.p("What it does, in one or two sentences, and why it matters to {{company_name}}."),
        B.hr(),
        B.p("Three short points on what's new, the price, and how to get it."),
        B.btn("See the launch", "https://"),
      ];
    case "minimal":
      return [
        B.hero("A short headline", "One line that says why it matters", "soft"),
        B.p("Dear {{recipient_name}},"),
        B.p("Two or three sentences on what you offer {{company_name}} and what you'd like them to do."),
        B.btn("Learn more", "https://"),
        B.p("Best regards,\n{{sender_name}}"),
      ];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------------------------------------
// Rows for the all-templates list
// ---------------------------------------------------------------------------------------------------------

export type TemplateRow = Template & {
  campaignId: string;
  campaignName: string;
  campaignEnded: boolean;
  kind: TemplateKind;
  replies: number;
};

/**
 * Counts as the Batches screen has them: a template with batches in the shared batch mock takes its numbers from
 * those batches (sent so far, delivered, opens, clicks, bounces, unsubs), so a batch still sending (Follow-up 1:
 * 412 of 640) reads the same here, on the batch report and in the agent. Templates without such a batch keep the
 * Campaigns mock numbers.
 */
export function withBatchTotals(t: Template): Template {
  // Every batch of the template (shared, history and newly created), the same set the detail page sums, so the
  // list and the detail show the same totals.
  const own = allBatches().filter((b) => b.templateId === t.id && b.sent > 0 && b.metrics);
  if (own.length === 0) return t;
  const sum = (k: "delivered" | "opens" | "clicks" | "bounces" | "unsubs") =>
    own.reduce((n, b) => n + (b.metrics![k] ?? 0), 0);
  return {
    ...t,
    recipients: own.reduce((n, b) => n + b.sent, 0),
    delivered: sum("delivered"),
    opens: sum("opens"),
    clicks: sum("clicks"),
    bounces: sum("bounces"),
    unsubs: sum("unsubs"),
  };
}

/**
 * Campaigns with this session's template changes applied (lib/mock/template-store.ts): status and owner, share
 * list, copies filed into them, deleted templates gone. Screens pass the store snapshot from useTemplateStore.
 */
export function applyTemplateStore(campaigns: Campaign[], s: TemplateStoreState = templateStore()): Campaign[] {
  if (!s.copies.length && !s.deleted.length && !Object.keys(s.patch).length && !Object.keys(s.shares).length)
    return campaigns;
  const gone = new Set(s.deleted);
  return campaigns.map((c) => ({
    ...c,
    templates: [...c.templates, ...s.copies.filter((x) => x.campaign.id === c.id).map((x) => x.template)]
      .filter((t) => !gone.has(t.id))
      .map((t) => {
        const shares = s.shares[t.id];
        return { ...t, ...s.patch[t.id], shared: shares ? shares.includes(CURRENT_USER) : t.shared };
      }),
  }));
}

export function allTemplates(campaigns: Campaign[] = applyTemplateStore(sampleCampaigns)): TemplateRow[] {
  return campaigns.flatMap((c) =>
    c.templates.map((raw) => {
      const t = withBatchTotals(raw);
      const d = detailsFor(t.id);
      return {
        ...t,
        // Sharing in campaigns/data.ts is a flag on the viewer; the details list is the owner's share list.
        shared: t.shared || d.sharedWith.includes(CURRENT_USER),
        campaignId: c.id,
        campaignName: c.name,
        campaignEnded: campaignStatus(c) === "ended",
        kind: d.kind,
        replies: d.replies,
      };
    })
  );
}

export function findTemplate(id: string, campaigns?: Campaign[]) {
  const s = templateStore();
  if (s.deleted.includes(id)) return null;
  for (const c of campaigns ?? applyTemplateStore(sampleCampaigns, s)) {
    const t = c.templates.find((x) => x.id === id);
    if (t) return { template: withBatchTotals(t), campaign: c };
  }
  // A copy filed into a campaign made this session (not in the seed list).
  const copy = s.copies.find((x) => x.template.id === id);
  if (!copy) return null;
  const [campaign] = applyTemplateStore([{ ...copy.campaign, templates: [] }], s);
  return { template: campaign.templates.find((x) => x.id === id) ?? copy.template, campaign };
}

/** Session-made ids (copies, templates created in the editor) have no prerendered page; their routes must not 404 on the server. */
export const isSessionTemplateId = (id: string) => id.startsWith("copy-") || id.startsWith("tpl-");

// ---------------------------------------------------------------------------------------------------------
// Activity log (live app TemplateActivityModal, template-activity.ts): who changed or sent the template, newest
// first. Seeded from the mock (sends from the batch mock, the last edit, shares), then this session's actions.
// ---------------------------------------------------------------------------------------------------------

export function activityFor(id: string, s: TemplateStoreState = templateStore()): ActivityEntry[] {
  const found = findTemplate(id);
  if (!found) return [...(s.log[id] ?? [])];
  const isCopy = s.copies.some((c) => c.template.id === id);
  const seed: ActivityEntry[] = [];
  if (!isCopy) {
    // The seed history is the mock owner's, from before any transfer this session.
    const owner = sampleCampaigns.flatMap((c) => c.templates).find((t) => t.id === id)?.owner ?? found.template.owner;
    const d = baseDetails(id);
    seed.push({ id: `${id}-edit`, action: "edit", actor: owner, at: d.updatedAt, detail: "Subject, content" });
    const sharedAt = new Date(Date.parse(d.updatedAt) - 2 * 86_400_000).toISOString();
    for (const email of d.sharedWith)
      seed.push({ id: `${id}-share-${email}`, action: "share", actor: owner, at: sharedAt, detail: `with ${ownerName(email)}` });
    for (const b of allBatches().filter((x) => x.templateId === id && x.sent > 0 && x.sentAt)) {
      const operator = members.find((m) => m.id === b.operatorId)?.email ?? owner;
      const from = senders.find((x) => x.id === b.senderId)?.email ?? "";
      seed.push({
        id: `${id}-${b.id}`,
        action: "send",
        actor: operator,
        at: b.sentAt!,
        detail: `${b.sent.toLocaleString("en-US")} recipients · ${from}`,
      });
    }
  }
  return [...(s.log[id] ?? []), ...seed].sort((a, b) => b.at.localeCompare(a.at));
}

// ---------------------------------------------------------------------------------------------------------
// Permissions: the live app's four tiers (Repo src/lib/email/template-permissions.ts).
//   owner  = creator: everything.  admin = workspace admin: everything + transfer.
//   shared = on the share list: edit, send, automate, activate, copy (AC-EC-TO-02).
//   viewer = everyone else: view and copy (AC-EC-TO-03).
// A button someone may not press is disabled and says why, never hidden (same file, header comment).
// ---------------------------------------------------------------------------------------------------------

export type TemplateAccess = "owner" | "admin" | "shared" | "viewer";

export type Viewer = { email: string; isAdmin: boolean };

/** Linh is the workspace admin in the shared mock; `?state=member` previews her as a plain member. */
export function viewerFor(previewState: string | null): Viewer {
  const me = members.find((m) => m.email === CURRENT_USER);
  return { email: CURRENT_USER, isAdmin: previewState === "member" ? false : me?.role === "admin" };
}

export function accessFor(t: Pick<Template, "owner" | "shared">, viewer: Viewer): TemplateAccess {
  if (t.owner === viewer.email) return "owner"; // owner outranks admin so the labels stay honest
  if (viewer.isAdmin) return "admin";
  if (t.shared) return "shared";
  return "viewer";
}

export const canEdit = (a: TemplateAccess) => a === "owner" || a === "admin" || a === "shared";
export const canManage = (a: TemplateAccess) => a === "owner" || a === "admin";
export const canTransfer = (a: TemplateAccess, viewer: Viewer) => a === "admin" || (viewer.isAdmin && a === "owner");

export const ownerName = (email: string) => members.find((m) => m.email === email)?.name ?? email.split("@")[0];

/** Why an action is locked, in the viewer's words. */
export const lockReason = {
  edit: (owner: string) => `Only ${ownerName(owner)} or people they share with can do this.`,
  manage: (owner: string) => `Only the owner (${ownerName(owner)}) or an admin can do this.`,
  transfer: "Only a workspace admin can move a template to another owner.",
};

// ---------------------------------------------------------------------------------------------------------
// Senders. BR-RULE-EC-42: the picker offers the chooser's own confirmed sender plus admin-marked shared
// identities. AC-EC-SA-02: without a sticky choice the admin-marked default is pre-selected.
// ---------------------------------------------------------------------------------------------------------

export function senderOptions(viewerEmail: string): Sender[] {
  const me = members.find((m) => m.email === viewerEmail);
  return senders.filter((s) => s.status === "confirmed" && (s.shared || s.ownerId === me?.id));
}

export const DEFAULT_SENDER_ID = "s0";

export function senderById(id?: string) {
  return senders.find((s) => s.id === id);
}

/** Sample recipient for the preview (Repo templating.ts examples). */
export const SAMPLE_VALUES: Record<string, string> = Object.fromEntries(MERGE_TAGS.map((m) => [m.tag, m.example]));
