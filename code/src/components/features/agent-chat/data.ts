import type { ApprovalState } from "@/components/saella/approval-card";
import type { AgentStep } from "@/components/saella/agent-steps";
import { getBatch } from "@/lib/mock/batches";
import { rate, sampleCampaigns } from "@/lib/mock/campaigns";
import { RATE_BANDS } from "@/components/saella/rate-meter";
import { batches } from "@/lib/mock/workspace";

// Full-page agent mock (PRD-03, 2026-10-28). Threads, message parts and scripted replies. Replies are picked by
// keyword from the user's text and play their steps on timers, so the live step list, Stop and approvals can be
// tried without a backend. Numbers come from the shared campaign mock; names are fictional. "Now" is fixed.

import { NOW } from "@/lib/mock/constants";
export { NOW };

/** The five gated flow steps (PRD-03 AC-AG-G-01; live app lib/agent/flow-steps.ts FLOW_STEPS). */
export type FlowStep = "campaign" | "template" | "edit" | "activate" | "send";
export const FLOW_STEPS: { step: FlowStep; label: string; tool: string }[] = [
  { step: "campaign", label: "Create campaign", tool: "create_campaign" },
  { step: "template", label: "Create template", tool: "create_template" },
  { step: "edit", label: "Edit template", tool: "update_template" },
  { step: "activate", label: "Activate template", tool: "update_template (active)" },
  { step: "send", label: "Send (live)", tool: "create_batch (live)" },
];

/**
 * Which steps stop for approval. The live app gates only activate and a live send (flow-steps.ts gateStepForTool:
 * creating and editing drafts is reversible, "reviewing a draft IS the approval"). PRD-03 AC-AG-G-01 gates all
 * five. Default follows the repo.
 */
export const REPO_GATES: FlowStep[] = ["activate", "send"];

/**
 * The email an approval saves or sends (R17). Variables are {{name}};
 * `sample` fills them so the preview reads as one real recipient will see it.
 */
export type DraftPreview = {
  from: string;
  /** Who gets it. Templates have no audience until they are sent. */
  to?: string;
  subject: string;
  body: string;
  sample: Record<string, string>;
  sampleLabel: string;
};

export type Cell = string | { text: string; badge?: { label: string; variant: "success" | "destructive" | "secondary" } };

export type Part =
  | { kind: "text"; text: string }
  | { kind: "steps"; steps: AgentStep[]; usage?: string }
  | { kind: "table"; caption: string; columns: { label: string; align?: "end" }[]; rows: Cell[][] }
  | { kind: "verdict"; text: string }
  | { kind: "advice"; items: string[] }
  | { kind: "dashboard"; title: string; data: { name: string; open: number; click: number }[] }
  | {
      kind: "approval";
      id: string;
      step: FlowStep;
      action: string;
      details: { label: string; value: string }[];
      note?: string;
      confirmLabel?: string;
      state: ApprovalState;
      result: string;
      /** What the agent does once approved. */
      after: Part[];
      /** Ran without asking because the user set "Always allow" for this step. */
      auto?: boolean;
      /** What gets saved or sent (R17). */
      preview?: DraftPreview;
      /** A live send runs an existing template: Edit opens it in the editor instead of editing here. */
      editHref?: string;
      /** The last Approve failed; the approval stays pending so it can be tried again. */
      error?: string;
      /** A live send's audience. From LARGE_SEND people up it can go to the first TEST_SEND_SIZE only (R18). */
      /** `who` names the people by their contact tags, e.g. tagged “hotel” (contacts have no named lists). */
      audience?: { count: number; who: string; template: string };
      /** Large sends only: "first" sends to TEST_SEND_SIZE people now, "all" to everyone. Unset means "first". */
      split?: SendSplit;
      /** The rest of a send that went to the first few: shows what they did and always waits for approval. */
      remainderOf?: TestSendResult;
    }
  | { kind: "companies"; total: number; rows: { name: string; city: string; industry: string }[]; href: string }
  | { kind: "links"; items: { label: string; href?: string; prompt?: string }[] }
  | { kind: "error"; text: string }
  | { kind: "notice"; text: string }
  /** Several approvals from one turn: says nothing ran yet; each card below is approved on its own (R17). */
  | { kind: "queue"; count: number }
  /** What happened to the first few of a large send (R18). */
  | { kind: "testSend"; result: TestSendResult; href: string }
  /** A file the agent made (PRD-03 AC-AG-X-01; live export_report: signed link, 1 hour). */
  | { kind: "download"; filename: string; format: "xlsx" | "docx" | "pdf" | "csv"; size: string };

/** A file sent with one user turn (PRD-03 AC-AG-A-01/02): at most one image and one document, as in the live
 * composer. `url` is a local preview of an image. The thread history does not keep them (PRD-03 §Attachments are
 * turn-scoped), so seeded threads have none. */
