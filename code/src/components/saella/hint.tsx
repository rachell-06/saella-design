import type { ReactElement, ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// A short hint on hover or focus (PATTERNS.md §9.13), built on the shadcn Tooltip. Use it instead of the native
// `title` attribute, which shows late, ignores Saella tokens and never opens from the keyboard.
// The only place `title` stays: text cut with an ellipsis, where it repeats the full text.
// The child must take a ref and props (an element or a component that forwards them). A hint that carries
// information the user needs on a non-interactive element: give the child tabIndex={0} so keyboard users reach it.
export function Hint({
  label,
  children,
  side,
}: {
  /** Nothing to say: the child renders alone. */
  label?: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
}) {
  if (label === undefined || label === null || label === "") return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-64">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
