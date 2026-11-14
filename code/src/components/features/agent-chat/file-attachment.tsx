"use client";

import { FileImageIcon, FileSpreadsheetIcon, FileTextIcon, FileTypeIcon, XIcon } from "lucide-react";
import { Hint } from "@/components/saella/hint";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import type { FileKind, SentFile } from "./data";

// The one file a user turn carries (PRD-03 AC-AG-A-01/02): in the composer before sending (with Remove) and in
// the sent message. An image shows its thumbnail, other files the icon of their type.
const KIND: Record<FileKind, { label: string; Icon: typeof FileTextIcon }> = {
  image: { label: "Image", Icon: FileImageIcon },
  pdf: { label: "PDF", Icon: FileTextIcon },
  word: { label: "Word", Icon: FileTypeIcon },
  excel: { label: "Excel", Icon: FileSpreadsheetIcon },
};

/** The kinds the agent reads; anything else is refused before upload, as in the live composer. */
export function kindOf(file: File): FileKind | undefined {
  if (file.type.startsWith("image/")) return "image";
  if (/\.pdf$/i.test(file.name)) return "pdf";
  if (/\.docx?$/i.test(file.name)) return "word";
  if (/\.xlsx?$/i.test(file.name)) return "excel";
  return undefined;
}

function formatBytes(n: number) {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileAttachment({ file, onRemove, className }: { file: SentFile; onRemove?: () => void; className?: string }) {
  const { label, Icon } = KIND[file.kind];
  return (
    <Attachment className={className}>
      {file.url ? (
        <AttachmentMedia variant="image">
          {/* A local blob: URL of the picked file; next/image cannot optimise it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.url} alt="" />
        </AttachmentMedia>
      ) : (
        <AttachmentMedia>
          <Icon />
        </AttachmentMedia>
      )}
      <AttachmentContent>
        <AttachmentTitle>{file.name}</AttachmentTitle>
        <AttachmentDescription className="tabular-nums">
          {label} · {formatBytes(file.bytes)}
        </AttachmentDescription>
      </AttachmentContent>
      {onRemove && (
        <AttachmentActions>
          <Hint label="Remove">
            <AttachmentAction aria-label={`Remove ${file.name}`} onClick={onRemove}>
              <XIcon />
            </AttachmentAction>
          </Hint>
        </AttachmentActions>
      )}
    </Attachment>
  );
}
