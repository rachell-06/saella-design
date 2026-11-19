"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CircleAlertIcon,
  CoinsIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileTypeIcon,
  ListChecksIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  XIcon,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { TopUpDialog } from "@/components/features/top-up-dialog";
import { useCreditBalance } from "@/lib/mock/credits";
import { creditsUsd } from "@/lib/mock/pricing";
import { AgentSteps } from "@/components/saella/agent-steps";
import { ApprovalCard } from "@/components/saella/approval-card";
import { Hint } from "@/components/saella/hint";
import { Badge } from "@/components/ui/badge";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageContent } from "@/components/ui/message";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { METRIC_COLOR } from "@/lib/metric-colors";
import {
  type FlowStep,
  type Message as Msg,
  type Part,
  type Rating,
  type SendSplit,
  type TurnCharge,
  actionList,
  canSplit,
  confirmLabelOf,
  creditWord,
  creditsFor,
  noteOf,
  splitOf,
  turnUsage,
} from "./data";
import { FileAttachment } from "./file-attachment";
import { SendSplitChoice, TestSendView } from "./send-split";

// One message of the agent panel's transcript: the user's text in a muted bubble on the right;
// the agent's turn full width with no bubble, so tables, dashboards and approval cards have room.
// Agent answers about performance read table → "Verdict:" → numbered advice (PRD-03 AC-AG-D-03).
export type PartHandlers = {
  onApprove: (approvalId: string) => void;
  onAlwaysAllow: (approvalId: string) => void;
  onDecline: (approvalId: string) => void;
  onPrompt: (text: string) => void;
  onRetry: () => void;
  /** A large live send: first TEST_SEND_SIZE or everyone (R18). */
  onSplit: (approvalId: string, split: SendSplit) => void;
  /** Steps that run without asking now; their auto-approved cards offer "Ask me again" (AC-AG-P-02). */
  alwaysAllowed: FlowStep[];
  /** Takes back "Always allow" for a step, so the agent asks again. */
  onAskAgain: (step: FlowStep) => void;
};

export function MessageView({ message, handlers, busy }: { message: Msg; handlers: PartHandlers; busy: boolean }) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          {message.attachments?.length ? (
            <AttachmentGroup className="max-w-full justify-end self-end">
              {message.attachments.map((f) => (
                <FileAttachment key={f.kind} file={f} className="max-w-80" />
              ))}
            </AttachmentGroup>
          ) : null}
          {message.parts.map((p, i) =>
            p.kind === "text" ? (
              <Bubble key={i} variant="muted">
                <BubbleContent className="text-sm">{p.text}</BubbleContent>
              </Bubble>
            ) : null
          )}
        </MessageContent>
      </Message>
    );
  }
  // One quiet line closes a finished turn, after everything it showed.
  const turn = message.parts.find((p) => p.kind === "steps");
  const closing = turn?.kind === "steps" && (turn.finished || turn.charge) ? turn : undefined;
  return (
    <Message>
      <MessageContent className="gap-3">
        {message.parts.map((p, i) => (
          <PartView key={i} part={p} handlers={handlers} busy={busy} />
        ))}
        {closing && <TurnUsage usage={closing.finished ? turnUsage(message.parts) : undefined} charge={closing.charge} />}
      </MessageContent>
    </Message>
  );
}

const FORMAT_LABEL = { xlsx: "Excel", docx: "Word", pdf: "PDF", csv: "CSV" } as const;

/**
 * One-tap rating of the conversation (PRD-03 AC-AG-Q-05; live AgentChatCore): inline under the last answer, never
 * blocks the composer, can be dismissed. A tap swaps it for a thank-you.
 */
export function RatingPrompt({ rated, onRate, onDismiss }: { rated?: Rating; onRate: (r: Rating) => void; onDismiss: () => void }) {
  if (rated) return <p className="text-sm text-muted-foreground">Thanks, that helps the agent get better.</p>;
  return (
    <div role="group" aria-label="Rate this conversation" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">How is the agent doing in this conversation?</span>
      {(["bad", "fine", "good"] as const).map((r) => (
        <Button key={r} variant="outline" size="sm" onClick={() => onRate(r)}>
          {r === "bad" ? "Bad" : r === "fine" ? "Fine" : "Good"}
        </Button>
      ))}
      <Hint label="Not now">
        <Button variant="ghost" size="icon-sm" aria-label="Not now" onClick={onDismiss}>
          <XIcon />
        </Button>
      </Hint>
    </div>
  );
}

/** "Costs 3 credits ($0.27)" before a paid step runs; nothing for a free one. */
function approvalCost(charges: Parameters<typeof creditsFor>[0]) {
  const cost = creditsFor(charges);
  return cost ? `Costs ${creditWord(cost)} (${creditsUsd(cost)})` : undefined;
}

