// "Write with Saella" (mock of live /api/social/draft): the tones and the drafted text, shared by the Goal step and
// the Write step of the post builder. Each network gets its own shape, the tone on top, and
// never more than the network's limit (rules.ts).
import type { SocialNetwork } from "@/lib/mock/social";
import { NETWORK_RULES, textLength } from "./rules";

export type Tone = "professional" | "friendly" | "excited" | "concise";
export const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "excited", label: "Upbeat" },
  { value: "concise", label: "Short" },
];

/** What the mock reads from a brief: the subject, a detail, the offer and the link. */
function facts(brief: string) {
  const sentences = brief
    .replace(/\n+/g, " ")
    .split(/(?<=\.)\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const first = (sentences[0] ?? brief).replace(/\.$/, "");
  const [head, detail] = first.includes(":") ? first.split(/:\s*/, 2) : [first, ""];
  const subject = head.replace(/^(launch of|introducing|announcing)\s+/i, "").trim() || head;
  const offer =
    sentences
      .find((x) => /\d+%|\bcode\b/i.test(x))
      ?.replace(/^offer:\s*/i, "")
      .replace(/\.$/, "") ?? "";
  const link = brief.match(/\b[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s,]*)?/i)?.[0]?.replace(/[.)]$/, "") ?? "";
  return { subject, detail, offer, link };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function opener(tone: Tone, subject: string) {
  if (tone === "friendly") return `Say hello to ${subject}`;
  if (tone === "excited") return `It's here: ${subject}!`;
  if (tone === "concise") return cap(subject);
  return `Introducing ${subject}`;
}

/** One network's draft from the brief, in that network's shape and the chosen tone. */
function forNetwork(n: SocialNetwork, brief: string, tone: Tone) {
  const { subject, detail, offer, link } = facts(brief);
  const open = opener(tone, subject).replace(/[.!]?$/, (m) => m || ".");
  const short = tone === "concise";
  switch (n) {
    case "facebook":
      return [
        open,
        detail && `${cap(detail)}, small-batch and made by hand.`,
        !short && offer && `${cap(offer)}.`,
        link && `See the range: ${link}`,
      ]
        .filter(Boolean)
        .join(" ");
    case "instagram":
      return [open, !short && detail && `${cap(detail)}.`, "Link in bio.", "#handmade #ceramics #tableware #slowliving"]
        .filter(Boolean)
        .join("\n\n");
    case "threads":
      return [open, link].filter(Boolean).join(" ");
    case "linkedin":
      return [
        `Introducing ${subject}.`,
        detail && `${cap(detail)}, food-safe and made in small batches for cafés, hotels and shops.`,
        !short && link && `Trade enquiries: ${link}`,
      ]
        .filter(Boolean)
        .join(" ");
    case "tiktok":
    case "douyin":
    case "youtube":
      return `${tone === "excited" ? "Wait for it… " : ""}${cap(subject)} in 30 seconds

#ceramics #handmade #pottery`;
    case "pinterest":
      return [
        cap(subject),
        [detail, "handmade ceramics", "stoneware tableware", "table setting ideas"].filter(Boolean).join(" · "),
      ].join("\n");
  }
}

/** Never over the limit: cut at the last word that fits. */
function fit(n: SocialNetwork, text: string) {
  const max = NETWORK_RULES[n].maxText;
  if (textLength(text) <= max) return text;
  const cut = Array.from(text)
    .slice(0, max - 1)
    .join("");
  return `${cut.slice(0, cut.lastIndexOf(" ")).trimEnd()}…`;
}

/**
 * A drafted text the mock "Write with Saella" returns. One network: that network's shape. Several sharing one text
 * ("All"): the fuller Facebook shape, held to the strictest limit among them.
 */
export function mockDraft(brief: string, tone: Tone, nets: SocialNetwork[], change?: string) {
  const n = nets.length === 1 ? nets[0] : "facebook";
  let text = forNetwork(n, brief, tone);
  if (nets.length > 1 && !nets.includes("linkedin")) text += "\n\n#handmade #ceramics";
  if (change) text += `\n\n(${change})`;
  const strictest = nets.length
    ? nets.reduce((a, b) => (NETWORK_RULES[a].maxText <= NETWORK_RULES[b].maxText ? a : b))
    : n;
  return fit(strictest, text);
}
