import type { ComponentMeta } from "@/components/meta";

export const buttonMeta: ComponentMeta = {
  name: "Button",
  category: "atom",
  description: "Runs an action. For navigation styled as text, use variant link or a plain <Link>.",
  variants: {
    default: "Solid orange primary action. One per page.",
    outline: "Secondary action next to the primary one; Back in wizards; Cancel in dialogs.",
    secondary: "Low-emphasis action on a muted surface, e.g. inside a card or toolbar.",
    ghost: "Row actions in tables, icon-only toolbar buttons, menu triggers.",
    destructive: "Confirm button of an AlertDialog for delete / archive / cancel-send. Soft red fill.",
    link: "Inline text action inside a sentence, e.g. 'View report'.",
    ai: "AI action (Generate, Write with AI, Suggest…) with a Sparkles icon: brand tint, never solid. Doesn't count as the page's one solid orange button.",
    "size=sm | icon-sm": "Inside table rows and dense toolbars.",
    "size=icon*": "Icon-only; always give aria-label and a Tooltip.",
  },
  relationships: {
    usedIn: ["PageHeader actions", "DialogFooter", "AlertDialogFooter", "Empty", "DataTable bulkActions"],
    preferInstead: {
      "copy a value": "CopyButton (components/saella/copy-button)",
      "on/off state": "Switch or Toggle",
    },
  },
  tokens: ["--primary", "--primary-hover", "--primary-foreground", "--primary-subtle", "--primary-soft-foreground", "--brand", "--destructive-soft", "--destructive-soft-foreground", "--input", "--accent", "--ring", "--radius-lg"],
  aiHints: [
    "Exactly one variant=default per page; everything else is outline or ghost.",
    "Delete flow: Button (ghost/outline) → AlertDialog → confirm with variant=destructive, cancel with outline.",
    "Wizard footer: Back = outline on the left, Continue = default on the right.",
    "Loading: keep the width, put <Spinner /> inside and set disabled + aria-busy.",
  ],
  invalid: [
    "An AI action (sparkle icon) in outline/ghost or solid default: use variant=ai.",
    "Two variant=default buttons on the same page.",
    "variant=destructive directly on a page without an AlertDialog confirmation.",
    "Custom colours via className (bg-red-*, hex). Add a token instead.",
  ],
};