export type FileKind = "image" | "pdf" | "word" | "excel";
export type SentFile = { name: string; kind: FileKind; bytes: number; url?: string };
export type Message = { id: string; role: "user" | "agent"; parts: Part[]; attachments?: SentFile[]; at: string };

export type Thread = {
  id: string;
  title: string;
  /** PRD-03 AC-AG-V-01; global threads are superadmin-only and not shown here. */
  visibility: "private" | "company";
  updatedAt: string;
  messages: Message[];
  /** One-tap rating of the conversation (AC-AG-Q-05): asked once ASK_RATING_AFTER answers are in. */
  rating?: Rating | "dismissed";
};

export type Rating = "bad" | "fine" | "good";
/** Live app AgentChatCore ASK_AFTER_TURNS. */
export const ASK_RATING_AFTER = 4;

// ---------------------------------------------------------------------------------------------------------
// Answers built from the campaign mock

const hotel = sampleCampaigns.find((c) => c.id === "c1")!;
/** Illustrative benchmarks for B2B email in the region; the live agent pulls these from its tools. Bounce has no
 *  benchmark of its own: it is measured against the app's warning level (RATE_BANDS, 5%; sending pauses at 10%). */
const BENCH = { open: 25, click: 3 };
const BOUNCE_WARN = Math.round(RATE_BANDS.bounce!.warn * 100);
const BOUNCE_PAUSE = Math.round(RATE_BANDS.bounce!.danger! * 100);

function pct(part: number, whole: number) {
  return whole ? (part / whole) * 100 : 0;
}

// Numbers per template come from the campaign's batches as the Batches screen has them at NOW (b1 sent, b2 still
// sending 412 of 640), so the agent, the template page and the batch report agree.
const hotelResults = hotel.templates.flatMap((t) => {
  const own = batches.filter((b) => b.templateId === t.id && b.sent > 0);
  if (own.length === 0) return [];
  const sum = (k: "delivered" | "opens" | "clicks" | "bounces") => own.reduce((n, b) => n + (getBatch(b.id)?.metrics?.[k] ?? 0), 0);
  return [
    {
      name: t.name,
      sent: own.reduce((n, b) => n + b.sent, 0),
      recipients: own.reduce((n, b) => n + b.recipients, 0),
      sending: own.some((b) => b.status === "sending"),
      delivered: sum("delivered"),
      opens: sum("opens"),
      clicks: sum("clicks"),
      bounces: sum("bounces"),
    },
  ];
});

export function performanceParts(): Part[] {
  // Plain numbers (DESIGN.md §2): the benchmark row does the comparing, no badges in rate cells.
  const rows: Cell[][] = hotelResults.map((t) => [
    t.name,
    t.delivered.toLocaleString("en-US"),
    rate(t.opens, t.delivered)!.text,
    rate(t.clicks, t.delivered)!.text,
    rate(t.bounces, t.sent)!.text,
  ]);
  rows.push(["Benchmark", "", `${BENCH.open}%`, `${BENCH.click}%`, `under ${BOUNCE_WARN}%`]);
  const bounces = hotelResults.map((t) => rate(t.bounces, t.sent)!.text).join(" and ");
  const sending = hotelResults.find((t) => t.sending);
  const sendingNote = sending
    ? ` “${sending.name}” is still sending (${sending.sent.toLocaleString("en-US")} of ${sending.recipients.toLocaleString("en-US")} so far), so its numbers will move.`
    : "";
  return [
    { kind: "text", text: `Here is how “${hotel.name}” is doing. Opens and clicks exclude bots and link scanners.${sendingNote}` },
    {
      kind: "table",
      caption: `${hotel.name}: results per template`,
      columns: [{ label: "Template" }, { label: "Delivered", align: "end" }, { label: "Open", align: "end" }, { label: "Click", align: "end" }, { label: "Bounce", align: "end" }],
      rows,
    },
    {
      kind: "verdict",
      text: `Opens and clicks are above benchmark on both templates. Bounce is ${bounces}, well under the ${BOUNCE_WARN}% warning level (sending pauses at ${BOUNCE_PAUSE}%).`,
    },
    {
      kind: "advice",
      items: [
        "Send the catalog reminder to the 752 people who haven't opened the intro yet. It opens less than the intro but is still above benchmark.",
        `Clean the 22 unreachable addresses in “Hotel purchasing – Vietnam” before the next batch, so bounce stays well under ${BOUNCE_WARN}%.`,
        "“Holiday pricing note” is inactive. Activate it before mid-November if you want it out before the holidays.",
      ],
    },
    {
      kind: "links",
      items: [
        { label: "Show as a dashboard", prompt: "Show it as a dashboard" },
        { label: "Export to Excel", prompt: "Export these results to Excel" },
        { label: "Open the campaign", href: "/campaigns?c=c1" },
      ],
    },
  ];
}

