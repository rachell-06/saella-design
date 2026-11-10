import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The × inside a chip or Badge that removes it: filter values, tags, an attached file. One shadcn ghost Button,
// round, 20px, so every removable chip looks and behaves the same. `label` is read out: "Remove tag Partners".
export function ChipRemove({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("size-5 rounded-full text-muted-foreground hover:text-foreground", className)}
    >
      <XIcon />
    </Button>
  );
}
