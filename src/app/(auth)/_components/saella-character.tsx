"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// Saella's brand character (full body) for sign-in, sign-up and the onboarding welcome (user decision
// 2026-11-12). Drawn from the LP's Chibi + BRAND_CHARACTER (Saella LP src/components/ui/Chibi.tsx, SignupGuide.tsx,
// HeroWalker.tsx; docs/visual-direction.md §9): orange heart-shaped tuft, round glasses, two lashes per eye, flat
// white body, single ink line, a faint shadow ellipse. Tuft = brand. Light theme: ink = foreground, fill = background.
// Dark theme: light head and body with dark ink, light limbs (never a negative of the character).
// Poses: point (right arm stretched towards the form), wave, cheer (both arms up).
// Motion (Web Animations API, no CSS file; everything off under prefers-reduced-motion, which shows the pose still):
// - entrance: walks in from the left (legs and arms swing), then raises the pointing arm;
// - idle: gentle bob and a blink every few seconds; at ~6s and ~17s it looks around, at ~11s it waves once; the bob
//   stops after 25s, only the blink stays;
// - mood "focus" (a field has focus): leans its head towards the form and gives a small point nudge;
//   mood "error": tilts the other way with an "o" mouth;
// - `cheerKey` changing (e.g. switching to sign-up): a short hop with both arms up.
// `flip` mirrors it so it points left (brand panel right of the form). Decorative only: aria-hidden, pointer-events-none, no layout of its own (the caller positions it).

export type CharacterPose = "point" | "wave" | "cheer";
export type CharacterMood = "idle" | "focus" | "error";

const EASE = "cubic-bezier(0.2, 0, 0, 1)";
const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useReducedMotion = () =>
  useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => true);