export function dashboardParts(): Part[] {
  return [
    {
      kind: "dashboard",
      title: `${hotel.name}: open and click rate per template`,
      data: hotelResults.map((t) => ({ name: t.name.split(" – ")[0], open: +pct(t.opens, t.delivered).toFixed(1), click: +pct(t.clicks, t.delivered).toFixed(1) })),
    },
    { kind: "text", text: "Drawn from the numbers above, nothing was fetched again." },
  ];
}

let seq = 0;
export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const SENDER = "Linh Tran <linh@northwind-ceramics.com>";
const HOTEL_SAMPLE = { sample: { first_name: "Minh", company: "Lotus Hotel Co., Ltd." }, sampleLabel: "Shown for Minh Pham, Lotus Hotel Co., Ltd." };

const LOOKBOOK_PREVIEW: DraftPreview = {
  from: SENDER,
  subject: "A tile range made for tropical facades",
  body: "Hi {{first_name}},\n\nOur new lookbook shows glazed tiles tested for Singapore's heat and rain, with project photos from three facades.\n\nWould a printed copy be useful for {{company}}?\n\nLinh Tran\nNorthwind Ceramics",
  sample: { first_name: "Wei Ling", company: "Kallang Studio Pte. Ltd." },
  sampleLabel: "Shown for Wei Ling Tan, Kallang Studio Pte. Ltd.",
};

function sendApproval(id = uid("ap")): Extract<Part, { kind: "approval" }> {
  return {
    kind: "approval",
    id,
    step: "send",
    action: "Send “Follow-up 1 – catalog reminder”",
    details: [
      { label: "To", value: "752 people tagged “hotel” who haven't opened" },
      { label: "From", value: "Linh Tran <linh@northwind-ceramics.com>" },
      { label: "When", value: "Now" },
      { label: "Left out", value: "22 unreachable, 4 unsubscribed" },
    ],
    note: "Emails start going out as soon as you approve. Caps, duplicates and unsubscribes are still checked.",
    confirmLabel: "I understand 752 emails will be sent now",
    state: "pending",
    result: "Batch started, 752 recipients",
    audience: { count: 752, who: "tagged “hotel”", template: "Follow-up 1 – catalog reminder" },
    preview: {
      from: SENDER,
      to: "752 people tagged “hotel”",
      subject: "Our 2027 tile catalog, in case you missed it",
      body: "Hi {{first_name}},\n\nLast week I sent our 2027 ceramics catalog. If {{company}} is planning room or lobby work next year, pages 12–19 show the glazed tiles most hotels pick.\n\nShall I send prices for your region?\n\nLinh Tran\nNorthwind Ceramics",
      ...HOTEL_SAMPLE,
    },
    editHref: "/templates/t2/edit",
    after: [
      { kind: "steps", steps: [{ title: "Start sending", status: "done", duration: "1.4s" }] },
      { kind: "text", text: "Sending has started. Most emails go out within the hour; I'll keep an eye on bounces." },
      { kind: "links", items: [{ label: "Open the batch report", href: "/batches/b2/report?tab=overview" }] },
    ],
  };
}

function activateApproval(id = uid("ap")): Extract<Part, { kind: "approval" }> {
  return {
    kind: "approval",
    id,
    step: "activate",
    action: "Activate “Lookbook intro – Singapore architects”",
    details: [
      { label: "Campaign", value: "Architects – Singapore" },
      { label: "Subject", value: "A tile range made for tropical facades" },
      { label: "Language", value: "English" },
    ],
    note: "An active template can be sent. Nothing is sent yet.",
    state: "pending",
    result: "Template is active",
    preview: LOOKBOOK_PREVIEW,
    after: [
      { kind: "steps", steps: [{ title: "Activate “Lookbook intro – Singapore architects”", status: "done", duration: "0.6s" }] },
      { kind: "text", text: "It's active. Want me to send it to the 248 people tagged “architect”?" },
      { kind: "links", items: [{ label: "Yes, send it", prompt: "Send it to people tagged architect" }, { label: "Open the template", href: "/templates/t7" }] },
    ],
  };
}

function gatedDraft(step: "campaign" | "template", rest: Part[]): Part {
  return step === "campaign"
    ? {
        kind: "approval",
        id: uid("ap"),
        step,
        action: "Create campaign “Architects – Singapore”",
        details: [
          { label: "Countries", value: "Singapore" },
          { label: "Industry", value: "Architecture & engineering" },
          { label: "Period", value: "Nov 1 – Dec 31, 2026" },
        ],
        note: "Saved as a campaign with no templates yet.",
        state: "pending",
        result: "Campaign created",
        after: rest,
      }
    : {
        kind: "approval",
        id: uid("ap"),
        step,
        action: "Create template “Lookbook intro – Singapore architects”",
        details: [
          { label: "Campaign", value: "Architects – Singapore" },
          { label: "Subject", value: "A tile range made for tropical facades" },
        ],
        note: "Saved as an inactive draft.",
        state: "pending",
        result: "Draft saved",
        preview: LOOKBOOK_PREVIEW,
        after: rest,
      };
}