/**
 * The quiet line that closes a turn: every step, the time and the credits it used (no token count).
 * What each credit paid for is in the tooltip.
 */
function TurnUsage({ usage, charge }: { usage?: string; charge?: TurnCharge }) {
  const cost = creditsFor(charge?.actions);
  const credits = !charge ? null : cost === 0 ? "No credits used" : `${creditWord(cost)} ${charge.refunded ? "refunded" : "used"}`;
  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      {usage}
      {usage && credits && " · "}
      {credits && cost > 0 ? (
        <Hint label={`${actionList(charge!.actions)}: ${charge!.actions.length > 1 ? "1 credit each" : "1 credit"}`}>
          <span tabIndex={0} className="rounded-sm underline decoration-dotted underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {credits}
          </span>
        </Hint>
      ) : (
        credits
      )}
    </p>
  );
}

/**
 * Refused for credits (PRD-03 AC-AG-W-01/02): nothing ran. Top up opens the shared Top up dialog in
 * place with what is missing; once the balance covers it, the line offers to run the turn again (an approval is just
 * approved again on its card).
 */
function NotEnoughCredits({ cost, on, onRetry, busy }: { cost: number; on: "turn" | "approval"; onRetry: () => void; busy: boolean }) {
  const balance = useCreditBalance();
  const [topUp, setTopUp] = useState(false);
  const short = Math.max(0, cost - balance);
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
      <CoinsIcon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 tabular-nums">
        {short > 0 ? (
          <>
            <span className="font-medium">Not enough credits.</span> This needs {creditWord(cost)}, you have{" "}
            {balance.toLocaleString("en-US")}. Nothing was done.
          </>
        ) : on === "turn" ? (
          "Credits added. Run it again when you're ready."
        ) : (
          "Credits added. Approve it again above."
        )}
      </span>
      {short > 0 ? (
        <Button variant="outline" size="sm" onClick={() => setTopUp(true)}>
          Top up credits
        </Button>
      ) : on === "turn" ? (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={busy}>
          <RotateCcwIcon data-icon="inline-start" />
          Try again
        </Button>
      ) : null}
      <TopUpDialog open={topUp} onOpenChange={setTopUp} need={short} />
    </div>
  );
}

// Colours from the one metric map (lib/metric-colors.ts), as every other chart.
const chartConfig = {
  open: { label: "Open rate %", color: METRIC_COLOR.opens },
  click: { label: "Click rate %", color: METRIC_COLOR.clicks },
} satisfies ChartConfig;

/** Tables in the agent panel fit its width: wrapping cells, tighter padding (no sideways scroll). */
export const AGENT_TABLE = "[&_td]:px-2 [&_td]:whitespace-normal [&_th]:px-2 [&_th]:whitespace-normal [&_td]:break-words";

