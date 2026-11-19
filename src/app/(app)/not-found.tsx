import Link from "next/link";
import { CompassIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

// Not-found screen inside the app frame (icon, one-line title, one sentence, one action).
export default function NotFound() {
  return (
    <Empty className="min-h-[60svh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CompassIcon />
        </EmptyMedia>
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>The address may be old or mistyped.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" asChild>
          <Link href="/overview">Go to Overview</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