// ---------------------------------------------------------------------------------------------------------
// Send to a few first (R18, learnt from Clay's "Save and run 10 rows", Competitor.md §6): a large live send can
// go to the first TEST_SEND_SIZE people, show what happened to them, and leave the rest as a new approval in
// the chat. It is a choice on the one send approval, not a second way to approve.

/** ĐX: from this many recipients a live send offers "Send to 20 first". Not in PRD-03; the team to confirm. */
export const LARGE_SEND = 100;
/** ĐX: how many go out in the first part. 20 matches the "too few to judge" line on Overview's KPI cards. */
export const TEST_SEND_SIZE = 20;

export type SendSplit = "first" | "all";

export type TestSendResult = {
  template: string;
  who: string;
  /** Everyone the send was approved for; `recipients` are the first part of it. */
  total: number;
  recipients: { name: string; company: string; email: string; status: "delivered" | "bounced"; reason?: string }[];
};

/** Whether this approval offers the choice: a live send to LARGE_SEND people or more that isn't a remainder. */
export const canSplit = (a: Approval) => a.step === "send" && !a.remainderOf && (a.audience?.count ?? 0) >= LARGE_SEND;
/** The choice in effect; undefined when the approval doesn't offer one. Defaults to the first few. */
export const splitOf = (a: Approval): SendSplit | undefined => (canSplit(a) ? (a.split ?? "first") : undefined);
/** How many emails go out if this is approved now. */
export const sendingNow = (a: Approval) => (splitOf(a) === "first" ? TEST_SEND_SIZE : (a.audience?.count ?? 0));

/** The confirm tick (AC-AG-G-06) names what is sent now, so it changes with the choice. */
export function confirmLabelOf(a: Approval) {
  return canSplit(a) ? `I understand ${sendingNow(a).toLocaleString("en-US")} emails will be sent now` : a.confirmLabel;
}

/** The consequence line under the details. */
export function noteOf(a: Approval) {
  if (splitOf(a) !== "first") return a.note;
  const rest = (a.audience!.count - TEST_SEND_SIZE).toLocaleString("en-US");
  return `${TEST_SEND_SIZE} emails go out as soon as you approve. The other ${rest} wait until you approve again, after you've seen how the first ${TEST_SEND_SIZE} did.`;
}

// Fictional recipients for the first part; one mailbox doesn't exist so a bounce shows.
const FIRST_RECIPIENTS: [string, string, string][] = [
  ["Minh Pham", "Lotus Hotel Co., Ltd.", "minh.pham@lotushotel.vn"],
  ["Thu Le", "Mekong Resort Co., Ltd.", "thu.le@mekongresort.vn"],
  ["Quang Vo", "Saffron Hotel Co., Ltd.", "q.vo@saffronhotel.vn"],
  ["Hanh Do", "Coral Resort Co., Ltd.", "hanh.do@coralresort.vn"],
  ["Bao Nguyen", "Monsoon Hotel Co., Ltd.", "bao@monsoonhotel.vn"],
  ["Lan Huynh", "Jade Bay Resort", "lan.huynh@jadebay.vn"],
  ["Tuan Bui", "Riverside Suites Co., Ltd.", "tuan.bui@riversidesuites.vn"],
  ["Mai Dang", "Pearl Lagoon Hotel", "mai.dang@pearllagoon.vn"],
  ["Khoa Ly", "Lantern Hotel Group", "khoa.ly@lanternhotels.vn"],
  ["Ngoc Tran", "Bamboo Grove Resort", "ngoc@bamboogrove.vn"],
  ["Phuc Ho", "Silk Road Hotel Co., Ltd.", "phuc.ho@silkroadhotel.vn"],
  ["Vy Truong", "Seabreeze Resort Co., Ltd.", "vy.truong@seabreeze.vn"],
  ["Duc Phan", "Golden Lotus Suites", "duc.phan@goldenlotus.vn"],
  ["Anh Vu", "Harbour Light Hotel", "anh.vu@harbourlight.vn"],
  ["Linh Cao", "Orchid Valley Resort", "linh.cao@orchidvalley.vn"],
  ["Son Dinh", "Cloud Peak Hotel Co., Ltd.", "son.dinh@cloudpeak.vn"],
  ["Trang Lam", "Palm Shore Resort", "trang.lam@palmshore.vn"],
  ["Hieu Mac", "Old Quarter Inn Co., Ltd.", "hieu.mac@oldquarterinn.vn"],
  ["Yen Ta", "Sunrise Cove Hotel", "yen.ta@sunrisecove.vn"],
  ["Long Kieu", "Lantern Hotel Group", "long.kieu@lanternhotels.vn"],
];

