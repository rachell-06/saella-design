"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { EditorContent, Extension, type Editor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaptionsIcon,
  CopyIcon,
  GripVerticalIcon,
  HeadingIcon,
  ImageIcon,
  ImageUpIcon,
  LayoutTemplateIcon,
  LinkIcon,
  MinusIcon,
  PilcrowIcon,
  PlusIcon,
  RectangleHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Hint } from "@/components/saella/hint";
import { BlockView } from "@/components/features/email-body";
import { BLOCK_LABEL, BLOCKS_FOR, type Block, type BlockType } from "@/lib/mock/templates";
import { escapeHtml } from "@/lib/mock/templates-html";
import { cn } from "@/lib/utils";
import { MergeTagChips } from "./letter-editor";

// The Design canvas in the editor (designer 2026-11-14): text is edited in place on the email, not in a side field.
// Click a block to select it; its text (heading, paragraph, hero headline and line below, button label) becomes
// editable right there. Plain text per field, merge tags as {{tag}} drawn as chips; the toolbar's Tags menu inserts
// at the caret of the field being edited. Enter ends a one-line field, Shift+Enter breaks a line in a paragraph,
// Escape leaves the field. The selected block carries a small toolbar: move up, move down, duplicate, delete.
// An image is picked by clicking, dropping or pasting on the block; Replace, Alt text (image) and Link (button) sit on
// the block's bar. No block has a separate settings card any more (designer 2026-11-14).

/** A plain-text field edited in place, with merge-tag chips. Mounted only while its block is selected. */
function InlineText({
  value,
  onChange,
  label,
  placeholder,
  singleLine,
  autoFocus,
  className,
  onActive,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Accessible name, e.g. "Text" or "Hero headline". */
  label: string;
  placeholder: string;
  singleLine?: boolean;
  autoFocus?: boolean;
  className?: string;
  onActive: (e: Editor) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        underline: false,
        dropcursor: false,
        gapcursor: false,
        trailingNode: false,
      }),
      Placeholder.configure({ placeholder }),
      MergeTagChips,
      Extension.create({
        name: "inlineKeys",
        addKeyboardShortcuts() {
          return {
            Escape: () => this.editor.commands.blur(),
            ...(singleLine ? { Enter: () => this.editor.commands.blur() } : {}),
          };
        },
      }),
    ],
    content: value
      .split("\n")
      .map((l) => `<p>${escapeHtml(l)}</p>`)
      .join(""),
    autofocus: autoFocus ? "end" : false,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.getText({ blockSeparator: "\n" })),
    // Autofocus doesn't fire onFocus: the field that opens focused is the active one from the start.
    onCreate: ({ editor: e }) => {
      if (autoFocus) onActive(e);
    },
    onFocus: ({ editor: e }) => onActive(e),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": singleLine ? "false" : "true",
        class: cn(
          "-mx-1 rounded-sm px-1 outline-none focus:ring-2 focus:ring-ring [&_p]:m-0",
          "[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0",
          "[&_.is-editor-empty:first-child]:before:opacity-60 [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
          className
        ),
      },
    },
  });
  return <EditorContent editor={editor} />;
}

const HERO_TONE = {
  soft: "bg-primary-soft text-primary-soft-foreground",
  muted: "bg-muted text-foreground",
  ink: "bg-foreground text-background",
} as const;

