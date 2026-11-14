"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CircleAlertIcon, ExternalLinkIcon, PlusIcon, SettingsIcon, TriangleAlertIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Hint } from "@/components/saella/hint";
import { StatusBadge } from "@/components/saella/status-badge";
import { cn } from "@/lib/utils";
import {
  NETWORK_INFO,
  networkPrompts,
  SOCIAL_NETWORKS,
  socialAccounts,
  type NetworkInfo,
  type SocialAccount,
  type SocialNetwork,
} from "@/lib/mock/social";
import { brand, kindLabel, NET_LABEL, NET_WHAT } from "./rules";
import { NetworkConfigSheet, UNAVAILABLE } from "./network-config-sheet";
import { NetworkIcon } from "./network-icon";
import { AccountAvatar } from "./shared";

const WORKSPACE = "Northwind Ceramics";
const DEMO = "Demo mode: nothing is sent to the real network";

type Flow = "live" | "paused" | "lost";
function flowOf(a: SocialAccount): Flow {
  if (a.status === "lost" || a.login.status !== "active") return "lost";
  return a.status === "active" ? "live" : "paused";
}
const FLOW_BADGE: Record<Flow, { status: "active" | "paused" | "failed"; label: string; hint: string }> = {
  live: { status: "active", label: "Live", hint: "Active" },
  paused: { status: "paused", label: "Paused", hint: "Paused in this network's settings" },
  lost: { status: "failed", label: "Lost", hint: "No longer covered by the login" },
};

/** Where the account lives on its network. The mock has no URLs: built from the handle, else the page name. */
function profileUrl(a: SocialAccount) {
  const slug = (a.handle ?? a.name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, a.handle ? "" : "-")
    .replace(/^-+|-+$/g, "");
  switch (a.network) {
    case "facebook":
      return `https://www.facebook.com/${slug.replace(/-/g, "")}`;
    case "instagram":
      return `https://www.instagram.com/${slug}`;
    case "threads":
      return `https://www.threads.net/@${slug}`;
    case "linkedin":
      return a.kind === "linkedin_member" ? `https://www.linkedin.com/in/${slug}` : `https://www.linkedin.com/company/${slug}`;
    case "tiktok":
      return `https://www.tiktok.com/@${slug}`;
    case "youtube":
      return `https://www.youtube.com/@${slug}`;
    case "pinterest":
      return `https://www.pinterest.com/${slug}`;
    case "douyin":
      return `https://www.douyin.com/search/${encodeURIComponent(a.name)}`;
  }
}

/** The connect callback's ?connect=… as one short message (live connectOutcome.ts). */
function connectOutcome(q: URLSearchParams): { type: "success" | "warning" | "info" | "error"; text: string } | null {
  const outcome = q.get("connect");
  if (!outcome) return null;
  const n = q.get("network") as SocialNetwork | null;
  const network = n ? brand(n) : "";
  const what = n ? NET_WHAT[n] : "";
  if (outcome === "ok") {
    const added = Number(q.get("added") ?? 0);
    const refreshed = Number(q.get("refreshed") ?? 0);
    const lost = Number(q.get("lost") ?? 0);
    const skipped = q.get("refused");
    if (!added && !refreshed && !skipped) return { type: "warning", text: `${network} shared no ${what}. Connect again and tick at least one.` };
    const parts = added ? [`${added} ${what} added from ${network}.`] : refreshed || !skipped ? [`${network} is up to date.`] : [];
    if (lost) parts.push(`${lost} no longer accessible.`);
    if (skipped)
      parts.push(
        q.get("why") === "personal"
          ? `Skipped ${skipped}: it is a personal ${network} account. Switch it to a business account (free, in ${network} settings), then connect again.`
          : `Skipped ${skipped}: you're not an admin.`
      );
    return { type: lost || skipped ? "warning" : "success", text: parts.join(" ") };
  }
  if (outcome === "wrong_account") return { type: "warning", text: `You're signed in as ${q.get("got")}, not ${q.get("want")}. Switch accounts on ${network} and try again.` };
  if (outcome === "same_account") return { type: "warning", text: `${q.get("name")} is already connected. Sign out of ${network}, sign in to another account, then try again.` };
  if (outcome === "denied") return { type: "info", text: `${network} connection cancelled.` };
  if (outcome === "refused") return { type: "error", text: `${network} did not connect: ${q.get("detail") ?? ""}` };
  return { type: "error", text: `Couldn't connect ${network}. Please try again.` };
}

