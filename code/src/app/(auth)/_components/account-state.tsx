"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClockIcon, LockIcon, MailOpenIcon, TriangleAlertIcon, UserXIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { WORKSPACE } from "@/lib/mock/workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

// Screens for signed-in users who can't enter a workspace. The live app has three routes for them
// (Repo src/app/join-pending, workspace-locked, account-disabled); here they are states of /login so the route
// map stays as agreed (decisions.md "Login"). Copy follows the live catalog (lib/i18n/messages.ts: join.*, wl.*,
// dis.*). Layout: Studio Admin src/app/(main)/unauthorized (icon, title, one paragraph, actions).
// - requested: join request waiting on the admin; the only actions are to wait, cancel or sign out
//   (AC-ORG-J-02, AC-ORG-J-04).
// - invited: the admin invited this address (live JoinPendingActions "invited").
// - none: no workspace and nothing pending.
// - claimed: a new sign-up whose domain already has a workspace sees request-to-join right after the first
//   sign-in; nothing is created while waiting (AC-ORG-3-01, AC-ORG-3-02).
// - locked: a colleague verified the domain first, so this workspace lost it (AC-ORG-A-03). What joining deletes is
//   said before the button, not after (AC-ORG-J-01, live WorkspaceLockedActions).
// - disabled: the admin disabled the account (BR-RULE-ORG-06).
// Every screen names the signed-in address next to Sign out, as the live app does ("Sign out (email)").
export type AccountState = "requested" | "invited" | "none" | "claimed" | "locked" | "disabled";

const ORG = WORKSPACE.company;
const DOMAIN = WORKSPACE.domain;

// Fictional addresses for the previews (bao@ is the pending member in lib/mock/workspace).
const PREVIEW_EMAIL: Record<AccountState, string> = {
  requested: `bao@${DOMAIN}`,
  invited: `quan@${DOMAIN}`,
  none: `quan@${DOMAIN}`,
  claimed: `quan@${DOMAIN}`,
  locked: `khoa@${DOMAIN}`,
  disabled: `thu@${DOMAIN}`,
};

export function AccountStatePanel({ initial, email }: { initial: AccountState; email?: string }) {
  const router = useRouter();
  const [state, setState] = useState<AccountState>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const address = email || PREVIEW_EMAIL[initial];

  // Mock round trip so the buttons show their loading state.
  const run = (key: string, then: () => void) => {
    setBusy(key);
    setTimeout(() => {
      setBusy(null);
      then();
    }, 700);
  };

  const signOut = (
    <Button variant="outline" onClick={() => router.push("/login")}>
      Sign out
    </Button>
  );

  const askToJoin = (
    <Button
      disabled={busy !== null}
      aria-busy={busy === "ask" || undefined}
      onClick={() =>
        run("ask", () => {
          setState("requested");
          toast.success("Request sent", { description: "The workspace admin has been notified." });
        })
      }
    >
      {busy === "ask" && <Spinner data-icon="inline-start" />}
      Ask to join {ORG}
    </Button>
  );

  const view: Record<
    AccountState,
    { icon: React.ElementType; title: string; body: string; actions: React.ReactNode; extra?: React.ReactNode }
  > = {
    requested: {
      icon: ClockIcon,
      title: "Waiting for approval",
      body: `Your request to join ${ORG} is with the workspace admin. You'll get an email when they decide.`,
      actions: (
        <>
          <Button
            variant="outline"
            disabled={busy !== null}
            aria-busy={busy === "cancel" || undefined}
            onClick={() =>
              run("cancel", () => {
                setState("none");
                toast("Request cancelled");
              })
            }
          >
            {busy === "cancel" && <Spinner data-icon="inline-start" />}
            Cancel request
          </Button>
          {signOut}
        </>
      ),
    },
    invited: {
      icon: MailOpenIcon,
      title: "You've been invited",
      body: `${ORG} invited you to their workspace. Join to start working together.`,
      actions: (
        <>
          <Button
            disabled={busy !== null}
            aria-busy={busy === "join" || undefined}
            onClick={() => run("join", () => router.push("/overview"))}
          >
            {busy === "join" && <Spinner data-icon="inline-start" />}
            Join {ORG}
          </Button>
          {signOut}
        </>
      ),
    },
    none: {
      icon: UsersIcon,
      title: "No pending request",
      body: "You don't have a workspace yet and no join request is pending. Ask your workspace admin for an invite.",
      actions: signOut,
    },
    claimed: {
      icon: UsersIcon,
      title: `${DOMAIN} already has a workspace`,
      body: `${ORG} uses Saella for ${DOMAIN}. Ask to join and their admin approves you.`,
      actions: (
        <>
          {askToJoin}
          {signOut}
        </>
      ),
    },
    locked: {
      icon: LockIcon,
      title: `${DOMAIN} now belongs to ${ORG}`,
      // What happened, then what joining costs, each said once.
      body: `A colleague verified ${DOMAIN} for ${ORG}, so this workspace can't send from it any more. Ask to join theirs to keep working.`,
      extra: (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>If you join</AlertTitle>
          <AlertDescription>
            Once their admin approves you, your campaigns, templates and contacts here are deleted for good. Credits you
            bought move with you.
          </AlertDescription>
        </Alert>
      ),
      actions: (
        <>
          {askToJoin}
          {signOut}
        </>
      ),
    },
    disabled: {
      icon: UserXIcon,
      title: "Your account is disabled",
      body: "The workspace admin disabled this account. Your history and templates are untouched. Ask the admin to re-enable you.",
      actions: signOut,
    },
  };

  const v = view[state];
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <v.icon className="size-12 text-brand" aria-hidden />
        <h1 className="font-heading text-3xl font-medium tracking-title">{v.title}</h1>
        <p className="text-muted-foreground">{v.body}</p>
      </div>
      {v.extra}
      <div className="flex flex-wrap justify-center gap-2">{v.actions}</div>
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{address}</span>
      </p>
    </div>
  );
}
