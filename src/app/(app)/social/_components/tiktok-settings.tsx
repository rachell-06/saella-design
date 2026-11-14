"use client";

import { RotateCcwIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Hint } from "@/components/saella/hint";
import type { TikTokCreator, TikTokPrivacy } from "@/lib/mock/social";
import { BLANK_TIKTOK, PRIVACY_LABEL, TIKTOK_BRANDED_URL, TIKTOK_MUSIC_URL, type TikTokChoice } from "./rules";
import { NetworkIcon } from "./network-icon";
import { AccountAvatar } from "./shared";

export type CreatorState = { status: "loading" } | { status: "ok"; creator: TikTokCreator } | { status: "error"; message: string };

const BRANDED_PRIVATE = "Branded content visibility cannot be set to private.";
const UNAUDITED = "Until TikTok approves Saella, videos can only be posted as “Only me”.";

export function tiktokProblems(c: TikTokChoice | undefined) {
  const out: ("privacy" | "disclose_pick" | "branded_private")[] = [];
  if (!c?.privacy) out.push("privacy");
  if (c?.disclose && !c.yourBrand && !c.branded) out.push("disclose_pick");
  if (c?.disclose && c.branded && c.privacy === "SELF_ONLY") out.push("branded_private");
  return out;
}

/** What stops the send, as the hover text on the disabled Send button (live tiktok-options.ts tiktokBlock). */
export function tiktokBlock(ids: number[], creators: Record<number, CreatorState>, choices: Record<number, TikTokChoice>, videoSeconds: number | null): string | null {
  if (ids.some((id) => tiktokProblems(choices[id]).includes("disclose_pick"))) return "You need to indicate if your content promotes yourself, a third party, or both.";
  for (const id of ids) {
    const c = creators[id];
    if (!c || c.status === "loading") return "Still reading the TikTok account. One moment.";
    if (c.status === "error") return "A TikTok account can't post right now. See the TikTok card above.";
    const ch = choices[id];
    const p = tiktokProblems(ch);
    if (p.includes("privacy")) return "Choose who can see the TikTok video first.";
    if (p.includes("branded_private")) return BRANDED_PRIVATE;
    if (!c.creator.audited && ch?.privacy !== "SELF_ONLY") return UNAUDITED;
    if (videoSeconds && c.creator.maxVideoSeconds && videoSeconds > c.creator.maxVideoSeconds) return "The video is too long for this TikTok account. See the TikTok card.";
  }
  return null;
}

/** "By posting, you agree to TikTok's …" with the policies linked. */
export function TikTokConsent({ branded }: { branded: boolean }) {
  const link = (href: string, label: string) => (
    <Button variant="link" className="h-auto border-0 p-0 align-baseline" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </Button>
  );
  return (
    <span className="text-sm text-muted-foreground">
      By posting, you agree to TikTok&apos;s {branded && <>{link(TIKTOK_BRANDED_URL, "Branded Content Policy")} and </>}
      {link(TIKTOK_MUSIC_URL, "Music Usage Confirmation")}.
    </span>
  );
}

