import { InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Heading for one block inside a settings page: title + one line of context, actions on the right.
// `info` puts the secondary detail behind an ⓘ next to the title (1–2 sentences, no footnotes).
export function SectionHeader({
  id,
  title,
  description,
  info,
  actions,
}: {
  id?: string;
  title: string;
  description?: React.ReactNode;
  info?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <h2 id={id} className="font-heading text-lg font-medium tracking-title">
            {title}
          </h2>
          {info && <InfoTip label={`About ${title.toLowerCase()}`}>{info}</InfoTip>}
        </div>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** ⓘ button with the detail in a tooltip. */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={label} className="text-muted-foreground">
          <InfoIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{children}</TooltipContent>
    </Tooltip>
  );
}
