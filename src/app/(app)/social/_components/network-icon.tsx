import { useId } from "react";
import { cn } from "@/lib/utils";
import type { SocialNetwork } from "@/lib/mock/social";

// Network marks in their own brand colours (user decision 2026-11-11: the one exception to the one-colour
// icon rule; only for the networks themselves, never as decoration). Every network is the same shape (user decision
// 2026-11-11): a circle in the brand colour (Instagram keeps its gradient) with a white glyph centred inside, glyphs
// drawn to one optical size. Simplified marks drawn here like the live app's components/social/NetworkIcon.tsx, so
// nothing loads from the network. In overlapping stacks the caller adds `rounded-full ring-2 ring-card` (or
// ring-background) to separate them. The black circles (Threads, TikTok, Douyin) get a hairline in the border colour
// on the dark theme so they don't sink into the page.
const FILL: Record<SocialNetwork, string> = {
  facebook: "#1877F2",
  instagram: "",
  threads: "#111111",
  linkedin: "#0A66C2",
  tiktok: "#111111",
  youtube: "#FF0000",
  pinterest: "#E60023",
  douyin: "#111111",
};
const DARK_INK: SocialNetwork[] = ["threads", "tiktok", "douyin"];

export function NetworkIcon({ network, size = 20, className }: { network: SocialNetwork; size?: number; className?: string }) {
  const gid = `ig-${useId().replace(/:/g, "")}`;
  const text = (ch: string, fs = 64, y = 82, fill = "#fff") => (
    <text x="60" y={y} textAnchor="middle" fontSize={fs} fontWeight="800" fill={fill} fontFamily="var(--font-sans), sans-serif">
      {ch}
    </text>
  );
  let glyph: React.ReactNode;
  switch (network) {
    case "facebook":
      glyph = <path d="M65 96V66h10l2-12H65v-7c0-4 1-6 6-6h6V30c-2 0-5-1-10-1-10 0-16 6-16 16v9H41v12h10v30z" fill="#fff" />;
      break;
    case "instagram":
      glyph = (
        <>
          <rect x="34" y="34" width="52" height="52" rx="16" fill="none" stroke="#fff" strokeWidth="7" />
          <circle cx="60" cy="60" r="12" fill="none" stroke="#fff" strokeWidth="7" />
          <circle cx="75" cy="45" r="4" fill="#fff" />
        </>
      );
      break;
    case "threads":
      glyph = text("@", 62, 80);
      break;
    case "linkedin":
      glyph = text("in", 58, 80);
      break;
    case "tiktok":
    case "douyin":
      glyph = (
        <>
          {text("♪", 62, 80, "#25F4EE")}
          {text("♪", 62, 85, "#FE2C55")}
          {text("♪", 62, 82)}
        </>
      );
      break;
    case "youtube":
      glyph = <path d="M50 40l32 20-32 20z" fill="#fff" />;
      break;
    case "pinterest":
      glyph = text("P", 64, 83);
      break;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={cn("shrink-0 rounded-full", className)} style={{ display: "block" }}>
      {network === "instagram" && (
        <defs>
          <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#F9CE34" />
            <stop offset=".45" stopColor="#EE2A7B" />
            <stop offset="1" stopColor="#6228D7" />
          </linearGradient>
        </defs>
      )}
      <circle
        cx="60"
        cy="60"
        r="60"
        fill={network === "instagram" ? `url(#${gid})` : FILL[network]}
      />
      {DARK_INK.includes(network) && <circle cx="60" cy="60" r="56" fill="none" strokeWidth="8" className="stroke-transparent dark:stroke-input" />}
      {glyph}
    </svg>
  );
}
