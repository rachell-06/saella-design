import type { Block } from "@/lib/mock/templates";

// A Letter's body is rich-text HTML (live app body_html, edited with TipTap; designer 2026-11-14). A Design keeps
// the block model. These helpers move between the two without losing text, sanitise what gets rendered, and fill or
// mark merge tags. Pure string work (no DOM), so server pages can use them too.

let seq = 0;
const id = () => `h${Date.now().toString(36)}${(seq++).toString(36)}`;

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (t: string) => t.replace(/[&<>"']/g, (c) => ESC[c]);
const unescape = (t: string) =>
  t
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** Blocks → Letter HTML (seed letters, Design → Letter, Saella's drafts). */
export function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return `<h2>${escapeHtml(b.text)}</h2>`;
        case "paragraph":
          return `<p>${escapeHtml(b.text).replace(/\n/g, "<br>")}</p>`;
        case "image":
          return `<img src="${escapeHtml(b.file ?? "")}" alt="${escapeHtml(b.alt)}">`;
        case "button":
          return `<p><a href="${escapeHtml(b.url)}">${escapeHtml(b.label)}</a></p>`;
        case "divider":
          return "<hr>";
        case "hero":
          return `<h1>${escapeHtml(b.headline)}</h1>${b.subline ? `<p>${escapeHtml(b.subline)}</p>` : ""}`;
      }
    })
    .join("");
}

/** Text of an HTML fragment: tags dropped, <br> kept as line breaks. */
export function htmlText(html: string) {
  return unescape(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim();
}

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? unescape(m[2] ?? m[3] ?? "") : undefined;
};

/**
 * Letter HTML → blocks (Letter → Design, and for the content check). Top-level elements become blocks: headings,
 * paragraphs (a paragraph that is only a link becomes a button), list items (one paragraph each, "• " / "1. "),
 * images and rules. Inline formatting is dropped; the text stays.
 */
export function htmlToBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  const re = /<(h[1-6]|p|ul|ol|hr|img|blockquote)\b([^>]*)>([\s\S]*?)(?:<\/\1>|(?=<(?:h[1-6]|p|ul|ol|hr|img|blockquote)\b)|$)/gi;
  for (const m of html.matchAll(re)) {
    const tag = m[1].toLowerCase();
    const open = `<${m[1]}${m[2]}>`;
    const inner = m[3] ?? "";
    if (tag === "hr") blocks.push({ id: id(), type: "divider" });
    else if (tag === "img") blocks.push({ id: id(), type: "image", file: attr(open, "src") || undefined, alt: attr(open, "alt") ?? "" });
    else if (tag === "ul" || tag === "ol") {
      let n = 0;
      for (const li of inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi))
        blocks.push({ id: id(), type: "paragraph", text: `${tag === "ul" ? "•" : `${++n}.`} ${htmlText(li[1])}` });
    } else if (tag.startsWith("h")) blocks.push({ id: id(), type: "heading", text: htmlText(inner) });
    else {
      // Images inside a paragraph (TipTap may wrap them) become their own blocks.
      for (const img of inner.matchAll(/<img\b[^>]*>/gi))
        blocks.push({ id: id(), type: "image", file: attr(img[0], "src") || undefined, alt: attr(img[0], "alt") ?? "" });
      const text = htmlText(inner);
      const onlyLink = inner.trim().match(/^<a\b([^>]*)>([\s\S]*?)<\/a>$/i);
      if (onlyLink) blocks.push({ id: id(), type: "button", label: htmlText(onlyLink[2]), url: attr(`<a${onlyLink[1]}>`, "href") ?? "" });
      else if (text) blocks.push({ id: id(), type: "paragraph", text });
    }
  }
  return blocks;
}

/**
 * Mock only: images have no storage, so an <img> whose src is a bare file name (or empty) shows as a placeholder box
 * with the name, like the block editor's image placeholder. Real URLs (http, blob, data) render as images.
 */
export function placeholderImages(html: string, boxClass: string) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = attr(tag, "src") ?? "";
    if (/^(https?:|blob:|data:image\/)/i.test(src)) return tag;
    const alt = attr(tag, "alt") ?? "";
    return `<span role="img" aria-label="${escapeHtml(alt || "Image without alt text")}" class="${boxClass}">${escapeHtml(src || "No image yet")}</span>`;
  });
}

/** Images with no file (the content check). */
export const imagesWithoutFile = (html: string) => [...html.matchAll(/<img\b[^>]*>/gi)].filter((m) => !attr(m[0], "src")).length;

/** Links in the letter text that have no usable address (the content check). */
export function badLinks(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(`<a${m[1]}>`, "href") ?? "";
    if (!/^(https?:\/\/[^\s/]+\.[^\s]+|mailto:\S+|\{\{\s*unsubscribe_url\s*\}\})$/.test(href)) out.push(htmlText(m[2]) || "A link");
  }
  return out;
}

/**
 * Remove what the live app's sanitiser rejects (AC-EC-T-05, BR-RULE-EC-35): script, iframe, object, embed, form,
 * style and link tags, event handlers and javascript: URLs.
 */
export function sanitizeHtml(html: string) {
  return html
    .replace(/<(script|iframe|object|embed|form|style)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|iframe|object|embed|form|style|link|meta)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
}

/**
 * Merge tags filled with sample values (preview), or shown as marked tags (edit views). Inside an HTML tag (e.g. an
 * href) a tag is only filled, never wrapped.
 */
export function renderTags(html: string, values?: Record<string, string>, tagClass: (tag: string) => string = () => "") {
  const fill = (t: string) => t.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, tag: string) => (values && tag in values ? escapeHtml(values[tag]) : m));
  return html.replace(/(<[^>]+>)|\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, el: string | undefined, tag: string | undefined) => {
    if (el) return fill(el);
    return values && tag! in values ? escapeHtml(values[tag!]) : `<span class="${tagClass(tag!)}">${escapeHtml(tag!)}</span>`;
  });
}