// The TikTok part of the send step, as TikTok's Content Sharing Guidelines lay it out (live TikTokSettings.tsx): per
// account its name, who can see the video (nothing pre-picked), Comment / Duet / Stitch (none ticked), and the
// commercial-content disclosure.
export function TikTokSettings({
  accounts,
  creators,
  choices,
  onChange,
  onReload,
  videoSeconds,
  readOnly,
}: {
  accounts: { id: number; name: string }[];
  creators: Record<number, CreatorState>;
  choices: Record<number, TikTokChoice>;
  onChange: (id: number, c: TikTokChoice) => void;
  onReload: (id: number) => void;
  videoSeconds: number | null;
  readOnly?: boolean;
}) {
  return (
    <section aria-labelledby="tt-title" className="flex flex-col gap-4 rounded-lg border p-4">
      <h3 id="tt-title" className="flex items-center gap-2 text-sm font-medium">
        <NetworkIcon network="tiktok" size={20} />
        Posting to TikTok
      </h3>
      {accounts.map((a) => {
        const st = creators[a.id];
        const ch = choices[a.id] ?? BLANK_TIKTOK;
        const set = (patch: Partial<TikTokChoice>) => onChange(a.id, { ...ch, ...patch });
        const creator = st?.status === "ok" ? st.creator : null;
        const off = readOnly || !creator;
        const label = ch.disclose ? (ch.branded ? "paid" : ch.yourBrand ? "promo" : null) : null;
        const tooLong = Boolean(creator && videoSeconds && creator.maxVideoSeconds && videoSeconds > creator.maxVideoSeconds);
        return (
          <div key={a.id} className="flex flex-col gap-4 border-t pt-4">
            <div className="flex items-center gap-3">
              <AccountAvatar name={creator?.nickname ?? a.name} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{creator?.nickname ?? a.name}</span>
                {creator && <span className="truncate text-sm text-muted-foreground">@{creator.username}</span>}
              </span>
            </div>
            {st?.status === "error" ? (
              <Alert variant="warning">
                <AlertTitle>Could not read this account from TikTok</AlertTitle>
                <AlertDescription>{st.message}</AlertDescription>
                <AlertAction>
                  <Button variant="outline" size="sm" onClick={() => onReload(a.id)}>
                    <RotateCcwIcon data-icon="inline-start" />
                    Try again
                  </Button>
                </AlertAction>
              </Alert>
            ) : (
              <>
                <Field className="max-w-sm">
                  <FieldLabel htmlFor={`tt-who-${a.id}`}>Who can see this video</FieldLabel>
                  <Select value={ch.privacy ?? ""} onValueChange={(v) => set({ privacy: v as TikTokPrivacy })} disabled={off}>
                    <SelectTrigger id={`tt-who-${a.id}`} className="w-full">
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(creator?.privacyOptions ?? []).map((v) => {
                          const why = !creator?.audited && v !== "SELF_ONLY" ? UNAUDITED : ch.disclose && ch.branded && v === "SELF_ONLY" ? BRANDED_PRIVATE : null;
                          return (
                            <SelectItem key={v} value={v} disabled={Boolean(why)}>
                              {PRIVACY_LABEL[v]}
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {creator && !creator.audited && <FieldDescription>{UNAUDITED}</FieldDescription>}
                </Field>

                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-medium">Allow users to</legend>
                  <div className="flex flex-wrap gap-6">
                    {(
                      [
                        ["comment", "Comment", creator?.commentDisabled],
                        ["duet", "Duet", creator?.duetDisabled],
                        ["stitch", "Stitch", creator?.stitchDisabled],
                      ] as const
                    ).map(([k, lbl, byAccount]) => {
                      const box = (
                        <Label className="gap-2 font-normal">
                          <Checkbox checked={ch[k] && !byAccount} disabled={off || Boolean(byAccount)} onCheckedChange={(v) => set({ [k]: v === true })} />
                          {lbl}
                        </Label>
                      );
                      return byAccount ? (
                        <Hint key={k} label="Turned off in this account's TikTok settings">
                          <span>{box}</span>
                        </Hint>
                      ) : (
                        <span key={k}>{box}</span>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="flex flex-col gap-3">
                  <Label className="items-start gap-3 font-normal">
                    <Switch checked={ch.disclose} disabled={off} onCheckedChange={(v) => set({ disclose: v, yourBrand: v && ch.yourBrand, branded: v && ch.branded })} />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">Disclose video content</span>
                      <span className="text-muted-foreground">Turn on if this video promotes yourself, a brand, a product or a service.</span>
                    </span>
                  </Label>
                  {ch.disclose && (
                    <div className="flex flex-col gap-3 pl-11">
                      <Label className="items-start gap-2 font-normal">
                        <Checkbox checked={ch.yourBrand} disabled={off} onCheckedChange={(v) => set({ yourBrand: v === true })} />
                        <span className="flex flex-col gap-0.5">
                          <span className="font-medium">Your brand</span>
                          <span className="text-muted-foreground">You are promoting yourself or your own business.</span>
                        </span>
                      </Label>
                      <Hint label={ch.privacy === "SELF_ONLY" ? BRANDED_PRIVATE : undefined}>
                        <span>
                          <Label className="items-start gap-2 font-normal">
                            <Checkbox checked={ch.branded} disabled={off || ch.privacy === "SELF_ONLY"} onCheckedChange={(v) => set({ branded: v === true })} />
                            <span className="flex flex-col gap-0.5">
                              <span className="font-medium">Branded content</span>
                              <span className="text-muted-foreground">You are promoting another brand or a third party.</span>
                            </span>
                          </Label>
                        </span>
                      </Hint>
                      {label ? (
                        <p className="text-sm text-muted-foreground">
                          Your video will be labeled “{label === "paid" ? "Paid partnership" : "Promotional content"}”.
                        </p>
                      ) : (
                        <p className="text-sm text-warning-soft-foreground">Choose at least one: Your brand or Branded content.</p>
                      )}
                    </div>
                  )}
                </div>

                {tooLong && creator && (
                  <Alert variant="destructive">
                    <AlertTitle>
                      This account can post videos up to {creator.maxVideoSeconds} seconds; this one is {Math.round(videoSeconds ?? 0)} seconds.
                    </AlertTitle>
                  </Alert>
                )}
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
