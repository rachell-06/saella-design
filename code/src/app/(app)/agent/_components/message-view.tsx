"use client";

import Link from "next/link";
import { ArrowRightIcon, CircleAlertIcon, ListChecksIcon, PaperclipIcon, RotateCcwIcon, ShieldAlertIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AgentSteps } from "@/components/saella/agent-steps";
import { ApprovalCard } from "@/components/saella/approval-card";
import { Badge } from "@/components/ui/badge";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Message, MessageContent } from "@/components/ui/message";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type Message as Msg, type Part, type SendSplit, canSplit, confirmLabelOf, noteOf, splitOf } from "./data";
import { SendSplitChoice, TestSendView } from "./send-split";

// One message of the full-page transcript (PATTERNS.md §9.4): the user's text in a muted bubble on the right;
// the agent's turn full width with no bubble, so tables, dashboards and approval cards have room.
// Agent answers about performance read table → "Verdict:" → numbered advice (PRD-03 AC-AG-D-03).
export type PartHandlers = {
  onApprove: (approvalId: string) => void;
  onAlwaysAllow: (approvalId: string) => void;
  onDecline: (approvalId: string) => void;
  onPrompt: (text: string) => void;
  onRetry: () => void;
  /** Opens the approval queue (R17), which works on the same approvals as the cards here. */
  onOpenQueue: () => void;
  /** A large live send: first TEST_SEND_SIZE or everyone (R18). The queue sets the same field. */
  onSplit: (approvalId: string, split: SendSplit) => void;
};

export function MessageView({ message, handlers, busy }: { message: Msg; handlers: PartHandlers; busy: boolean }) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          {message.attachment && (
            <span className="flex items-center gap-1.5 self-end text-sm text-muted-foreground">
              <PaperclipIcon className="size-3.5" aria-hidden />
              {message.attachment}
            </span>
          )}
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
  return (
    <Message>
      <MessageContent className="gap-3">
        {message.parts.map((p, i) => (
          <PartView key={i} part={p} handlers={handlers} busy={busy} />
        ))}
      </MessageContent>
    </Message>
  );
}

const chartConfig = {
  open: { label: "Open rate %", color: "var(--chart-1)" },
  click: { label: "Click rate %", color: "var(--chart-2)" },
} satisfies ChartConfig;

function PartView({ part: p, handlers, busy }: { part: Part; handlers: PartHandlers; busy: boolean }) {
  switch (p.kind) {
    case "text":
      return <p className="text-sm leading-relaxed">{p.text}</p>;
    case "steps":
      return (
        <div className="flex flex-col gap-1">
          <AgentSteps steps={p.steps} />
          {p.usage && <p className="text-xs text-subtle-foreground tabular-nums">{p.usage}</p>}
        </div>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border">
          <Table aria-label={p.caption} className="text-dense">
            <TableHeader>
              <TableRow>
                {p.columns.map((c) => (
                  <TableHead key={c.label} className={cn(c.align === "end" && "text-right")}>
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
                      <TableCell key={c} className={cn(p.columns[c]?.align === "end" && "text-right tabular-nums", c === 0 && !last && "font-medium")}>
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
          {/* A large live send carries the "20 first / all N" choice as one more detail row (R18). The key
              remounts the card when the choice changes, so the confirm tick has to be given again for the new
              number (AC-AG-G-06). */}
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
            onApprove={() => handlers.onApprove(p.id)}
            onAlwaysAllow={() => handlers.onAlwaysAllow(p.id)}
            onDecline={() => handlers.onDecline(p.id)}
          />
          {p.auto && <p className="pl-7 text-sm text-muted-foreground">Ran without asking: you set this step to always allow.</p>}
          {p.edited && p.state === "pending" && <p className="text-sm text-muted-foreground">You edited this draft in the approval queue.</p>}
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
            <Table aria-label="Companies found" className="text-dense">
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
          <span className="flex-1">{p.text}</span>
          <Button variant="outline" size="sm" onClick={handlers.onRetry} disabled={busy}>
            <RotateCcwIcon data-icon="inline-start" />
            Try again
          </Button>
        </div>
      );
    case "queue":
      // Unify's "Nothing is sending yet" line (Competitor.md U-P1): the cards below and the queue are one set.
      return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <ListChecksIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1">
            Nothing is sent or changed yet. {p.count} {p.count === 1 ? "item waits" : "items wait"} for your approval below, or
            review them side by side.
          </span>
          <Button variant="outline" size="sm" onClick={handlers.onOpenQueue}>
            Review in queue
          </Button>
        </div>
      );
    case "testSend":
      return <TestSendView result={p.result} href={p.href} />;
    case "notice":
      return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldAlertIcon className="size-4 shrink-0" aria-hidden />
          {p.text}
        </p>
      );
  }
}