/** The selected block, with its text editable in place. Mirrors BlockView's look so nothing jumps on select. */
function EditableBlock({ block: b, poster, onPatch, onActive }: { block: Block; poster: boolean; onPatch: (p: Record<string, string>) => void; onActive: (e: Editor) => void }) {
  // Each field patches only itself, by block id: the editors keep their first callback, and a hero has two of them.
  const common = { onActive, autoFocus: true };
  switch (b.type) {
    case "heading":
      return (
        <InlineText {...common} singleLine label="Heading text" placeholder="Heading" value={b.text} onChange={(text) => onPatch({ text })} className="pt-2 text-lg font-semibold tracking-title" />
      );
    case "paragraph":
      return <InlineText {...common} label="Text" placeholder="Write something" value={b.text} onChange={(text) => onPatch({ text })} />;
    case "button":
      return (
        <div className={cn("py-2", poster && "flex justify-center")}>
          <span className="inline-flex min-h-9 min-w-24 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground">
            <InlineText {...common} singleLine label="Button label" placeholder="Button label" value={b.label} onChange={(label) => onPatch({ label })} className="focus:ring-primary-foreground" />
          </span>
        </div>
      );
    case "hero":
      return (
        <div className={cn("my-1 flex flex-col gap-1 rounded-md px-6 py-10", HERO_TONE[b.tone])}>
          <InlineText {...common} singleLine label="Hero headline" placeholder="Headline" value={b.headline} onChange={(headline) => onPatch({ headline })} className="text-3xl font-semibold tracking-display" />
          <InlineText onActive={onActive} singleLine label="Hero line below" placeholder="A line below (optional)" value={b.subline} onChange={(subline) => onPatch({ subline })} className="text-base opacity-90" />
        </div>
      );
    default:
      return <BlockView block={b} poster={poster} mode="edit" values={undefined} />;
  }
}

/** Inline images (AC-EC-T-03, BR-RULE-EC-36): 5 MB, png / jpeg / gif / webp. */
const IMAGE_MAX = 5 * 1024 * 1024;
const IMAGE_TYPES = "image/png,image/jpeg,image/gif,image/webp";

/**
 * The selected image block: empty, a drop zone you click, drop or paste onto; with a file, the image (drop or paste
 * replaces it). Errors show on the block. Mock: only the file name is kept (no storage).
 */
