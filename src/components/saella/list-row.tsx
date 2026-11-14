import type { ReactNode } from "react";
import { Item } from "@/components/ui/item";
import { cn } from "@/lib/utils";

// One selectable row in the list on the left of a master–detail screen: campaigns, agent
// threads, the approval queue. Built on the shadcn Item. Selected = `primary-subtle` fill and a `brand` bar on
// the left, marked with aria-current. Pass the row's own layout and padding through className.
export function ListRow({
  selected,
  onSelect,
  className,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Item
      asChild
      className={cn(
        "relative flex-nowrap gap-0 rounded-none border-0 text-left text-[length:inherit] transition-colors hover:bg-muted/60",
        "focus-visible:border-0 focus-visible:ring-inset",
        "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand before:opacity-0",
        "aria-[current=true]:bg-primary-subtle aria-[current=true]:before:opacity-100",
        className
      )}
    >
      <button type="button" aria-current={selected ? "true" : undefined} onClick={onSelect}>
        {children}
      </button>
    </Item>
  );
}
