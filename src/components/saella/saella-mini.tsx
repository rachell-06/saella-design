import { useId } from "react";

import { cn } from "@/lib/utils";

// Saella mini (user request 2026-10-28): the agent's face, a compact form of the brand character.
// Every look keeps her marks: the heart bun (same shape, brand color), dot eyes with 2 lashes, small smile,
// flat ink line + white + brand only (no grey shading, no gradient, LP visual-direction §9).
// Looks under review (compare 03 Brand/saella-mini-*.png); the one picked becomes the only one:
//   classic: head-and-shoulders crop of the character (first version)
//   visor:   small robot after the user's refs: white round head, ink visor, light eyes, ink ear pods, bun antenna
//   hood:    ink gumdrop shell with a white face window, bun on top (ref: hooded bot)
//   helmet:  her face with round glasses inside a round helmet, brand ear pods, bun antenna (ref: astronaut bot)
//   orb:     round head-body, wide ink visor with big eyes, ear discs, open smile, stub arms, brand belt (ref: orb bot)
//   blob:    one-piece white mascot body with a thin ink outline, brand heart bun as its tuft, big round glasses,
//            line arms with round hands as in the cheer pose, stub legs (refs: blob mascots).
// Colors follow the theme like the onboarding art: ink = currentColor, fill = background, bun = brand,
// disc = primary-soft. Brand files: 03 Brand/saella-mini-<variant>.png.
// Small sizes get thicker lines so the face still reads at 20–24px.

export type SaellaMiniVariant = "classic" | "visor" | "hood" | "helmet" | "orb" | "blob";
export type SaellaMiniState = "idle" | "thinking";

const LASH = "M-2 -0.9 Q-2.9 -1.5 -3.2 -3 M-2 -0.9 Q-3.4 -0.7 -4.1 -1.7";
// Brand character bun (LP Chibi.tsx); its bottom edge is y = -52.
const BUN = "M-7 -52 C-13 -63 -7 -71 0 -66 C2 -73 13 -72 10.5 -62 C9.5 -58.5 8 -55 6 -52 Z";
const BLOB_BODY = "M0 -18 C12 -18 18 -9 18 3 C18 14 12 20 0 20 C-12 20 -18 14 -18 3 C-18 -9 -12 -18 0 -18 Z";
const BG = "var(--background)";
const INK = "currentColor";

/** The bun with its bottom edge at `y`, scaled by `s`. */
function Bun({ y, s, sw }: { y: number; s: number; sw: number }) {
  return (
    <path
      transform={`translate(0 ${y}) scale(${s}) translate(0 52)`}
      d={BUN}
      fill="var(--brand)"
      stroke={INK}
      strokeWidth={sw / s}
      strokeLinejoin="round"
    />
  );
}

/** Dot eyes with the 2 lashes at the upper outer edge. */
function Eyes({ x, y, r, color, lw }: { x: number; y: number; r: number; color: string; lw: number }) {
  const off = x + r - 2.1;
  return (
    <g className="saella-mini-eyes">
      <g fill="none" stroke={color} strokeWidth={lw} strokeLinecap="round">
        <path transform={`translate(${-off} ${y})`} d={LASH} />
        <path transform={`translate(${off} ${y}) scale(-1 1)`} d={LASH} />
      </g>
      <circle cx={-x} cy={y} r={r} fill={color} />
      <circle cx={x} cy={y} r={r} fill={color} />
    </g>
  );
}

/** Round glasses with the bridge; eyes go on top. */
function Glasses({ x, y, r, sw }: { x: number; y: number; r: number; sw: number }) {
  return (
    <g fill={BG} stroke={INK} strokeWidth={sw}>
      <circle cx={-x} cy={y} r={r} />
      <circle cx={x} cy={y} r={r} />
      <path d={`M-1.5 ${y - 0.5} H1.5`} fill="none" />
    </g>
  );
}

