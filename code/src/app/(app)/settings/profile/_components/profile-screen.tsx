"use client";

import { useRef, useState } from "react";
import { CameraIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ME } from "../../_components/data";
import { SectionHeader } from "../../_components/section-header";

// Settings → Profile: the signed-in person, not the workspace (live app MyProfileSection.tsx, api/me/avatar;
// PRD Master v1.1.9 "a real Profile tab").
// - Name and email come from the sign-in identity, so they're shown, not edited.
// - The photo is the only thing to change: PNG, JPG, GIF or WebP up to 2 MB; saved at once, no Save button.
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export function ProfileScreen() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const initial = ME.name.charAt(0).toUpperCase();

  function upload(f: File) {
    if (!TYPES.includes(f.type)) return toast.error("Use a PNG, JPG, GIF or WebP image.");
    if (f.size > MAX_BYTES) return toast.error("That image is over 2 MB. Pick a smaller one.");
    setBusy(true);
    const url = URL.createObjectURL(f);
    setTimeout(() => {
      setPhoto(url);
      setBusy(false);
      toast.success("Photo updated");
    }, 600);
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby="me-title">
      <SectionHeader id="me-title" title="Your profile" description="How teammates see you." />
      <div className="flex items-center gap-4">
        <Avatar className="size-20">
          {photo && <AvatarImage src={photo} alt="" />}
          <AvatarFallback className="text-2xl">{initial}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <input
              ref={file}
              type="file"
              accept={TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => file.current?.click()} disabled={busy} aria-busy={busy || undefined}>
              {busy ? <Spinner data-icon="inline-start" /> : <CameraIcon data-icon="inline-start" />}
              {photo ? "Change photo" : "Add a photo"}
            </Button>
            {photo && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setPhoto(null);
                  toast.success("Photo removed");
                }}
              >
                <TrashIcon data-icon="inline-start" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">PNG, JPG, GIF or WebP, up to 2 MB.</p>
        </div>
      </div>
      {/* Name and email come from sign-in: plain text, not disabled inputs. */}
      <dl className="grid max-w-lg grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-3">
        <dt className="text-muted-foreground">Name</dt>
        <dd className="min-w-0 truncate">{ME.name}</dd>
        <dt className="text-muted-foreground">Email</dt>
        <dd className="min-w-0 truncate">{ME.email}</dd>
      </dl>
    </section>
  );
}
