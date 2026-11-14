"use client";

import { useRef, useState } from "react";
import { EditorContent, Extension, type Editor, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import {
  BaselineIcon,
  BoldIcon,
  BracesIcon,
  ImagePlusIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  PaperclipIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Hint } from "@/components/saella/hint";
import { EMAIL_PROSE, tagChipClass } from "@/components/features/email-body";
import { KNOWN_TAGS } from "@/lib/mock/templates";
import { MERGE_TAG_MENU_CLASS, MergeTagItems } from "@/components/features/merge-tag-items";
import { cn } from "@/lib/utils";

// The Letter body editor: rich text like the live app's EmailEditor (TipTap). Headless
// TipTap, Saella styling: the toolbar is shadcn components only, the content uses EMAIL_PROSE (the same typography as
// the preview). Toolbar as the live one: block style, text size, B / I / U / S, bullet and numbered list, link, image,
// text colour, undo / redo, merge tags, attach; Write with Saella sits at its right (live app "Agent").
// Merge tags stay plain {{tag}} text in the HTML (the send pipeline fills them); the editor only draws them as chips.
// Not built: font family, text alignment, drag-and-drop / pasted images, resizable images, the right-click menu.

/** Inline images (AC-EC-T-03, BR-RULE-EC-36): 5 MB, png / jpeg / gif / webp. */
const IMAGE_MAX = 5 * 1024 * 1024;
const IMAGE_TYPES = "image/png,image/jpeg,image/gif,image/webp";

// Text colours: these go into the email itself (recipients' inboxes), so they are template colours, not UI tokens.
// The first is the email ink (--email-ink). Live app: BRAND_PRESETS + a free picker.
const TEXT_COLOURS = [
  { name: "Ink", value: "#0c2124" },
  { name: "Grey", value: "#62747a" },
  { name: "Orange", value: "#b75000" },
  { name: "Green", value: "#1f8b5f" },
  { name: "Forest", value: "#0f3d2e" },
  { name: "Blue", value: "#1d4ed8" },
  { name: "Red", value: "#dc2626" },
];

const SIZES = [
  { key: "small", label: "Small", value: "13px" },
  { key: "normal", label: "Normal", value: "" },
  { key: "large", label: "Large", value: "18px" },
  { key: "huge", label: "Huge", value: "24px" },
];

/** An image file into the letter at `pos` (or the cursor). Mock: a session-only blob URL, no storage. */
function insertImage(view: EditorView, f: File, pos: number | null) {
  if (!IMAGE_TYPES.split(",").includes(f.type)) return void toast.error(`${f.name} isn't a PNG, JPEG, GIF or WebP image.`);
  if (f.size > IMAGE_MAX) return void toast.error(`${f.name} is over 5 MB`, { description: "Use a smaller image." });
  const node = view.state.schema.nodes.image?.create({ src: URL.createObjectURL(f), alt: f.name.replace(/\.[^.]+$/, "") });
  if (!node) return;
  const tr = pos === null ? view.state.tr.replaceSelectionWith(node) : view.state.tr.insert(pos, node);
  view.dispatch(tr);
}

/** {{tag}} drawn as a chip inside the editor (decoration only: the HTML keeps the plain text). */
export const MergeTagChips = Extension.create({
  name: "mergeTagChips",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("mergeTagChips"),
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              for (const m of node.text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g))
                decos.push(Decoration.inline(pos + m.index, pos + m.index + m[0].length, { class: tagChipClass(KNOWN_TAGS.has(m[1])) }));
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

export function LetterEditor({
  value,
  onChange,
  disabled,
  onAttach,
  trailing,
}: {
  /** Read once: remount (key) to load different content, e.g. after Write with Saella or Undo. */
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  onAttach?: () => void;
  /** Right end of the toolbar: Write with Saella. */
  trailing?: React.ReactNode;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener nofollow", target: "_blank" } },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      TextStyle,
      Color,
      FontSize,
      Placeholder.configure({ placeholder: "Write your email…" }),
      MergeTagChips,
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      // Paste or drop an image into the text, as in the live editor (5 MB, png / jpeg / gif / webp).
      handlePaste: (view, event) => {
        const f = [...(event.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/"));
        if (!f) return false;
        event.preventDefault();
        insertImage(view, f, null);
        return true;
      },
      handleDrop: (view, event) => {
        const f = [...((event as DragEvent).dataTransfer?.files ?? [])].find((x) => x.type.startsWith("image/"));
        if (!f) return false;
        event.preventDefault();
        const at = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY })?.pos ?? null;
        insertImage(view, f, at);
        return true;
      },
      attributes: {
        "aria-label": "Email body",
        class: cn(
          EMAIL_PROSE,
          "min-h-64 outline-none",
          // TipTap's placeholder: an empty first paragraph shows the hint.
          "[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0",
          "[&_.is-editor-empty:first-child]:before:text-subtle-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
          "[&_img.ProseMirror-selectednode]:ring-2 [&_img.ProseMirror-selectednode]:ring-brand",
          // Mock: an image with a file name but no stored file (seed letters) shows as a placeholder box with its alt.
          "[&_img:not([src^='http']):not([src^='blob:'])]:flex [&_img:not([src^='http']):not([src^='blob:'])]:h-24 [&_img:not([src^='http']):not([src^='blob:'])]:w-full",
          "[&_img:not([src^='http']):not([src^='blob:'])]:items-center [&_img:not([src^='http']):not([src^='blob:'])]:justify-center",
          "[&_img:not([src^='http']):not([src^='blob:'])]:border [&_img:not([src^='http']):not([src^='blob:'])]:border-dashed",
          "[&_img:not([src^='http']):not([src^='blob:'])]:border-input [&_img:not([src^='http']):not([src^='blob:'])]:bg-muted",
          "[&_img:not([src^='http']):not([src^='blob:'])]:text-xs [&_img:not([src^='http']):not([src^='blob:'])]:text-muted-foreground"
        ),
      },
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 flex items-start gap-2 rounded-lg border bg-background p-1.5">
        {editor ? <Toolbar editor={editor} disabled={disabled} onAttach={onAttach} /> : <div className="h-7 flex-1" />}
        {trailing}
      </div>
      {/* email-canvas: always the light palette recipients see, whatever the app theme (tokens.css). */}
      <div className="email-canvas w-full rounded-lg border p-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor, disabled, onAttach }: { editor: Editor; disabled?: boolean; onAttach?: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive("heading", { level: 1 }) ? "h1" : e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : "p",
      size: SIZES.find((z) => z.value && z.value === e.getAttributes("textStyle").fontSize)?.key ?? "normal",
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      link: e.isActive("link"),
      href: (e.getAttributes("link").href as string | undefined) ?? "",
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const imageRef = useRef<HTMLInputElement>(null);
  const run = () => editor.chain().focus();

  const mark = (label: string, pressed: boolean, onToggle: () => void, Icon: React.ElementType) => (
    <Hint label={label}>
      <Toggle size="sm" aria-label={label} pressed={pressed} onPressedChange={onToggle} disabled={disabled}>
        <Icon />
      </Toggle>
    </Hint>
  );
  const sep = <Separator orientation="vertical" className="mx-0.5 h-5 self-center" />;

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5" role="toolbar" aria-label="Format the email">
      <Select
        value={s.block}
        onValueChange={(v) => (v === "p" ? run().setParagraph().run() : run().setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run())}
        disabled={disabled}
      >
        <SelectTrigger size="sm" aria-label="Text style" className="border-0 px-2 shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="p">Paragraph</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        value={s.size}
        onValueChange={(v) => {
          const z = SIZES.find((x) => x.key === v);
          if (z?.value) run().setFontSize(z.value).run();
          else run().unsetFontSize().run();
        }}
        disabled={disabled}
      >
        <SelectTrigger size="sm" aria-label="Text size" className="border-0 px-2 shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {SIZES.map((z) => (
              <SelectItem key={z.key} value={z.key}>
                {z.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {sep}
      {mark("Bold", s.bold, () => run().toggleBold().run(), BoldIcon)}
      {mark("Italic", s.italic, () => run().toggleItalic().run(), ItalicIcon)}
      {mark("Underline", s.underline, () => run().toggleUnderline().run(), UnderlineIcon)}
      {mark("Strikethrough", s.strike, () => run().toggleStrike().run(), StrikethroughIcon)}
      {sep}
      {mark("Bullet list", s.bullet, () => run().toggleBulletList().run(), ListIcon)}
      {mark("Numbered list", s.ordered, () => run().toggleOrderedList().run(), ListOrderedIcon)}
      {sep}
      <LinkPopover editor={editor} active={s.link} href={s.href} disabled={disabled} />
      <Hint label="Insert an image, up to 5 MB">
        <Button variant="ghost" size="icon-sm" aria-label="Insert an image" disabled={disabled} onClick={() => imageRef.current?.click()}>
          <ImagePlusIcon />
        </Button>
      </Hint>
      {/* Hidden file input opened by a Button. Mock: the image lives for this session only. */}
      <input
        ref={imageRef}
        type="file"
        accept={IMAGE_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-label="Image file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > IMAGE_MAX) return void toast.error(`${f.name} is over 5 MB`, { description: "Use a smaller image." });
          run().setImage({ src: URL.createObjectURL(f), alt: f.name.replace(/\.[^.]+$/, "") }).run();
        }}
      />
      <ColourPopover editor={editor} color={s.color} disabled={disabled} />
      {sep}
      <Hint label="Undo">
        <Button variant="ghost" size="icon-sm" aria-label="Undo" disabled={disabled || !s.canUndo} onClick={() => run().undo().run()}>
          <Undo2Icon />
        </Button>
      </Hint>
      <Hint label="Redo">
        <Button variant="ghost" size="icon-sm" aria-label="Redo" disabled={disabled || !s.canRedo} onClick={() => run().redo().run()}>
          <Redo2Icon />
        </Button>
      </Hint>
      {sep}
      <DropdownMenu>
        <Hint label="Insert a merge tag">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={disabled} className="px-2 text-muted-foreground">
              <BracesIcon data-icon="inline-start" />
              Tags
            </Button>
          </DropdownMenuTrigger>
        </Hint>
        <DropdownMenuContent align="start" className={MERGE_TAG_MENU_CLASS}>
          <MergeTagItems onPick={(t) => run().insertContent(`{{${t}}}`).run()} />
        </DropdownMenuContent>
      </DropdownMenu>
      {onAttach && (
        <Hint label="Attach a file, up to 10 MB">
          <Button variant="ghost" size="icon-sm" aria-label="Attach a file" disabled={disabled} onClick={onAttach}>
            <PaperclipIcon />
          </Button>
        </Hint>
      )}
    </div>
  );
}

function LinkPopover({ editor, active, href, disabled }: { editor: Editor; active: boolean; href: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  function apply() {
    const v = url.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!v) chain.unsetLink().run();
    else chain.setLink({ href: v }).run();
    setOpen(false);
  }
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setUrl(href || "https://");
      }}
    >
      <Hint label={active ? "Edit link" : "Add a link"}>
        <PopoverTrigger asChild>
          <Toggle size="sm" aria-label={active ? "Edit link" : "Add a link"} pressed={active} disabled={disabled}>
            <LinkIcon />
          </Toggle>
        </PopoverTrigger>
      </Hint>
      <PopoverContent align="start" className="w-80">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <Field>
            <FieldLabel htmlFor="le-url">Link address</FieldLabel>
            <Input id="le-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" autoFocus />
          </Field>
          <div className="flex justify-end gap-2">
            {active && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  setOpen(false);
                }}
              >
                Remove link
              </Button>
            )}
            <Button type="submit" size="sm" variant="outline">
              {active ? "Update" : "Add link"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function ColourPopover({ editor, color, disabled }: { editor: Editor; color: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Hint label="Text colour">
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Text colour" disabled={disabled} className="relative">
            <BaselineIcon />
            {/* The current colour under the icon (an email colour, see TEXT_COLOURS). */}
            <span aria-hidden className="absolute inset-x-2 bottom-1 h-0.5 rounded-full" style={{ backgroundColor: color || TEXT_COLOURS[0].value }} />
          </Button>
        </PopoverTrigger>
      </Hint>
      <PopoverContent align="start" className="w-auto">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Text colour</p>
          <div className="flex gap-1.5" role="group" aria-label="Text colours">
            {TEXT_COLOURS.map((c) => (
              <Hint key={c.value} label={c.name}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={c.name}
                  aria-pressed={color.toLowerCase() === c.value}
                  className={cn("rounded-full p-0", color.toLowerCase() === c.value && "ring-2 ring-ring ring-offset-1")}
                  onClick={() => {
                    if (c === TEXT_COLOURS[0]) editor.chain().focus().unsetColor().run();
                    else editor.chain().focus().setColor(c.value).run();
                    setOpen(false);
                  }}
                >
                  <span aria-hidden className="size-4 rounded-full" style={{ backgroundColor: c.value }} />
                </Button>
              </Hint>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
