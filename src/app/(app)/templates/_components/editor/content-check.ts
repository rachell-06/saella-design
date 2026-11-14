import { type Block, KNOWN_TAGS, SAMPLE_VALUES, type TemplateKind, resolveTags, splitTags } from "@/lib/mock/templates";
import { senderById } from "@/lib/mock/templates";
import { badLinks } from "@/lib/mock/templates-html";

// Content check before a template goes active. PRD-02 doesn't specify one and the live app has no editor check
// (its pre-send check is about recipient lists, PreflightPanel); rules below are a proposal:
//  - errors block "Mark active": they would send a broken email (no subject, unknown merge tag, button without
//    a link, image without a file, no confirmed sender, empty body).
//  - warnings and tips never block: spam-like wording, missing alt text, long subject, emoji, no preheader.
// Unsubscribe is never an error: Saella appends a footer when the body has none (Repo render.ts:153).

export type Issue = {
  id: string;
  severity: "error" | "warning" | "tip";
  title: string;
  detail?: string;
  /** Block to select when the issue is clicked; or the field to focus. */
  blockId?: string;
  field?: "subject" | "preheader" | "sender";
};

// Words spam filters and readers both distrust in cold B2B email (illustrative list).
const SPAM_WORDS = ["free", "guarantee", "guaranteed", "act now", "risk-free", "100%", "winner", "urgent", "cash", "click here", "limited time", "no obligation"];

const SUBJECT_MAX = 70;
const EMOJI_MAX = 1;

function spamWordsIn(text: string) {
  const t = text.toLowerCase();
  return SPAM_WORDS.filter((w) => new RegExp(`(^|[^a-z])${w.replace(/[%-]/g, "\\$&")}([^a-z]|$)`).test(t));
}

function unknownTagsIn(texts: string[]) {
  const unknown = new Set<string>();
  for (const text of texts) for (const p of splitTags(text)) if (p.tag && !KNOWN_TAGS.has(p.tag)) unknown.add(p.tag);
  return [...unknown];
}

// Live subject checklist (after 's best-practice list next to the subject field).
// Graded on every keystroke; never blocks saving. Each rule is the one checkContent uses, so the checklist
// and the Check tab can't disagree: `inCheck: false` rules are reported there by the body-wide pass instead
// (unknown tags as an error, spam words across subject and body), not twice.
export type SubjectCheck = {
  id: "length" | "emoji" | "shouting" | "spam" | "tags" | "preheader";
  state: "ok" | Issue["severity"];
  label: string;
  detail: string;
  field: "subject" | "preheader";
  inCheck: boolean;
};

export function checkSubject(subject: string, preheader: string): SubjectCheck[] {
  // Length as the inbox shows it: merge tags filled with sample values.
  const shown = resolveTags(subject, SAMPLE_VALUES);
  const words = shown.trim().split(/\s+/).filter(Boolean).length;
  const emoji = subject.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
  const caps = subject.match(/\b[A-Z]{4,}\b/g);
  const bangs = /!{2,}/.test(subject);
  const spam = spamWordsIn(subject);
  const tags = splitTags(`${subject} ${preheader}`).filter((p) => p.tag).length;
  const unknown = unknownTagsIn([subject, preheader]);
  return [
    shown.length > SUBJECT_MAX
      ? {
          id: "length",
          state: "warning",
          label: `Subject is ${shown.length} characters`,
          detail: `Most inboxes cut it off after about ${SUBJECT_MAX}, phones sooner.`,
          field: "subject",
          inCheck: true,
        }
      : {
          id: "length",
          state: "ok",
          label: `${shown.length} characters, ${words} ${words === 1 ? "word" : "words"}`,
          detail: "Short enough to show in full in most inboxes.",
          field: "subject",
          inCheck: true,
        },
    emoji > EMOJI_MAX
      ? { id: "emoji", state: "warning", label: `${emoji} emoji`, detail: "More than one reads like a promotion.", field: "subject", inCheck: true }
      : {
          id: "emoji",
          state: "ok",
          label: emoji ? "1 emoji" : "No emoji",
          detail: "One at most keeps it friendly, not promotional.",
          field: "subject",
          inCheck: true,
        },
    caps || bangs
      ? {
          id: "shouting",
          state: "warning",
          label: caps ? `Words in capitals: ${caps.join(", ")}` : "Repeated exclamation marks",
          detail: caps && bangs ? "Also “!!”. Filters and buyers read it as shouting." : "Filters and buyers read it as shouting.",
          field: "subject",
          inCheck: true,
        }
      : { id: "shouting", state: "ok", label: "No capitals or “!!”", detail: "Reads calm, the way you'd say it.", field: "subject", inCheck: true },
    spam.length
      ? {
          id: "spam",
          state: "warning",
          label: `Spam-like: ${spam.map((w) => `“${w}”`).join(", ")}`,
          detail: "Spam filters and buyers both distrust these words.",
          field: "subject",
          inCheck: false,
        }
      : { id: "spam", state: "ok", label: "No spam-like words", detail: "Nothing filters usually flag.", field: "subject", inCheck: false },
    unknown.length
      ? {
          id: "tags",
          state: "error",
          label: `Unknown merge tag ${unknown.map((t) => `{{${t}}}`).join(", ")}`,
          detail: "Recipients would see it as typed. Fix it before marking active.",
          field: "subject",
          inCheck: false,
        }
      : {
          id: "tags",
          state: "ok",
          label: tags ? "Merge tags are valid" : "No merge tags",
          detail: tags ? "Each one fills in from the contact." : "Optional. A first name makes it personal.",
          field: "subject",
          inCheck: false,
        },
    preheader.trim()
      ? { id: "preheader", state: "ok", label: "Has a preheader", detail: "Inboxes show it next to the subject.", field: "preheader", inCheck: true }
      : {
          id: "preheader",
          state: "tip",
          label: "No preheader",
          detail: "Inboxes show the first line of the body instead.",
          field: "preheader",
          inCheck: true,
        },
  ];
}