function ImageArea({
  block,
  inputRef,
  onFile,
}: {
  block: Extract<Block, { type: "image" }>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (name: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  function take(f: File | undefined) {
    if (!f) return;
    if (!IMAGE_TYPES.split(",").includes(f.type)) return setError(`${f.name} isn't a PNG, JPEG, GIF or WebP image.`);
    if (f.size > IMAGE_MAX) return setError(`${f.name} is over 5 MB. Use a smaller image.`);
    setError(null);
    onFile(f.name);
  }
  return (
    <div
      onDragOver={(e) => {
        if (![...e.dataTransfer.items].some((i) => i.kind === "file")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files[0]);
      }}
      onPaste={(e) => {
        const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
        if (!f) return;
        e.preventDefault();
        take(f);
      }}
      className={cn("rounded-md", over && "ring-2 ring-ring")}
    >
      {/* Hidden file input opened by the drop zone or the bar's Replace (DESIGN.md §2 Control). */}
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {block.file ? (
        <BlockView block={block} poster mode="edit" values={undefined} />
      ) : (
        <Button
          type="button"
          variant="ghost"
          autoFocus
          onClick={() => inputRef.current?.click()}
          className="my-1 h-40 w-full flex-col gap-1 rounded-md border border-dashed border-input bg-muted whitespace-normal text-muted-foreground hover:bg-muted"
        >
          <ImageUpIcon className="size-6" />
          <span className="text-sm font-medium text-foreground">Click, drop or paste an image</span>
          <span className="text-xs">PNG, JPEG, GIF or WebP, up to 5 MB</span>
        </Button>
      )}
      {error && (
        <p role="alert" className="pt-1 text-xs text-destructive-soft-foreground">
          {error}
        </p>
      )}
    </div>
  );
}

/** A small popover from the block bar: alt text for an image, link for a button. */
function BarPopover({
  open,
  onOpenChange,
  label,
  icon: Icon,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Hint label={label}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={label}>
            <Icon />
          </Button>
        </PopoverTrigger>
      </Hint>
      <PopoverContent align="end" className="w-80 text-left">
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** Which action a content-check item asks for on its block: pick a file, write the alt text, set the link. */
export type BlockRequest = { id: string; action: "file" | "alt" | "link"; n: number };

export const BLOCK_ICON: Record<BlockType, React.ElementType> = {
  heading: HeadingIcon,
  paragraph: PilcrowIcon,
  image: ImageIcon,
  button: RectangleHorizontalIcon,
  divider: MinusIcon,
  hero: LayoutTemplateIcon,
};

/** The block types to add, as menu items (toolbar "Add block", the gaps' "+", the bar's "Add below"). */
export function AddBlockItems({ onPick }: { onPick: (type: BlockType) => void }) {
  return (
    <DropdownMenuGroup>
      {BLOCKS_FOR.design.map((type) => {
        const Icon = BLOCK_ICON[type];
        return (
          <DropdownMenuItem key={type} onSelect={() => onPick(type)}>
            <Icon />
            {BLOCK_LABEL[type]}
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuGroup>
  );
}

/**
 * The gap between two blocks (and above the first / below the last). Hover shows a line with a "+" that adds a
 * block right there; while dragging, the gap where the block will land shows the drop line.
 */
function Gap({ index, dropping, dragging, onInsert }: { index: number; dropping: boolean; dragging: boolean; onInsert: (at: number, type: BlockType) => void }) {
  return (
    <div className="group/gap relative flex h-4 items-center justify-center">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full transition-opacity motion-reduce:transition-none",
          dropping ? "h-0.5 bg-brand opacity-100" : "h-px bg-brand/50 opacity-0",
          !dragging && "group-hover/gap:opacity-100 group-focus-within/gap:opacity-100"
        )}
      />
      {!dragging && (
        <DropdownMenu>
          <Hint label="Add a block here">
            <DropdownMenuTrigger asChild>
              {/* Out of the Tab order: keyboard users add from the selected block's bar ("Add below"). */}
              <Button
                variant="outline"
                size="icon-xs"
                tabIndex={-1}
                aria-label={index === 0 ? "Add a block at the top" : `Add a block after block ${index}`}
                className="relative z-10 size-5 rounded-full bg-background opacity-0 transition-opacity group-hover/gap:opacity-100 data-[state=open]:opacity-100 motion-reduce:transition-none"
                onClick={(e) => e.stopPropagation()}
              >
                <PlusIcon />
              </Button>
            </DropdownMenuTrigger>
          </Hint>
          {/* Focus stays with the new block (its text gets the caret), not back on this "+". */}
          <DropdownMenuContent align="center" className="w-44" onCloseAutoFocus={(e) => e.preventDefault()}>
            <AddBlockItems onPick={(t) => onInsert(index, t)} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function DesignCanvas({
  blocks,
  selectedId,
  issueIds,
  request,
  onSelect,
  onPatch,
  onReorder,
  onInsert,
  onDuplicate,
  onDelete,
  onActiveEditor,
}: {
  blocks: Block[];
  selectedId: string | null;
  issueIds: Set<string>;
  /** From the content check: open the action that fixes the problem on that block. */
  request: BlockRequest | null;
  onSelect: (id: string) => void;
  /** Changes some fields of one block. */
  onPatch: (id: string, patch: Record<string, string>) => void;
  /** Moves the block at `from` so it ends up at index `to` (after the move). */
  onReorder: (from: number, to: number) => void;
  /** Adds a new block of `type` at index `at`, selected. */
  onInsert: (at: number, type: BlockType) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** The text field being edited, so the toolbar's Tags menu can insert at its caret. */
  onActiveEditor: (e: Editor | null) => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
  const [popover, setPopover] = useState<"alt" | "link" | null>(null);
  // A new selection starts with its popovers closed (adjusted during render, not in an effect).
  const [popoverFor, setPopoverFor] = useState(selectedId);
  if (popoverFor !== selectedId) {
    setPopoverFor(selectedId);
    setPopover(null);
  }
  // A content-check item: its block is selected by the editor; here the matching action opens.
  const [handled, setHandled] = useState<number | null>(null);
  if (request && request.n !== handled && request.id === selectedId) {
    setHandled(request.n);
    if (request.action !== "file") setPopover(request.action);
  }
  const pickedFor = useRef<number | null>(null);
  useEffect(() => {
    // Opening the file picker needs the DOM: after the block has rendered its input. Once per request.
    if (request?.action === "file" && request.id === selectedId && pickedFor.current !== request.n) {
      pickedFor.current = request.n;
      imageInput.current?.click();
    }
  }, [request, selectedId]);

  // Moves are read out (aria-live): "Image moved to position 3 of 7".
  const [announce, setAnnounce] = useState("");
  function move(from: number, to: number) {
    if (to < 0 || to >= blocks.length || to === from) return;
    onReorder(from, to);
    setAnnounce(`${BLOCK_LABEL[blocks[from].type]} moved to position ${to + 1} of ${blocks.length}`);
  }

  // Drag to reorder, from the handle only (never from text being edited). Pointer events, no library.
  const blockEls = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<{ from: number; startY: number; dy: number; gap: number } | null>(null);
  /** The gap (0…n) the pointer is nearest to: before the first other block whose middle is below it. */
  function gapAt(y: number, from: number) {
    const mids = blockEls.current.slice(0, blocks.length).map((el, k) => {
      // The dragged block follows the pointer: it doesn't count.
      if (k === from) return null;
      const r = el?.getBoundingClientRect();
      return r ? r.top + r.height / 2 : Infinity;
    });
    const i = mids.findIndex((m) => m !== null && y < m);
    return i === -1 ? blocks.length : i;
  }
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="flex flex-col text-center text-sm leading-relaxed">
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      {blocks.map((b, i) => {
        const selected = b.id === selectedId;
        const dragged = drag?.from === i;
        return (
          <Fragment key={b.id}>
            <Gap index={i} dropping={Boolean(drag) && drag!.gap === i && drag!.gap !== drag!.from && drag!.gap !== drag!.from + 1} dragging={Boolean(drag)} onInsert={onInsert} />
            <div
              ref={(el) => {
                blockEls.current[i] = el;
              }}
              role="group"
              aria-label={`${BLOCK_LABEL[b.type]} block, ${i + 1} of ${blocks.length}${selected ? ", selected" : ""}${issueIds.has(b.id) ? ", has a content check note" : ""}`}
              tabIndex={selected ? -1 : 0}
              onClick={() => !selected && onSelect(b.id)}
              onKeyDown={(e) => {
                if (selected && e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                  e.preventDefault();
                  move(i, e.key === "ArrowUp" ? i - 1 : i + 1);
                  return;
                }
                if (!selected && (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                  e.preventDefault();
                  onSelect(b.id);
                }
              }}
              style={dragged && !reduceMotion ? { transform: `translateY(${drag!.dy}px)` } : undefined}
              className={cn(
                "relative -mx-2 rounded-md px-2 py-1 outline-none transition-shadow",
                "hover:ring-1 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring",
                selected && "ring-2 ring-brand hover:ring-2 hover:ring-brand",
                // Lifted while dragged (floats: it may cast a shadow).
                dragged && "z-20 bg-background opacity-80 shadow-lg"
              )}
            >
              {issueIds.has(b.id) && (
                <Hint label="See the content check">
                  <span aria-hidden className="absolute top-1 right-1 size-2 rounded-full bg-warning" />
                </Hint>
              )}
              {selected ? (
                <>
                  {/* The block's actions on the block itself (designer 2026-11-14). Floats: it may cast a shadow. */}
                  <div
                    role="toolbar"
                    aria-label={`${BLOCK_LABEL[b.type]} block actions`}
                    className="absolute right-0 bottom-full z-10 mb-1 flex items-center gap-0.5 rounded-md border bg-background p-0.5 text-foreground shadow-sm"
                  >
                    <Hint label="Drag to move (or Alt+↑ / Alt+↓)">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Drag to move"
                        className="cursor-grab touch-none active:cursor-grabbing"
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setDrag({ from: i, startY: e.clientY, dy: 0, gap: i });
                        }}
                        onPointerMove={(e) => {
                          if (!drag) return;
                          setDrag({ ...drag, dy: e.clientY - drag.startY, gap: gapAt(e.clientY, drag.from) });
                        }}
                        onPointerUp={(e) => {
                          if (!drag) return;
                          e.currentTarget.releasePointerCapture(e.pointerId);
                          const { from, gap } = drag;
                          setDrag(null);
                          // Gap g sits before block g; dropping after itself changes nothing.
                          if (gap !== from && gap !== from + 1) move(from, gap > from ? gap - 1 : gap);
                        }}
                        onPointerCancel={() => setDrag(null)}
                      >
                        <GripVerticalIcon />
                      </Button>
                    </Hint>
                    <Separator orientation="vertical" className="mx-0.5 h-4 self-center" />
                    {b.type === "image" && b.file && (
                      <Hint label="Replace image">
                        <Button variant="ghost" size="icon-xs" aria-label="Replace image" onClick={() => imageInput.current?.click()}>
                          <ImageUpIcon />
                        </Button>
                      </Hint>
                    )}
                    {b.type === "image" && (
                      <BarPopover open={popover === "alt"} onOpenChange={(o) => setPopover(o ? "alt" : null)} label="Alt text" icon={CaptionsIcon}>
                        <Field>
                          <FieldLabel htmlFor="dc-alt">Alt text</FieldLabel>
                          <Textarea
                            id="dc-alt"
                            value={b.alt}
                            onChange={(e) => onPatch(b.id, { alt: e.target.value })}
                            placeholder="Describe the image for people who can't see it"
                            className="min-h-16"
                            autoFocus
                          />
                          <FieldDescription>Shown when images are blocked, and read aloud by screen readers.</FieldDescription>
                        </Field>
                      </BarPopover>
                    )}
                    {b.type === "button" && (
                      <BarPopover open={popover === "link"} onOpenChange={(o) => setPopover(o ? "link" : null)} label="Link" icon={LinkIcon}>
                        <Field>
                          <FieldLabel htmlFor="dc-url">Link</FieldLabel>
                          <Input
                            id="dc-url"
                            type="url"
                            value={b.url}
                            onChange={(e) => onPatch(b.id, { url: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && setPopover(null)}
                            placeholder="https://"
                            autoFocus
                          />
                          <FieldDescription>Clicks on it are counted per link.</FieldDescription>
                        </Field>
                      </BarPopover>
                    )}
                    {(b.type === "image" || b.type === "button") && <Separator orientation="vertical" className="mx-0.5 h-4 self-center" />}
                    <Hint label="Move up">
                      <Button variant="ghost" size="icon-xs" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                        <ArrowUpIcon />
                      </Button>
                    </Hint>
                    <Hint label="Move down">
                      <Button variant="ghost" size="icon-xs" aria-label="Move down" disabled={i === blocks.length - 1} onClick={() => move(i, i + 1)}>
                        <ArrowDownIcon />
                      </Button>
                    </Hint>
                    <DropdownMenu>
                      <Hint label="Add a block below">
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs" aria-label="Add a block below">
                            <PlusIcon />
                          </Button>
                        </DropdownMenuTrigger>
                      </Hint>
                      <DropdownMenuContent align="end" className="w-44" onCloseAutoFocus={(e) => e.preventDefault()}>
                        <AddBlockItems onPick={(t) => onInsert(i + 1, t)} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Hint label="Duplicate">
                      <Button variant="ghost" size="icon-xs" aria-label="Duplicate block" onClick={onDuplicate}>
                        <CopyIcon />
                      </Button>
                    </Hint>
                    <Hint label="Delete">
                      <Button variant="ghost" size="icon-xs" aria-label="Delete block" onClick={onDelete} className="text-destructive hover:text-destructive">
                        <Trash2Icon />
                      </Button>
                    </Hint>
                  </div>
                  {b.type === "image" ? (
                    <ImageArea key={b.id} block={b} inputRef={imageInput} onFile={(file) => onPatch(b.id, { file })} />
                  ) : (
                    <EditableBlock key={b.id} block={b} poster onPatch={(patch) => onPatch(b.id, patch)} onActive={onActiveEditor} />
                  )}
                </>
              ) : (
                <BlockView block={b} poster mode="edit" values={undefined} />
              )}
            </div>
          </Fragment>
        );
      })}
      <Gap
        index={blocks.length}
        dropping={Boolean(drag) && drag!.gap === blocks.length && drag!.from !== blocks.length - 1}
        dragging={Boolean(drag)}
        onInsert={onInsert}
      />
      {blocks.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">Add a block with the toolbar, or ask Write with Saella for a first draft.</p>
      )}
      {/* The unsubscribe footer Saella appends (as EmailBody shows it). */}
      <p className="mt-4 border-t pt-3 text-center text-xs text-subtle-foreground">
        You received this email from Northwind Ceramics. <span className="underline">Unsubscribe</span> · added automatically
      </p>
    </div>
  );
}