function Smile({ y, w, color, sw }: { y: number; w: number; color: string; sw: number }) {
  return (
    <path d={`M${-w} ${y} Q0 ${y + w * 0.9} ${w} ${y}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
  );
}

const LOOKS: Record<SaellaMiniVariant, { fit: string; draw: (sw: (w: number) => number) => React.ReactNode }> = {
  classic: {
    fit: "translate(0 44)",
    draw: (sw) => (
      <>
        <path
          d="M-13 0 C-13.5 -13 -9 -21 0 -21 C9 -21 13.5 -13 13 0 Z"
          fill={BG}
          stroke={INK}
          strokeWidth={sw(1.9)}
          strokeLinejoin="round"
        />
        <Bun y={-55} s={1} sw={sw(1.7)} />
        <circle cx="-20" cy="-39" r="4.2" fill={BG} stroke={INK} strokeWidth={sw(1.6)} />
        <circle cx="20" cy="-39" r="4.2" fill={BG} stroke={INK} strokeWidth={sw(1.6)} />
        <ellipse cy="-40" rx="20" ry="19.5" fill={BG} stroke={INK} strokeWidth={sw(1.9)} />
        <Glasses x={8} y={-38} r={6.5} sw={sw(1.6)} />
        <Eyes x={8} y={-38} r={2.1} color={INK} lw={sw(0.85)} />
        <Smile y={-28.5} w={3.2} color={INK} sw={sw(1.5)} />
      </>
    ),
  },
  visor: {
    fit: "translate(0 4) scale(0.9)",
    draw: (sw) => (
      <>
        <rect x="-26" y="-4" width="8" height="16" rx="4" fill={INK} />
        <rect x="18" y="-4" width="8" height="16" rx="4" fill={INK} />
        <path d="M0 -14 V-18" stroke={INK} strokeWidth={sw(2)} strokeLinecap="round" />
        <Bun y={-17.5} s={0.65} sw={sw(1.6)} />
        <ellipse cy="4" rx="21" ry="18.5" fill={BG} stroke={INK} strokeWidth={sw(2)} />
        <rect x="-15.5" y="-5" width="31" height="18" rx="8" fill={INK} />
        <Eyes x={6.5} y={2.5} r={3} color={BG} lw={sw(0.95)} />
        <Smile y={8} w={2.6} color={BG} sw={sw(1.5)} />
      </>
    ),
  },
  hood: {
    fit: "translate(0 2.5) scale(0.92)",
    draw: (sw) => (
      <>
        <Bun y={-14} s={0.7} sw={sw(1.6)} />
        <path d="M0 -18 C14 -18 23 -7 23 7 C23 19 13 24 0 24 C-13 24 -23 19 -23 7 C-23 -7 -14 -18 0 -18 Z" fill={INK} />
        <path d="M0 -4 C11 -4 17 2 17 9 C17 16 10 19 0 19 C-10 19 -17 16 -17 9 C-17 2 -11 -4 0 -4 Z" fill={BG} />
        <Eyes x={6.5} y={6.5} r={2.6} color={INK} lw={sw(0.95)} />
        <Smile y={12} w={2.6} color={INK} sw={sw(1.5)} />
      </>
    ),
  },
  helmet: {
    fit: "translate(0 4) scale(0.86)",
    draw: (sw) => (
      <>
        <g fill="var(--brand)" stroke={INK} strokeWidth={sw(1.6)}>
          <rect x="-27" y="-3" width="7" height="14" rx="3.5" />
          <rect x="20" y="-3" width="7" height="14" rx="3.5" />
        </g>
        <path d="M0 -17 V-20" stroke={INK} strokeWidth={sw(2)} strokeLinecap="round" />
        <Bun y={-19.5} s={0.65} sw={sw(1.6)} />
        <circle cy="4" r="21" fill={BG} stroke={INK} strokeWidth={sw(2)} />
        <Glasses x={7.5} y={4} r={6} sw={sw(1.6)} />
        <Eyes x={7.5} y={4} r={2} color={INK} lw={sw(0.85)} />
        <Smile y={14} w={3} color={INK} sw={sw(1.5)} />
      </>
    ),
  },
  orb: {
    fit: "translate(0 3) scale(0.88)",
    draw: (sw) => (
      <>
        <Bun y={-15.5} s={0.65} sw={sw(1.6)} />
        <g fill={BG} stroke={INK} strokeWidth={sw(1.6)}>
          <ellipse cx="-22.5" cy="13" rx="4.5" ry="2.8" transform="rotate(-20 -22.5 13)" />
          <ellipse cx="22.5" cy="13" rx="4.5" ry="2.8" transform="rotate(20 22.5 13)" />
        </g>
        <ellipse cy="3" rx="22" ry="20.5" fill={BG} stroke={INK} strokeWidth={sw(2)} />
        <path d="M-16.6 16.5 Q0 21.5 16.6 16.5" fill="none" stroke="var(--brand)" strokeWidth={sw(1.8)} strokeLinecap="round" />
        <g stroke={INK} strokeWidth={sw(1.4)}>
          <circle cx="-21.5" cy="-1" r="3.2" fill={BG} />
          <circle cx="21.5" cy="-1" r="3.2" fill={BG} />
        </g>
        <circle cx="-21.5" cy="-1" r="1.4" fill="var(--brand)" />
        <circle cx="21.5" cy="-1" r="1.4" fill="var(--brand)" />
        <rect x="-17" y="-8.5" width="34" height="15" rx="6" fill={INK} />
        <g className="saella-mini-eyes">
          <g fill="none" stroke={BG} strokeWidth={sw(0.95)} strokeLinecap="round">
            <path transform="translate(-8.4 -3.1) scale(1.2)" d={LASH} />
            <path transform="translate(8.4 -3.1) scale(-1.2 1.2)" d={LASH} />
          </g>
          <circle cx="-7.5" cy="-1" r="4.4" fill={BG} />
          <circle cx="7.5" cy="-1" r="4.4" fill={BG} />
          <circle cx="-7" cy="-0.6" r="2.3" fill={INK} />
          <circle cx="7" cy="-0.6" r="2.3" fill={INK} />
        </g>
        <path d="M-2.8 10 H2.8 Q2.8 14.6 0 14.6 Q-2.8 14.6 -2.8 10 Z" fill={INK} />
      </>
    ),
  },
  blob: {
    fit: "translate(0 1.5) scale(0.92)",
    draw: (sw) => (
      <>
        <g fill={BG} stroke={INK} strokeWidth={sw(1.6)} strokeLinejoin="round">
          <rect x="-10" y="14" width="7" height="10" rx="3.5" />
          <rect x="3" y="14" width="7" height="10" rx="3.5" />
        </g>
        {/* Arms as in the cheer pose: one ink line out from the body, a small round hand at the end. */}
        <g fill="none" stroke={INK} strokeWidth={sw(1.6)} strokeLinecap="round">
          <path d="M-16 7 C-19.5 7.5 -22 6 -23.5 3" />
          <path d="M16 7 C19.5 7.5 22 6 23.5 3" />
        </g>
        <g fill={BG} stroke={INK} strokeWidth={sw(1.5)}>
          <circle cx="-24.3" cy="0.6" r="2.6" />
          <circle cx="24.3" cy="0.6" r="2.6" />
        </g>
        <Bun y={-15} s={0.62} sw={sw(1.6)} />
        <path d={BLOB_BODY} fill={BG} stroke={INK} strokeWidth={sw(1.8)} />
        <Glasses x={7} y={-3} r={6.5} sw={sw(1.8)} />
        <Eyes x={7} y={-3} r={2.6} color={INK} lw={sw(0.95)} />
        <Smile y={8.5} w={3} color={INK} sw={sw(1.6)} />
      </>
    ),
  },
};

export function SaellaMini({
  size = 32,
  variant = "visor",
  state = "idle",
  badge = true,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "children"> & {
  /** Rendered width and height in px. Common: 20, 24, 28, 40, 56. */
  size?: number;
  variant?: SaellaMiniVariant;
  /** idle: blinks now and then. thinking: also tilts the head while the agent works. */
  state?: SaellaMiniState;
  /** Round primary-soft disc behind the character. Off when the parent already has a surface. */
  badge?: boolean;
  /** Accessible name. Leave empty when text next to it already says "agent". */
  label?: string;
  className?: string;
}) {
  const clipId = useId();
  // Keep the main line at ≥1.1 screen px: the art is 64 units wide with ~2-unit lines.
  const k = Math.max(1, 37 / size);
  const sw = (w: number) => +(w * k).toFixed(2);
  const look = LOOKS[variant];

  return (
    <svg
      viewBox="-32 -32 64 64"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      data-state={state}
      data-variant={variant}
      className={cn("saella-mini shrink-0 text-foreground", className)}
      {...props}
    >
      <defs>
        <clipPath id={clipId}>
          <circle r="32" />
        </clipPath>
      </defs>
      {badge && <circle r="32" fill="var(--primary-soft)" />}
      <g clipPath={`url(#${clipId})`}>
        <g transform={look.fit}>
          <g className="saella-mini-head">{look.draw(sw)}</g>
        </g>
      </g>
    </svg>
  );
}