/**
 * Approving the first part: the line for the decided card, and the agent's next turn: what happened to the first
 * TEST_SEND_SIZE (mock: one bounce) and a new approval for the rest. The remainder keeps the original's email,
 * sender and `after`, so approving it finishes the send the way approving everyone at once would have.
 */
export function testSendRun(a: Approval, id: string): { result: string; parts: Part[] } {
  const { count, who, template } = a.audience!;
  const restCount = count - TEST_SEND_SIZE;
  const rest = restCount.toLocaleString("en-US");
  const result: TestSendResult = {
    template,
    who,
    total: count,
    recipients: FIRST_RECIPIENTS.slice(0, TEST_SEND_SIZE).map(([name, company, email], i) =>
      i === 2
        ? { name, company, email, status: "bounced", reason: "Mailbox doesn't exist. Now marked unreachable." }
        : { name, company, email, status: "delivered" }
    ),
  };
  const delivered = result.recipients.filter((r) => r.status === "delivered").length;
  const bounced = TEST_SEND_SIZE - delivered;
  const remainder: Approval = {
    ...a,
    id,
    action: `Send the remaining ${rest} · “${template}”`,
    details: [
      ...a.details.map((d) => (d.label === "To" ? { ...d, value: `The other ${rest} people ${who}` } : d)),
      { label: `First ${TEST_SEND_SIZE}`, value: `${delivered} delivered · ${bounced} bounced` },
    ],
    note: "Emails start going out as soon as you approve. Caps, duplicates and unsubscribes are still checked.",
    confirmLabel: `I understand ${rest} emails will be sent now`,
    state: "pending",
    result: `Batch started, ${rest} more recipients`,
    audience: { count: restCount, who, template },
    split: undefined,
    remainderOf: result,
    preview: a.preview && { ...a.preview, to: `The other ${rest} people ${who}` },
    auto: undefined,
    error: undefined,
  };
  return {
    result: `Sent to the first ${TEST_SEND_SIZE} · ${rest} wait for your approval`,
    parts: [
      { kind: "steps", steps: [done(`Send to the first ${TEST_SEND_SIZE} of ${count.toLocaleString("en-US")}`, "1.2s")] },
      { kind: "testSend", result, href: "/batches/b2/report?tab=recipients" },
      {
        kind: "text",
        text: `${delivered} of ${TEST_SEND_SIZE} were delivered. ${bounced} bounced because the mailbox doesn't exist; I marked it unreachable so it isn't tried again. ${TEST_SEND_SIZE} is too few to judge open rates, but nothing points to a sending problem.`,
      },
      remainder,
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// Scripts

export type ScriptStep = { title: string; ms: number; detail?: string };
export type Script = { steps: ScriptStep[]; parts: Part[]; tokens: number };

export function planReply(text: string, gates: FlowStep[]): Script {
  const t = text.toLowerCase();
  if (/follow-?ups?/.test(t)) {
    return { steps: FU_STEPS, parts: followUpParts(gates), tokens: 5120 };
  }
  if (/dashboard|chart|graph/.test(t)) {
    return { steps: [{ title: "Draw dashboard from fetched data", ms: 900 }], parts: dashboardParts(), tokens: 640 };
  }
  if (/export|download|excel|spreadsheet|xlsx|csv/.test(t)) {
    return {
      steps: [
        { title: "Get results per template and batch", ms: 1000 },
        { title: "Build the Excel file", ms: 900 },
      ],
      parts: [
        { kind: "text", text: `Here are the results of “${hotel.name}” per template, as an Excel file.` },
        { kind: "download", filename: "hotel-buyers-vietnam-results.xlsx", format: "xlsx", size: "18 KB" },
      ],
      tokens: 1960,
    };
  }
  if (/\bsend\b|launch/.test(t)) {
    return {
      steps: [
        { title: "Find template “Follow-up 1 – catalog reminder”", ms: 700 },
        { title: "Find contacts tagged “hotel”", ms: 600 },
        { title: "Check the audience", ms: 1300, detail: "778 matched · 22 unreachable and 4 unsubscribed left out · 752 to send. Nothing is sent yet." },
      ],
      parts: [{ kind: "text", text: "The audience is ready. I need your approval to send." }, sendApproval()],
      tokens: 2140,
    };
  }
  if (/how|perform|result|report|did|doing/.test(t)) {
    return {
      steps: [
        { title: "Find campaign “Hotel buyers – Vietnam”", ms: 600 },
        { title: "Get results per template and batch", ms: 1200, detail: "2 templates with sends, 3 batches." },
        { title: "Compare with benchmarks", ms: 700 },
      ],
      parts: performanceParts(),
      tokens: 3480,
    };
  }
  if (/find|compan|buyer|hotel|distribut|lead/.test(t)) {
    return {
      steps: [
        { title: "Search companies · Vietnam · Hotels & resorts", ms: 1100, detail: "Country VN, ISIC 5510, status active." },
        { title: "Count companies with an email", ms: 600 },
      ],
      parts: [
        { kind: "text", text: "I found hotels and resorts in Vietnam. Here are the first five; the full list is on Companies." },
        {
          kind: "companies",
          total: 1240,
          href: "/companies?country=VN&isic=5510",
          rows: [
            { name: "Lotus Hotel Co., Ltd.", city: "Ho Chi Minh City", industry: "Hotels & resorts" },
            { name: "Mekong Resort Co., Ltd.", city: "Da Nang", industry: "Hotels & resorts" },
            { name: "Saffron Hotel Co., Ltd.", city: "Hanoi", industry: "Hotels & resorts" },
            { name: "Coral Resort Co., Ltd.", city: "Ho Chi Minh City", industry: "Hotels & resorts" },
            { name: "Monsoon Hotel Co., Ltd.", city: "Hai Phong", industry: "Hotels & resorts" },
          ],
        },
      ],
      tokens: 1820,
    };
  }
  if (/campaign|set up|template|write|architect/.test(t)) {
    const activate = activateApproval();
    const tail: Part[] = [{ kind: "text", text: "The draft is ready. It needs to be active before it can be sent." }, activate];
    const templateDone: Part[] = gates.includes("template")
      ? [gatedDraft("template", tail)]
      : [{ kind: "steps", steps: [{ title: "Save template draft", status: "done", duration: "1.1s" }] }, ...tail];
    const parts: Part[] = gates.includes("campaign")
      ? [{ kind: "text", text: "Here's the plan. I'll create the campaign first." }, gatedDraft("campaign", templateDone)]
      : [{ kind: "steps", steps: [{ title: "Create campaign “Architects – Singapore”", status: "done", duration: "0.8s" }] }, ...templateDone];
    return {
      steps: [
        { title: "Read company profile", ms: 600 },
        { title: "Pick audience · Singapore · Architecture & engineering", ms: 900 },
        { title: "Write subject and body", ms: 1600 },
      ],
      parts,
      tokens: 4210,
    };
  }
  if (/error|offline/.test(t)) {
    return { steps: [{ title: "Thinking", ms: 800 }], parts: [{ kind: "error", text: "The connection dropped before I finished. You were not charged for this turn." }], tokens: 0 };
  }
  return {
    steps: [{ title: "Thinking", ms: 700 }],
    parts: [
      {
        kind: "text",
        text: "I can find companies, check how your campaigns are doing, write templates and send batches. Anything that sends email waits for your approval.",
      },
      {
        kind: "links",
        items: [
          { label: "How is Hotel buyers – Vietnam doing?", prompt: "How is Hotel buyers – Vietnam doing?" },
          { label: "Find hotels in Vietnam", prompt: "Find hotels in Vietnam" },
          { label: "Set up a campaign for architects in Singapore", prompt: "Set up a campaign for architects in Singapore" },
        ],
      },
    ],
    tokens: 380,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Seed threads

const done = (title: string, duration: string, detail?: string): AgentStep => ({ title, status: "done", duration, detail });

// ---------------------------------------------------------------------------------------------------------
// One turn, several approvals (R17, Unify U2): two follow-ups, a template edit and a send. Which of them stop
// for approval follows the gates: 3 cards under the repo's two gates, 4 when all five are gated.

export const FOLLOW_UP_ASK = "Write two more follow-ups for Hotel buyers – Vietnam and get the Da Nang send ready";

const FU_STEPS: ScriptStep[] = [
  { title: "Find campaign “Hotel buyers – Vietnam”", ms: 600 },
  { title: "Write Follow-up 2 and Follow-up 3", ms: 1600, detail: "Same tone as the intro; each one shorter than the last." },
  { title: "Check dates in “Holiday pricing note”", ms: 500 },
  { title: "Check the Da Nang audience", ms: 1100, detail: "191 matched · 5 unreachable left out · 186 to send. Nothing is sent yet." },
];

export type Approval = Extract<Part, { kind: "approval" }>;

const FOLLOW_UPS = [
  {
    key: "fu2",
    name: "Follow-up 2 – samples offer",
    when: "4 days after Follow-up 1, to people who haven't replied",
    subject: "Free tile samples for {{company}}?",
    body: "Hi {{first_name}},\n\nIf it helps your team decide, we can send {{company}} a box of six glazed tile samples at no cost, so you can check colour and finish on site.\n\nReply with a delivery address and they ship this week.\n\nLinh Tran\nNorthwind Ceramics",
  },
  {
    key: "fu3",
    name: "Follow-up 3 – last note",
    when: "6 days after Follow-up 2, to people who haven't replied",
    subject: "Closing the loop, {{first_name}}",
    body: "Hi {{first_name}},\n\nI won't keep writing. If tiles for {{company}} come up next year, the catalog and samples offer stand; just reply to this email.\n\nLinh Tran\nNorthwind Ceramics",
  },
];

export function followUpParts(gates: FlowStep[], id: (key: string) => string = uid): Part[] {
  const steps: AgentStep[] = [];
  const approvals: Approval[] = [];

  for (const f of FOLLOW_UPS) {
    const preview: DraftPreview = { from: SENDER, subject: f.subject, body: f.body, ...HOTEL_SAMPLE };
    const activate: Approval = {
      kind: "approval",
      id: id(`${f.key}-activate`),
      step: "activate",
      action: `Activate “${f.name}”`,
      details: [
        { label: "Campaign", value: "Hotel buyers – Vietnam" },
        { label: "Sends", value: f.when },
      ],
      note: "Once active, it goes out on its own schedule. Nothing is sent right now.",
      state: "pending",
      result: "Follow-up is active",
      preview,
      after: [{ kind: "steps", steps: [done(`Activate “${f.name}”`, "0.6s")] }],
    };
    const created = done(`Save template draft “${f.name}”`, "1.1s");
    if (gates.includes("template")) {
      approvals.push({
        kind: "approval",
        id: id(`${f.key}-create`),
        step: "template",
        action: `Create template “${f.name}”`,
        details: [
          { label: "Campaign", value: "Hotel buyers – Vietnam" },
          { label: "Subject", value: f.subject },
        ],
        note: "Saved as an inactive draft. Activating it is a separate approval.",
        state: "pending",
        result: "Draft saved",
        preview,
        after: [{ kind: "steps", steps: [created] }, activate],
      });
    } else {
      steps.push(created);
      approvals.push(activate);
    }
  }

  const holiday: DraftPreview = {
    from: SENDER,
    subject: "2027 prices hold until January 15",
    body: "Hi {{first_name}},\n\nA short note before the holidays: orders placed by January 15 keep this year's prices, including delivery to {{company}}.\n\nLinh Tran\nNorthwind Ceramics",
    ...HOTEL_SAMPLE,
  };
  if (gates.includes("edit")) {
    approvals.push({
      kind: "approval",
      id: id("holiday-edit"),
      step: "edit",
      action: "Edit “Holiday pricing note”",
      details: [
        { label: "Change", value: "Price deadline moved from December 31 to January 15" },
        { label: "Subject", value: holiday.subject },
      ],
      note: "The template stays inactive.",
      state: "pending",
      result: "Template updated",
      preview: holiday,
      after: [{ kind: "steps", steps: [done("Update “Holiday pricing note”", "0.7s")] }],
    });
  } else {
    steps.push(done("Update “Holiday pricing note”", "0.7s"));
  }

  approvals.push({
    kind: "approval",
    id: id("danang-send"),
    step: "send",
    action: "Send “Intro – ceramics catalog”",
    details: [
      { label: "To", value: "186 people tagged “resort”" },
      { label: "From", value: SENDER },
      { label: "When", value: "Now" },
      { label: "Left out", value: "5 unreachable" },
    ],
    note: "Emails start going out as soon as you approve. Caps, duplicates and unsubscribes are still checked.",
    confirmLabel: "I understand 186 emails will be sent now",
    state: "pending",
    result: "Batch started, 186 recipients",
    audience: { count: 186, who: "tagged “resort”", template: "Intro – ceramics catalog" },
    preview: {
      from: SENDER,
      to: "186 people tagged “resort”",
      subject: "Ceramic tiles for hotel and resort projects",
      body: "Hi {{first_name}},\n\nNorthwind Ceramics makes glazed wall and floor tiles for hotels across Vietnam. Our 2027 catalog is attached, with lobby, bathroom and pool ranges.\n\nWould it help if I sent prices for {{company}}?\n\nLinh Tran\nNorthwind Ceramics",
      sample: { first_name: "Thu", company: "Mekong Resort Co., Ltd." },
      sampleLabel: "Shown for Thu Le, Mekong Resort Co., Ltd.",
    },
    editHref: "/templates/t1/edit",
    after: [
      { kind: "steps", steps: [done("Start sending", "1.2s")] },
      { kind: "links", items: [{ label: "Open the batch report", href: "/batches/b2/report?tab=overview" }] },
    ],
  });

  return [
    ...(steps.length ? [{ kind: "steps" as const, steps }] : []),
    {
      kind: "text",
      text: "I wrote Follow-up 2 and Follow-up 3, moved the price deadline in “Holiday pricing note” and got the Da Nang send ready.",
    },
    { kind: "queue", count: approvals.length },
    ...approvals,
  ];
}

export function seedThreads(): Thread[] {
  // Fixed ids: seeds render on the server too, so they must match on hydration.
  const pendingSend = sendApproval("ap-seed-send");
  return [
    {
      id: "th1",
      title: "Hotel buyers – Vietnam results",
      visibility: "private",
      updatedAt: "2026-10-27T02:52:00Z",
      messages: [
        { id: "m1", role: "user", at: "2026-10-27T02:48:00Z", parts: [{ kind: "text", text: "How is Hotel buyers – Vietnam doing?" }] },
        {
          id: "m2",
          role: "agent",
          at: "2026-10-27T02:48:10Z",
          parts: [
            {
              kind: "steps",
              steps: [
                done("Find campaign “Hotel buyers – Vietnam”", "0.6s"),
                done("Get results per template and batch", "1.2s", "2 templates with sends, 3 batches."),
                done("Compare with benchmarks", "0.7s"),
              ],
              usage: "3 steps · 2.5s · 3,480 tokens",
            },
            ...performanceParts().filter((p) => p.kind !== "links"),
          ],
        },
        { id: "m3", role: "user", at: "2026-10-27T02:51:00Z", parts: [{ kind: "text", text: "Send the reminder to everyone who hasn't opened" }] },
        {
          id: "m4",
          role: "agent",
          at: "2026-10-27T02:52:00Z",
          parts: [
            {
              kind: "steps",
              steps: [
                done("Find template “Follow-up 1 – catalog reminder”", "0.7s"),
                done("Find contacts tagged “hotel”", "0.6s"),
                done("Check the audience", "1.3s", "778 matched · 22 unreachable and 4 unsubscribed left out · 752 to send."),
              ],
              usage: "3 steps · 2.6s · 2,140 tokens",
            },
            { kind: "text", text: "The audience is ready. I need your approval to send." },
            pendingSend,
          ],
        },
      ],
    },
    {
      id: "th2",
      title: "Architects in Singapore",
      visibility: "company",
      updatedAt: "2026-10-26T08:20:00Z",
      messages: [
        { id: "m5", role: "user", at: "2026-10-26T08:10:00Z", parts: [{ kind: "text", text: "Set up a campaign for architects in Singapore" }] },
        {
          id: "m6",
          role: "agent",
          at: "2026-10-26T08:12:00Z",
          parts: [
            { kind: "steps", steps: [done("Read company profile", "0.6s"), done("Create campaign “Architects – Singapore”", "0.8s"), done("Save template draft", "1.1s")], usage: "3 steps · 2.5s · 4,210 tokens" },
            { kind: "text", text: "The draft is ready. It needs to be active before it can be sent." },
            { ...activateApproval("ap-seed-activate"), state: "approved" },
            { kind: "text", text: "It's active." },
          ],
        },
        { id: "m7", role: "user", at: "2026-10-26T08:18:00Z", parts: [{ kind: "text", text: "Send it to people tagged architect" }] },
        {
          id: "m8",
          role: "agent",
          at: "2026-10-26T08:20:00Z",
          parts: [
            { kind: "steps", steps: [done("Check the audience", "0.9s", "248 to send.")] },
            {
              kind: "approval",
              id: "ap-old",
              step: "send",
              action: "Send “Lookbook intro – Singapore architects”",
              details: [{ label: "To", value: "248 people tagged “architect”" }],
              state: "declined",
              result: "",
              after: [],
            },
            { kind: "text", text: "OK, nothing was sent. Tell me when you want to send it." },
          ],
        },
      ],
    },
    {
      id: "th3",
      title: "Distributors in Malaysia",
      visibility: "private",
      updatedAt: "2026-10-22T01:05:00Z",
      messages: [
        { id: "m9", role: "user", at: "2026-10-22T01:04:00Z", parts: [{ kind: "text", text: "Find building material distributors in Malaysia" }] },
        {
          id: "m10",
          role: "agent",
          at: "2026-10-22T01:05:00Z",
          parts: [
            { kind: "steps", steps: [done("Search companies · Malaysia · Wholesale of construction materials", "1.0s")] },
            { kind: "text", text: "There are 2,875 matching companies, 640 with an email. Unlock the ones you want to see their full contact details." },
            { kind: "links", items: [{ label: "View companies", href: "/companies" }] },
          ],
        },
      ],
    },
    {
      id: "th4",
      title: "Verify northwind-tiles.vn",
      visibility: "company",
      updatedAt: "2026-10-11T19:30:00Z",
      messages: [
        { id: "m11", role: "user", at: "2026-10-11T19:29:00Z", parts: [{ kind: "text", text: "Why can't I send from northwind-tiles.vn?" }] },
        {
          id: "m12",
          role: "agent",
          at: "2026-10-11T19:30:00Z",
          parts: [
            { kind: "steps", steps: [done("Check sending domains", "0.5s")] },
            { kind: "text", text: "The domain is added but not verified: the DKIM and DMARC records are missing. Add them at your DNS provider, then press Verify." },
            { kind: "links", items: [{ label: "Open domain settings", href: "/settings/domain" }] },
          ],
        },
      ],
    },
  ];
}

export function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((new Date(NOW).getTime() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}