// SVG transforms in viewBox units (as the LP does): origin in px of the viewBox.
const pivot = (x: number, y: number): React.CSSProperties => ({ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" });

export function SaellaCharacter({
  pose = "point",
  mood = "idle",
  entrance = false,
  cheerKey,
  flip = false,
  className,
}: {
  pose?: CharacterPose;
  mood?: CharacterMood;
  /** Walk in from the left on mount. */
  entrance?: boolean;
  /** Each change plays a short cheer (ignored on first render). */
  cheerKey?: string;
  /** Mirror the drawing so it points (and walks in) leftwards, e.g. from a panel right of the form. */
  flip?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [walkPending, setWalkPending] = useState(entrance);
  const [override, setOverride] = useState<CharacterPose | null>(null);
  const [blink, setBlink] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const upper = useRef<SVGGElement>(null);
  const head = useRef<SVGGElement>(null);
  const legL = useRef<SVGPathElement>(null);
  const legR = useRef<SVGPathElement>(null);
  const armL = useRef<SVGGElement>(null);
  const armR = useRef<SVGGElement>(null);
  const reach = useRef<SVGGElement>(null);

  // Reduced motion never walks: the pose shows still from the start.
  const walking = walkPending && !reduced;
  const shown: CharacterPose = override ?? pose;

  // Entrance: before paint, so the character never flashes in its final spot.
  useLayoutEffect(() => {
    if (!entrance || reduced) return;
    const walkCycle = { duration: 420, iterations: 4, direction: "alternate" as const, easing: "ease-in-out" };
    const anims = [
      stage.current?.animate(
        [
          { transform: `translateX(${flip ? 140 : -140}px)`, opacity: 0 },
          { transform: `translateX(${flip ? 100 : -100}px)`, opacity: 1, offset: 0.25 },
          { transform: "translateX(0)", opacity: 1 },
        ],
        { duration: 1680, easing: "ease-out", fill: "backwards" }
      ),
      legL.current?.animate([{ transform: "rotate(-16deg)" }, { transform: "rotate(16deg)" }], walkCycle),
      legR.current?.animate([{ transform: "rotate(16deg)" }, { transform: "rotate(-16deg)" }], walkCycle),
      armL.current?.animate([{ transform: "rotate(14deg)" }, { transform: "rotate(-14deg)" }], walkCycle),
      armR.current?.animate([{ transform: "rotate(-14deg)" }, { transform: "rotate(14deg)" }], walkCycle),
      upper.current?.animate([{ transform: "translateY(0)" }, { transform: "translateY(-2.5px)" }], {
        duration: 210,
        iterations: 8,
        direction: "alternate",
        easing: "ease-in-out",
      }),
    ];
    const done = setTimeout(() => setWalkPending(false), 1700);
    return () => {
      clearTimeout(done);
      anims.forEach((a) => a?.cancel());
    };
  }, [entrance, reduced, flip]);

  // Arm goes up once the walk ends (or on mount when there's no walk).
  useEffect(() => {
    if (reduced || walking) return;
    const a = reach.current?.animate([{ transform: "rotate(70deg)" }, { transform: "rotate(-6deg)", offset: 0.7 }, { transform: "rotate(0)" }], {
      duration: 520,
      easing: EASE,
    });
    return () => a?.cancel();
  }, [walking, reduced, shown]);

  // Idle: bob, blink, look around, one wave. Bob stops after 25s.
  useEffect(() => {
    if (reduced || walking) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const bob = upper.current?.animate([{ transform: "translateY(0)" }, { transform: "translateY(-2px)" }], {
      duration: 1800,
      iterations: Infinity,
      direction: "alternate",
      easing: "ease-in-out",
    });
    const look = () =>
      head.current?.animate(
        [{ transform: "rotate(0)" }, { transform: "rotate(-9deg)" }, { transform: "rotate(9deg)" }, { transform: "rotate(0)" }],
        { duration: 1800, easing: "ease-in-out", composite: "add" }
      );
    timers.push(setTimeout(look, 6000));
    timers.push(setTimeout(() => setOverride("wave"), 11000));
    timers.push(setTimeout(() => setOverride(null), 13400));
    timers.push(setTimeout(look, 17000));
    timers.push(setTimeout(() => bob?.cancel(), 25000));
    const blinker = setInterval(() => {
      setBlink(true);
      timers.push(setTimeout(() => setBlink(false), 130));
    }, 3600);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(blinker);
      bob?.cancel();
    };
  }, [walking, reduced]);

  // Wave arm swings while waving.
  const waveArm = useRef<SVGGElement>(null);
  useEffect(() => {
    if (reduced || shown !== "wave") return;
    const a = waveArm.current?.animate([{ transform: "rotate(-10deg)" }, { transform: "rotate(18deg)" }], {
      duration: 800,
      iterations: pose === "wave" ? 12 : 3,
      direction: "alternate",
      easing: "ease-in-out",
    });
    return () => a?.cancel();
  }, [shown, pose, reduced]);

  // Focus: a small nudge of the pointing hand towards the form.
  useEffect(() => {
    if (reduced || walking || mood !== "focus") return;
    const a = reach.current?.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }],
      { duration: 700, iterations: 2, easing: "ease-in-out" }
    );
    return () => a?.cancel();
  }, [mood, walking, reduced]);

  // Cheer on cheerKey change (not on first render).
  const lastCheer = useRef(cheerKey);
  useEffect(() => {
    if (cheerKey === lastCheer.current) return;
    lastCheer.current = cheerKey;
    if (reduced || walking) return;
    const t1 = setTimeout(() => setOverride("cheer"), 0);
    const t2 = setTimeout(() => setOverride(null), 1300);
    const hop = stage.current?.animate(
      [
        { transform: "translateY(0) scale(1, 1)" },
        { transform: "translateY(0) scale(1.05, 0.93)", offset: 0.15 },
        { transform: "translateY(-18px) scale(0.98, 1.03)", offset: 0.5 },
        { transform: "translateY(0) scale(1.03, 0.96)", offset: 0.85 },
        { transform: "translateY(0) scale(1, 1)" },
      ],
      { duration: 520, iterations: 2, easing: "cubic-bezier(0.3, 0.8, 0.4, 1)" }
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      hop?.cancel();
    };
  }, [cheerKey, walking, reduced]);

  const tilt = mood === "focus" ? 8 : mood === "error" ? -8 : 0;
  const limb = "var(--char-limb)";
  const lineProps = { fill: "none", stroke: limb, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const handProps = { fill: "var(--char-fill)", stroke: limb, strokeWidth: 2 } as const;

  return (
    <div
      ref={stage}
      aria-hidden
      className={cn(
        // Light: ink = foreground, fill = background. Dark: keep the identity (light head and body, dark ink on them)
        // and draw the limbs light so they show on the dark page (LP visual-direction §9).
        "pointer-events-none select-none text-foreground [--char-fill:var(--background)] [--char-limb:currentColor]",
        "dark:text-background dark:[--char-fill:var(--foreground)] dark:[--char-limb:var(--foreground)]",
        className
      )}
      style={{ transformOrigin: "50% 100%" }}
    >
      <svg
        viewBox="14 40 124 162"
        className={cn("block h-auto w-full overflow-visible", flip && "-scale-x-100")}
        focusable="false"
      >
        <ellipse cx={66} cy={196} rx={34} ry={4} fill={limb} opacity={0.1} />
        {/* legs */}
        <g {...lineProps} strokeWidth={2.2}>
          <path ref={legL} d="M58 150 L56 192 L46 194" style={pivot(58, 150)} />
          <path ref={legR} d="M74 150 L76 192 L86 194" style={pivot(74, 150)} />
        </g>
        <g ref={upper}>
          {/* body */}
          <g transform="translate(66 154) scale(1.45)">
            <path
              d="M-13 0 C-13.5 -13 -9 -21 0 -21 C9 -21 13.5 -13 13 0 Z"
              fill="var(--char-fill)"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinejoin="round"
            />
          </g>
          {/* head: pivots at the neck (66, 122 in viewBox units) */}
          <g ref={head} style={{ ...pivot(66, 122), transform: `rotate(${tilt}deg)`, transition: "transform 400ms ease-out" }}>
            <g transform="translate(66 154) scale(1.45)">
              <path
                transform="translate(0 -3)"
                d="M-7 -52 C-13 -63 -7 -71 0 -66 C2 -73 13 -72 10.5 -62 C9.5 -58.5 8 -55 6 -52 Z"
                fill="var(--brand)"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinejoin="round"
              />
              <circle cx={-20} cy={-39} r={4.2} fill="var(--char-fill)" stroke="currentColor" strokeWidth={1.6} />
              <circle cx={20} cy={-39} r={4.2} fill="var(--char-fill)" stroke="currentColor" strokeWidth={1.6} />
              <ellipse cy={-40} rx={20} ry={19.5} fill="var(--char-fill)" stroke="currentColor" strokeWidth={1.9} />
              <g fill="var(--char-fill)" stroke="currentColor" strokeWidth={1.6}>
                <circle cx={-8} cy={-38} r={6.5} />
                <circle cx={8} cy={-38} r={6.5} />
                <path d="M-1.5 -38.5 H1.5" fill="none" />
              </g>
              {!blink && (
                <g fill="none" stroke="currentColor" strokeWidth={0.85} strokeLinecap="round">
                  <path transform="translate(-8 -38)" d="M-2 -0.9 Q-2.9 -1.5 -3.2 -3 M-2 -0.9 Q-3.4 -0.7 -4.1 -1.7" />
                  <path transform="translate(8 -38) scale(-1 1)" d="M-2 -0.9 Q-2.9 -1.5 -3.2 -3 M-2 -0.9 Q-3.4 -0.7 -4.1 -1.7" />
                </g>
              )}
              {[-8, 8].map((x) =>
                blink ? (
                  <path key={x} d={`M${x - 2.2} -38 H${x + 2.2}`} stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
                ) : (
                  <circle key={x} cx={x} cy={-38} r={2.1} fill="currentColor" />
                )
              )}
              {mood === "error" ? (
                <ellipse cy={-27.5} rx={1.9} ry={2.3} fill="currentColor" />
              ) : (
                <path d="M-3.2 -28.5 Q0 -25.5 3.2 -28.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
              )}
            </g>
          </g>
          {/* arms */}
          <g {...lineProps} strokeWidth={2}>
            {walking || shown === "point" || shown === "wave" ? (
              <g ref={armL} style={pivot(50, 130)}>
                <path d="M50 130 C42 136 40 144 42 150" />
                <circle cx={42} cy={153} r={5} {...handProps} />
              </g>
            ) : (
              <g>
                <path d="M50 130 C40 118 34 106 32 94" />
                <circle cx={31} cy={88} r={5.5} {...handProps} />
              </g>
            )}
            {walking ? (
              <g ref={armR} style={pivot(82, 130)}>
                <path d="M82 130 C90 136 92 144 90 150" />
                <circle cx={90} cy={153} r={5} {...handProps} />
              </g>
            ) : shown === "point" ? (
              <g ref={reach} style={pivot(82, 128)}>
                <path d="M82 128 C96 129 109 131 121 134" />
                <circle cx={126.5} cy={135.5} r={5.5} {...handProps} />
              </g>
            ) : shown === "wave" ? (
              <g ref={waveArm} style={pivot(82, 128)}>
                <path d="M82 128 C100 124 112 110 116 90" />
                <circle cx={117} cy={84.5} r={5.5} {...handProps} />
              </g>
            ) : (
              <g>
                <path d="M82 130 C92 118 98 106 100 94" />
                <circle cx={101} cy={88} r={5.5} {...handProps} />
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}
