import {
  type Campaign,
  CURRENT_USER,
  type Template,
  campaignStatus,
  sampleCampaigns,
} from "@/app/(app)/campaigns/_components/data";
import { getBatch } from "@/app/(app)/batches/_components/data";
import { batches, members, senders, type Sender } from "@/lib/mock/workspace";

// Template-level data the Campaigns mock doesn't carry: kind, subject, preheader, default sender, body and
// replies. Keyed by the template ids in campaigns/data.ts (t1..t9). Names fictional, numbers illustrative.

export type TemplateKind = "letter" | "design";

// ---------------------------------------------------------------------------------------------------------
// Body blocks. A first build of the editor (2026-10-28): a template is a list of blocks instead of free HTML.
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
  paragraph: "Paragraph",
  image: "Image",
  button: "Button",
  divider: "Divider",
  hero: "Hero",
};

/** Blocks offered per kind. A poster leads with a hero and has no separate heading. */
export const BLOCKS_FOR: Record<TemplateKind, BlockType[]> = {
  letter: ["heading", "paragraph", "image", "button", "divider"],
  design: ["hero", "paragraph", "image", "button", "divider"],
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
  blocks: Block[];
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

/** Starting body for a new template (live app starts letters from a short intro, EmailTemplateEditor:107). */
export function starterBlocks(kind: TemplateKind): Block[] {
  return kind === "design"
    ? [B.hero("Your headline", "One line that says why it matters"), B.img(undefined, ""), B.btn("Learn more", "https://")]
    : [
        B.p("Hi {{recipient_first_name}},"),
        B.p("I'm reaching out from {{sender_name}}. We work with companies like {{company_name}} and thought what we do might be relevant to you."),
        signature(),
      ];
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
  const own = batches.filter((b) => b.templateId === t.id && b.sent > 0 && getBatch(b.id)?.metrics);
  if (own.length === 0) return t;
  const sum = (k: "delivered" | "opens" | "clicks" | "bounces" | "unsubs") =>
    own.reduce((n, b) => n + (getBatch(b.id)!.metrics![k] ?? 0), 0);
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

export function allTemplates(campaigns: Campaign[] = sampleCampaigns): TemplateRow[] {
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

export function findTemplate(id: string, campaigns: Campaign[] = sampleCampaigns) {
  for (const c of campaigns) {
    const t = c.templates.find((x) => x.id === id);
    if (t) return { template: withBatchTotals(t), campaign: c };
  }
  return null;
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
  edit: (owner: string) => `Only ${ownerName(owner)} or people they share with can do this. Ask them to share it.`,
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