export function textOf(b: Block) {
  switch (b.type) {
    case "heading":
    case "paragraph":
      return b.text;
    case "button":
      return b.label;
    case "hero":
      return `${b.headline} ${b.subline}`;
    default:
      return "";
  }
}

export function checkContent(input: {
  kind: TemplateKind;
  subject: string;
  preheader: string;
  senderId?: string;
  blocks: Block[];
  /** A Letter's HTML (its blocks are read from it): every link in the text is checked, not only button-like ones. */
  html?: string;
}): { issues: Issue[]; passed: string[] } {
  const issues: Issue[] = [];
  const passed: string[] = [];
  const { subject, preheader, blocks } = input;

  // Subject and preheader: the same rules the live checklist under the fields shows (checkSubject).
  if (!subject.trim()) issues.push({ id: "subject-empty", severity: "error", title: "Add a subject", field: "subject" });
  for (const c of checkSubject(subject, preheader))
    if (c.state !== "ok" && c.inCheck)
      issues.push({ id: `subject-${c.id}`, severity: c.state, title: c.label, detail: c.detail, field: c.field });

  // Sender
  const sender = senderById(input.senderId);
  if (sender && sender.status !== "confirmed")
    issues.push({ id: "sender", severity: "error", title: `${sender.email} isn't confirmed`, detail: "Pick a confirmed sender.", field: "sender" });
  else passed.push("Sender is confirmed");

  // Body
  if (blocks.length === 0) issues.push({ id: "body-empty", severity: "error", title: "The email has no content" });

  const tagged = [subject, preheader, ...blocks.map(textOf)];
  const unknown = unknownTagsIn(tagged);
  for (const tag of unknown) {
    const block = blocks.find((b) => splitTags(textOf(b)).some((p) => p.tag === tag));
    issues.push({
      id: `tag-${tag}`,
      severity: "error",
      title: `Unknown merge tag {{${tag}}}`,
      detail: "Every recipient would see it as typed. Pick a tag from the list.",
      blockId: block?.id,
      field: block ? undefined : "subject",
    });
  }
  if (unknown.length === 0) passed.push("Merge tags are valid");

  const spam = spamWordsIn(tagged.join(" "));
  if (spam.length)
    issues.push({
      id: "spam",
      severity: "warning",
      title: "Words that look like spam",
      detail: `${spam.map((w) => `“${w}”`).join(", ")}. Spam filters and buyers both distrust them.`,
    });
  else passed.push("No spam-like wording");

  // Starter text left in ("[Replace this paragraph…]", live app's default letter): it would send as typed.
  const placeholder = blocks.find((b) => /\[[^\]]{3,}\]/.test(textOf(b)));
  if (placeholder)
    issues.push({ id: "placeholder", severity: "error", title: "Replace the text in [brackets]", blockId: placeholder.id });

  blocks.forEach((b, i) => {
    if (b.type === "image") {
      if (!b.file) issues.push({ id: `img-file-${b.id}`, severity: "error", title: `Image ${i + 1} has no file`, blockId: b.id });
      if (!b.alt.trim())
        issues.push({
          id: `img-alt-${b.id}`,
          severity: "warning",
          title: `Image ${i + 1} has no alt text`,
          detail: "Many inboxes block images; the alt text is what people see instead.",
          blockId: b.id,
        });
    }
    if (b.type === "button") {
      if (!b.label.trim()) issues.push({ id: `btn-label-${b.id}`, severity: "error", title: "A button has no label", blockId: b.id });
      if (!input.html && !/^https?:\/\/[^\s/]+\.[^\s]+$/.test(b.url))
        issues.push({ id: `btn-url-${b.id}`, severity: "error", title: `“${b.label || "Button"}” has no valid link`, blockId: b.id });
    }
  });

  if (input.html)
    badLinks(input.html).forEach((label, i) =>
      issues.push({ id: `link-${i}`, severity: "error", title: `“${label}” has no valid link`, detail: "Select the text and set its link address." })
    );

  // A poster that is all pictures lands in spam folders and says nothing when images are blocked.
  const words = blocks.filter((b) => b.type !== "image").map(textOf).join(" ").trim().split(/\s+/).filter(Boolean).length;
  if (input.kind === "design" && blocks.some((b) => b.type === "image") && words < 15)
    issues.push({ id: "image-heavy", severity: "warning", title: "Mostly images", detail: "Add a line of text so the email still reads when images are blocked." });

  passed.push("Unsubscribe link is added automatically");
  return { issues, passed };
}
