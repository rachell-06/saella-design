import { redirect } from "next/navigation";

// "New campaign" from the command menu (search-command.tsx): the board opens its New campaign dialog on ?new=1.
export default function NewCampaignPage() {
  redirect("/campaigns?new=1");
}
