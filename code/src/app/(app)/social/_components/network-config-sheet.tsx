"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, UnplugIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Hint } from "@/components/saella/hint";
import { StatusBadge } from "@/components/saella/status-badge";
import { cn } from "@/lib/utils";
import type { NetworkInfo, SocialAccount, SocialNetwork } from "@/lib/mock/social";
import { brand, kindLabel, NET_LABEL, NET_WHAT } from "./rules";
import { NetworkIcon } from "./network-icon";
import { AccountAvatar } from "./shared";

const MAX_PROMPT = 2000;
export const UNAVAILABLE = "Not available on this deployment yet";

// One network's settings (live NetworkConfig.tsx): how Saella writes for it, and which of its pages or accounts
// posts may go to. Pausing an account stops posts going there without disconnecting it.
export function NetworkConfigSheet({
  network,
  info,
  accounts,
  prompt,
  onClose,
  onSetStatus,
  onDisconnect,
  onConnect,
  onPromptSaved,
}: {
  network: SocialNetwork | null;
  info?: NetworkInfo;
  accounts: SocialAccount[];
  prompt: string;
  onClose: () => void;
  onSetStatus: (id: number, status: "active" | "disabled") => void;
  /** Disconnect a login (many) or one account (one). */
  onDisconnect: (a: SocialAccount, wholeLogin: boolean) => void;
  onConnect: (network: SocialNetwork, how: "new" | "login" | "reconnect", loginId?: number) => void;
  onPromptSaved: (network: SocialNetwork, prompt: string) => void;
}) {
  return (
    <Sheet open={network !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        {network && (
          <Body
            key={network}
            network={network}
            info={info}
            accounts={accounts}
            prompt={prompt}
            onSetStatus={onSetStatus}
            onDisconnect={onDisconnect}
            onConnect={onConnect}
            onPromptSaved={onPromptSaved}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Body({
  network,
  info,
  accounts,
  prompt,
  onSetStatus,
  onDisconnect,
  onConnect,
  onPromptSaved,
}: {
  network: SocialNetwork;
  info?: NetworkInfo;
  accounts: SocialAccount[];
  prompt: string;
  onSetStatus: (id: number, status: "active" | "disabled") => void;
  onDisconnect: (a: SocialAccount, wholeLogin: boolean) => void;
  onConnect: (network: SocialNetwork, how: "new" | "login" | "reconnect", loginId?: number) => void;
  onPromptSaved: (network: SocialNetwork, prompt: string) => void;
}) {
  const [draft, setDraft] = useState(prompt);
  const [confirm, setConfirm] = useState<{ a: SocialAccount; whole: boolean } | null>(null);
  const many = info?.fanout === "many";
  const unavailable = !info?.route || Boolean(info?.error);
  const logins = [...new Set(accounts.map((a) => a.loginId))].map((id) => accounts.filter((a) => a.loginId === id));
  const len = Array.from(draft).length;
  const over = len > MAX_PROMPT;

  return (
    <>
      <SheetHeader className="border-b p-6 pr-12">
        <SheetTitle className="flex items-center gap-2.5 text-lg">
          <NetworkIcon network={network} size={24} />
          {NET_LABEL[network]} settings
        </SheetTitle>
        <SheetDescription className="sr-only">How Saella writes for {brand(network)}, and the accounts posts may go to.</SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-6">
        <section className="flex flex-col gap-3">
          <Field data-invalid={over || undefined}>
            <FieldLabel htmlFor="nc-prompt">How Saella writes for {brand(network)}</FieldLabel>
            <Textarea
              id="nc-prompt"
              value={draft}
              aria-invalid={over || undefined}
              placeholder="e.g. Friendly and short, 1–2 emoji, end with 3 hashtags, speak to parents"
              className="min-h-28"
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="flex items-start justify-between gap-4">
              <FieldDescription>Leave empty to use its usual {brand(network)} style.</FieldDescription>
              <span className={cn("shrink-0 text-xs tabular-nums", over ? "text-destructive-soft-foreground" : "text-muted-foreground")}>
                {len.toLocaleString("en-US")} / {MAX_PROMPT.toLocaleString("en-US")}
              </span>
            </div>
          </Field>
          <Button
            variant="outline"
            size="sm"
            className="self-end"
            disabled={over || draft.trim() === prompt.trim()}
            onClick={() => {
              onPromptSaved(network, draft.trim());
              toast.success("Instruction saved");
            }}
          >
            Save instruction
          </Button>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Pages &amp; accounts</h3>
          {logins.map((group) => {
            const login = group[0].login;
            const lapsed = login.status !== "active";
            return (
              <div key={group[0].loginId} className="flex flex-col divide-y rounded-lg border">
                {many && (
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <AccountAvatar name={login.displayName ?? NET_LABEL[network]} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{login.displayName ?? NET_LABEL[network]}</span>
                      <span className="truncate text-sm text-muted-foreground">Personal account that connected</span>
                    </span>
                    <Hint label={unavailable ? UNAVAILABLE : `Add ${NET_WHAT[network]} from ${login.displayName}`}>
                      <span>
                        <Button variant="ghost" size="sm" disabled={unavailable} onClick={() => onConnect(network, "login", group[0].loginId)}>
                          <PlusIcon data-icon="inline-start" />
                          {NET_WHAT[network]}
                        </Button>
                      </span>
                    </Hint>
                    <Hint label="Disconnect">
                      <Button variant="ghost" size="icon-sm" aria-label="Disconnect" onClick={() => setConfirm({ a: group[0], whole: true })}>
                        <UnplugIcon />
                      </Button>
                    </Hint>
                  </div>
                )}
                {lapsed && (
                  <Alert variant="warning" className="rounded-none border-0">
                    <AlertTitle>Sign-in expired. Connect again to keep posting.</AlertTitle>
                    <AlertAction>
                      <Hint label={unavailable ? UNAVAILABLE : undefined}>
                        <span>
                          <Button variant="outline" size="sm" disabled={unavailable} onClick={() => onConnect(network, "reconnect", group[0].loginId)}>
                            Reconnect
                          </Button>
                        </span>
                      </Hint>
                    </AlertAction>
                  </Alert>
                )}
                {group.map((a) => {
                  const lost = a.status === "lost" || lapsed;
                  return (
                    <div key={a.id} className={cn("flex items-center gap-3 px-3 py-2.5", many && "pl-6")}>
                      <AccountAvatar name={a.name} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{a.name}</span>
                        {(a.handle || kindLabel(a.network, a.kind) !== NET_LABEL[network]) && (
                          <span className="truncate text-sm text-muted-foreground">{a.handle ? `@${a.handle}` : kindLabel(a.network, a.kind)}</span>
                        )}
                      </span>
                      {lost ? (
                        <Hint label="No longer covered by the login">
                          <span tabIndex={0} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <StatusBadge status="failed" label="Lost" />
                          </span>
                        </Hint>
                      ) : (
                        <Hint label={a.status === "active" ? "Posts can go here. Switch off to pause" : "Paused. Switch on to post here again"}>
                          {/* Wrapped: the tooltip trigger's data-state would override the switch's own. */}
                          <span className="flex">
                            <Switch
                              checked={a.status === "active"}
                              aria-label={`Post to ${a.name}`}
                              onCheckedChange={(v) => onSetStatus(a.id, v ? "active" : "disabled")}
                            />
                          </span>
                        </Hint>
                      )}
                      {!many && (
                        <Hint label="Disconnect">
                          <Button variant="ghost" size="icon-sm" aria-label={`Disconnect ${a.name}`} onClick={() => setConfirm({ a, whole: false })}>
                            <UnplugIcon />
                          </Button>
                        </Hint>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
      </div>

      <SheetFooter className="border-t p-6">
        <Hint
          label={
            unavailable
              ? UNAVAILABLE
              : `Adds the ${brand(network)} account signed in here. Sign out first to add another.`
          }
        >
          <span>
            <Button variant="outline" className="w-full" disabled={unavailable} onClick={() => onConnect(network, "new")}>
              <PlusIcon data-icon="inline-start" />
              {many ? `Add another personal ${brand(network)} account` : `Add another ${brand(network)} account`}
            </Button>
          </span>
        </Hint>
      </SheetFooter>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {confirm?.whole ? `${confirm.a.login.displayName}'s login` : confirm?.a.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every account connected through this login is removed from Saella. Posts already published stay on {brand(network)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirm) onDisconnect(confirm.a, confirm.whole);
                setConfirm(null);
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