function PartView({ part: p, handlers, busy }: { part: Part; handlers: PartHandlers; busy: boolean }) {
  switch (p.kind) {
    case "text":
      return <p className="text-sm leading-relaxed">{p.text}</p>;
    case "steps":
      return (
        <AgentSteps steps={p.steps} />
      );
    case "table":
      return (
        // The panel is ~400px: cells wrap (names on two lines, "under 5%") and pad tighter instead of scrolling
        // sideways inside the chat.
        <div className="overflow-hidden rounded-lg border">
          <Table aria-label={p.caption} className={cn("text-dense", AGENT_TABLE)}>
            <TableHeader>
              <TableRow>
                {p.columns.map((c) => (
                  <TableHead key={c.label}>
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.rows.map((row, r) => {
                const last = r === p.rows.length - 1 && row[0] === "Benchmark";
                return (
                  <TableRow key={r} className={cn(last && "text-muted-foreground")}>
                    {row.map((cell, c) => (
                      <TableCell key={c} className={cn(p.columns[c]?.align === "end" && "tabular-nums", c === 0 && !last && "font-medium")}>
                        {typeof cell === "string" ? (
                          cell
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            {cell.badge && <Badge variant={cell.badge.variant}>{cell.badge.label}</Badge>}
                            {cell.text}
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      );
    case "verdict":
      return (
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">Verdict: </span>
          {p.text}
        </p>
      );
    case "advice":
      return (
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
          {p.items.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ol>
      );
    case "dashboard":
      return (
        <figure className="flex flex-col gap-2 rounded-card border p-4">
          <figcaption className="text-sm font-medium">{p.title}</figcaption>
          <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
            <BarChart data={p.data} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={32} unit="%" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="open" fill="var(--color-open)" radius={4} />
              <Bar dataKey="click" fill="var(--color-click)" radius={4} />
            </BarChart>
          </ChartContainer>
        </figure>
      );
    case "approval":
      return (
        <div className="flex flex-col gap-1">
          {/* A large live send carries the "20 first / all N" choice as one more detail row (R18). The key remounts the card
              when the choice changes, so the confirm tick has to be given again for the new number (AC-AG-G-06). */}
          <ApprovalCard
            key={splitOf(p) ?? "one"}
            action={p.action}
            details={
              canSplit(p) && p.state === "pending"
                ? [
                    ...p.details,
                    {
                      label: "Send",
                      value: <SendSplitChoice approval={p} onChange={(v) => handlers.onSplit(p.id, v)} />,
                    },
                  ]
                : p.details
            }
            note={noteOf(p)}
            confirmLabel={confirmLabelOf(p)}
            state={p.state}
            result={p.result}
            cost={approvalCost(p.charges)}
            onApprove={() => handlers.onApprove(p.id)}
            onAlwaysAllow={() => handlers.onAlwaysAllow(p.id)}
            onDecline={() => handlers.onDecline(p.id)}
          />
          {/* The only place to take back "Always allow". */}
          {p.auto && (
            <p className="pl-6 text-sm text-muted-foreground">
              Ran without asking
              {handlers.alwaysAllowed.includes(p.step) && (
                <>
                  {" · "}
                  <Button variant="link" className="h-auto p-0 text-sm" onClick={() => handlers.onAskAgain(p.step)}>
                    Ask me again
                  </Button>
                </>
              )}
            </p>
          )}
          {p.error && p.state === "pending" && (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              {p.error}
            </p>
          )}
        </div>
      );
    case "companies":
      return (
        <div className="flex flex-col gap-2">
          <div className="overflow-hidden rounded-lg border">
            <Table aria-label="Companies found" className={cn("text-dense", AGENT_TABLE)}>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Industry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.rows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.city}</TableCell>
                    <TableCell className="text-muted-foreground">{r.industry}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground tabular-nums">{p.total.toLocaleString("en-US")} companies match</span>
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <Link href={p.href}>
                Open in Companies
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      );
    case "links":
      return (
        <div className="flex flex-wrap gap-2">
          {p.items.map((l) =>
            l.href ? (
              <Bubble key={l.label} variant="outline">
                <BubbleContent asChild>
                  <Link href={l.href}>{l.label}</Link>
                </BubbleContent>
              </Bubble>
            ) : (
              <Bubble key={l.label} variant="outline">
                <BubbleContent asChild>
                  <button type="button" disabled={busy} onClick={() => l.prompt && handlers.onPrompt(l.prompt)} className="disabled:opacity-50">
                    {l.label}
                  </button>
                </BubbleContent>
              </Bubble>
            )
          )}
        </div>
      );
    case "error":
      return (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
          <CircleAlertIcon className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">
            {p.text}
            {p.refunded ? <span className="font-medium"> {creditWord(p.refunded)} refunded.</span> : null}
          </span>
          <Button variant="outline" size="sm" onClick={handlers.onRetry} disabled={busy}>
            <RotateCcwIcon data-icon="inline-start" />
            Try again
          </Button>
        </div>
      );
    case "credits":
      return <NotEnoughCredits cost={p.cost} on={p.on} onRetry={handlers.onRetry} busy={busy} />;
    case "queue":
      // "Nothing is sending yet" line (Competitor.md U-P1): the cards below are where each item is approved.
      return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <ListChecksIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1">
            Nothing is sent or changed yet. {p.count} {p.count === 1 ? "item waits" : "items wait"} for your approval below.
          </span>
        </div>
      );
    case "testSend":
      return <TestSendView result={p.result} href={p.href} />;
    case "download": {
      const Icon = p.format === "xlsx" || p.format === "csv" ? FileSpreadsheetIcon : p.format === "docx" ? FileTypeIcon : FileTextIcon;
      return (
        <Attachment className="w-full">
          <AttachmentMedia>
            <Icon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{p.filename}</AttachmentTitle>
            <AttachmentDescription className="tabular-nums">
              {FORMAT_LABEL[p.format]} · {p.size}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            {/* Live export_report hands back a signed link that works for an hour. */}
            <Hint label="The link works for 1 hour">
              <AttachmentAction
                variant="outline"
                size="sm"
                aria-label={`Download ${p.filename}`}
                onClick={() => toast.success(`Downloaded ${p.filename}`)}
              >
                <DownloadIcon data-icon="inline-start" />
                Download
              </AttachmentAction>
            </Hint>
          </AttachmentActions>
        </Attachment>
      );
    }
    // How a turn ended when it did not finish: stopped by you, or stopped for safety (PRD-03 AC-AG-S-05).
    case "notice":
      return (
        <Marker>
          <MarkerIcon>
            <ShieldAlertIcon />
          </MarkerIcon>
          <MarkerContent>{p.text}</MarkerContent>
        </Marker>
      );
  }
}
