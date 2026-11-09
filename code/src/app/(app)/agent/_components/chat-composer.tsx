"use client";

import { useRef, useState } from "react";
import { ArrowUpIcon, PaperclipIcon, SquareIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";

// Working composer for the full agent page. Same look as AgentComposer in layout/agent-panel.tsx (which is a
// static shell), plus sending, Stop and attachments. Images, PDF, Word and Excel up to 5 MB, for this turn only
// (PRD-03 AC-AG-A-01/02/04). Enter sends, Shift+Enter adds a line.
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx";

export function ChatComposer({
  busy,
  disabled,
  onSend,
  onStop,
}: {
  busy: boolean;
  /** e.g. rate limited: say why in the composer's hint. */
  disabled?: string;
  onSend: (text: string, attachment?: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File>();
  const fileRef = useRef<HTMLInputElement>(null);

  const send = () => {
    if (!text.trim() || busy || disabled) return;
    onSend(text.trim(), file?.name);
    setText("");
    setFile(undefined); // attachments apply to this turn only (AC-AG-A-04)
  };

  return (
    <InputGroup>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > MAX_BYTES) {
            toast.error(`“${f.name}” is over 5 MB`, { description: "Attach an image, PDF, Word or Excel file up to 5 MB." });
            return;
          }
          setFile(f);
        }}
      />
      {file && (
        <InputGroupAddon align="block-start">
          <Badge variant="secondary" className="h-6 gap-1 pr-0.5 text-foreground">
            <PaperclipIcon />
            <span className="max-w-60 truncate">{file.name}</span>
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              onClick={() => setFile(undefined)}
              className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        </InputGroupAddon>
      )}
      <InputGroupTextarea
        aria-label="Message the agent"
        placeholder="Ask the agent…"
        value={text}
        disabled={Boolean(disabled)}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        className="max-h-48 min-h-14"
      />
      <InputGroupAddon align="block-end">
        <InputGroupButton
          size="icon-sm"
          aria-label="Attach file (image, PDF, Word or Excel, up to 5 MB)"
          onClick={() => fileRef.current?.click()}
          disabled={busy || Boolean(disabled)}
        >
          <PaperclipIcon />
        </InputGroupButton>
        <InputGroupText className="text-sm text-muted-foreground">{disabled ?? "Writes wait for your approval"}</InputGroupText>
        {busy ? (
          <InputGroupButton variant="outline" size="sm" className="ml-auto" onClick={onStop}>
            <SquareIcon data-icon="inline-start" />
            Stop
          </InputGroupButton>
        ) : (
          <InputGroupButton variant="default" size="icon-sm" className="ml-auto" aria-label="Send" disabled={!text.trim() || Boolean(disabled)} onClick={send}>
            <ArrowUpIcon />
          </InputGroupButton>
        )}
      </InputGroupAddon>
    </InputGroup>
  );
}
