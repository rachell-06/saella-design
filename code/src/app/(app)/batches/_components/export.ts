import { toast } from "sonner";

// Excel export is server-side in the live app (PRD-02 AC-EC-X-01); in the mock a toast stands in for the download.
export function exportToast(what: string, file: string) {
  toast.success(`Exporting ${what}`, { description: `${file}.xlsx downloads when it's ready.` });
}
