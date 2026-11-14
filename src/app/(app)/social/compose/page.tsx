import { redirect } from "next/navigation";

// Posts are written inside a campaign (Social → campaign → New post), as in the live app, where /social/compose is
// kept only so an old bookmark lands somewhere useful.
export default function SocialComposeRedirect() {
  redirect("/social");
}
