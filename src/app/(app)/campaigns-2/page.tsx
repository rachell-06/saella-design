import { redirect } from "next/navigation";

// Old address of Campaigns option 2, which became /campaigns (2026-11-11). Kept so shared links still land, query
// included (?state=many…).
export default async function CampaignsOptionTwoRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v);
  }
  const query = params.toString();
  redirect(query ? `/campaigns?${query}` : "/campaigns");
}
