import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Skeleton cells of the Contacts table, shaped like the real cells in contacts-screen.tsx:
// name + email, company + position, two tag pills, a date. Rows keep the real height (48px), so nothing
// moves when the contacts arrive. Status and actions stay blank, as they are on most real rows.

export const CONTACT_SKELETON_ROWS = 8;

function Line({ className }: { className?: string }) {
  return (
    <div className="flex h-5 items-center">
      <Skeleton className={cn("h-3.5", className)} />
    </div>
  );
}

export function contactSkeletonCell(columnId: string, row: number) {
  const odd = row % 2 === 1;
  switch (columnId) {
    case "name":
      return (
        <div className="flex min-w-0 flex-col gap-0.5">
          <Line className={odd ? "w-28" : "w-36"} />
          <Line className={odd ? "w-44" : "w-40"} />
        </div>
      );
    case "company":
      return (
        <div className="flex flex-col gap-0.5">
          <Line className={odd ? "w-24" : "w-32"} />
          <Line className={odd ? "w-28" : "w-20"} />
        </div>
      );
    case "tags":
      return (
        <div className="flex items-center gap-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          {!odd && <Skeleton className="h-5 w-12 rounded-full" />}
        </div>
      );
    case "lastSent":
      return <Line className="w-20" />;
    default:
      return null;
  }
}
