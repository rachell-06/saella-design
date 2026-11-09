"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClockIcon, LockIcon, MailOpenIcon, UserXIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { WORKSPACE } from "@/lib/mock/workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

// Screens for signed-in users who can't enter a workspace. The live app has three routes for them
// (Repo src/app/join-pending, workspace-locked, account-disabled); here they are states of /login so the route
// map stays as agreed. Copy follows the live app catalog (lib/i18n/messages.ts: join.*, wl.*, dis.*).
// - requested: join request waiting on the admin; the workspace is locked, the only action is to wait or
//   cancel (AC-ORG-J-02, AC-ORG-J-04).
// - invited: the admin invited this address (AC-ORG-U-02).
// - none: no workspace and nothing pending.
// - claimed: a new sign-up whose domain already has a workspace sees request-to-join right after the first
//   sign-in; nothing is created while waiting (AC-ORG-3-01, AC-ORG-3-02).
// - locked: a colleague verified the domain first, so this workspace lost it (AC-ORG-A-03, ORG-SEQ-003).
//   Joining deletes this workspace's data on approval; purchased credits carry over (AC-ORG-J-01, BR-RULE-ORG-05).
// - disabled: the admin disabled the account; nothing to do here but ask them (BR-RULE-ORG-06).
export type AccountState = "requested" | "invited" | "none" | "claimed" | "locked" | "disabled";

const ORG = WORKSPACE.company;
const DOMAIN = WORKSPACE.domain;

export function AccountStatePanel({ initial }: { initial: AccountState }) {
  const router = useRouter();
  const [state, setState] = useState<AccountState>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  // Mock round trip so the buttons show their loading state.
  const run = (key: string, then: () => void) => {
    setBusy(key);
    setTimeout(() => {
      setBusy(null);
      then();
    }, 700);
  };

  const signOut = (
    <Button variant="ghost" onClick={() => router.push("/login")}>
      Sign out
    </Button>
  );

  const askToJoin = (
    <Button
      disabled={busy !== null}
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
    { icon: React.ReactNode; title: string; body: React.ReactNode; actions: React.ReactNode; extra?: React.ReactNode }
  > = {
    requested: {
      icon: <ClockIcon />,
      title: "Waiting for approval",
      body: `Your request to join ${ORG} is with the workspace admin. You'll get an email as soon as they decide. Nothing else to do here.`,
      actions: (
        <>
          <Button
            variant="outline"
            disabled={busy !== null}
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
      icon: <MailOpenIcon />,
      title: "You've been invited",
      body: `${ORG} invited you to their workspace. Join to start working together.`,
      actions: (
        <>
          <Button
            disabled={busy !== null}
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
      icon: <UsersIcon />,
      title: "No pending request",
      body: "You don't have a workspace yet and no join request is pending. Ask your workspace admin for an invite, or contact support.",
      actions: signOut,
    },
    claimed: {
      icon: <UsersIcon />,
      title: `${DOMAIN} already has a workspace`,
      body: `${ORG} set up Saella for ${DOMAIN}. Ask to join: their admin approves, then you work in their workspace. Nothing is created for you while you wait.`,
      actions: (
        <>
          {askToJoin}
          {signOut}
        </>
      ),
    },
    locked: {
      icon: <LockIcon />,
      title: `${DOMAIN} now belongs to ${ORG}`,
      body: `A colleague verified ${DOMAIN} by proving control of its DNS, so the domain and this company's workspace are now theirs. This workspace can no longer send from it.`,
      extra: (
        <Alert className="text-left">
          <AlertTitle>What happens if you join</AlertTitle>
          <AlertDescription>
            Your campaigns, templates and contacts here are permanently deleted when the admin approves you. You
            continue in their workspace, with their data. Any credits you purchased carry across. Nothing is deleted
            until they approve.
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
      icon: <UserXIcon />,
      title: "Your account is disabled",
      body: "The workspace admin disabled this account. Your history and templates are untouched; automations on templates you own are paused. Ask the admin to re-enable you to come back.",
      actions: signOut,
    },
  };

  const v = view[state];
  return (
    <Empty className="max-w-lg flex-none p-0">
      <EmptyHeader className="max-w-lg">
        <EmptyMedia variant="icon">{v.icon}</EmptyMedia>
        <EmptyTitle className="text-xl">{v.title}</EmptyTitle>
        <EmptyDescription>{v.body}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="max-w-lg">
        {v.extra}
        <div className="flex flex-wrap justify-center gap-2">{v.actions}</div>
        {state === "locked" && (
          <p className="text-sm text-muted-foreground">
            Think this is wrong? If you control {DOMAIN}&apos;s DNS, the colleague who verified it can transfer the
            admin role to you, or you can contact us.
          </p>
        )}
      </EmptyContent>
    </Empty>
  );
}
