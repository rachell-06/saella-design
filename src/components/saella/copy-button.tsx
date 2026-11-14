"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Copy one value to the clipboard (DNS records, addresses). The icon turns into a tick for 1.5s and a toast
// confirms, so the result is announced without relying on the icon alone.
export function CopyButton({ value, label = "Copy value" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy", { description: "Select the value and copy it by hand." });
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={copy} aria-label={label} className="text-muted-foreground">
          {copied ? <CheckIcon className="text-success-soft-foreground" /> : <CopyIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : label}</TooltipContent>
    </Tooltip>
  );
}