// Connected accounts (live SocialConnections.tsx). The live page draws workspace → network → login → account as a
// map with moving dots; here the same tree is a grouped list (Studio Admin kanban "List" view): one group per network,
// the person who signed in where one login brings several pages, then the pages and accounts posts go to.
export function SocialAccountsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const preview = params.get("state");
  const [accounts, setAccounts] = useState<SocialAccount[]>(preview === "empty" ? [] : socialAccounts);
  const [prompts, setPrompts] = useState(networkPrompts);
  // ?config=<network> opens that network's settings sheet.
  const [config, setConfig] = useState<SocialNetwork | null>((SOCIAL_NETWORKS as readonly string[]).includes(params.get("config") ?? "") ? (params.get("config") as SocialNetwork) : null);
  const networks: NetworkInfo[] = useMemo(
    () => (preview === "network-error" ? NETWORK_INFO.map((x) => (x.network === "linkedin" ? { ...x, route: null, error: "LinkedIn app credentials are missing on this deployment" } : x)) : NETWORK_INFO),
    [preview]
  );
  const infoFor = (n: SocialNetwork) => networks.find((x) => x.network === n);

  // The callback lands here with ?connect=…: one message per outcome, then the address is cleaned.
  const shown = useRef<string | null>(null);
  useEffect(() => {
    const key = params.toString();
    const o = connectOutcome(params);
    if (!o || shown.current === key) return;
    shown.current = key;
    toast[o.type](o.text, { duration: o.type === "success" ? 5000 : 10000 });
    router.replace("/social/accounts");
  }, [params, router]);

  const byNetwork = useMemo(() => {
    const m = new Map<SocialNetwork, SocialAccount[]>();
    for (const a of accounts) m.set(a.network, [...(m.get(a.network) ?? []), a]);
    return m;
  }, [accounts]);
  const connected = SOCIAL_NETWORKS.filter((n) => byNetwork.has(n));
  const others = SOCIAL_NETWORKS.filter((n) => !byNetwork.has(n));

  // The mock has no network to sign in to: each connect lands as the callback would, with a fitting outcome.
  function connect(n: SocialNetwork, how: "new" | "login" | "reconnect", loginId?: number) {
    if (how === "reconnect") {
      setAccounts((all) => all.map((a) => (a.loginId === loginId ? { ...a, login: { ...a.login, status: "active" } } : a)));
      router.push(`/social/accounts?connect=ok&network=${n}&refreshed=1`);
      return;
    }
    if (how === "login") {
      router.push(`/social/accounts?connect=ok&network=${n}&refreshed=1`);
      return;
    }
    if (byNetwork.has(n)) {
      const first = byNetwork.get(n)![0];
      router.push(`/social/accounts?connect=same_account&network=${n}&name=${encodeURIComponent(first.login.displayName ?? first.name)}`);
      return;
    }
    const id = Date.now();
    const kind = ({ facebook: "page", instagram: "ig_business", threads: "threads_profile", linkedin: "linkedin_org", tiktok: "tiktok_user", youtube: "youtube_channel", pinterest: "pinterest_user", douyin: "douyin_user" } as const)[n];
    setAccounts((all) => [
      ...all,
      { id, loginId: id, network: n, kind, name: WORKSPACE, handle: "northwindceramics", status: "active", canPublish: true, login: { displayName: "northwindceramics", status: "active" } },
    ]);
    router.push(`/social/accounts?connect=ok&network=${n}&added=1`);
  }

  const header = (
    <>
      <PageHeader title="Accounts" description="The social pages and profiles Saella posts to." />
    </>
  );

  if (preview === "loading") {
    return (
      <>
        {header}
        <div className="flex flex-col gap-4" aria-busy>
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-80 rounded-card" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20 rounded-card" />
            <Skeleton className="h-20 rounded-card" />
            <Skeleton className="h-20 rounded-card" />
          </div>
        </div>
      </>
    );
  }
  if (preview === "error") {
    return (
      <>
        {header}
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Couldn&apos;t load your connected accounts</AlertTitle>
          <AlertDescription>Check your connection, then try again.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => router.replace("/social/accounts")}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      </>
    );
  }

  const broken = networks.filter((x) => x.error);

  return (
    <>
      {header}

      {broken.length > 0 && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>{broken.map((x) => `${brand(x.network)}: ${x.error}`).join(" · ")}</AlertTitle>
        </Alert>
      )}

      {connected.length > 0 && (
        <section aria-label="Connected accounts" className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-card border bg-card">
            {connected.map((n) => {
              const info = infoFor(n);
              const list = byNetwork.get(n)!;
              const many = info?.fanout === "many";
              const unavailable = !info?.route || Boolean(info?.error);
              const logins = [...new Set(list.map((a) => a.loginId))].map((id) => list.filter((a) => a.loginId === id));
              return (
                <section key={n} aria-label={NET_LABEL[n]} className="border-t first:border-t-0">
                  <div className="flex items-center gap-3 bg-muted/50 px-4 py-2.5">
                    <NetworkIcon network={n} size={28} />
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <h3 className="text-sm font-medium">{NET_LABEL[n]}</h3>
                      {/* No "Demo" chip on mock-routed networks (designer 2026-11-14): the screen previews production. */}
                    </div>
                    <Hint label={unavailable ? UNAVAILABLE : many ? `Sign in with another ${brand(n)} account` : undefined}>
                      <span>
                        <Button variant="outline" size="sm" disabled={unavailable} onClick={() => connect(n, "new")}>
                          <PlusIcon data-icon="inline-start" />
                          Add account
                        </Button>
                      </span>
                    </Hint>
                    <Separator orientation="vertical" className="mx-1 data-vertical:h-5 data-vertical:self-center" />
                    <Hint label="Settings">
                      <Button variant="outline" size="icon-sm" aria-label={`${NET_LABEL[n]} settings`} onClick={() => setConfig(n)}>
                        <SettingsIcon />
                      </Button>
                    </Hint>
                  </div>
                  <ul className="divide-y border-t">
                    {logins.map((group) => {
                      const login = group[0].login;
                      return (
                        <li key={group[0].loginId} className="flex flex-col divide-y">
                          {many && (
                            <div className="flex items-center gap-3 px-4 py-2.5 pl-14">
                              <AccountAvatar name={login.displayName ?? NET_LABEL[n]} />
                              <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-sm font-medium">{login.displayName}</span>
                                {login.status === "active" ? (
                                  <span className="text-sm text-muted-foreground">Personal account</span>
                                ) : (
                                  <span className="text-sm text-destructive-soft-foreground">Sign-in expired. Connect again</span>
                                )}
                              </span>
                              <Hint label={unavailable ? UNAVAILABLE : `Add ${NET_WHAT[n]} from ${login.displayName}`}>
                                <span>
                                  <Button variant="ghost" size="sm" disabled={unavailable} onClick={() => connect(n, "login", group[0].loginId)}>
                                    <PlusIcon data-icon="inline-start" />
                                    {NET_WHAT[n]}
                                  </Button>
                                </span>
                              </Hint>
                            </div>
                          )}
                          {group.map((a) => {
                            const f = FLOW_BADGE[flowOf(a)];
                            return (
                              <div key={a.id} className={cn("flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50", many ? "pl-24" : "pl-14")}>
                                <AccountAvatar name={a.name} />
                                <span className="flex min-w-0 flex-1 flex-col">
                                  <span className="truncate text-sm font-medium">{a.name}</span>
                                  {/* The group already says "Facebook Page": only a handle or a different kind (LinkedIn profile) adds anything. */}
                                  {(a.handle || kindLabel(a.network, a.kind) !== NET_LABEL[n]) && (
                                    <span className="truncate text-sm text-muted-foreground">{a.handle ? `@${a.handle}` : kindLabel(a.network, a.kind)}</span>
                                  )}
                                </span>
                                {/* Status right before the Open icon (designer 2026-11-14), Reconnect before both: one aligned column of badges. */}
                                <span className="flex shrink-0 items-center justify-end gap-2">
                                  {!many && login.status !== "active" && (
                                    <Button variant="outline" size="sm" disabled={unavailable} onClick={() => connect(n, "reconnect", a.loginId)}>
                                      Reconnect
                                    </Button>
                                  )}
                                  <Hint label={login.status !== "active" ? "Sign-in expired. Connect again" : f.hint}>
                                    <span tabIndex={0} className="flex shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                      <StatusBadge status={f.status} label={f.label} />
                                    </span>
                                  </Hint>
                                  {/* Icon only (designer 2026-11-14): the label lives in the tooltip and aria-label. */}
                                  <Hint label={`Open on ${brand(n)}`}>
                                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground" asChild>
                                      <a href={profileUrl(a)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${a.name} on ${brand(n)}`}>
                                        <ExternalLinkIcon />
                                      </a>
                                    </Button>
                                  </Hint>
                                </span>
                              </div>
                            );
                          })}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="soc-add" className="flex flex-col gap-3">
          <h2 id="soc-add" className="font-heading text-lg font-medium tracking-title">
            {connected.length ? "Add a network" : "Connect your first network"}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {others.map((n) => {
              const info = infoFor(n);
              const unavailable = !info?.route || Boolean(info?.error);
              return (
                <div key={n} className={cn("flex items-center gap-3 rounded-card border bg-card p-4", unavailable && "bg-muted/40")}>
                  <NetworkIcon network={n} size={36} className={cn(unavailable && "opacity-60")} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{NET_LABEL[n]}</span>
                    <span className="text-sm text-muted-foreground">
                      {info?.fanout === "many" ? `One login brings several ${NET_WHAT[n]}` : `One ${NET_WHAT[n]} per login`}
                    </span>
                  </div>
                  <Hint label={unavailable ? UNAVAILABLE : info?.route === "mock" ? DEMO : undefined}>
                    <span>
                      <Button variant="outline" size="sm" disabled={unavailable} onClick={() => connect(n, "new")}>
                        <PlusIcon data-icon="inline-start" />
                        Connect
                      </Button>
                    </span>
                  </Hint>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <NetworkConfigSheet
        network={config}
        info={config ? infoFor(config) : undefined}
        accounts={config ? (byNetwork.get(config) ?? []) : []}
        prompt={config ? (prompts[config] ?? "") : ""}
        onClose={() => setConfig(null)}
        onSetStatus={(id, status) => setAccounts((all) => all.map((a) => (a.id === id ? { ...a, status } : a)))}
        onDisconnect={(a, whole) => {
          setAccounts((all) => all.filter((x) => (whole ? x.loginId !== a.loginId : x.id !== a.id)));
          if ((byNetwork.get(a.network) ?? []).every((x) => (whole ? x.loginId === a.loginId : x.id === a.id))) setConfig(null);
          toast.success("Disconnected");
        }}
        onConnect={connect}
        onPromptSaved={(n, p) => setPrompts((m) => ({ ...m, [n]: p }))}
      />
    </>
  );
}
