"use client";

import { useRef, useState } from "react";
import { ArrowUpIcon, PaperclipIcon, SquareIcon } from "lucide-react";
import { toast } from "sonner";
import { AttachmentGroup } from "@/components/ui/attachment";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import type { SentFile } from "./data";
import { FileAttachment, kindOf } from "./file-attachment";

// The agent's composer, in the side panel and on /agent: sending, Stop and attachments. Images, PDF, Word and Excel up to 5 MB, for this turn only
// (PRD-03 AC-AG-A-01/02/04); a pasted image attaches too. Enter sends, Shift+Enter adds a line.
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
  onSend: (text: string, attachments?: SentFile[]) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  // One image and one document per turn, as in the live composer; a second of the same kind replaces the first.
  const [image, setImage] = useState<SentFile>();
  const [doc, setDoc] = useState<SentFile>();
  const files = [image, doc].filter((f): f is SentFile => Boolean(f));
  const fileRef = useRef<HTMLInputElement>(null);
  const attach = (f: File) => {
    const kind = kindOf(f);
    if (!kind || f.size > MAX_BYTES) {
      toast.error(kind ? `“${f.name}” is over 5 MB` : `The agent can't read “${f.name}”`, {
        description: "Attach an image, PDF, Word or Excel file up to 5 MB.",
      });
      return;
    }
    if (kind === "image") {
      revoke(image);
      setImage({ name: f.name, kind, bytes: f.size, url: URL.createObjectURL(f) });
    } else setDoc({ name: f.name, kind, bytes: f.size });
  };

  const remove = (f: SentFile) => {
    revoke(f);
    if (f.kind === "image") setImage(undefined);
    else setDoc(undefined);
  };

  const send = () => {
    if (!text.trim() || busy || disabled) return;
    onSend(text.trim(), files.length ? files : undefined); // the sent message now shows the preview, so it is not revoked here
    setText("");
    // Attachments apply to this turn only (AC-AG-A-04).
    setImage(undefined);
    setDoc(undefined);
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
          if (f) attach(f);
        }}
      />
      {files.length > 0 && (
        <InputGroupAddon align="block-start" className="min-w-0">
          <AttachmentGroup className="max-w-full">
            {files.map((f) => (
              <FileAttachment key={f.kind} file={f} onRemove={() => remove(f)} className="max-w-72" />
            ))}
          </AttachmentGroup>
        </InputGroupAddon>
      )}
      <InputGroupTextarea
        aria-label="Message the agent"
        placeholder="Ask the agent…"
        value={text}
        disabled={Boolean(disabled)}
        onChange={(e) => setText(e.target.value)}
        // A pasted screenshot attaches like a picked image (AC-AG-A-01).
        onPaste={(e) => {
          const img = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
          if (!img || busy) return;
          e.preventDefault();
          attach(img);
        }}
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
        {/* No approval chip (designer decision 2026-11-12): the agent works on its own and asks only at the send step, on the approval card. */}
        {disabled && <InputGroupText className="min-w-0 text-sm text-muted-foreground">{disabled}</InputGroupText>}
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

// An image keeps a local preview URL: free it when the file is removed or replaced before sending.
function revoke(file?: SentFile) {
  if (file?.url) URL.revokeObjectURL(file.url);
}
